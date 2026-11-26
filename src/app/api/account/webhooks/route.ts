import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createEndpoint, deleteEndpoint, listEndpoints, sendTestEvent, WebhookUrlError, WEBHOOK_EVENTS } from "@/lib/webhooks";

// Webhook endpoints from the account pages (session auth). The same operations
// exist for integrators at /api/v1/webhooks (key auth).
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ data: await listEndpoints(session.accountId), valid_events: WEBHOOK_EVENTS });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  if (body?.test_id) {
    const r = await sendTestEvent(session.accountId, String(body.test_id));
    return r ? NextResponse.json(r) : NextResponse.json({ error: "No such endpoint" }, { status: 404 });
  }
  try {
    const { endpoint, secret } = await createEndpoint(session.accountId, body?.mode !== "test", {
      url: String(body?.url ?? ""), events: body?.events, description: typeof body?.description === "string" ? body.description : undefined,
    });
    return NextResponse.json({ ...endpoint, secret }, { status: 201 });
  } catch (e) {
    if (e instanceof WebhookUrlError) return NextResponse.json({ error: e.message }, { status: 400 });
    throw e;
  }
}

export async function DELETE(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const id = new URL(req.url).searchParams.get("id") ?? "";
  return (await deleteEndpoint(session.accountId, id))
    ? NextResponse.json({ deleted: true })
    : NextResponse.json({ error: "No such endpoint" }, { status: 404 });
}
