import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { csvResponse, dollars, toCsv } from "@/lib/csv";
import { letterStatus } from "@/lib/letters";

// CSV of the account's API orders. Optional ?from=YYYY-MM-DD&to=YYYY-MM-DD (created date, UTC) and ?mode=test.
export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const u = new URL(req.url);
  const livemode = u.searchParams.get("mode") !== "test";
  let q = getDb().from("sendletter_orders").select("*").eq("api_account_id", session.accountId).eq("livemode", livemode);
  const from = u.searchParams.get("from"), to = u.searchParams.get("to");
  if (from && /^\d{4}-\d\d-\d\d$/.test(from)) q = q.gte("created_at", `${from}T00:00:00.000Z`);
  if (to && /^\d{4}-\d\d-\d\d$/.test(to)) q = q.lt("created_at", new Date(Date.parse(`${to}T00:00:00.000Z`) + 86_400_000).toISOString());
  const { data } = await q.order("created_at", { ascending: false }).limit(50_000);

  const now = new Date();
  const rows = (data ?? []).map((o: Record<string, unknown>) => [
    o.id, o.created_at, letterStatus(o, now), o.reference, o.to_name, o.to_line1, o.to_line2, o.to_city, o.to_province, o.to_postal,
    o.page_count, o.letter_size, o.colour ? "colour" : "black and white", o.duplex ? "double" : "single", o.mailings, o.stamps,
    dollars(o.amount_cents as number), o.printed_at, o.mailed_at, o.cancelled_at,
  ]);
  const csv = toCsv(
    ["id", "created_at", "status", "reference", "to_name", "to_line1", "to_line2", "to_city", "to_province", "to_postal",
     "pages", "size", "colour", "sides", "mailings", "stamps", "amount_cad", "printed_at", "mailed_at", "cancelled_at"],
    rows,
  );
  return csvResponse(`sendletter-orders-${new Date().toISOString().slice(0, 10)}.csv`, csv);
}
