// Data layer for the Canner tenant Postgres (DATABASE_URL, auto-injected by
// the platform).
//
// The query-builder shape here is a historical artefact: it was written as a
// drop-in for the Supabase client during the migration off Supabase, so it
// mirrors that subset — from/select/insert/update, eq/in filters, order/limit,
// single/maybeSingle — and returns the same `{ data, error }`. Supabase itself
// is long gone; the shape stayed because rewriting every call site into raw SQL
// would have been unrelated risk. Treat it as this app's own small ORM.
//
// The connection string points at PgBouncer (transaction pooling, :6432).
// node-postgres uses unnamed/simple queries here, so it is pooler-safe.
//
// One deliberate asymmetry, added after a silent outage: a query that matches
// no rows returns `{ data: null }`, but a database that cannot be REACHED
// throws DbConnectionError. See that class for why it matters.

import { Pool, type QueryResult } from "pg";
import { ensureSchema } from "./migrate";

// Reuse a single pool across hot-reloads in dev and across the module cache
// in prod.
const globalForPg = globalThis as unknown as { __sendletterPgPool?: Pool };

function getPool(): Pool {
  if (!globalForPg.__sendletterPgPool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) throw new Error("DATABASE_URL not set");
    globalForPg.__sendletterPgPool = new Pool({
      connectionString,
      max: 10,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
    });
  }
  return globalForPg.__sendletterPgPool;
}

/**
 * Raised when the database itself is unreachable — connection refused, auth
 * failure, timeout, missing DATABASE_URL — as opposed to a query that simply
 * matched no rows.
 *
 * The distinction is the whole point. Previously every failure collapsed into
 * `{ data: null }`, so a total outage was indistinguishable from an empty
 * table: `validateApiKey` answered "Invalid API key", `/api/auth/login`
 * answered "Invalid email or password", and the confirmation-email idempotency
 * probe answered "no order yet" and sent a duplicate receipt. Callers that care
 * about the difference now catch this; callers that do not are unchanged.
 */
export class DbConnectionError extends Error {
  readonly cause?: unknown;
  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = "DbConnectionError";
    this.cause = cause;
  }
}

// Postgres error codes and node-postgres/libpq failure modes that mean "the
// database did not answer", rather than "the database answered, with nothing".
// Class 08 is connection exceptions; 53 is insufficient resources; 57P0x are
// admin shutdown / crash recovery; 28xxx is authentication.
const CONNECTION_ERROR_CODES = new Set([
  "28000", "28P01",          // invalid authorization / bad password
  "3D000",                   // database does not exist
  "53300",                   // too many connections
  "57P01", "57P02", "57P03", // admin shutdown, crash shutdown, cannot connect now
]);

function isConnectionFailure(e: unknown): boolean {
  if (!e || typeof e !== "object") return false;
  const err = e as { code?: string; message?: string };
  const code = err.code;
  if (typeof code === "string") {
    if (code.startsWith("08")) return true;            // connection exception
    if (CONNECTION_ERROR_CODES.has(code)) return true;
    // Node socket-level failures surface as these, with no SQLSTATE.
    if (["ECONNREFUSED", "ETIMEDOUT", "ENOTFOUND", "EHOSTUNREACH", "ECONNRESET", "EPIPE"].includes(code)) {
      return true;
    }
  }
  const msg = err.message ?? "";
  return (
    msg.includes("Connection terminated") ||
    msg.includes("timeout exceeded when trying to connect") ||
    msg.includes("DATABASE_URL not set")
  );
}

export type DbError = { message: string } | null;
// `data` is intentionally `any` (defaulted), matching the loose typing the
// untyped Supabase client exposed, so existing call sites compile unchanged.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type DbResult<T = any> = { data: T; error: DbError };

// Identifiers in this codebase are all compile-time literals (table/column
// names). Validate anyway so a stray dynamic value can never break out of an
// identifier position — values are always parameterized separately.
const IDENT = /^[a-z_][a-z0-9_]*$/i;
function ident(name: string): string {
  const trimmed = name.trim();
  if (!IDENT.test(trimmed)) throw new Error(`Unsafe SQL identifier: ${name}`);
  return `"${trimmed}"`;
}
function identList(cols: string): string {
  // "id, email" -> "id","email"   ("*" passes through)
  if (cols.trim() === "*") return "*";
  return cols
    .split(",")
    .map((c) => ident(c))
    .join(", ");
}

type Filter = { col: string; op: "eq" | "neq" | "in" | "lt" | "lte" | "gt" | "gte" | "notnull" | "isnull"; val: unknown };
type Op = "select" | "insert" | "update" | "delete";

