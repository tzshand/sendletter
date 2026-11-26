// Terminology and typography rules for the Canadian French pages, taken from the OQLF
// (Vitrine linguistique: Grand dictionnaire terminologique, Banque de dépannage linguistique)
// and Postes Canada's French pages. Each rule names its source so a failure explains itself.
//
// Two characters matter below: NBSP (U+00A0) and the narrow no-break space (U+202F),
// both accepted wherever the OQLF asks for an "espace insécable".

import type { FrGuide } from "../src/lib/hubs.ts";

const NB = "  ";
const MONTHS_FR = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
const MONTHS_EN = ["january", "february", "march", "april", "june", "july", "august", "september", "october", "november", "december"];

/** Every visible string of a guide, joined. Link targets are removed, link text kept. */
export function frTextOf(g: Pick<FrGuide, "title" | "description" | "answer" | "sections" | "sources">): string {
  const parts: string[] = [g.title, g.description, g.answer];
  for (const s of g.sections) {
    parts.push(s.h2);
    for (const b of s.blocks) {
      if ("p" in b) parts.push(b.p);
      else if ("note" in b) parts.push(b.note);
      else if ("ul" in b) parts.push(...b.ul);
      else if ("ol" in b) parts.push(...b.ol);
      else parts.push(...b.table.headers, ...b.table.rows.flat());
    }
  }
  for (const s of g.sources) parts.push(s.label);
  return parts.join("\n").replace(/\[([^\]]*)\]\([^)]*\)/g, "$1");
}

type Rule = { name: string; source: string; test: (text: string) => string[] };
const find = (text: string, re: RegExp, ctx = 18) =>
  [...text.matchAll(re)].map((m) => `…${text.slice(Math.max(0, (m.index ?? 0) - ctx), (m.index ?? 0) + m[0].length + ctx).replace(/\n/g, " ")}…`);

// Words that are capitalised in running French because they are proper nouns or product names.
const PROPER = new Set([
  "Postes", "Canada", "Poste-lettres", "Permanent", "Permanents", "Poste", "Courrier", "Xpresspost", "Québec", "Ontario", "Alberta", "Manitoba", "Saskatchewan", "Nunavut", "Yukon",
  "Colombie-Britannique", "Nouveau-Brunswick", "Nouvelle-Écosse", "Terre-Neuve-et-Labrador", "Île-du-Prince-Édouard", "Territoires", "Nord-Ouest", "États-Unis", "Royaume-Uni",
  "Noël", "Père", "Pôle", "Nord", "Europe", "Afrique", "Asie", "Australie", "Nouvelle-Zélande", "Chine", "Inde", "Japon", "France", "Allemagne", "Suisse", "Pays-Bas", "Moyen-Orient",
  "Amérique", "Antilles", "Caraïbes", "Sud", "Centrale", "Amériques", "API", "TPS", "TVH", "TVQ", "PDF", "CSV", "GST", "HST", "QST", "Global", "News", "CTV", "BNN", "Bloomberg", "H0H", "FSA",
  "OQLF", "Santa", "Claus", "Montréal", "Toronto", "ZIP", "RTA", "ULL", "Royal", "Mail", "Web", "USPS", "Word", "Excel", "Budget", "Incentive", "Lettermail", "Courriel", "Solutions", "Petite", "Entreprise", "Lob", "PostGrid", "sendletter", "Stripe", "Resend", "Cloud", "Mail",
]);

