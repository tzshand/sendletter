# Translating a guide into Canadian French

Each English guide is `src/content/guides/<id>.json`. Write its French version to
`src/content/guides-fr/<id>.json` (same file name, the English guide's id). Read the English
file first. Translate; do not adapt, add, or drop claims.

## Voice

Quebec French for a general reader: plain, direct, vouvoiement, the same short sentences and the
same answer-first structure as the English. No France-French (« mél », « un mail », « week-end » for
« fin de semaine » is acceptable but prefer Quebec forms). Write as a Quebec writer would, not
word for word: restructure a sentence when French needs it, but keep every fact.

## File shape (must match)

```json
{
  "id": "<same id as the English file>",
  "slug": "<French slug: ASCII, lower case, hyphens, no accents, built from the French title>",
  "title": "<≤ 65 characters, sentence case>",
  "description": "<70 to 165 characters; answers the query, like the English one>",
  "keywords": ["<4 realistic French search phrases a Quebec searcher would type>"],
  "answer": "<35 to 75 words: the direct answer, same facts as the English 'answer'>",
  "sections": [ { "h2": "...", "blocks": [ ...same block types and count as the English... ] } ],
  "sources": [ { "label": "...", "url": "..." } ]
}
```

- Same number of sections; in each, the same block kinds in the same order (`p`, `ul`, `ol`, `table`, `note`);
  same number of list items and table rows and columns.
- Sources: same number, same order. Keep each URL exactly as in the English file (a later pass swaps in
  Postes Canada's French pages). Translate the label: « Canada Post, Consumer prices » becomes
  « Postes Canada, prix pour les consommateurs ».
- **Links.** Every inline link `[text](/blog/some-english-slug)` stays, with the ENGLISH slug unchanged in
  the path (the site maps it to the French page). Translate only the link text. Any other link stays
  identical.
- **Figures.** Every number must survive: prices, grams, millimetres, dates, thresholds, percentages.
  A test compares them with the English guide. Never round, convert, or restate a figure.
- **Do not translate**: `sendletter`, `API`, `PDF`, `CSV`, code, the postal code `H0H 0H0`, URLs.

## Typography (OQLF) — the checker enforces these

- Money: `1,24 $` = number, NO-BREAK SPACE, `$`; decimal comma; `$2.00` becomes `2,00 $`; `$2` becomes `2 $`;
  `$1,000` becomes `1 000 $` (no-break space between thousand groups).
- Units: `30 g`, `500 g`, `245 × 156 × 5 mm` with a no-break space between number and unit; `5 %` with a
  no-break space before `%`.
- Colon `:` is preceded by a NO-BREAK SPACE. **No space before `;` `?` `!`** (Quebec usage).
- Quotation marks `« … »` with a no-break space inside each mark; never straight `"`.
- Apostrophe is the typographic `’`, never `'`.
- Dates: `le 26 novembre 2026`; months and weekdays lower case; never `2026-11-26`. Times: `8 h`, `19 h 30`.
- Headings, titles and table headers: capital on the first word and on proper nouns only (Postes Canada,
  Poste-lettres, Québec, place names), not on every word. Source labels are not headings.
- In JSON write each no-break space as the escape ` ` so it cannot be lost.

## Terminology (Postes Canada's French pages and the OQLF's Grand dictionnaire / Banque de dépannage)

| English | Use | Avoid |
|---|---|---|
| Canada Post | Postes Canada | Poste Canada |
| Lettermail | Poste-lettres | courrier-lettre, Lettermail |
| Incentive Lettermail | Poste-lettres à tarifs préférentiels | Incentive Lettermail |
| Personalized Mail | Courrier personnalisé | |
| Permanent stamp | timbre Permanent (capital P) | timbre permanent |
| stamp booklet / coil / pane | carnet / rouleau / feuillet | |
| single stamp | timbre à l’unité | |
| postage | affranchissement | |
| postage meter | machine à affranchir | |
| postal code | code postal | |
| return address | adresse de l’expéditeur | adresse de retour |
| sender / recipient | expéditeur / destinataire | |
| window envelope | enveloppe à fenêtre | |
| standard / non-standard / oversize | standard / non standard / surdimensionné | |
| Registered Mail | Courrier recommandé | courrier enregistré |
| proof of mailing | preuve de dépôt | preuve d’envoi |
| tracking number | numéro de repérage | numéro de suivi |
| signature on delivery | signature à la livraison | |
| delivery standard | norme de livraison / délai de livraison | |
| business day | jour ouvrable | |
| community mailbox | boîte postale communautaire | |
| street letter box | boîte aux lettres (Postes Canada) | |
| post office | bureau de poste | |
| PO box | case postale | boîte postale |
| general delivery | poste restante | |
| rural route | route rurale | |
| return to sender | renvoyé à l’expéditeur | |
| insufficient postage | courrier insuffisamment affranchi | |
| Do Not Forward | « Ne pas faire suivre » | |
| email | courriel | e-mail, mail, email |
| mail merge | publipostage | |
| formal notice | mise en demeure | |
| volume discount | remise sur quantité | escompte de volume |
| subscription | abonnement | |
| tax-exempt | exempt de taxe | hors taxe |
| GST / HST / QST | TPS / TVH / TVQ | GST, HST, QST |
| double-sided | recto verso (no hyphen) | recto-verso |
| mailing fee | frais d’envoi | |
| print-and-mail service | service d’impression et d’envoi postal | |
| webhook | lien de rappel HTTP | |
| federal budget | budget fédéral | |

Also avoid « faire du sens », « rencontrer les exigences » (say « respecter »), « adresse e-mail ».
If a term is missing here, choose the Quebec / OQLF form and keep it consistent within the guide.

## Check before you finish

```
node --experimental-transform-types --import ./tests/register.mjs tests/check-fr-file.mts src/content/guides-fr/<id>.json
```

It must print `ok`. It compares your file with the English one (structure, figures, links) and applies
the rules above. Fix every line it reports. A passing check is not a review: reread your French for
sense, tone and natural phrasing, and keep every claim as in the English.
