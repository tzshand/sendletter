import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { getLimits, spentToday, recentMailings } from "@/lib/api-limits";

// The customer's daily spend limit: what they will let their API keys spend in a
// day (America/Toronto). They may set it anywhere up to the cap we have approved
// (starts at $500). Above the cap needs a request: POST /api/account/limit-requests.
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const [{ limitCents, capCents }, spent, mailings] = await Promise.all([
    getLimits(session.accountId), spentToday(session.accountId), recentMailings(session.accountId),
  ]);
  return NextResponse.json({ daily_limit_cents: limitCents, daily_cap_cents: capCents, spent_today_cents: spent, mailings_last_30_days: mailings });
}

export async function PATCH(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const cents = Math.round(Number(body?.daily_limit_dollars) * 100);
  const { capCents } = await getLimits(session.accountId);
  if (!Number.isFinite(cents) || cents < 100) {
    return NextResponse.json({ error: "Enter a daily limit of at least $1.00." }, { status: 400 });
  }
  if (cents > capCents) {
    return NextResponse.json(
      { error: `Your approved maximum is $${(capCents / 100).toFixed(2)} a day. Request an increase to go higher.`, code: "above_cap", daily_cap_cents: capCents },
      { status: 400 },
    );
  }
  await getDb().from("sendletter_accounts").update({ daily_spend_limit_cents: cents }).eq("id", session.accountId);
  return NextResponse.json({ daily_limit_cents: cents, daily_cap_cents: capCents });
}
