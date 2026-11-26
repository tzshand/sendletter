import { NextResponse } from "next/server";
import { withApi, apiError, isUuid } from "@/lib/api-route";
import { deleteEndpoint } from "@/lib/webhooks";

type Ctx = { params: Promise<{ id: string }> };

export async function DELETE(req: Request, { params }: Ctx) {
  const { id } = await params;
  return withApi(req, async ({ accountId }) => {
    if (!isUuid(id) || !(await deleteEndpoint(accountId, id))) return apiError(404, "No such webhook endpoint.", "webhook_not_found");
    return NextResponse.json({ id, object: "webhook_endpoint", deleted: true });
  });
}