// The default thenable resolves a list result (`data: any[]`), matching the
// untyped Supabase client — so `.map`/`.reduce`/`.filter` on results stay
// contextually typed. `.single()`/`.maybeSingle()` narrow to a single row.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
class QueryBuilder implements PromiseLike<DbResult<any[]>> {
  private op: Op = "select";
  private selectCols = "*";
  private hasReturning = false;
  private payload: Record<string, unknown> | Record<string, unknown>[] = {};
  private filters: Filter[] = [];
  private orderBy: { col: string; ascending: boolean } | null = null;
  private limitN: number | null = null;
  private rowMode: "many" | "single" | "maybeSingle" = "many";

  constructor(private readonly table: string) {}

  select(cols = "*"): this {
    this.selectCols = cols;
    if (this.op === "insert" || this.op === "update" || this.op === "delete") {
      this.hasReturning = true; // .insert(...).select(...) -> RETURNING
    } else {
      this.op = "select";
    }
    return this;
  }

  insert(values: Record<string, unknown> | Record<string, unknown>[]): this {
    this.op = "insert";
    this.payload = values;
    return this;
  }

  update(values: Record<string, unknown>): this {
    this.op = "update";
    this.payload = values;
    return this;
  }

  delete(): this {
    this.op = "delete";
    return this;
  }

  neq(col: string, val: unknown): this {
    this.filters.push({ col, op: "neq", val });
    return this;
  }

  lte(col: string, val: unknown): this {
    this.filters.push({ col, op: "lte", val });
    return this;
  }

  gt(col: string, val: unknown): this {
    this.filters.push({ col, op: "gt", val });
    return this;
  }

  gte(col: string, val: unknown): this {
    this.filters.push({ col, op: "gte", val });
    return this;
  }

  /** col IS NULL */
  isNull(col: string): this {
    this.filters.push({ col, op: "isnull", val: null });
    return this;
  }

  eq(col: string, val: unknown): this {
    this.filters.push({ col, op: "eq", val });
    return this;
  }

  in(col: string, val: unknown[]): this {
    this.filters.push({ col, op: "in", val });
    return this;
  }

  lt(col: string, val: unknown): this {
    this.filters.push({ col, op: "lt", val });
    return this;
  }

  /** col IS NOT NULL */
  notNull(col: string): this {
    this.filters.push({ col, op: "notnull", val: null });
    return this;
  }

  order(col: string, opts?: { ascending?: boolean }): this {
    this.orderBy = { col, ascending: opts?.ascending !== false };
    return this;
  }

  limit(n: number): this {
    this.limitN = n;
    return this;
  }

  // single()/maybeSingle() narrow the resolved shape from a list to one row.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  single(): PromiseLike<DbResult<any>> {
    this.rowMode = "single";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return this as unknown as PromiseLike<DbResult<any>>;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  maybeSingle(): PromiseLike<DbResult<any>> {
    this.rowMode = "maybeSingle";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return this as unknown as PromiseLike<DbResult<any>>;
  }

  // --- execution ---------------------------------------------------------

  private buildWhere(params: unknown[]): string {
    if (this.filters.length === 0) return "";
    const clauses = this.filters.map((f) => {
      if (f.op === "notnull") return `${ident(f.col)} IS NOT NULL`;
      if (f.op === "isnull") return `${ident(f.col)} IS NULL`;
      params.push(f.val);
      if (f.op === "in") return `${ident(f.col)} = ANY($${params.length})`;
      if (f.op === "lt") return `${ident(f.col)} < $${params.length}`;
      if (f.op === "lte") return `${ident(f.col)} <= $${params.length}`;
      if (f.op === "gt") return `${ident(f.col)} > $${params.length}`;
      if (f.op === "gte") return `${ident(f.col)} >= $${params.length}`;
      if (f.op === "neq") return `${ident(f.col)} <> $${params.length}`;
      return `${ident(f.col)} = $${params.length}`;
    });
    return ` WHERE ${clauses.join(" AND ")}`;
  }

