// Post id → body, per locale. Static imports so every post is prerendered at
// build time and nothing is fetched at request time.

import { createElement, type ComponentType, type ReactElement } from "react";
import type { Locale } from "@/lib/blog";
import { GuideBody } from "@/components/blog/GuideBody";
import { GUIDES } from "@/content/guides";

import EnSendALetterOnline from "./posts/how-to-send-a-letter-online-in-canada";
import EnCostToMail from "./posts/what-it-costs-to-mail-a-letter-in-canada";
import EnLegalNotice from "./posts/can-you-mail-a-legal-notice-online";
import EnApiGuide from "./posts/send-physical-mail-from-your-app";
import EnApiVolumePricing from "./posts/api-volume-pricing";

import FrSendALetterOnline from "./posts/fr/envoyer-une-lettre-en-ligne-au-canada";
import FrCostToMail from "./posts/fr/combien-coute-une-lettre-au-canada";
import FrLegalNotice from "./posts/fr/envoyer-une-mise-en-demeure-par-la-poste";
import FrApiGuide from "./posts/fr/envoyer-du-courrier-depuis-votre-application";

const EN: Record<string, ComponentType> = {
  "send-a-letter-online": EnSendALetterOnline,
  "cost-to-mail": EnCostToMail,
  "legal-notice": EnLegalNotice,
  "api-guide": EnApiGuide,
  "api-volume-pricing": EnApiVolumePricing,
};

const FR: Record<string, ComponentType> = {
  "send-a-letter-online": FrSendALetterOnline,
  "cost-to-mail": FrCostToMail,
  "legal-notice": FrLegalNotice,
  "api-guide": FrApiGuide,
};

export function getBody(locale: Locale, id: string): ComponentType | undefined {
  return (locale === "fr" ? FR : EN)[id];
}

const GUIDES_BY_ID = new Map(GUIDES.map((g) => [g.id, g]));

/** The post body as a ready element (so pages render a value, not a component picked at render time). */
export function renderBody(locale: Locale, id: string): ReactElement | null {
  const guide = locale === "en" ? GUIDES_BY_ID.get(id) : undefined;
  if (guide) return createElement(GuideBody, { guide });
  const Body = getBody(locale, id);
  return Body ? createElement(Body) : null;
}
