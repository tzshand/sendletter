import { P, Lead, H2, Table, UL, A } from "@/components/blog/Prose";
import { PostageCalculator } from "@/components/blog/PostageCalculator";
import { RATES, formatCents, requiredPostageCents, stampsFor, weightGrams } from "@/lib/pricing";
import { getPostBySlug, postPath } from "@/lib/blog";

// "~" in the strings below is a no-break space (OQLF: before ":" and between a number and its unit).
const nb = (s: string) => s.replace(/~/g, " ");
const $ = (c: number) => formatCents(c, "fr");
/** Link to the French version of a guide when it exists, else the English page. */
const L = (slug: string) => {
  const p = getPostBySlug("en", slug);
  return p ? postPath(p, "fr") : `/blog/${slug}`;
};

export default function Post() {
  const rows = [1, 2, 3, 4, 5, 6, 7, 8].map((n) => {
    const g = weightGrams("standard", n);
    const c = requiredPostageCents("standard", g);
    return [String(n), nb(`${g}~g`), c === null ? "s.~o." : $(c), c === null ? "s.~o." : String(stampsFor(c))].map(nb);
  });
  return (
    <>
      <Lead>
        {nb(`Une lettre standard de 30~g ou moins exige un timbre Permanent de ${$(RATES.stampCents)} au Canada; de 30 à 50~g, il faut ${$(175)} d’affranchissement, soit deux timbres. Indiquez ci-dessous le nombre de feuilles et l’enveloppe, ou le poids si vous avez pesé la lettre, pour connaître le nombre de timbres nécessaires.`)}
      </Lead>

      <H2>Combien de timbres faut-il pour ma lettre?</H2>
      <PostageCalculator locale="fr" />

      <H2>Enveloppe standard, selon le nombre de feuilles</H2>
      <P>Poids estimés pour une enveloppe commerciale standard; une feuille recto verso compte pour une feuille.</P>
      <Table headers={["Feuilles de papier", "Poids estimé", "Tarif d’affranchissement", "Timbres Permanents"]} rows={rows} />
      <P>
        {nb("L’estimation penche vers le haut : elle suppose du papier de 90~g/m² et une enveloppe robuste, puis elle arrondit à la hausse. Le tableau de Postes Canada indique jusqu’à 5 feuilles de papier pour le tarif de 30~g; ce calculateur est donc volontairement plus prudent. Le papier d’imprimante ordinaire de 75~g/m² est plus léger : une lettre à la limite pourrait donc passer au tarif inférieur. Une balance de cuisine règle la question. L’affranchissement dépend aussi du format : une grande enveloppe ou une enveloppe surdimensionnée coûte plus cher, quel que soit le poids. Voir ")}
        <A href={L("postage-for-a-large-envelope-canada")}>l’affranchissement d’une grande enveloppe</A>.
      </P>

      <H2>Les tarifs utilisés</H2>
      <UL>
        <li>{nb(`Poste-lettres de Postes Canada au pays, jusqu’à 30~g : ${$(RATES.postage.standard30)} avec un timbre Permanent. De plus de 30~g à 50~g : ${$(RATES.postage.standard50)}.`)}</li>
        <li>
          {nb("Un timbre à l’unité coûte plus cher (1,44~$) qu’un timbre en carnet, en rouleau ou en feuillet (1,24~$); le calculateur affiche donc le prix du carnet. Voir ")}
          <A href={L("canada-post-stamp-price")}>le prix des timbres de Postes Canada</A>.
        </li>
        <li>
          {nb("Les lettres à destination des États-Unis et de l’étranger suivent d’autres tarifs, et le prix d’un timbre devrait changer en 2027~: ")}
          <A href={L("stamp-price-2027-what-we-know")}>ce que l’on sait</A>.
        </li>
      </UL>

      <H2>Si vous préférez ne pas acheter de timbres</H2>
      <P>
        Une lettre commandée en ligne est imprimée, pesée, affranchie et postée pour vous, et les timbres sont comptés selon le même modèle que ce calculateur. <A href={L("what-an-online-letter-costs")}>Ce que coûte une lettre en ligne</A> en présente le détail, et <A href={L("how-many-stamps-for-a-letter-in-canada")}>combien de timbres pour une lettre</A> explique ce qui arrive quand l’affranchissement est insuffisant.
      </P>
    </>
  );
}
