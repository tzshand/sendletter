import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { getLimits, recentMailings, spentToday } from "@/lib/api-limits";
import { listEndpoints, WEBHOOK_EVENTS } from "@/lib/webhooks";
import { volumeBaseCents, VOLUME, API_FROM_ALL_IN_CENTS } from "@/lib/volume";
import { DevelopersClient } from "./DevelopersClient";

export const metadata = { title: "Developers | sendletter", robots: { index: false } };

export default async function DevelopersPage() {
  const session = (await getSession())!;
  const db = getDb();
  const id = session.accountId;

  const [{ data: acct }, { data: keys }, limits, spent, mailings, endpoints] = await Promise.all([
    db.from("sendletter_accounts").select("has_payment_method").eq("id", id).single(),
    db.from("sendletter_api_keys").select("key_prefix, created_at, livemode, last_used_at").eq("account_id", id).eq("is_active", true),
    getLimits(id), spentToday(id), recentMailings(id), listEndpoints(id),
  ]);

  const { data: dels } = await db
    .from("sendletter_webhook_deliveries")
    .select("id, endpoint_id, event_id, status, attempts, last_status_code, last_error, created_at")
    .in("endpoint_id", endpoints.length ? endpoints.map((e) => e.id) : ["00000000-0000-0000-0000-000000000000"])
    .order("created_at", { ascending: false })
    .limit(15);
  const evIds = [...new Set((dels ?? []).map((d: { event_id: string }) => d.event_id))];
  const { data: evs } = evIds.length ? await db.from("sendletter_webhook_events").select("id, type").in("id", evIds) : { data: [] };
  const evType = new Map((evs ?? []).map((e: { id: string; type: string }) => [e.id, e.type]));
  const epUrl = new Map(endpoints.map((e) => [e.id, e.url]));

  const kk = (keys ?? []) as { key_prefix: string; created_at: string; livemode: boolean; last_used_at: string | null }[];
  return (
    <DevelopersClient
      hasCard={Boolean(acct?.has_payment_method)}
      liveKey={kk.find((k) => k.livemode) ?? null}
      testKey={kk.find((k) => !k.livemode) ?? null}
      limits={{ limitCents: limits.limitCents, capCents: limits.capCents, spentCents: spent }}
      volume={{ mailings, currentFeeCents: volumeBaseCents(mailings + 1), listFeeCents: VOLUME.listCents, floorFeeCents: VOLUME.floorCents, floorAt: VOLUME.fullDiscountAt, asLowAsCents: API_FROM_ALL_IN_CENTS }}
      endpoints={endpoints}
      validEvents={[...WEBHOOK_EVENTS]}
      deliveries={(dels ?? []).map((d: Record<string, unknown>) => ({
        id: String(d.id), type: evType.get(String(d.event_id)) ?? "", url: epUrl.get(String(d.endpoint_id)) ?? "",
        status: String(d.status), attempts: Number(d.attempts), code: (d.last_status_code as number | null) ?? null,
        error: (d.last_error as string | null) ?? null, at: String(d.created_at),
      }))}
    />
  );
}
