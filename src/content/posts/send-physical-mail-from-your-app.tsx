import { P, Lead, H2, UL, Pre, Note, A } from "@/components/blog/Prose";

export default function Post() {
  return (
    <>
      <Lead>
        A print-and-mail API turns an HTTP request into a physical letter: you POST the
        recipient, the sender, and the content, and a printer somewhere produces paper that
        enters the postal system. It is worth reaching for in the specific cases where
        email does not do the job.
      </Lead>

      <H2>When paper beats email</H2>

      <UL>
        <li>
          <strong>The email bounced.</strong> Postal addresses decay far more slowly than
          email addresses. For win-back and collections, mail reaches people your list has
          lost.
        </li>
        <li>
          <strong>The rules require paper.</strong> Plenty of statutory and regulatory
          notices still specify mail, and a spam folder is not a defence.
        </li>
        <li>
          <strong>You need to be read.</strong> A letter competes with four other envelopes;
          an email competes with three hundred messages.
        </li>
      </UL>

      <P>
        What it is <em>not</em> good for is anything time-critical. Domestic delivery now
        runs three to seven business days. If it has to arrive tomorrow, mail is the wrong
        channel regardless of how good the API is.
      </P>

      <H2>What a request looks like</H2>

      <P>
        The shape is consistent across providers: authenticate with a key, describe the two
        addresses, supply the content, get back an id. Ours takes structured fields, raw
        HTML, or a base64 PDF:
      </P>

      <Pre>{`curl -X POST https://sendletter.app/api/v1/send \\
  -H "Authorization: Bearer sl_live_..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "mode": "draft",
    "letter_size": "standard",
    "from": {
      "name": "Acme Inc.",
      "line1": "100 Queen St W",
      "city": "Toronto",
      "province": "ON",
      "postal_code": "M5H 2N2",
      "country": "CA"
    },
    "to": {
      "name": "Jane Doe",
      "line1": "1 Rue Sainte-Catherine",
      "city": "Montreal",
      "province": "QC",
      "postal_code": "H2X 1K4",
      "country": "CA"
    },
    "letter": {
      "salutation": "Dear Ms. Doe,",
      "body": "Your subscription renews on 1 September.",
      "closing": "Sincerely,",
      "signature": "Acme Billing"
    }
  }'`}</Pre>

      <H2>Four things that bite first-timers</H2>

      <P>
        <strong>1. Retries send real paper.</strong> This is the big one. A retried API call
        that fails halfway can produce two physical letters, and you cannot recall the
        second. Generate an idempotency key per logical letter and store the returned id
        before you retry anything.
      </P>

      <P>
        <strong>2. Addresses fail late.</strong> A bad email bounces in seconds. A bad
        postal address fails days later, silently, and often without telling you. Validate
        the postal code format up front — Canadian codes are letter-digit-letter
        digit-letter-digit — and always set a return address so undeliverable mail comes
        back instead of being destroyed.
      </P>

      <P>
        <strong>3. Page count changes the price and the envelope.</strong> A tri-fold
        envelope holds a handful of sheets; past that you are into a flat envelope at a
        higher rate. If your content is user-generated, its length is now a billing input.
        Count pages before you send, not after.
      </P>

      <P>
        <strong>4. Cost per piece is the whole cost model.</strong> There is no free tier in
        physics. Postage and printing put a hard floor under every letter, so unit
        economics matter in a way they never do for email. Check whether a provider adds a
        platform fee or monthly minimum on top of the per-piece price.
      </P>

      <H2>Picking a provider</H2>

      <P>
        Be honest about which lane you are in. If you are running bulk direct-mail campaigns
        with audience segmentation, address verification at scale, and per-campaign
        analytics, the established platforms — Lob and PostGrid among them — are built for
        exactly that and you should use one.
      </P>

      <Note>
        <strong>Where we fit:</strong> sendletter does one letter at a time, delivered to
        Canadian addresses, billed per piece with no monthly fee. Sending addresses can be
        anywhere in the world; delivery is Canada only. If you need bulk campaign tooling or
        delivery outside Canada, use one of the platforms above — it will be less work than
        bending ours into that shape.
      </Note>

      <P>
        For the full request and response schema, error codes, and the other two content
        modes, see the{" "}
        <A href="/docs">API reference</A>.
      </P>
    </>
  );
}
