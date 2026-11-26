import { NextResponse } from "next/server";
import { Resend } from "resend";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { getLimits, MAX_DAILY_LIMIT_CENTS } from "@/lib/api-limits";
import { escapeHtml, stripControl } from "@/lib/sanitize";

const INTERNAL_EMAIL = "colinh.shand@gmail.com";

// A request to raise the daily spend cap. It is stored and emailed to us; we raise
// the cap by hand (sendletter_accounts.daily_spend_cap_cents) and reply.
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));

  const cents = Math.round(Number(body?.requested_daily_dollars) * 100);
  const volume = stripControl(String(body?.expected_volume ?? "")).trim().slice(0, 300);
  const reason = stripControl(String(body?.reason ?? "")).trim().slice(0, 2000);
  const { capCents } = await getLimits(session.accountId);
  if (!Number.isFinite(cents) || cents <= capCents || cents > MAX_DAILY_LIMIT_CENTS) {
    return NextResponse.json({ error: `Ask for more than your current maximum of $${(capCents / 100).toFixed(2)} a day.` }, { status: 400 });
  }
  if (reason.length < 10) {
    return NextResponse.json({ error: "Tell us briefly what you are sending, so we can approve it quickly." }, { status: 400 });
  }

  const db = getDb();
  const { data: acct } = await db.from("sendletter_accounts").select("email").eq("id", session.accountId).single();
  const { error } = await db.from("sendletter_limit_requests").insert({
    account_id: session.accountId, requested_daily_cents: cents, expected_volume: volume || null, reason,
  });
  if (error) return NextResponse.json({ error: "Could not save your request. Please email support@sendletter.app." }, { status: 500 });

  try {
    if (process.env.RESEND_API_KEY) {
      await new Resend(process.env.RESEND_API_KEY).emails.send({
        from: "sendletter <noreply@sendletter.app>",
        to: INTERNAL_EMAIL,
        replyTo: acct?.email || undefined,
        subject: `Limit increase request: $${(cents / 100).toFixed(2)}/day from ${acct?.email ?? session.accountId}`,
        html: `<h2>Daily limit increase request</h2>
<p><strong>Account:</strong> ${escapeHtml(acct?.email ?? "")} (${escapeHtml(session.accountId)})</p>
<p><strong>Current cap:</strong> $${(capCents / 100).toFixed(2)}/day<br/><strong>Requested:</strong> $${(cents / 100).toFixed(2)}/day</p>
<p><strong>Expected volume:</strong> ${escapeHtml(volume || "(not given)")}</p>
<p><strong>What they send:</strong><br/>${escapeHtml(reason).replace(/\n/g, "<br/>")}</p>
<p style="color:#888;font-size:12px;">To approve: update sendletter_accounts.daily_spend_cap_cents for this account, then reply to this email.</p>`,
      });
    }
  } catch (e) {
    console.error("limit request email failed (request is saved):", e);
  }
  return NextResponse.json({ ok: true });
}
