// Drop-in data layer backed by the Canner tenant Postgres (DATABASE_URL),
// replacing the former Supabase PostgREST client. The public surface
// (`getSupabase()` + a small query-builder) mirrors the subset of
// @supabase/supabase-js this app actually used — from/select/insert/update,
// eq/in filters, order/limit, single/maybeSingle — returning the same
// `{ data, error }` shape, so call sites are unchanged.
//
// The connection string points at PgBouncer (transaction pooling, :6432).
// node-postgres uses unnamed/simple queries here, so it is pooler-safe.

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

type Filter = { col: string; op: "eq" | "in"; val: unknown };
type Op = "select" | "insert" | "update";

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
    if (this.op === "insert" || this.op === "update") {
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

  eq(col: string, val: unknown): this {
    this.filters.push({ col, op: "eq", val });
    return this;
  }

  in(col: string, val: unknown[]): this {
    this.filters.push({ col, op: "in", val });
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
      params.push(f.val);
      if (f.op === "in") return `${ident(f.col)} = ANY($${params.length})`;
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
      if ((this.op === "insert" || this.op === "update") && !this.hasReturning) {
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

export function getSupabase(): TenantDbClient {
  // Validate the connection is configured up-front, matching prior behaviour
  // of throwing when the backing store was unconfigured.
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL not set");
  return new TenantDbClient();
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
  api_account_id?: string | null;
  api_usage_id?: string | null;
};
