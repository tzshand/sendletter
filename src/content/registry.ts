// Slug → post body. Static imports so every post is prerendered at build time
// and nothing is fetched at request time.

import type { ComponentType } from "react";

import HowToSendALetterOnlineInCanada from "./posts/how-to-send-a-letter-online-in-canada";
import WhatItCostsToMailALetterInCanada from "./posts/what-it-costs-to-mail-a-letter-in-canada";
import CanYouMailALegalNoticeOnline from "./posts/can-you-mail-a-legal-notice-online";
import SendPhysicalMailFromYourApp from "./posts/send-physical-mail-from-your-app";
import MailALetterToCanadaFromAbroad from "./posts/mail-a-letter-to-canada-from-abroad";

export const BODIES: Record<string, ComponentType> = {
  "how-to-send-a-letter-online-in-canada": HowToSendALetterOnlineInCanada,
  "what-it-costs-to-mail-a-letter-in-canada": WhatItCostsToMailALetterInCanada,
  "can-you-mail-a-legal-notice-online": CanYouMailALegalNoticeOnline,
  "send-physical-mail-from-your-app": SendPhysicalMailFromYourApp,
  "mail-a-letter-to-canada-from-abroad": MailALetterToCanadaFromAbroad,
};
