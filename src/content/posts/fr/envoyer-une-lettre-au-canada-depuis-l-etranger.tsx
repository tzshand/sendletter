import { P, Lead, H2, UL, Table, Pre, Note, A } from "@/components/blog/Prose";

export default function Post() {
  return (
    <>
      <Lead>
        Vous avez deux options : poster à l&apos;international depuis votre pays, ou passer
        par un service qui imprime la lettre au Canada et la poste au tarif intérieur. Dans
        les deux cas, ce qui risque le plus de mal tourner, c&apos;est le format de
        l&apos;adresse : les adresses canadiennes suivent des conventions différentes des
        conventions américaines et européennes, et Postes Canada trie justement sur
        l&apos;élément qu&apos;on écrit le plus souvent de travers.
      </Lead>

      <H2>Le format d&apos;adresse canadien</H2>

      <Pre>{`JEANNE TREMBLAY
123 RUE PRINCIPALE O
MONTREAL QC  H3Z 2Y7
CANADA`}</Pre>

      <P>Les règles qui comptent vraiment :</P>

      <UL>
        <li>
          <strong>Le code postal en dernier, sur la ligne de la ville.</strong> Le format est
          lettre-chiffre-lettre, espace, chiffre-lettre-chiffre — <code>H3Z 2Y7</code>.
          Postes Canada trie là-dessus avant tout le reste. La convention officielle prévoit
          deux espaces avant le code ; un seul passe en pratique, mais un code absent ou
          erroné, non.
        </li>
        <li>
          <strong>La province en code de deux lettres.</strong> QC, ON, BC, AB, NS. Écrire
          « Québec » au long, c&apos;est compter sur une intervention humaine.
        </li>
        <li>
          <strong>Le pays seul sur la dernière ligne</strong>, en majuscules, uniquement pour
          un envoi depuis l&apos;étranger.
        </li>
        <li>
          <strong>L&apos;appartement ou l&apos;unité en premier</strong> sur la ligne de
          voirie : écrivez <code>4-123 rue Principale</code>, et non
          <code> 123 rue Principale app. 4</code>.
        </li>
        <li>
          <strong>Pas de ponctuation</strong> et pas de virgule entre la ville et la
          province. Postes Canada privilégie les majuscules sur l&apos;ensemble, même si la
          casse mixte est acceptée.
        </li>
      </UL>

      <Note>
        L&apos;erreur la plus fréquente est un code postal qui appartient à une autre ville —
        généralement recopié d&apos;une vieille fiche ou deviné. Si vous ne vérifiez
        qu&apos;un seul champ, vérifiez celui-là. C&apos;est le champ que la machine lit
        réellement.
      </Note>

      <H2>Ce que coûte l&apos;affranchissement international</H2>

      <Table
        headers={["Trajet", "Tarif", "Remarques"]}
        rows={[
          ["Au Canada, jusqu'à 30 g", "1,44 $ CA", "Tarif du timbre intérieur"],
          ["Du Canada vers les États-Unis, jusqu'à 30 g", "1,75 $ CA", "Poste-lettres standard"],
          ["Des États-Unis ou d'outre-mer vers le Canada", "Variable", "Fixé par votre poste nationale"],
        ]}
      />

      <P>
        Le courrier international entrant est tarifé par le service postal du pays
        d&apos;expédition, et non par Postes Canada : il n&apos;existe donc pas de chiffre
        unique. Il est généralement plusieurs fois supérieur au tarif intérieur canadien, et
        le transit ajoute une semaine ou plus aux trois à sept jours ouvrables que met une
        lettre une fois entrée dans le réseau canadien.
      </P>

      <H2>Imprimer au Canada plutôt</H2>

      <P>
        Si la lettre est un document plutôt qu&apos;un objet — un formulaire signé, un avis,
        une lettre de présentation —, il n&apos;est pas nécessaire de faire traverser une
        frontière à du papier. Transmettre le fichier à un service qui imprime au Canada fait
        entrer l&apos;envoi dans le réseau comme du courrier intérieur : affranchissement
        moins cher, et pas de segment international.
      </P>

      <P>
        C&apos;est le cas où un service en ligne est nettement avantageux, et pas seulement
        commode. La comparaison n&apos;est plus « 3,79 $ contre un timbre à 1,44 $ », mais
        « 3,79 $ contre l&apos;affranchissement international plus une semaine ». Pour le
        détail des chiffres intérieurs, voyez{" "}
        <A href="/fr/blog/combien-coute-une-lettre-au-canada">
          combien coûte vraiment l&apos;envoi d&apos;une lettre au Canada
        </A>
        .
      </P>

      <H2>Un mot sur les douanes</H2>

      <P>
        Les documents — la correspondance sur papier — n&apos;exigent pas de déclaration en
        douane. Tout ce qui contient un objet en exige une, même petit, et un article non
        déclaré est la deuxième cause d&apos;immobilisation du courrier entrant. Si vous
        glissez quelque chose dans une carte, c&apos;est un colis déguisé en enveloppe, et il
        doit être déclaré comme tel.
      </P>
    </>
  );
}
