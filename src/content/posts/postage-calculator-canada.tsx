import { P, Lead, H2, Table, UL, A } from "@/components/blog/Prose";
import { PostageCalculator } from "@/components/blog/PostageCalculator";
import { RATES, formatCents, requiredPostageCents, stampsFor, weightGrams } from "@/lib/pricing";

const $ = (c: number) => formatCents(c);

export default function Post() {
  const rows = [1, 2, 3, 4, 5, 6, 7, 8].map((n) => {
    const g = weightGrams("standard", n);
    const c = requiredPostageCents("standard", g);
    return [String(n), `${g} g`, c === null ? "n/a" : $(c), c === null ? "n/a" : String(stampsFor(c))];
  });
  return (
    <>
      <Lead>
        A standard letter up to 30 grams needs one {$(RATES.stampCents)} Permanent stamp within Canada; 30 to 50 grams needs {$(175)} of postage, which means two stamps. Enter your sheets and envelope below, or the weight if you have weighed it, to see how many stamps it needs.
      </Lead>

      <H2>How many stamps does my letter need?</H2>
      <PostageCalculator />

      <H2>Standard envelope, by number of sheets</H2>
      <P>Estimated weights for a standard business envelope, double-sided sheets counted as one sheet each:</P>
      <Table headers={["Sheets of paper", "Estimated weight", "Postage rate", "Permanent stamps"]} rows={rows} />
      <P>
        The estimate leans heavy: it assumes 90 gsm paper and a sturdy envelope, then rounds up. Plain 75 gsm printer paper weighs less, so a letter right at a limit may fit under the lower rate. A kitchen scale settles it. Postage is also set by size: a large or oversize envelope costs more at any weight. See <A href="/blog/postage-for-a-large-envelope-canada">postage for a large envelope</A>.
      </P>

      <H2>Which rates this uses</H2>
      <UL>
        <li>Canada Post domestic Lettermail, up to 30 g: {$(RATES.postage.standard30)} with a Permanent stamp. Over 30 g up to 50 g: {$(RATES.postage.standard50)}.</li>
        <li>A single stamp costs more ($1.44) than a stamp from a booklet, coil or pane ($1.24), so the calculator shows the booklet price. See <A href="/blog/canada-post-stamp-price">Canada Post stamp prices</A>.</li>
        <li>Letters to the United States and overseas use different rates, and the price of a stamp is expected to change in 2027: <A href="/blog/stamp-price-2027-what-we-know">what is known</A>.</li>
      </UL>

      <H2>If you would rather not buy stamps</H2>
      <P>
        An online letter is printed, weighed, stamped and posted for you, with the stamps counted by the same model as this calculator. <A href="/blog/what-an-online-letter-costs">What an online letter costs</A> shows the breakdown, and <A href="/blog/how-many-stamps-for-a-letter-in-canada">how many stamps for a letter</A> covers what goes wrong when you are short.
      </P>
    </>
  );
}
