// Fake of the `pg` driver for the real db.ts: every SQL string the query builder
// produces is recorded in `queries`, and is also executed against a small
// in-memory set of tables, so tests exercise real read-after-write behaviour
// (idempotency, limits, billing, webhooks) instead of canned responses.
//
// It understands only the statement shapes QueryBuilder generates:
//   INSERT INTO "t" (cols) VALUES (...) [RETURNING ...]
//   SELECT cols FROM "t" [WHERE ...] [ORDER BY "c" ASC|DESC] [LIMIT n]
//   UPDATE "t" SET "a" = $1, ... [WHERE ...] [RETURNING ...]
//   DELETE FROM "t" [WHERE ...] [RETURNING ...]
// with WHERE built from  =  <>  <  <=  >  >=  = ANY($n)  IS NULL  IS NOT NULL  joined by AND.
//
// `setResponder` is kept for tests that want to script the driver directly.
import { randomUUID } from "node:crypto";

export const queries: { text: string; params: unknown[] }[] = [];
type Row = Record<string, unknown>;
const tables = new Map<string, Row[]>();
let seq = 0;
let responder: ((text: string, params: unknown[]) => unknown[]) | null = null;

export const setResponder = (fn: (text: string, params: unknown[]) => unknown[]) => { responder = fn; };
export const reset = () => { queries.length = 0; tables.clear(); responder = null; seq = 0; };
export const rows = (t: string): Row[] => tables.get(t) ?? [];
export const seed = (t: string, data: Row[]) => { for (const r of data) insertRow(t, { ...r }); };

const UNIQUE: Record<string, string[][]> = {
  sendletter_idempotency: [["account_id", "key"]],
  sendletter_api_keys: [["key_hash"]],
};

const DEFAULTS: Record<string, () => Row> = {
  sendletter_accounts: () => ({ has_payment_method: false, daily_spend_limit_cents: 50000, daily_spend_cap_cents: 50000 }),
  sendletter_orders: () => ({ status: "pending", livemode: true, stripe_payment_status: "paid" }),
  sendletter_api_usage: () => ({ billed: false, voided_at: null, invoice_id: null, refunded_cents: 0 }),
  sendletter_api_keys: () => ({ is_active: true, livemode: true, revoked_at: null }),
  sendletter_invoices: () => ({ status: "open", paid_at: null, stripe_payment_intent_id: null, seq: ++seq }),
  sendletter_webhook_endpoints: () => ({ active: true, livemode: true, events: null }),
  sendletter_webhook_deliveries: () => ({ status: "pending", attempts: 0, last_status_code: null, last_error: null, next_attempt_at: new Date().toISOString(), delivered_at: null }),
  sendletter_idempotency: () => ({ status: "in_progress", response_status: null, response_body: null, order_id: null }),
  sendletter_limit_requests: () => ({ status: "open" }),
};

function insertRow(t: string, row: Row): Row {
  const full: Row = { id: randomUUID(), created_at: new Date().toISOString(), ...(DEFAULTS[t]?.() ?? {}), ...row };
  for (const cols of UNIQUE[t] ?? []) {
    if (rows(t).some((r) => cols.every((c) => r[c] === full[c]))) {
      throw new Error(`duplicate key value violates unique constraint on ${t} (${cols.join(", ")})`);
    }
  }
  if (!tables.has(t)) tables.set(t, []);
  tables.get(t)!.push(full);
  return full;
}

const unq = (s: string) => s.trim().replace(/^"|"$/g, "");
const cols = (s: string) => (s.trim() === "*" ? null : s.split(",").map(unq));
const pick = (r: Row, c: string[] | null) => (c ? Object.fromEntries(c.map((k) => [k, r[k] ?? null])) : { ...r });
const isoLike = (v: unknown) => typeof v === "string" && /^\d{4}-\d\d-\d\dT/.test(v);
const cmpVal = (v: unknown): number | string | null => (v instanceof Date ? v.getTime() : isoLike(v) ? Date.parse(v as string) : (v as number | string | null));

