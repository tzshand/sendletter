/**
 * Sanitization utilities for user-provided strings that get interpolated into HTML.
 */

/** Escape HTML special characters to prevent injection when interpolating into HTML. */
export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Strip ASCII control characters (0x00–0x1F) except tab (0x09), newline (0x0A),
 * and carriage return (0x0D). Also strips DEL (0x7F) and common Unicode control chars.
 * These can cause rendering issues, log injection, or parser confusion.
 */
export function stripControl(s: string): string {
  return s.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F\u200B\u200C\u200D\uFEFF]/g, "");
}

/**
 * A Content-Security-Policy for letter.html, the customer-supplied document that is
 * attached to the fulfilment email and opened in a browser to be printed. With
 * `default-src 'none'` nothing can run or connect: no script (inline or external),
 * no event handlers, no fetch, no frames, no forms. Only inline styles, fonts and
 * images (data: or https:) are allowed, which is all a printed letter needs.
 */
export const LETTER_CSP =
  `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data: https:; style-src 'unsafe-inline'; font-src data:; form-action 'none'; base-uri 'none'"/>`;

/**
 * Remove what could act on the person who opens a customer's HTML: scripts, frames,
 * objects, embeds, forms, links to other documents, base/meta redirects, inline event
 * handlers and javascript:/data:text/html URLs. This is a second layer under LETTER_CSP
 * (which already stops these from running in a modern browser), not the only one, and
 * it is deliberately blunt: a letter is text, tables and images.
 */
export function sanitizeLetterHtml(html: string): string {
  const once = (input: string): string => {
    let s = input;
    // Whole elements, with their content. (<style> is allowed: LETTER_CSP confines it.)
    for (const tag of ["script", "iframe", "frame", "frameset", "object", "embed", "applet", "form", "template", "noscript", "svg", "math"]) {
      s = s.replace(new RegExp(String.raw`<\s*${tag}\b[\s\S]*?<\s*/\s*${tag}\s*>`, "gi"), "");
      s = s.replace(new RegExp(String.raw`<\s*/?\s*${tag}\b[^>]*>`, "gi"), "");
    }
    // Void or redirecting elements.
    s = s.replace(/<\s*(base|link|meta|input|button|select|textarea|isindex)\b[^>]*>/gi, "");
    // Inline event handlers (onclick=, onerror=, ...), quoted or not.
    s = s.replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "");
    // javascript:, vbscript: and html data: URLs in any attribute.
    s = s.replace(/\b(href|src|action|formaction|xlink:href|background|poster)\s*=\s*(["']?)\s*(javascript|vbscript|data\s*:\s*text\/html)[^"'>\s]*\2/gi, "$1=$2#$2");
    return s;
  };
  // Removing one thing can join the pieces around it into another (<scr<script></script>ipt>), so repeat until nothing changes.
  let cur = html;
  for (let i = 0; i < 10; i++) {
    const next = once(cur);
    if (next === cur) return next;
    cur = next;
  }
  return cur;
}

/**
 * Sanitize user-provided CSS to prevent tag injection.
 * CSS should never contain HTML tags — strip </style (breakout),
 * <script, <style, and </ sequences that could escape the CSS context.
 */
export function sanitizeCss(s: string): string {
  return s
    .replace(/<\s*\/\s*style/gi, "/* blocked */")
    .replace(/<\s*script/gi, "/* blocked */")
    .replace(/<\s*\/\s*script/gi, "/* blocked */")
    .replace(/<\s*style/gi, "/* blocked */");
}
