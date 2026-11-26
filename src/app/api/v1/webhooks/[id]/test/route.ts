import { NextResponse } from "next/server";
import { withApi, apiError, isUuid } from "@/lib/api-route";
import { sendTestEvent } from "@/lib/webhooks";

type Ctx = { params: Promise<{ id: string }> };

// POST /api/v1/webhooks/{id}/test: send a signed webhook.test event now and report what your server answered.
export async function POST(req: Request, { params }: Ctx) {
  const { id } = await params;
  return withApi(req, async ({ accountId }) => {
    const r = isUuid(id) ? await sendTestEvent(accountId, id) : null;
    if (!r) return apiError(404, "No such webhook endpoint.", "webhook_not_found");
    return NextResponse.json(r);
  });
}
