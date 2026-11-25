import { P, Lead, H2, UL, Table, Note, A } from "@/components/blog/Prose";

export default function Post() {
  return (
    <>
      <Lead>
        There are three ways to get a physical letter into the Canadian mail without
        visiting a post office: buy stamps and use a street mailbox, use an online
        print-and-mail service, or call an API if software is doing the sending. Which
        one is right depends almost entirely on whether you own a printer and how often
        you send.
      </Lead>

      <H2>The three options, compared</H2>

      <Table
        headers={["Method", "Cost per letter", "You need", "Best for"]}
        rows={[
          [
            "Stamp and mailbox",
            "$1.44",
            "Printer, envelope, stamps, a mailbox on your route",
            "One-offs, when you already have supplies",
          ],
          [
            "Online service",
            "$3.49–$6",
            "A browser and the recipient's address",
            "No printer, or you're not going out",
          ],
          [
            "Print-and-mail API",
            "Varies by volume",
            "A developer and an integration",
            "Software that sends mail on a schedule",
          ],
        ]}
      />

      <H2>What you need before you start</H2>

      <P>
        All three routes need the same three things, and missing any one of them is the
        usual reason a letter comes back:
      </P>

      <UL>
        <li>
          <strong>A complete recipient address</strong>, including the postal code. Canada
          Post sorts on the postal code first — an address without one is handled by
          exception, slowly.
        </li>
        <li>
          <strong>A return address.</strong> Without one, an undeliverable letter is simply
          destroyed rather than returned to you.
        </li>
        <li>
          <strong>The document itself</strong>, either typed or as a PDF or Word file.
        </li>
      </UL>

      <H2>What an online service actually does</H2>

      <P>
        The useful ones do the whole physical chain: print your document, fold it, put it
        in an envelope, apply postage, and hand it to Canada Post — usually within one
        business day. You are paying roughly $2 over the cost of a stamp for the printing,
        the envelope, and not having to leave.
      </P>

      <P>
        Prices in Canada currently run from $3.49 for a standard tri-fold letter up to
        about $6 at the higher end. Anything advertised well below the price of a stamp is
        not mailing a physical letter.
      </P>

      <H2>How long it takes in 2026</H2>

      <P>
        Budget <strong>three to seven business days</strong> for domestic lettermail, and
        longer outside major centres. That window got wider this year: Canada Post is{" "}
        <A href="https://www.cbc.ca/news/business/canada-post-community-mailboxes-questions-9.7148787">
          converting around four million door-to-door addresses to community mailboxes
        </A>{" "}
        over five years and has reduced delivery frequency, moving average letter mail
        delivery from three or four days to three to seven.
      </P>

      <P>
        No ordinary lettermail service — ours included — offers tracking. If you need to
        know the letter arrived, that is a different product; see{" "}
        <A href="/blog/can-you-mail-a-legal-notice-online">
          whether you can mail a legal notice online
        </A>
        .
      </P>

      <Note>
        If you already own stamps and envelopes, own a printer, and walk past a mailbox
        anyway, mailing it yourself is cheaper and always will be. An online service is
        worth paying for when any one of those three is missing — which, for most people
        most of the time, is the printer.
      </Note>

      <H2>When to reach for the API instead</H2>

      <P>
        If the thing triggering the letter is software rather than a person — a renewal
        notice, a payment failure after email bounced, a statutory disclosure — then a
        print-and-mail API is the right shape. You send one HTTP request per letter and
        never think about envelopes. That is a{" "}
        <A href="/blog/send-physical-mail-from-your-app">separate guide</A>.
      </P>
    </>
  );
}
