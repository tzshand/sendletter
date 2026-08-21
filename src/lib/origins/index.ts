import type { OriginPage } from "./types";
import { hi } from "@/content/origins/hi";
import { pa, ur, bn, ta, gu } from "@/content/origins/south-asia";
import { zhHans, zhHant, ja, ko } from "@/content/origins/east-asia";
import { tl, vi } from "@/content/origins/southeast-asia";
import { ar, fa, tr } from "@/content/origins/mena";
import { de, fr, it, nl } from "@/content/origins/europe-west";
import { ru, uk, pl, ro } from "@/content/origins/europe-east";
import { es, pt } from "@/content/origins/iberia-latam";
import { am, ti, so, enNg } from "@/content/origins/africa";

export type { OriginPage } from "./types";
export const SITE = "https://sendletter.app";

/**
 * Every origin page, in the order the hub lists them: roughly by how much mail
 * actually flows from that market to Canada, which tracks immigration volume
 * more than population.
 */
export const ORIGINS: OriginPage[] = [
  hi, pa, tl, zhHans, zhHant, es, ar, fr, ur, pt,
  vi, ko, ja, de, it, ru, uk, fa, pl, nl,
  ro, tr, bn, ta, gu, am, ti, so, enNg,
];

export function getOrigin(lang: string, slug: string): OriginPage | undefined {
  return ORIGINS.find((o) => o.lang === lang && o.slug === slug);
}

export function originsForLang(lang: string): OriginPage[] {
  return ORIGINS.filter((o) => o.lang === lang);
}

/** English pages live at the root; every other language is prefixed. */
export function originPath(o: OriginPage): string {
  return o.lang === "en" ? `/mail-to-canada/${o.slug}` : `/${o.lang}/mail-to-canada/${o.slug}`;
}

export function originUrl(o: OriginPage): string {
  return `${SITE}${originPath(o)}`;
}

/**
 * hreflang alternates for the whole cluster.
 *
 * These pages are NOT translations of one another — each covers a different
 * origin country — so they are deliberately not declared as alternates of each
 * other. Doing so would tell search engines that the Japanese and German pages
 * are the same content in two languages, which is false and would suppress one
 * of them. The only thing every page shares is the hub, so that carries
 * x-default and each page self-references.
 */
export function alternatesFor(o: OriginPage): Record<string, string> {
  return {
    [o.hreflang]: originUrl(o),
    "x-default": `${SITE}/mail-to-canada`,
  };
}

/** Languages the section exists in, for the hub's language switcher. */
export const LANGS: { lang: string; label: string }[] = [
  { lang: "en", label: "English" },
  { lang: "fr", label: "Français" },
  { lang: "es", label: "Español" },
  { lang: "pt", label: "Português" },
  { lang: "de", label: "Deutsch" },
  { lang: "it", label: "Italiano" },
  { lang: "nl", label: "Nederlands" },
  { lang: "pl", label: "Polski" },
  { lang: "ro", label: "Română" },
  { lang: "ru", label: "Русский" },
  { lang: "uk", label: "Українська" },
  { lang: "tr", label: "Türkçe" },
  { lang: "ar", label: "العربية" },
  { lang: "fa", label: "فارسی" },
  { lang: "ur", label: "اردو" },
  { lang: "hi", label: "हिन्दी" },
  { lang: "pa", label: "ਪੰਜਾਬੀ" },
  { lang: "gu", label: "ગુજરાતી" },
  { lang: "bn", label: "বাংলা" },
  { lang: "ta", label: "தமிழ்" },
  { lang: "zh", label: "简体中文" },
  { lang: "zh-hant", label: "繁體中文" },
  { lang: "ja", label: "日本語" },
  { lang: "ko", label: "한국어" },
  { lang: "vi", label: "Tiếng Việt" },
  { lang: "tl", label: "Filipino" },
  { lang: "am", label: "አማርኛ" },
  { lang: "ti", label: "ትግርኛ" },
  { lang: "so", label: "Soomaali" },
];