function matcher(where: string | undefined, params: unknown[]): (r: Row) => boolean {
  if (!where) return () => true;
  const tests = where.split(" AND ").map((clause): ((r: Row) => boolean) => {
    let m: RegExpMatchArray | null;
    if ((m = clause.match(/^"(\w+)" IS NOT NULL$/))) return (r) => r[m![1]] != null;
    if ((m = clause.match(/^"(\w+)" IS NULL$/))) return (r) => r[m![1]] == null;
    if ((m = clause.match(/^"(\w+)" = ANY\(\$(\d+)\)$/))) return (r) => (params[Number(m![2]) - 1] as unknown[]).includes(r[m![1]]);
    if ((m = clause.match(/^"(\w+)" (=|<>|<=|>=|<|>) \$(\d+)$/))) {
      const [, col, op, n] = m;
      return (r) => {
        const a = cmpVal(r[col]), b = cmpVal(params[Number(n) - 1]);
        if (a == null || b == null) return op === "<>" ? a !== b : false;
        switch (op) {
          case "=": return a === b;
          case "<>": return a !== b;
          case "<": return a < b;
          case "<=": return a <= b;
          case ">": return a > b;
          default: return a >= b;
        }
      };
    }
    throw new Error(`fake pg: cannot parse WHERE clause: ${clause}`);
  });
  return (r) => tests.every((t) => t(r));
}

function run(text: string, params: unknown[]): Row[] {
  let m: RegExpMatchArray | null;
  if ((m = text.match(/^INSERT INTO "(\w+)" \((.*?)\) VALUES (.*?)(?: RETURNING (.*))?$/s))) {
    const [, t, colList, valuesSql, ret] = m;
    const names = colList.split(",").map(unq);
    const groups = valuesSql.split(/\),\s*\(/).length;
    const out: Row[] = [];
    for (let g = 0; g < groups; g++) {
      const row: Row = {};
      names.forEach((c, i) => { row[c] = params[g * names.length + i]; });
      out.push(pick(insertRow(t, row), ret ? cols(ret) : null));
    }
    return ret ? out : [];
  }
  if ((m = text.match(/^SELECT (.*?) FROM "(\w+)"(?: WHERE (.*?))?(?: ORDER BY "(\w+)" (ASC|DESC))?(?: LIMIT (\d+))?$/s))) {
    const [, sel, t, where, ord, dir, lim] = m;
    let out = rows(t).filter(matcher(where, params));
    if (ord) out = [...out].sort((a, b) => { const x = cmpVal(a[ord]), y = cmpVal(b[ord]); return (x! < y! ? -1 : x! > y! ? 1 : 0) * (dir === "DESC" ? -1 : 1); });
    if (lim) out = out.slice(0, Number(lim));
    return out.map((r) => pick(r, cols(sel)));
  }
  if ((m = text.match(/^UPDATE "(\w+)" SET (.*?)(?: WHERE (.*?))?(?: RETURNING (.*))?$/s))) {
    const [, t, setSql, where, ret] = m;
    const sets = setSql.split(/, (?="\w+" = \$)/).map((p) => { const mm = p.match(/^"(\w+)" = \$(\d+)$/)!; return [mm[1], params[Number(mm[2]) - 1]] as const; });
    const hit = rows(t).filter(matcher(where, params));
    for (const r of hit) for (const [k, v] of sets) r[k] = v;
    return ret ? hit.map((r) => pick(r, cols(ret))) : [];
  }
  if ((m = text.match(/^DELETE FROM "(\w+)"(?: WHERE (.*?))?(?: RETURNING (.*))?$/s))) {
    const [, t, where, ret] = m;
    const keep: Row[] = [], gone: Row[] = [];
    const f = matcher(where, params);
    for (const r of rows(t)) (f(r) ? gone : keep).push(r);
    tables.set(t, keep);
    return ret ? gone.map((r) => pick(r, cols(ret))) : [];
  }
  throw new Error(`fake pg: cannot parse: ${text.slice(0, 120)}`);
}

// A real Postgres (PGlite) can stand in for the fake: tests/pg-real.test.mts sets
// globalThis.__pgBackend, and every statement then runs against it instead.
type Backend = { query(t: string, p?: unknown[]): Promise<{ rows: Row[] }>; exec(t: string): Promise<unknown> };
const backend = () => (globalThis as unknown as { __pgBackend?: Backend }).__pgBackend;

export class Pool {
  constructor() {}
  async query(text: string, params: unknown[] = []) {
    queries.push({ text, params });
    const real = backend();
    if (real) {
      if (text.length > 3000) { await real.exec(text); return { rows: [], rowCount: 0 }; } // the schema migration
      const r = await real.query(text, params);
      return { rows: r.rows, rowCount: r.rows.length };
    }
    if (text.length > 3000) return { rows: [], rowCount: 0 }; // the schema migration
    const out = responder ? responder(text, params) : run(text, params);
    return { rows: out, rowCount: out.length };
  }
  on() {}
}
