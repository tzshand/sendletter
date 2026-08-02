import { P, Lead, H2, UL, Table, Note, A } from "@/components/blog/Prose";

export default function Post() {
  return (
    <>
      <Lead>
        Généralement non, pas par Poste-lettres ordinaire. Si une loi, un tribunal ou un
        contrat exige que vous prouviez que le destinataire a <em>reçu</em> votre avis, il
        vous faut le courrier recommandé ou un huissier de justice. Le courrier ordinaire —
        y compris tous les services d&apos;envoi en ligne, le nôtre compris — ne produit
        aucune preuve de réception.
      </Lead>

      <H2>La distinction qui compte</H2>

      <Table
        headers={["", "Poste-lettres ordinaire", "Courrier recommandé"]}
        rows={[
          ["Preuve d'envoi", "Non", "Oui"],
          ["Signature à la livraison", "Non", "Oui"],
          ["Suivi", "Non", "Oui"],
          ["Se fait entièrement en ligne", "Oui", "Non — passage au bureau de poste"],
        ]}
      />

      <P>
        Le courrier recommandé existe précisément pour constituer une preuve. Postes Canada
        le présente comme le service{" "}
        <A href="https://www.canadapost-postescanada.ca/scp/fr/personnel/expedition-au-canada/courrier-recommande.page">
          destiné à ceux qui ont besoin d&apos;une preuve d&apos;envoi ou de livraison
        </A>
        . Cette signature est toute la raison d&apos;être du service, et c&apos;est pourquoi
        il ne peut pas se faire depuis un navigateur : quelqu&apos;un doit remettre
        l&apos;envoi au comptoir.
      </P>

      <H2>Quand la preuve est réellement exigée</H2>

      <P>
        Cela varie selon la juridiction, et le présent article ne constitue pas un avis
        juridique. Les cas les plus courants au Canada :
      </P>

      <UL>
        <li>
          <strong>La mise en demeure au Québec.</strong> Les indications du gouvernement du
          Québec sont claires : la mise en demeure s&apos;envoie par courrier recommandé ou
          se fait signifier par huissier, et vous pourriez devoir prouver la réception
          devant le tribunal.{" "}
          <A href="https://www.quebec.ca/justice-et-etat-civil/petites-creances/depot-demande/demarche-aide-demandeur/mise-en-demeure">
            Québec.ca détaille la démarche
          </A>
          .
        </li>
        <li>
          <strong>Les avis en matière de logement.</strong> La plupart des provinces
          prescrivent exactement comment signifier un avis de reprise, de résiliation ou
          d&apos;augmentation de loyer. Le courriel ne figure souvent pas dans la liste.
        </li>
        <li>
          <strong>Les clauses de notification contractuelles.</strong> Beaucoup de contrats
          commerciaux imposent le mode d&apos;envoi des avis. Si le vôtre dit « courrier
          recommandé », le courrier ordinaire ne satisfait pas à la clause, aussi
          raisonnable que cela puisse paraître.
        </li>
        <li>
          <strong>Tout ce qui met en marche un délai.</strong> Si un délai commence à courir
          à la réception de la lettre, vous devez pouvoir établir cette date.
        </li>
      </UL>

      <Note>
        La règle empirique : si vous pouvez imaginer qu&apos;on vous demande, devant un
        décideur, « comment savez-vous qu&apos;il l&apos;a reçue ? », le courrier ordinaire
        est le mauvais outil. Passez au bureau de poste et envoyez en recommandé, ou faites
        appel à un huissier.
      </Note>

      <H2>Ce à quoi le courrier ordinaire convient très bien</H2>

      <P>
        L&apos;essentiel de la correspondance, y compris beaucoup de courrier qui paraît
        formel :
      </P>

      <UL>
        <li>Une première approche avant tout litige — une demande polie de régler une facture.</li>
        <li>Les factures, relevés et reçus.</li>
        <li>Les lettres de présentation et les pièces jointes à une demande.</li>
        <li>Les avis dont le mode d&apos;envoi n&apos;est prescrit ni par contrat ni par la loi.</li>
        <li>Tout ce dont le destinataire ne contestera pas la réception.</li>
      </UL>

      <H2>Une voie mitoyenne courante</H2>

      <P>
        Envoyer la même lettre deux fois, par deux moyens, est une pratique normale et
        souvent recommandée : le courrier recommandé pour la copie qui fait preuve, et une
        copie ordinaire par la poste ou par courriel pour que le destinataire la lise
        rapidement, au lieu d&apos;attendre un avis de passage. La copie recommandée est pour
        le dossier ; la copie ordinaire est pour la personne.
      </P>

      <P>
        Et conservez une copie datée de tout ce que vous envoyez. Cela ne coûte rien, et
        c&apos;est la première chose qu&apos;on vous demandera.
      </P>

      <Note>
        <strong>Pour être clairs sur notre propre service :</strong> sendletter poste du
        Poste-lettres ordinaire de Postes Canada. Il n&apos;y a ni suivi ni signature. Si
        vous avez besoin d&apos;une preuve de réception, nous sommes le mauvais choix, et
        nous préférons le dire ici plutôt que de prendre la commande.
      </Note>
    </>
  );
}
