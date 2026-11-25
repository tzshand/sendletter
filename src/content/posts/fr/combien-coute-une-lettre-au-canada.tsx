import { P, Lead, H2, UL, Table, Note, A } from "@/components/blog/Prose";

export default function Post() {
  return (
    <>
      <Lead>
        Un timbre à l&apos;unité coûte <strong>1,44 $</strong> en 2026, ou 1,24 $ l&apos;unité
        en carnet ou en rouleau. Cela couvre une lettre standard jusqu&apos;à 30 g partout au
        Canada. Vers les États-Unis, c&apos;est 1,75 $.
      </Lead>

      <H2>Les tarifs de Postes Canada en 2026</H2>

      <Table
        headers={["Ce que vous envoyez", "Tarif"]}
        rows={[
          ["Lettre au Canada, jusqu'à 30 g — timbre à l'unité", "1,44 $"],
          ["Lettre au Canada, jusqu'à 30 g — carnet ou rouleau", "1,24 $"],
          ["Vers les États-Unis, jusqu'à 30 g", "1,75 $"],
          ["Vers les États-Unis, 30 à 50 g (affranchissement mécanique)", "2,61 $"],
        ]}
      />

      <P>
        Le tarif du timbre à l&apos;unité est passé de 1,15 $ à 1,44 $ lors de la dernière
        hausse — un peu plus de 25 % d&apos;un coup —, et le timbre en carnet de 0,99 $ à
        1,24 $. Les tarifs changent périodiquement ; le tableau à jour se trouve toujours
        sur la{" "}
        <A href="https://www.canadapost-postescanada.ca/scp/fr/personnel/tarifs-affranchissement.page">
          page des tarifs d&apos;affranchissement de Postes Canada
        </A>
        .
      </P>

      <H2>Le timbre n&apos;est pas le coût</H2>

      <P>
        Le timbre, c&apos;est la partie qui porte un prix. Le coût réel d&apos;une lettre que
        vous postez vous-même ressemble plutôt à ceci :
      </P>

      <Table
        headers={["Poste de dépense", "Environ"]}
        rows={[
          ["Timbre (tarif carnet)", "1,24 $"],
          ["Enveloppe", "0,10 $ à 0,20 $"],
          ["Papier et encre, une page", "0,15 $ à 0,30 $"],
          [<strong key="t">Total des fournitures</strong>, <strong key="v">~1,50 $ à 1,75 $</strong>],
          ["Le déplacement jusqu'à la boîte aux lettres", "Gratuit, si vous passiez devant"],
        ]}
      />

      <P>
        La vraie comparaison n&apos;est donc pas 1,44 $ contre 3,49 $. C&apos;est environ
        1,60 $ de fournitures — en supposant que vous ayez déjà une imprimante qui
        fonctionne et des timbres dans un tiroir — contre un prix de service qui comprend
        tout.
      </P>

      <Note>
        Si vous avez l&apos;imprimante, les enveloppes et les timbres, poster vous-même
        coûte moins cher. C&apos;est vrai, et aucun argument de vente n&apos;y changera rien.
        Le calcul bascule quand il vous manque l&apos;un des trois, quand le déplacement
        n&apos;est pas gratuit, ou quand vous écrivez depuis un autre pays que le
        destinataire.
      </Note>

      <H2>Ce qui fait varier le prix</H2>

      <UL>
        <li>
          <strong>Le poids.</strong> Le seuil de 30 g est le point de bascule. Cela
          représente environ quatre ou cinq feuilles standard plus l&apos;enveloppe : une
          longue lettre peut donc passer discrètement dans la tranche suivante.
        </li>
        <li>
          <strong>Le format et l&apos;épaisseur.</strong> Les tarifs Poste-lettres supposent
          une enveloppe standard. Tout ce qui est rigide, bosselé ou surdimensionné est
          tarifé autrement — c&apos;est pourquoi une carte d&apos;anniversaire contenant un
          objet coûte plus cher que la carte seule.
        </li>
        <li>
          <strong>La destination.</strong> Canada, États-Unis et international sont trois
          grilles tarifaires distinctes.
        </li>
      </UL>

      <H2>Où se situent les services en ligne</H2>

      <P>
        Les services canadiens d&apos;impression et de postage vont actuellement d&apos;environ
        3,49 $ à 6 $ par lettre pour une livraison au Canada, impression, enveloppe,
        affranchissement et taxes compris. C&apos;est une prime de 2 $ à 4 $ sur le
        « faites-le vous-même » : le prix de l&apos;impression et de la course.
      </P>

      <P>
        Pour une entreprise qui poste quelques lettres par mois, cette prime est presque
        toujours inférieure au temps de personnel qu&apos;elle remplace. Pour une carte
        d&apos;anniversaire par année, non. Les deux réponses sont valables.
      </P>

      <P>
        Écrire depuis l&apos;étranger change considérablement le calcul, l&apos;affranchissement
        international étant nettement plus cher que le tarif intérieur —{" "}
        <A href="/fr/blog/envoyer-une-lettre-au-canada-depuis-l-etranger">
          ce cas est traité ici
        </A>
        .
      </P>
    </>
  );
}
