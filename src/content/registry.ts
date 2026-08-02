// Post id → body, per locale. Static imports so every post is prerendered at
// build time and nothing is fetched at request time.

import type { ComponentType } from "react";
import type { Locale } from "@/lib/blog";

import EnSendALetterOnline from "./posts/how-to-send-a-letter-online-in-canada";
import EnCostToMail from "./posts/what-it-costs-to-mail-a-letter-in-canada";
import EnLegalNotice from "./posts/can-you-mail-a-legal-notice-online";
import EnApiGuide from "./posts/send-physical-mail-from-your-app";
import EnFromAbroad from "./posts/mail-a-letter-to-canada-from-abroad";

import FrSendALetterOnline from "./posts/fr/envoyer-une-lettre-en-ligne-au-canada";
import FrCostToMail from "./posts/fr/combien-coute-une-lettre-au-canada";
import FrLegalNotice from "./posts/fr/envoyer-une-mise-en-demeure-par-la-poste";
import FrApiGuide from "./posts/fr/envoyer-du-courrier-depuis-votre-application";
import FrFromAbroad from "./posts/fr/envoyer-une-lettre-au-canada-depuis-l-etranger";

const EN: Record<string, ComponentType> = {
  "send-a-letter-online": EnSendALetterOnline,
  "cost-to-mail": EnCostToMail,
  "legal-notice": EnLegalNotice,
  "api-guide": EnApiGuide,
  "from-abroad": EnFromAbroad,
};

const FR: Record<string, ComponentType> = {
  "send-a-letter-online": FrSendALetterOnline,
  "cost-to-mail": FrCostToMail,
  "legal-notice": FrLegalNotice,
  "api-guide": FrApiGuide,
  "from-abroad": FrFromAbroad,
};

export function getBody(locale: Locale, id: string): ComponentType | undefined {
  return (locale === "fr" ? FR : EN)[id];
}
