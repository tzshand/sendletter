// Liveness + data-layer visibility.
//
// This route exists because the app previously had no way to distinguish "the
// database is down" from "the table is empty" — every failure collapsed into a
// null result somewhere upstream. The counts below are deliberately included:
// after the Vercel-to-Canner port the billing cron stopped running entirely,
// and `unbilled_usage` is the number that reveals how much has accrued since.
//
// Public, but discloses only aggregate counts — no addresses, emails, or keys.

import { NextResponse } from "next/server";
import { getDb, pingDb, DbConnectionError } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const latencyMs = await pingDb();
    const db = getDb();

    const [accounts, apiKeys, unbilled, orders] = await Promise.all([
      db.from("sendletter_accounts").select("id"),
      db.from("sendletter_api_keys").select("id").eq("is_active", true),
      db.from("sendletter_api_usage").select("id, amount_cents").eq("billed", false),
      db.from("sendletter_orders").select("id"),
    ]);

    const unbilledRows: { amount_cents: number }[] = unbilled.data ?? [];
    const unbilledCents = unbilledRows.reduce((sum, r) => sum + (r.amount_cents || 0), 0);

    return NextResponse.json({
      db: "ok",
      latency_ms: latencyMs,
      counts: {
        accounts: accounts.data?.length ?? 0,
        active_api_keys: apiKeys.data?.length ?? 0,
        orders: orders.data?.length ?? 0,
        unbilled_usage: unbilledRows.length,
        unbilled_cents: unbilledCents,
      },
    });
  } catch (e) {
    if (e instanceof DbConnectionError) {
      return NextResponse.json(
        { db: "down", error: e.message },
        { status: 503, headers: { "Retry-After": "30" } },
      );
    }
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ db: "error", error: message }, { status: 500 });
  }
}
