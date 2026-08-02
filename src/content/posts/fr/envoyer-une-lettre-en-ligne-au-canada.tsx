import { P, Lead, H2, UL, Table, Note, A } from "@/components/blog/Prose";

export default function Post() {
  return (
    <>
      <Lead>
        Il existe trois façons de mettre une vraie lettre à la poste au Canada sans passer
        au bureau de poste : acheter des timbres et utiliser une boîte aux lettres, passer
        par un service d&apos;impression et de postage en ligne, ou appeler une API si
        c&apos;est un logiciel qui envoie. Le bon choix dépend surtout de deux choses :
        avez-vous une imprimante, et à quelle fréquence envoyez-vous ?
      </Lead>

      <H2>Les trois options</H2>

      <Table
        headers={["Méthode", "Coût par lettre", "Ce qu'il vous faut", "Idéal pour"]}
        rows={[
          [
            "Timbre et boîte aux lettres",
            "1,44 $",
            "Imprimante, enveloppe, timbres, une boîte sur votre chemin",
            "Les envois ponctuels, si vous avez déjà le nécessaire",
          ],
          [
            "Service en ligne",
            "3,79 $ à 6 $",
            "Un navigateur et l'adresse du destinataire",
            "Pas d'imprimante, ou vous ne sortez pas",
          ],
          [
            "API d'impression et de postage",
            "Selon le volume",
            "Un développeur et une intégration",
            "Un logiciel qui poste automatiquement",
          ],
        ]}
      />

      <H2>Ce qu&apos;il vous faut dans tous les cas</H2>

      <P>
        Les trois méthodes exigent les mêmes trois éléments, et c&apos;est l&apos;absence de
        l&apos;un d&apos;eux qui explique la plupart des retours :
      </P>

      <UL>
        <li>
          <strong>Une adresse complète</strong>, code postal compris. Postes Canada trie
          d&apos;abord sur le code postal : une adresse sans code postal est traitée par
          exception, donc lentement.
        </li>
        <li>
          <strong>Une adresse de retour.</strong> Sans elle, une lettre non distribuable
          est tout simplement détruite plutôt que retournée.
        </li>
        <li>
          <strong>Le document</strong>, saisi directement ou téléversé en PDF ou en Word.
        </li>
      </UL>

      <H2>Ce que fait réellement un service en ligne</H2>

      <P>
        Les bons services prennent en charge toute la chaîne matérielle : impression,
        pliage, mise sous enveloppe, affranchissement, puis remise à Postes Canada,
        généralement en un jour ouvrable. Vous payez environ 2 $ de plus que le prix
        d&apos;un timbre pour l&apos;impression, l&apos;enveloppe et le fait de ne pas avoir
        à sortir.
      </P>

      <P>
        Au Canada, les prix vont actuellement de 3,79 $ pour une lettre standard pliée en
        trois à environ 6 $ pour les offres les plus chères. Tout ce qui est annoncé
        nettement sous le prix d&apos;un timbre ne poste pas une lettre physique.
      </P>

      <H2>Les délais en 2026</H2>

      <P>
        Prévoyez <strong>de trois à sept jours ouvrables</strong> pour le courrier
        intérieur, et davantage hors des grands centres. Ce délai s&apos;est allongé cette
        année : Postes Canada{" "}
        <A href="https://www.cbc.ca/news/business/canada-post-community-mailboxes-questions-9.7148787">
          convertit environ quatre millions d&apos;adresses
        </A>{" "}
        de la livraison à domicile vers des boîtes postales communautaires sur cinq ans, et
        a réduit la fréquence de livraison. La moyenne est passée de trois ou quatre jours à
        trois à sept.
      </P>

      <P>
        Aucun service de Poste-lettres ordinaire — le nôtre compris — n&apos;offre de suivi.
        S&apos;il vous faut la preuve que la lettre est arrivée, c&apos;est un autre produit :
        voyez{" "}
        <A href="/fr/blog/envoyer-une-mise-en-demeure-par-la-poste">
          si l&apos;on peut envoyer une mise en demeure en ligne
        </A>
        .
      </P>

      <Note>
        Si vous avez déjà des timbres et des enveloppes, que vous possédez une imprimante et
        que vous passez devant une boîte aux lettres de toute façon, poster vous-même
        revient moins cher, et ce sera toujours vrai. Un service en ligne vaut son prix dès
        qu&apos;il manque l&apos;un des trois — et, pour la plupart des gens, c&apos;est
        l&apos;imprimante.
      </Note>

      <H2>Quand passer par l&apos;API</H2>

      <P>
        Si c&apos;est un logiciel, et non une personne, qui déclenche la lettre — un avis de
        renouvellement, un échec de paiement après un courriel resté sans réponse, une
        communication obligatoire —, l&apos;API d&apos;impression et de postage est la bonne
        forme. Une requête HTTP par lettre, et plus jamais d&apos;enveloppes. C&apos;est{" "}
        <A href="/fr/blog/envoyer-du-courrier-depuis-votre-application">
          l&apos;objet d&apos;un autre guide
        </A>
        .
      </P>
    </>
  );
}
