import { P, Lead, H2, UL, Table, Note, A } from "@/components/blog/Prose";

export default function Post() {
  return (
    <>
      <Lead>
        Usually not with ordinary lettermail. If a law, a court, or a contract requires you
        to prove the recipient <em>received</em> your notice, you need Registered Mail, a
        bailiff, or a process server. Ordinary letter mail — including every online
        print-and-mail service, ours included — produces no proof of delivery.
      </Lead>

      <H2>The distinction that matters</H2>

      <Table
        headers={["", "Ordinary lettermail", "Registered Mail"]}
        rows={[
          ["Proof you sent it", "No", "Yes"],
          ["Signature on delivery", "No", "Yes"],
          ["Tracking", "No", "Yes"],
          ["Can be sent online end-to-end", "Yes", "No — requires a post office"],
        ]}
      />

      <P>
        Registered Mail exists specifically to create evidence. Canada Post describes it as
        the service{" "}
        <A href="https://www.canadapost-postescanada.ca/cpc/en/personal/send-within-canada/registered-mail.page">
          for those who need proof of mailing and proof of delivery
        </A>
        . That signature is the entire point, and it is why it cannot be done from a
        browser: someone has to hand the item over a counter.
      </P>

      <H2>When proof is actually required</H2>

      <P>
        This is jurisdiction-specific and this article is not legal advice, but the common
        cases in Canada are:
      </P>

      <UL>
        <li>
          <strong>Formal notice in Quebec</strong> (<em>mise en demeure</em>). Quebec&apos;s
          own guidance is that a formal notice should be sent by registered mail or served
          by bailiff, and that you may have to prove receipt to a court.{" "}
          <A href="https://www.quebec.ca/en/justice-and-civil-status/small-claims/filing-claim/process-help-applicant/formal-notice">
            Québec.ca sets out the process
          </A>
          .
        </li>
        <li>
          <strong>Residential tenancy notices.</strong> Most provinces prescribe exactly how
          a notice to end tenancy or a rent increase must be served, and email is frequently
          not on the list.
        </li>
        <li>
          <strong>Contractual notice clauses.</strong> Plenty of commercial agreements
          specify the delivery method for notices. If yours says registered mail, ordinary
          mail does not satisfy it, however reasonable that feels.
        </li>
        <li>
          <strong>Anything with a limitation period.</strong> If a deadline starts running
          when the other side receives the letter, you need to be able to show when that
          was.
        </li>
      </UL>

      <Note>
        The rule of thumb: if you can imagine standing in front of a decision-maker being
        asked &ldquo;how do you know they got it?&rdquo;, ordinary mail is the wrong tool.
        Go to a post office and send it Registered, or use a bailiff or process server.
      </Note>

      <H2>What ordinary mail is genuinely fine for</H2>

      <P>
        Most correspondence, including a lot of correspondence that feels formal:
      </P>

      <UL>
        <li>A first approach before anything is in dispute — a polite request to pay an invoice.</li>
        <li>Invoices, statements, and receipts.</li>
        <li>Cover letters and supporting documents accompanying an application.</li>
        <li>Notices where the contract or statute does not prescribe a method.</li>
        <li>Anything where the recipient is not going to contest having received it.</li>
      </UL>

      <H2>A common middle path</H2>

      <P>
        Sending the same letter twice, by two methods, is normal practice and often
        explicitly contemplated: Registered Mail for the evidentiary copy, and an ordinary
        copy by regular mail or email so the recipient actually reads it promptly rather
        than waiting on a delivery attempt notice. The registered copy is for the file; the
        ordinary copy is for the human.
      </P>

      <P>
        And keep a copy of whatever you send, with the date. That costs nothing and is the
        first thing you will be asked for.
      </P>

      <Note>
        <strong>To be plain about our own product:</strong> sendletter posts standard
        Canada Post lettermail. There is no tracking and no signature. If you need proof of
        receipt, we are the wrong choice, and we would rather say so here than take the
        order.
      </Note>
    </>
  );
}