  private build(): { text: string; params: unknown[] } {
    const params: unknown[] = [];

    if (this.op === "insert") {
      const rows = Array.isArray(this.payload) ? this.payload : [this.payload];
      const cols = Object.keys(rows[0]);
      const colSql = cols.map((c) => ident(c)).join(", ");
      const valuesSql = rows
        .map(
          (row) =>
            `(${cols
              .map((c) => {
                params.push(row[c]);
                return `$${params.length}`;
              })
              .join(", ")})`
        )
        .join(", ");
      const returning = this.hasReturning
        ? ` RETURNING ${identList(this.selectCols)}`
        : "";
      return {
        text: `INSERT INTO ${ident(this.table)} (${colSql}) VALUES ${valuesSql}${returning}`,
        params,
      };
    }

    if (this.op === "update") {
      const entries = Object.entries(this.payload as Record<string, unknown>);
      const setSql = entries
        .map(([c, v]) => {
          params.push(v);
          return `${ident(c)} = $${params.length}`;
        })
        .join(", ");
      const where = this.buildWhere(params);
      const returning = this.hasReturning
        ? ` RETURNING ${identList(this.selectCols)}`
        : "";
      return {
        text: `UPDATE ${ident(this.table)} SET ${setSql}${where}${returning}`,
        params,
      };
    }

    if (this.op === "delete") {
      // A DELETE with no filter would empty the table. Refuse to build one.
      if (this.filters.length === 0) throw new Error("Refusing an unfiltered DELETE");
      const where = this.buildWhere(params);
      const returning = this.hasReturning ? ` RETURNING ${identList(this.selectCols)}` : "";
      return { text: `DELETE FROM ${ident(this.table)}${where}${returning}`, params };
    }

    // select
    const where = this.buildWhere(params);
    const order = this.orderBy
      ? ` ORDER BY ${ident(this.orderBy.col)} ${this.orderBy.ascending ? "ASC" : "DESC"}`
      : "";
    const limit = this.limitN != null ? ` LIMIT ${Math.floor(this.limitN)}` : "";
    return {
      text: `SELECT ${identList(this.selectCols)} FROM ${ident(this.table)}${where}${order}${limit}`,
      params,
    };
  }

  private async execute(): Promise<DbResult> {
    try {
      const pool = getPool();
      await ensureSchema(pool); // idempotent; runs once per process
      const { text, params } = this.build();
      const res: QueryResult = await pool.query(text, params);
      const rows = res.rows ?? [];

      // Inserts/updates without a .select() return no data (matches PostgREST).
      if ((this.op === "insert" || this.op === "update" || this.op === "delete") && !this.hasReturning) {
        return { data: null, error: null };
      }

      if (this.rowMode === "single") {
        if (rows.length !== 1) {
          return {
            data: null,
            error: { message: `Expected exactly one row, got ${rows.length}` },
          };
        }
        return { data: rows[0], error: null };
      }

      if (this.rowMode === "maybeSingle") {
        if (rows.length > 1) {
          return {
            data: null,
            error: { message: `Expected at most one row, got ${rows.length}` },
          };
        }
        return { data: rows[0] ?? null, error: null };
      }

      return { data: rows, error: null };
    } catch (e) {
      // A dead database is not a query result. Throwing here is what lets
      // callers answer 503 instead of 401/"invalid password"/"no such order".
      if (isConnectionFailure(e)) {
        const message = e instanceof Error ? e.message : String(e);
        throw new DbConnectionError(`Database unreachable: ${message}`, e);
      }
      // Genuine query errors (constraint violations, bad SQL) keep the old
      // `{ data, error }` shape — call sites already branch on those.
      const message = e instanceof Error ? e.message : String(e);
      return { data: null, error: { message } };
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  then<TResult1 = DbResult<any[]>, TResult2 = never>(
    onfulfilled?:
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      | ((value: DbResult<any[]>) => TResult1 | PromiseLike<TResult1>)
      | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): PromiseLike<TResult1 | TResult2> {
    return this.execute().then(onfulfilled, onrejected);
  }
}

class TenantDbClient {
  from(table: string): QueryBuilder {
    return new QueryBuilder(table);
  }
}

export function getDb(): TenantDbClient {
  // Validate the connection is configured up-front. Throws the same error type
  // a runtime connection failure produces, so callers need only one catch.
  if (!process.env.DATABASE_URL) {
    throw new DbConnectionError("DATABASE_URL not set");
  }
  return new TenantDbClient();
}

/**
 * Liveness probe for /api/health. Returns the round-trip time of a trivial
 * query, or throws DbConnectionError.
 */
export async function pingDb(): Promise<number> {
  const started = Date.now();
  const pool = getPool();
  try {
    await pool.query("SELECT 1");
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    throw new DbConnectionError(`Database unreachable: ${message}`, e);
  }
  return Date.now() - started;
}

export type OrderInsert = {
  stripe_session_id: string | null;
  stripe_payment_status: string;
  customer_email: string;
  letter_mode: string;
  letter_size: string;
  page_count: number;
  amount_cents: number;
  from_name: string;
  from_line1: string;
  from_line2?: string | null;
  from_city: string;
  from_province: string;
  from_postal: string;
  from_country?: string | null;
  to_name: string;
  to_line1: string;
  to_line2?: string | null;
  to_city: string;
  to_province: string;
  to_postal: string;
  to_country?: string | null;
  has_pdf_attachment: boolean;
  letter_html?: string | null;
  colour?: boolean;
  duplex?: boolean;
  mailings?: number;
  sheets?: number;
  stamps?: number;
  est_weight_g?: number;
  price_breakdown?: unknown;
  pricing_version?: string;
  from_lines?: string | null;
  print_files?: string | null;
  api_account_id?: string | null;
  api_usage_id?: string | null;
};
