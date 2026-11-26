import { P, Lead, H2, UL, Table, Note, A } from "@/components/blog/Prose";
import { VolumeCalculator } from "@/components/blog/VolumeCalculator";
import { quote, formatCents } from "@/lib/pricing";
import { VOLUME, volumeTable, estimateVolume, API_FROM_ALL_IN_CENTS } from "@/lib/volume";

const $ = (c: number) => formatCents(c);
const one = (prior: number) => quote({ pages: 1, size: "standard", colour: false, duplex: true, channel: "api", priorMailings: prior }).totalCents;

export default function Post() {
  const volumes = [10, 50, 100, 500, 1000].map((n) => ({ n, e: estimateVolume({ lettersPerMonth: n, pages: 1, size: "standard", colour: false, duplex: true }) }));

  return (
    <>
      <Lead>
        By API, a letter costs as low as <strong>{$(API_FROM_ALL_IN_CENTS)}</strong> all in: one black-and-white page in a #10 envelope,
        with its Canada Post stamp, from your {VOLUME.fullDiscountAt}th mailing in any {VOLUME.windowDays} days. The mailing fee falls automatically
        from {$(VOLUME.listCents)} on your first letter to {$(VOLUME.floorCents)}; postage stays at cost. There is no subscription and no minimum.
      </Lead>

      <H2>What you pay for</H2>
      <P>
        Every API letter is the sum of four lines: a mailing fee, an envelope, printing, and postage. Only the first moves with volume.
      </P>
      <Table
        headers={["Line", "Price", "Changes with volume?"]}
        rows={[
          ["Mailing fee", `${$(VOLUME.listCents)} falling to ${$(VOLUME.floorCents)}`, "Yes, automatically"],
          ["Envelope (#10 window)", "$0.10", "No"],
          ["Printing, black and white", "$0.15 a page", "No"],
          ["Canada Post postage", "$1.24 a stamp, at cost", "No"],
        ]}
      />
      <P>
        Postage is a pass-through: we charge what the stamps cost and no more, so there is nothing to discount. The envelope and printing are priced to cover
        their own costs. The mailing fee is the part that pays for running the service, so that is the part that shrinks as you
        send more.
      </P>

      <H2>The discount curve</H2>
      <P>
        The fee follows how many mailings you have sent in the last {VOLUME.windowDays} days (including this one). It falls smoothly, then stops at your {VOLUME.fullDiscountAt}th:
      </P>
      <Table
        headers={["Your mailing number (in 30 days)", "Mailing fee", "Discount", "1-page letter, all in"]}
        rows={volumeTable().map((t) => [String(t.mailing_number), $(t.base_fee_cents), `${t.discount_pct}%`, $(one(t.mailing_number - 1))])}
      />
      <UL>
        <li><strong>It is a rolling window, not a calendar month.</strong> A steady sender stays at the lowest fee instead of climbing back to full price on the 1st.</li>
        <li><strong>It is automatic.</strong> Nothing to sign up for or negotiate. Each response shows how the fee was set, in <code>price.volume</code>.</li>
        <li><strong>Cancelled letters do not count</strong> toward your volume, and are not billed.</li>
        <li><strong>A long letter split across envelopes</strong> counts each envelope as a mailing.</li>
      </UL>

      <H2>Calculate your price</H2>
      <VolumeCalculator />

      <H2>What it comes to at different volumes</H2>
      <P>One-page black-and-white letters in a #10 envelope, at a steady volume:</P>
      <Table
        headers={["Letters a month", "Per letter", "Per month", "First 30 days, average"]}
        rows={volumes.map(({ n, e }) => [n.toLocaleString("en-CA"), $(e.steady_state_letter_cents), $(e.steady_state_month_cents), $(e.first_30_days_average_cents)])}
      />
      <P>
        Past {VOLUME.fullDiscountAt} letters in 30 days the price per letter stops falling: the {$(VOLUME.floorCents)} fee is the floor, and the {$(API_FROM_ALL_IN_CENTS)} all-in price is
        what a one-page letter costs from there. More pages, colour, or a flat envelope add their own lines.
      </P>

      <H2>How you are billed</H2>
      <UL>
        <li><strong>Your first live letter is charged when you send it.</strong> If the card is declined, nothing is sent and you get a clear error.</li>
        <li><strong>After that, one invoice a month</strong> on the 1st, for the month just ended, as a single charge. Every invoice lists its letters and can be printed or exported as CSV from your account.</li>
        <li><strong>You set a daily spending limit</strong> (it starts at $500 a day), so a bug in your code cannot run up a bill. You can ask for a higher maximum.</li>
      </UL>

      <Note>
        Postage is the larger part of any letter, and it is the same for everyone: Canada Post charges a single stamp for a letter up to 30 g. The volume discount cannot change that.
        It takes the all-in price of a one-page letter from {$(one(0))} on your first letter to {$(API_FROM_ALL_IN_CENTS)} at volume.
      </Note>

      <H2>Start with a test key</H2>
      <P>
        A test key prices and validates letters (including your discount) without printing, mailing or billing anything, and needs no card. The{" "}
        <A href="/docs#volume">API reference</A> has the request, and <A href="/api/v1/pricing">/api/v1/pricing</A> returns this table as JSON, for your own estimates.
        Questions: support@sendletter.app.
      </P>
    </>
  );
}
