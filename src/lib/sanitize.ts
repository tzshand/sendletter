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
  // eslint-disable-next-line no-control-regex
  return s.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F\u200B\u200C\u200D\uFEFF]/g, "");
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
