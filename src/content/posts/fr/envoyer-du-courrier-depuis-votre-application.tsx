import { P, Lead, H2, UL, Pre, Note, A } from "@/components/blog/Prose";

export default function Post() {
  return (
    <>
      <Lead>
        Une API d&apos;impression et de postage transforme une requête HTTP en lettre
        physique : vous transmettez le destinataire, l&apos;expéditeur et le contenu, et une
        imprimante quelque part produit du papier qui entre dans le réseau postal. Elle vaut
        le détour dans les cas précis où le courriel ne suffit pas.
      </Lead>

      <H2>Quand le papier bat le courriel</H2>

      <UL>
        <li>
          <strong>Le courriel a rebondi.</strong> Les adresses postales se périment beaucoup
          plus lentement que les adresses de courriel. Pour la reconquête de clients et le
          recouvrement, la poste rejoint des gens que votre liste a perdus.
        </li>
        <li>
          <strong>La réglementation impose le papier.</strong> De nombreux avis légaux ou
          réglementaires exigent encore la poste, et un dossier de pourriels n&apos;est pas
          une défense.
        </li>
        <li>
          <strong>Vous devez être lu.</strong> Une lettre affronte quatre autres
          enveloppes ; un courriel en affronte trois cents.
        </li>
      </UL>

      <P>
        Ce à quoi elle ne convient <em>pas</em>, c&apos;est l&apos;urgence. La livraison au
        Canada prend maintenant de trois à sept jours ouvrables. Si l&apos;envoi doit arriver
        demain, la poste est le mauvais canal, quelle que soit la qualité de l&apos;API.
      </P>

      <H2>À quoi ressemble une requête</H2>

      <P>
        La forme est comparable d&apos;un fournisseur à l&apos;autre : on s&apos;authentifie
        avec une clé, on décrit les deux adresses, on fournit le contenu, on reçoit un
        identifiant. La nôtre accepte des champs structurés, du HTML brut ou un PDF encodé
        en base64 :
      </P>

      <Pre>{`curl -X POST https://sendletter.app/api/v1/send \\
  -H "Authorization: Bearer sl_live_..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "mode": "draft",
    "letter_size": "standard",
    "from": {
      "name": "Acme inc.",
      "line1": "100 rue Queen O",
      "city": "Toronto",
      "province": "ON",
      "postal_code": "M5H 2N2",
      "country": "CA"
    },
    "to": {
      "name": "Jeanne Tremblay",
      "line1": "1 rue Sainte-Catherine",
      "city": "Montreal",
      "province": "QC",
      "postal_code": "H2X 1K4",
      "country": "CA"
    },
    "letter": {
      "salutation": "Madame Tremblay,",
      "body": "Votre abonnement se renouvelle le 1er septembre.",
      "closing": "Cordialement,",
      "signature": "Facturation Acme"
    }
  }'`}</Pre>

      <H2>Quatre pièges d&apos;une première intégration</H2>

      <P>
        <strong>1. Une reprise imprime du vrai papier.</strong> C&apos;est le piège
        principal. Un appel repris après un échec partiel peut produire deux lettres
        physiques, et vous ne pouvez pas rappeler la seconde. Générez une clé
        d&apos;idempotence par lettre logique et enregistrez l&apos;identifiant retourné
        avant toute reprise.
      </P>

      <P>
        <strong>2. Les adresses échouent tard.</strong> Un courriel invalide rebondit en
        quelques secondes. Une adresse postale erronée échoue des jours plus tard, en
        silence, et souvent sans vous prévenir. Validez le format du code postal en amont —
        au Canada, lettre-chiffre-lettre chiffre-lettre-chiffre — et indiquez toujours une
        adresse de retour, sans quoi le courrier non distribuable est détruit au lieu de
        revenir.
      </P>

      <P>
        <strong>3. Le nombre de pages change le prix et l&apos;enveloppe.</strong> Une
        enveloppe pour pli en trois contient quelques feuilles ; au-delà, vous passez à une
        enveloppe à plat, à un tarif supérieur. Si votre contenu vient des utilisateurs, sa
        longueur devient une donnée de facturation. Comptez les pages avant l&apos;envoi, pas
        après.
      </P>

      <P>
        <strong>4. Le coût unitaire est tout le modèle de coûts.</strong> Il n&apos;y a pas
        de gratuité en physique. L&apos;affranchissement et l&apos;impression posent un
        plancher dur sous chaque lettre : la rentabilité unitaire compte ici comme elle ne
        compte jamais pour le courriel. Vérifiez si un fournisseur ajoute des frais de
        plateforme ou un minimum mensuel par-dessus le prix unitaire.
      </P>

      <H2>Choisir un fournisseur</H2>

      <P>
        Soyez honnête sur votre créneau. Si vous menez des campagnes de publipostage en
        masse, avec segmentation d&apos;auditoire, validation d&apos;adresses à grande échelle
        et analyse par campagne, les plateformes établies — Lob et PostGrid notamment — sont
        conçues exactement pour cela et c&apos;est vers elles qu&apos;il faut aller.
      </P>

      <Note>
        <strong>Notre créneau :</strong> sendletter envoie une lettre à la fois, vers des
        adresses canadiennes, facturée à l&apos;unité et sans frais mensuels. L&apos;adresse
        d&apos;expéditeur peut se trouver n&apos;importe où dans le monde ; la livraison se
        fait au Canada seulement. S&apos;il vous faut des outils de campagne en masse ou une
        livraison hors Canada, prenez l&apos;une des plateformes ci-dessus : ce sera moins de
        travail que de plier la nôtre à cet usage.
      </Note>

      <P>
        Pour le schéma complet des requêtes et des réponses, les codes d&apos;erreur et les
        deux autres modes de contenu, consultez la{" "}
        <A href="/docs">référence de l&apos;API</A>.
      </P>
    </>
  );
}
