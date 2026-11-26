// Test letters are never printed, so nothing marks them printed or mailed. Their
// status is simulated from their age (30 s, then 2 min; see lib/letters.ts) and
// this module makes the matching webhooks fire, so an integrator can exercise
// their letter.printed and letter.mailed handlers with a test key.
//
// It runs lazily when a test letter is read (GET, list) and on every webhook-retry
// tick (every few minutes), so an event arrives when the letter is next looked at
// or within a few minutes, whichever is first. Each step fires exactly once: the
// timestamp is written before the event is sent, and only a row that still lacks
// it is advanced.

import { getDb } from "./db";
import { emitEvent } from "./webhooks";
import { letterStatus, TEST_MAILED_AFTER_MS, TEST_PRINTED_AFTER_MS, type OrderRow } from "./letters";

export async function advanceTestLetter(row: OrderRow, now = new Date()): Promise<OrderRow> {
  if (row.livemode !== false || !row.api_account_id) return row;
  const status = letterStatus(row, now);
  if (status === "queued" || status === "cancelled") return row;

  const created = Date.parse(row.created_at);
  const db = getDb();
  let current = row;

  if (!current.printed_at) {
    const { data } = await db
      .from("sendletter_orders")
      .update({ status: "printed", printed_at: new Date(created + TEST_PRINTED_AFTER_MS).toISOString() })
      .eq("id", row.id)
      .isNull("printed_at")
      .select("*");
    if (data?.[0]) {
      current = data[0];
      await emitEvent(row.api_account_id, false, "letter.printed", current, now);
    } else {
      current = { ...current, printed_at: new Date(created + TEST_PRINTED_AFTER_MS).toISOString() };
    }
  }
  if (status === "mailed" && !current.mailed_at) {
    const { data } = await db
      .from("sendletter_orders")
      .update({ status: "mailed", mailed_at: new Date(created + TEST_MAILED_AFTER_MS).toISOString() })
      .eq("id", row.id)
      .isNull("mailed_at")
      .select("*");
    if (data?.[0]) {
      current = data[0];
      await emitEvent(row.api_account_id, false, "letter.mailed", current, now);
    }
  }
  return current;
}

/** Advance every test letter that has aged past a step. Run by the webhook-retry job. */
export async function advanceDueTestLetters(now = new Date(), limit = 200): Promise<number> {
  const { data } = await getDb()
    .from("sendletter_orders")
    .select("*")
    .eq("livemode", false)
    .isNull("cancelled_at")
    .isNull("mailed_at")
    .lt("created_at", new Date(now.getTime() - TEST_PRINTED_AFTER_MS).toISOString())
    .limit(limit);
  let n = 0;
  for (const row of data ?? []) {
    const after = await advanceTestLetter(row, now);
    if (after !== row) n++;
  }
  return n;
}
