import { P, Lead, H2, UL, Table, Note, A } from "@/components/blog/Prose";

export default function Post() {
  return (
    <>
      <Lead>
        A single domestic stamp costs <strong>$1.44</strong> in 2026, or $1.24 each if you
        buy a booklet or coil. That covers a standard letter up to 30 grams going anywhere
        in Canada. Sending to the United States costs $1.75.
      </Lead>

      <H2>Canada Post rates in 2026</H2>

      <Table
        headers={["What you're sending", "Rate"]}
        rows={[
          ["Domestic letter, up to 30 g — single stamp", "$1.44"],
          ["Domestic letter, up to 30 g — booklet or coil", "$1.24"],
          ["To the United States, up to 30 g", "$1.75"],
          ["To the United States, 30–50 g (metered)", "$2.61"],
        ]}
      />

      <P>
        These went up in March 2026, when the domestic single-stamp rate moved from $1.15
        to $1.44 — a 25% increase in one step. Current rates are published on{" "}
        <A href="https://www.canadapost-postescanada.ca/cpc/en/personal/stamp-prices.page">
          Canada Post&apos;s stamp prices page
        </A>
        .
      </P>

      <H2>The stamp is not the cost</H2>

      <P>
        The stamp is the part with a price on it. The actual cost of putting one letter in
        the mail yourself looks more like this:
      </P>

      <Table
        headers={["Item", "Roughly"]}
        rows={[
          ["Stamp (booklet rate)", "$1.24"],
          ["Envelope", "$0.10–$0.20"],
          ["Paper and toner, one page", "$0.15–$0.30"],
          [<strong key="t">Materials total</strong>, <strong key="v">~$1.50–$1.75</strong>],
          ["Your trip to a mailbox", "Free, if you were passing one"],
        ]}
      />

      <P>
        So the honest comparison is not $1.44 against $3.79. It is about $1.60 in
        consumables — assuming you already own a working printer and have stamps in a
        drawer — against a service price that includes all of it.
      </P>

      <Note>
        If you have the printer, the envelopes, and the stamps, mailing it yourself is
        cheaper. That is true and no amount of marketing changes it. The calculation flips
        when you are missing one of the three, when the trip is not free, or when you are
        sending from a different country than the recipient.
      </Note>

      <H2>What actually drives the price</H2>

      <UL>
        <li>
          <strong>Weight.</strong> The 30 g threshold is the big one. That is roughly four
          or five sheets of standard paper plus an envelope, so a long letter can quietly
          cross into the next tier.
        </li>
        <li>
          <strong>Size and thickness.</strong> Standard lettermail rates assume a standard
          envelope. Anything rigid, lumpy, or oversized is priced differently, which is why
          a birthday card with something in it can cost more than the card alone.
        </li>
        <li>
          <strong>Destination.</strong> Domestic, US, and international are three separate
          rate tables.
        </li>
      </UL>

      <H2>Where online services land</H2>

      <P>
        Canadian print-and-mail services currently run from about $3.79 to $6 per letter
        for domestic delivery, with printing, envelope, postage, and tax included. That is
        a premium of roughly $2 to $4 over doing it yourself — the price of the printing
        and the errand.
      </P>

      <P>
        For a business sending a handful of letters a month, that premium is almost always
        smaller than the staff time it replaces. For one birthday card a year, it is not.
        Both are fine answers.
      </P>

      <P>
        Sending from outside Canada changes the maths substantially, because international
        postage is priced well above the domestic rate —{" "}
        <A href="/blog/mail-a-letter-to-canada-from-abroad">that case is covered here</A>.
      </P>
    </>
  );
}
