// Every guide, in publishing order. Each guide is one JSON file in this folder;
// add the import here and nowhere else (tests/guides.test.mts fails if a file is
// left unregistered). Guides are English-only by design: the French mirror
// pages cover the original four posts, and the keyword data shows no Canadian
// French demand for these topics.

import type { GuideData } from "@/lib/hubs";
import g0 from "./canada-post-letter-rates-by-weight.json";
import g1 from "./canada-post-stamp-price.json";
import g2 from "./how-long-does-a-letter-take-in-canada.json";
import g3 from "./how-many-stamps-for-a-letter-in-canada.json";
import g4 from "./how-online-letter-mailing-works.json";
import g5 from "./letter-with-too-little-postage.json";
import g6 from "./lettermail-size-and-weight-limits.json";
import g7 from "./mail-a-letter-without-a-printer.json";
import g8 from "./mail-one-letter-without-a-stamp-book.json";
import g9 from "./permanent-stamp-value-canada.json";
import g10 from "./postage-for-a-large-envelope-canada.json";
import g11 from "./return-address-on-a-canadian-letter.json";
import g12 from "./what-an-online-letter-costs.json";
import g13 from "./canadian-postal-code-format.json";
import g14 from "./how-to-address-a-letter-to-canada.json";
import g15 from "./mail-a-letter-to-canada-from-abroad.json";
import g16 from "./send-a-letter-to-canada-from-the-uk.json";
import g17 from "./send-a-letter-to-canada-from-the-us.json";
import g18 from "./why-letters-to-canada-get-returned.json";
import g19 from "./can-you-track-a-letter-canada.json";
import g20 from "./holiday-mailing-deadlines-2026.json";
import g21 from "./letter-not-delivered-what-to-do.json";
import g22 from "./proof-of-mailing-letter-canada.json";
import g23 from "./registered-mail-canada-cost.json";
import g24 from "./registered-vs-regular-mail-canada.json";
import g25 from "./stamp-price-2027-what-we-know.json";
import g26 from "./cancel-a-contract-or-membership-by-mail.json";
import g27 from "./how-to-write-a-complaint-letter.json";
import g28 from "./canada-post-address-validation-api.json";
import g29 from "./canada-post-api-send-letters.json";
import g30 from "./idempotency-for-physical-mail.json";
import g31 from "./send-a-letter-with-an-api-canada.json";
import g32 from "./sendletter-vs-lob.json";
import g33 from "./sendletter-vs-postgrid.json";
import g34 from "./test-mode-for-a-mail-api.json";

export const GUIDES: GuideData[] = [
  // Wave 1
  g0 as GuideData,
  g1 as GuideData,
  g2 as GuideData,
  g3 as GuideData,
  g4 as GuideData,
  g5 as GuideData,
  g6 as GuideData,
  g7 as GuideData,
  g8 as GuideData,
  g9 as GuideData,
  g10 as GuideData,
  g11 as GuideData,
  g12 as GuideData,
  // Wave 2
  g13 as GuideData,
  g14 as GuideData,
  g15 as GuideData,
  g16 as GuideData,
  g17 as GuideData,
  g18 as GuideData,
  // Wave 3
  g19 as GuideData,
  g20 as GuideData,
  g21 as GuideData,
  g22 as GuideData,
  g23 as GuideData,
  g24 as GuideData,
  g25 as GuideData,
  // Wave 4
  g26 as GuideData,
  g27 as GuideData,
  // Wave 5
  g28 as GuideData,
  g29 as GuideData,
  g30 as GuideData,
  g31 as GuideData,
  g32 as GuideData,
  g33 as GuideData,
  g34 as GuideData,
];
