import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { serializeLetter } from "@/lib/letters";
import { withApi, apiError, isUuid } from "@/lib/api-route";
import { advanceTestLetter } from "@/lib/test-letters";

// POST /api/v1/letters is the same endpoint as POST /api/v1/send (kept so
// existing integrations keep working); this is the REST-style name.
export { POST } from "../send/route";

// GET /api/v1/letters?limit=20&starting_after=<letter id>
// A test key lists test letters; a live key lists live letters. Newest first.
export async function GET(req: Request) {
  return withApi(req, async ({ accountId, livemode }) => {
    const url = new URL(req.url);
    const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit") ?? 20) || 20));
    const after = url.searchParams.get("starting_after");
    const db = getDb();

    let q = db.from("sendletter_orders").select("*").eq("api_account_id", accountId).eq("livemode", livemode);
    let cursorId: string | null = null;
    if (after) {
      if (!isUuid(after)) return apiError(400, "starting_after must be a letter id", "invalid_cursor");
      const { data: cursor } = await db.from("sendletter_orders").select("created_at").eq("id", after).eq("api_account_id", accountId).single();
      if (!cursor) return apiError(400, "starting_after does not match one of your letters", "invalid_cursor");
      // lte, then drop everything up to and including the cursor: letters created in the same instant as
      // the cursor (a batch can do that) would be skipped by a strict lt.
      q = q.lte("created_at", cursor.created_at);
      cursorId = after;
    }
    const { data } = await q.order("created_at", { ascending: false }).limit(limit + 1 + (cursorId ? 200 : 0));
    let rows = data ?? [];
    if (cursorId) {
      const at = rows.findIndex((r: { id: string }) => r.id === cursorId);
      rows = at >= 0 ? rows.slice(at + 1) : rows;
    }
    rows = rows.slice(0, limit + 1);
    const now = new Date();
    const page = rows.slice(0, limit);
    const shown = livemode ? page : await Promise.all(page.map((r: Record<string, unknown>) => advanceTestLetter(r, now)));
    return NextResponse.json({
      object: "list",
      data: shown.map((r: Record<string, unknown>) => serializeLetter(r, { now })),
      has_more: rows.length > limit,
    });
  });
}
