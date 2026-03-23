import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata = {
  title: "Terms of Service — sendletter",
};

export default function TermsPage() {
  return (
    <div className="min-h-full bg-[#fafafa]">
      <div className="max-w-2xl mx-auto px-5 py-12">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Link>

        <h1 className="text-2xl font-bold mb-2">Terms of Service</h1>
        <p className="text-sm text-gray-400 mb-8">
          Last updated: March 22, 2026 &middot; Derniere mise a jour : 22 mars
          2026
        </p>

        <div className="prose prose-sm prose-gray max-w-none space-y-8">
          {/* English */}
          <section>
            <h2 className="text-lg font-semibold mb-4">English</h2>

            <h3 className="font-semibold mt-6 mb-2">1. Service Description</h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              sendletter (&ldquo;we&rdquo;, &ldquo;us&rdquo;,
              &ldquo;our&rdquo;) provides an online letter-mailing service. You
              upload or compose a document, provide mailing addresses, and we
              print and mail the physical letter via Canada Post on your behalf.
            </p>

            <h3 className="font-semibold mt-6 mb-2">
              2. No Refunds &mdash; Service Rendered
            </h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              Once payment is completed, your letter is queued for printing and
              dispatch. Because our service involves physical printing and
              mailing,{" "}
              <strong>
                all sales are final and no refunds will be issued
              </strong>
              . The service is considered rendered at the time of payment
              confirmation. This applies regardless of errors in the content or
              addresses you provide.
            </p>

            <h3 className="font-semibold mt-6 mb-2">3. Your Responsibilities</h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              You are solely responsible for the accuracy of the letter content,
              return address, and recipient address. We print and mail exactly
              what you submit. We do not review, edit, or verify your content or
              addresses. You must not use this service to send threatening,
              harassing, defamatory, or unlawful material.
            </p>

            <h3 className="font-semibold mt-6 mb-2">4. Delivery</h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              Letters are printed and deposited with Canada Post within 1
              business day of payment. Delivery times depend on Canada Post and
              are typically 3&ndash;10 business days within Canada. We are not
              responsible for delays, loss, or damage by Canada Post after
              deposit.
            </p>

            <h3 className="font-semibold mt-6 mb-2">5. Pricing</h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              Prices are displayed in Canadian dollars (CAD) and include
              printing, envelope, and postage. Applicable taxes are included in
              the displayed price.
            </p>

            <h3 className="font-semibold mt-6 mb-2">6. Privacy</h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              We collect only the information necessary to fulfill your order:
              letter content, mailing addresses, and payment information
              (processed securely by Stripe). We do not store your letter
              content after dispatch. Your email address, collected during
              checkout, is used solely for order confirmation.
            </p>

            <h3 className="font-semibold mt-6 mb-2">7. Contact</h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              For questions or concerns, contact us at{" "}
              <a
                href="mailto:support@sendletter.app"
                className="text-gray-900 underline"
              >
                support@sendletter.app
              </a>
              .
            </p>
          </section>

          <hr className="border-gray-200" />

          {/* French */}
          <section>
            <h2 className="text-lg font-semibold mb-4">Fran&ccedil;ais</h2>

            <h3 className="font-semibold mt-6 mb-2">
              1. Description du service
            </h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              sendletter (&laquo;&nbsp;nous&nbsp;&raquo;,
              &laquo;&nbsp;notre&nbsp;&raquo;) offre un service d&rsquo;envoi de
              lettres en ligne. Vous t&eacute;l&eacute;chargez ou
              r&eacute;digez un document, fournissez les adresses postales, et
              nous imprimons et postons la lettre physique via Postes Canada en
              votre nom.
            </p>

            <h3 className="font-semibold mt-6 mb-2">
              2. Aucun remboursement &mdash; Service rendu
            </h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              Une fois le paiement effectu&eacute;, votre lettre est mise en
              file d&rsquo;attente pour impression et exp&eacute;dition.
              Puisque notre service implique l&rsquo;impression et l&rsquo;envoi
              physique,{" "}
              <strong>
                toutes les ventes sont finales et aucun remboursement ne sera
                &eacute;mis
              </strong>
              . Le service est consid&eacute;r&eacute; comme rendu au moment de
              la confirmation du paiement. Cela s&rsquo;applique
              ind&eacute;pendamment des erreurs dans le contenu ou les adresses
              que vous fournissez.
            </p>

            <h3 className="font-semibold mt-6 mb-2">
              3. Vos responsabilit&eacute;s
            </h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              Vous &ecirc;tes seul responsable de l&rsquo;exactitude du contenu
              de la lettre, de l&rsquo;adresse de retour et de l&rsquo;adresse
              du destinataire. Nous imprimons et postons exactement ce que vous
              soumettez. Nous ne r&eacute;visons, ne modifions ni ne
              v&eacute;rifions votre contenu ou vos adresses. Vous ne devez pas
              utiliser ce service pour envoyer du mat&eacute;riel
              mena&ccedil;ant, harcelant, diffamatoire ou ill&eacute;gal.
            </p>

            <h3 className="font-semibold mt-6 mb-2">4. Livraison</h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              Les lettres sont imprim&eacute;es et
              d&eacute;pos&eacute;es aupr&egrave;s de Postes Canada dans un
              d&eacute;lai de 1 jour ouvrable apr&egrave;s le paiement. Les
              d&eacute;lais de livraison d&eacute;pendent de Postes Canada et
              sont g&eacute;n&eacute;ralement de 3 &agrave; 10 jours ouvrables
              au Canada. Nous ne sommes pas responsables des retards, pertes ou
              dommages par Postes Canada apr&egrave;s le d&eacute;p&ocirc;t.
            </p>

            <h3 className="font-semibold mt-6 mb-2">5. Tarification</h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              Les prix sont affich&eacute;s en dollars canadiens (CAD) et
              comprennent l&rsquo;impression, l&rsquo;enveloppe et
              l&rsquo;affranchissement. Les taxes applicables sont incluses dans
              le prix affich&eacute;.
            </p>

            <h3 className="font-semibold mt-6 mb-2">
              6. Confidentialit&eacute;
            </h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              Nous ne recueillons que les informations n&eacute;cessaires
              &agrave; l&rsquo;ex&eacute;cution de votre commande : contenu de
              la lettre, adresses postales et informations de paiement
              (trait&eacute;es de mani&egrave;re s&eacute;curis&eacute;e par
              Stripe). Nous ne conservons pas le contenu de votre lettre
              apr&egrave;s l&rsquo;exp&eacute;dition. Votre adresse courriel,
              recueillie lors du paiement, est utilis&eacute;e uniquement pour
              la confirmation de commande.
            </p>

            <h3 className="font-semibold mt-6 mb-2">7. Contact</h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              Pour toute question ou pr&eacute;occupation, contactez-nous
              &agrave;{" "}
              <a
                href="mailto:support@sendletter.app"
                className="text-gray-900 underline"
              >
                support@sendletter.app
              </a>
              .
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
