import { NextResponse } from "next/server";
import { withApi, apiError, readJsonObject } from "@/lib/api-route";
import { createEndpoint, listEndpoints, WebhookUrlError, WEBHOOK_EVENTS } from "@/lib/webhooks";

// POST /api/v1/webhooks  { "url": "https://...", "events": ["letter.mailed"], "description": "..." }
// The signing secret is returned once, in this response only. A test key creates a test
// endpoint (it receives events for test letters); a live key a live one.
export async function POST(req: Request) {
  return withApi(req, async ({ accountId, livemode }) => {
    const parsed = await readJsonObject(req);
    if (!parsed.ok) return parsed.res;
    const body = parsed.body;
    if (typeof body.url !== "string") return apiError(400, "url (string) is required", "invalid_url");
    try {
      const { endpoint, secret } = await createEndpoint(accountId, livemode, {
        url: body.url, events: body.events, description: typeof body.description === "string" ? body.description : undefined,
      });
      return NextResponse.json({ ...endpoint, secret, valid_events: WEBHOOK_EVENTS }, { status: 201 });
    } catch (e) {
      if (e instanceof WebhookUrlError) return apiError(400, e.message, "invalid_webhook");
      throw e;
    }
  });
}

export async function GET(req: Request) {
  return withApi(req, async ({ accountId }) => NextResponse.json({ object: "list", data: await listEndpoints(accountId) }));
}
