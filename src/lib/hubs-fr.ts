// Canadian French versions of the hub pages. The API hub stays English only (developer audience).
// Terminology follows Postes Canada's French pages and the OQLF; tests/fr-rules.mts enforces it.

import type { Hub, HubId } from "./hubs";

type Fr = NonNullable<Hub["fr"]>;

export const HUBS_FR: Partial<Record<HubId, Fr>> = {
  postage: {
    slug: "affranchissement-et-timbres",
    title: "Affranchissement et timbres au Canada",
    description:
      "Tarifs actuels des lettres de Postes Canada, nombre de timbres nécessaires, valeur des timbres Permanents et conséquences d’un affranchissement insuffisant.",
    intro: [
      "La plupart des problèmes d’envoi au Canada se résument à une question : quel affranchissement faut-il pour cette enveloppe? La réponse dépend du poids, du format et de la présence du code postal.",
      "Ces guides s’appuient sur les prix publiés par Postes Canada (le guide des prix aux consommateurs, mis à jour le 7 septembre 2026) et montrent les calculs, pour que vous puissiez vérifier chaque chiffre.",
    ],
  },
  "send-online": {
    slug: "envoyer-une-lettre-en-ligne",
    title: "Envoyer une lettre en ligne",
    description:
      "Comment poster une lettre sans imprimante, sans enveloppe et sans timbre : ce que fait un service de lettres en ligne, ce qu’il coûte et quand il vaut la peine.",
    intro: [
      "Il arrive qu’on doive poster une seule lettre sans avoir le matériel : ni imprimante, ni enveloppe, ni timbre, ni le temps d’aller au bureau de poste.",
      "Ces guides expliquent ce qu’un service d’impression et d’envoi en ligne fait de votre document, ce qu’il coûte par rapport à l’envoi à la maison et les limites à connaître avant de commander.",
    ],
  },
  "from-abroad": {
    slug: "ecrire-au-canada-depuis-l-etranger",
    title: "Envoyer une lettre au Canada depuis l’étranger",
    description:
      "Envoyer une lettre à une adresse canadienne depuis un autre pays : comment l’adresser, pourquoi un timbre canadien n’est pas une option et comment éviter un retour.",
    intro: [
      "Quand on vit hors du Canada, deux obstacles se présentent : il est difficile d’acheter des timbres canadiens, et les adresses canadiennes suivent des conventions que les formulaires étrangers ne respectent pas toujours.",
      "Ces guides couvrent le format de l’adresse, le code postal, le problème du timbre et une solution qui ne demande aucun timbre. sendletter n’envoie qu’à des adresses canadiennes; l’adresse de l’expéditeur peut être saisie en texte libre.",
    ],
  },
  everyday: {
    slug: "lettres-du-quotidien",
    title: "Les lettres du quotidien qui valent d’être postées",
    description:
      "Plaintes, résiliations et autres lettres pour lesquelles le papier est utile : quoi y écrire, comment conserver une preuve et comment les poster.",
    intro: [
      "La plupart des gens qui doivent poster une lettre n’écrivent pas à un ami. Ils résilient un contrat, formulent une plainte ou consignent une demande.",
      "Ces guides expliquent ce qu’une telle lettre doit dire et comment l’envoyer pour pouvoir démontrer ce que vous avez envoyé et quand. Il s’agit de conseils pratiques, non d’un avis juridique; lorsqu’un contrat ou une loi prévoit une règle, c’est elle qui prime.",
    ],
  },
  legal: {
    slug: "avis-formels-et-juridiques",
    title: "Avis formels et juridiques par la poste",
    description:
      "Quand le courrier ordinaire suffit pour un avis formel, quand il faut le courrier recommandé et ce que chacun coûte. Information générale, non un avis juridique.",
    intro: [
      "Un avis formel soulève une autre question qu’une lettre ordinaire : non seulement la lettre arrivera-t-elle, mais pourrez-vous le prouver?",
      "Ces guides comparent ce que le courrier ordinaire et le courrier recommandé offrent, avec les prix publiés par Postes Canada. Il s’agit d’information générale, non d’un avis juridique; les règles applicables à votre situation proviennent de la loi, du tribunal ou du contrat en cause.",
    ],
  },
};
