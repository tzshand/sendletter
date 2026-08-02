import { P, Lead, H2, UL, Table, Pre, Note, A } from "@/components/blog/Prose";

export default function Post() {
  return (
    <>
      <Lead>
        You have two options: post it internationally from where you are, or use a service
        that prints it inside Canada and mails it at the domestic rate. Either way, the
        thing most likely to go wrong is the address format — Canadian addresses have
        conventions that differ from US and European ones, and Canada Post sorts on the
        part people most often get wrong.
      </Lead>

      <H2>The Canadian address format</H2>

      <Pre>{`JANE DOE
123 MAIN ST NW
MONTREAL QC  H3Z 2Y7
CANADA`}</Pre>

      <P>The rules that actually matter:</P>

      <UL>
        <li>
          <strong>Postal code last, on the city line.</strong> Format is
          letter-digit-letter, space, digit-letter-digit — <code>H3Z 2Y7</code>. Canada Post
          sorts on this before anything else. Two spaces before it is the official
          convention; one is fine in practice, but a missing or wrong code is not.
        </li>
        <li>
          <strong>Province as a two-letter code.</strong> QC, ON, BC, AB, NS. Write out
          &ldquo;Quebec&rdquo; and you are relying on a human to intervene.
        </li>
        <li>
          <strong>Country on its own final line</strong>, in capitals, only when mailing
          from outside Canada.
        </li>
        <li>
          <strong>Apartment or unit goes first</strong> on the street line — write
          <code> 4-123 Main St</code>, not <code>123 Main St Apt 4</code>.
        </li>
        <li>
          <strong>No punctuation</strong> and no commas between city and province. Canada
          Post&apos;s preferred style is uppercase throughout, though mixed case is accepted.
        </li>
      </UL>

      <Note>
        The single most common failure is a postal code that belongs to a different city —
        usually copied from an old record or guessed. If you only verify one field, verify
        that one. It is the field the machine actually reads.
      </Note>

      <H2>What international postage costs</H2>

      <Table
        headers={["Route", "Rate", "Notes"]}
        rows={[
          ["Within Canada, up to 30 g", "$1.44 CAD", "Domestic stamp rate"],
          ["Canada to the US, up to 30 g", "$1.75 CAD", "Standard lettermail"],
          ["US or overseas into Canada", "Varies by origin", "Set by your own postal operator"],
        ]}
      />

      <P>
        Inbound international mail is priced by the sending country&apos;s postal service,
        not Canada Post, so there is no single figure. It is generally several times the
        Canadian domestic rate, and transit adds a week or more on top of the three to seven
        business days a letter takes once it is inside the Canadian system.
      </P>

      <H2>Printing inside Canada instead</H2>

      <P>
        If the letter is a document rather than a physical object — a signed form, a notice,
        a cover letter — you do not need to physically move paper across a border at all.
        Sending the file to a service that prints in Canada means it enters the mail stream
        as domestic mail: cheaper postage, and no international transit leg.
      </P>

      <P>
        This is the case where an online service is unambiguously better value rather than
        merely convenient. The comparison is not &ldquo;$3.79 versus a $1.44 stamp&rdquo;;
        it is &ldquo;$3.79 versus international postage plus a week&rdquo;. For a fuller
        breakdown of the domestic numbers, see{" "}
        <A href="/blog/what-it-costs-to-mail-a-letter-in-canada">
          what it actually costs to mail a letter in Canada
        </A>
        .
      </P>

      <H2>A note on customs</H2>

      <P>
        Documents — plain paper correspondence — do not require a customs declaration.
        Anything with an object in it does, even a small one, and an undeclared item is the
        second most common reason inbound mail stalls. If you are sending a card with
        something tucked inside, that is a parcel wearing an envelope, and it needs to be
        declared as such.
      </P>
    </>
  );
}