export const RULES: Rule[] = [
  {
    name: "deux-points précédé d’une espace insécable",
    source: "OQLF, Espacement avant et après les signes de ponctuation",
    test: (t) => find(t.replace(/https?:\/\/\S+/g, "").replace(/\b\d{1,2}:\d{2}\b/g, ""), new RegExp(`[^${NB}\\s]:(?=\\s|$)|[ ]:(?=\\s|$)`, "g")),
  },
  {
    name: "aucune espace avant ; ? !",
    source: "OQLF, Espacement avant et après les signes de ponctuation (usage québécois)",
    test: (t) => find(t, new RegExp(`[ ${NB}][;?!]`, "g")),
  },
  {
    name: "monnaie : 1,24 $ (nombre, espace insécable, symbole), jamais $1.24 ni 1.24 $",
    source: "OQLF, Écriture des symboles d’unités monétaires",
    test: (t) => [
      ...find(t, /\$[ 	]?\d/g),
      ...find(t, /\d\$/g),
      ...find(t, /\d [$]/g),
      ...find(t, /\d\.\d{2}(?!\d)/g),
    ],
  },
  {
    name: "nombres : virgule décimale; espace insécable entre les tranches de trois chiffres",
    source: "OQLF, Espacements dans les nombres",
    test: (t) => [
      ...find(t, /\b\d{1,3},\d{3}\b(?!\s?(?:\$|g\b))/g).filter((s) => !/\d,\d{2}(?!\d)/.test(s)),
      ...find(t, /\b\d{1,3}(?: )\d{3}\b/g),
      ...find(t.replace(/(\d),(\d{3})\b/g, "$1$2"), /\b\d+\.\d+\b/g),
    ],
  },
  {
    name: "espace insécable entre le nombre et l’unité ou le symbole (30 g, 5 %)",
    source: "OQLF, Formation des symboles; Espacement avant et après les symboles",
    test: (t) => [...find(t, /\d (?:g|kg|mm|cm|po|%)(?![\p{L}])/gu), ...find(t, /\d(?:g|kg|mm|cm)(?![\p{L}])/gu)],
  },
  {
    name: "guillemets français « » avec espace insécable à l’intérieur; pas de guillemets droits",
    source: "OQLF, Guillemets : généralités",
    test: (t) => [...find(t, /«[ ]|[ ]»/g), ...find(t, new RegExp(`«[^${NB}]`, "g")), ...find(t, new RegExp(`[^${NB}]»`, "g")), ...find(t, /"/g)],
  },
  {
    name: "apostrophe typographique (’) et non droite (')",
    source: "convention du site",
    test: (t) => find(t.replace(/https?:\/\/\S+/g, ""), /\w'\w/g),
  },
  {
    name: "date : « le 26 novembre 2026 »; mois en minuscules, en toutes lettres, pas de mois anglais",
    source: "OQLF, Date et heure; Jours de la semaine",
    test: (t) => [
      ...find(t, new RegExp(`(?<![.!?]\\s|\\n)\\b(${MONTHS_FR.map((m) => m[0].toUpperCase() + m.slice(1)).join("|")})\\b`, "g")),
      ...find(t.toLowerCase(), new RegExp(`\\b(${MONTHS_EN.join("|")})\\b`, "g")),
      ...find(t, /\b\d{4}-\d{2}-\d{2}\b/g),
    ],
  },
  {
    name: "heure : 8 h ou 19 h 30 (espaces insécables), pas 8:00 ni 8h",
    source: "OQLF, Date et heure",
    test: (t) => [...find(t, /\b\d{1,2}:\d{2}\b/g), ...find(t, /\b\d{1,2}h\b/g)],
  },
  {
    name: "courriel, jamais e-mail, email ni mail",
    source: "OQLF, GDT « courriel »",
    test: (t) => find(t, /\b(?:e-?mails?|mails?)\b/gi).filter((s) => !/sendletter|Royal Mail|First-Class Mail/i.test(s)),
  },
  {
    name: "remise sur quantité, jamais « escompte de volume »",
    source: "OQLF, GDT « remise sur quantité » (calque signalé)",
    test: (t) => find(t, /escompte (?:de|sur) volume|rabais de volume/gi),
  },
  {
    name: "pas de « faire du sens » ni « rencontrer » au sens de satisfaire une exigence",
    source: "OQLF, Banque de dépannage linguistique (calques)",
    test: (t) => [...find(t, /faire(?:nt)? du sens|fait du sens/gi), ...find(t, /rencontrer (?:les |des )?(?:exigences|critères|conditions)/gi)],
  },
  {
    name: "case postale, jamais « boîte postale » (sauf boîte postale communautaire)",
    source: "OQLF, GDT « case postale »; Postes Canada, glossaire",
    test: (t) => find(t, /boîtes? postales?(?! communautaires?)/gi),
  },
  {
    name: "adresse de l’expéditeur plutôt que « adresse de retour »",
    source: "OQLF, GDT « adresse de l’expéditeur » (« adresse de retour » critiquée au Québec)",
    test: (t) => find(t, /adresses? de retour/gi),
  },
  {
    name: "terminologie de Postes Canada : preuve de dépôt, numéro de repérage, Courrier recommandé",
    source: "Postes Canada, page Courrier recommandé",
    test: (t) => [
      ...find(t, /preuve d’envoi|preuve d’expédition/gi),
      ...find(t, /numéros? de suivi/gi),
      ...find(t, /courrier enregistré|poste recommandée|lettre recommandée/gi),
    ],
  },
  {
    name: "timbre Permanent (P majuscule), Poste-lettres, Postes Canada",
    source: "Postes Canada, tarification Poste-lettres et boutique",
    test: (t) => [
      ...find(t, /timbres? permanents?\b/g),
      ...find(t, /\bposte-lettres\b/g).filter((s) => !/[.!?]\s/.test(s)),
      ...find(t, /\bPoste Canada\b/g),
      ...find(t, /\bCanada Post\b/g),
    ],
  },
  {
    name: "produits de Postes Canada en français : pas de Lettermail, Registered Mail, Permanent stamp",
    source: "Postes Canada, versions françaises des pages",
    test: (t) => find(t, /\b(?:Lettermail|Registered Mail|Permanent stamp|Incentive Lettermail|Personalized Mail)\b/g),
  },
  {
    name: "taxes : TPS, TVH, TVQ (pas GST, HST, QST)",
    source: "OQLF, GDT et abréviations de taxe",
    test: (t) => find(t, /\b(?:GST|HST|QST|PST)\b/g),
  },
  {
    name: "pas de « hors taxe » pour dire « exempt de taxe »",
    source: "OQLF, GDT « exempt de taxe »",
    test: (t) => find(t, /hors taxes?/gi),
  },
  {
    name: "impression recto verso (sans trait d’union)",
    source: "OQLF, trait d’union dans recto verso",
    test: (t) => find(t, /recto-verso/gi),
  },
  {
    name: "pas d’anglais résiduel (mots-outils)",
    source: "contrôle de traduction",
    test: (t) => find(t.replace(/https?:\/\/\S+/g, ""), /\b(?:the|and|with|your|you|are|this|that|what|which|from|letters?|stamps?|postage|delivery)\b(?=[ ,.;:])/g).filter((s) => !/Global News|sendletter|Lob|PostGrid/.test(s)),
  },
];

/** Headings (title, h2, table headers): capital on the first word and on proper nouns only. */
export function checkHeadings(headings: string[]): string[] {
  const out: string[] = [];
  for (const line of headings) {
    const words = line.split(/\s+/);
    if (words.length < 3) continue;
    const caps = words.slice(1).filter((w) => /^[A-ZÉÈÀÂÊÎÔÛÇ]/.test(w.replace(/^[«(]/, "")) && !PROPER.has(w.replace(/[,:()«»?]/g, "")));
    if (caps.length) out.push(`titres et intertitres : majuscule initiale seulement [OQLF, Majuscule aux titres d’œuvres et d’ouvrages] ${line} → ${caps.join(", ")}`);
  }
  return out;
}

export function frHeadingsOf(g: Pick<FrGuide, "title" | "sections">): string[] {
  return [g.title, ...g.sections.map((s) => s.h2), ...g.sections.flatMap((s) => s.blocks.flatMap((b) => ("table" in b ? b.table.headers : [])))];
}

/** Run every rule; each problem is "rule name (source): context". Empty means clean. */
export function checkFrench(text: string): string[] {
  const problems: string[] = [];
  for (const r of RULES) for (const hit of r.test(text)) problems.push(`${r.name} [${r.source}] ${hit}`);
  return problems;
}

// ── Parity helpers: the French guide must carry the same figures and links as the English one ──

export const blockTexts = (b: import("../src/lib/hubs.ts").Block): string[] => {
  if ("p" in b) return [b.p];
  if ("note" in b) return [b.note];
  if ("ul" in b) return b.ul;
  if ("ol" in b) return b.ol;
  return [...b.table.headers, ...b.table.rows.flat()];
};
export const bodyText = (g: { answer: string; sections: { blocks: import("../src/lib/hubs.ts").Block[] }[] }) =>
  [g.answer, ...g.sections.flatMap((s) => s.blocks.flatMap(blockTexts))].join("\n");

/** Numbers as the reader sees them, normalised so 1,24 $ (French) and $1.24 (English) are the same token. */
export function numbersOf(text: string, lang: "en" | "fr"): string[] {
  let t = text.replace(/\[([^\]]*)\]\([^)]*\)/g, "$1");
  if (lang === "en") t = t.replace(/(\d),(\d{3})\b/g, "$1$2");
  else t = t.replace(/(\d)[   ](?=\d{3}\b)/g, "$1").replace(/(\d),(\d)/g, "$1.$2");
  return [...t.matchAll(/\d+(?:\.\d+)?/g)].map((m) => String(Number(m[0]))).sort();
}
export const linksOf = (text: string) => [...text.matchAll(/\]\((\/[^)\s]*|https?:[^)\s]*)\)/g)].map((m) => m[1]).sort();

// Gender: Postes Canada's « Poste-lettres » follows « poste » (feminine). The articles must agree.
RULES.push({
  name: "Poste-lettres est féminin (la, de la, à la, une)",
  source: "cohérence avec « la poste »; à confirmer dans les pages françaises de Postes Canada",
  test: (t) => find(t, /\b(?:le|du|au|un|ce|Le|Du|Au|Un|Ce) Poste-lettres/g),
});

RULES.push({
  name: "timbres Permanents : l’adjectif prend le s au pluriel",
  source: "Postes Canada, boutique (« timbres Permanents »)",
  test: (t) => find(t, /(?:timbres|Timbres) Permanent(?!s)/g),
});
