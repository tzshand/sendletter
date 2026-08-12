/**
 * Coarse, honest device label from a user-agent string.
 *
 * Not analytics and not fingerprinting — just enough for someone to recognise
 * their own row in the session list, or fail to recognise one that isn't
 * theirs. Deliberately low resolution: exact versions would add nothing a user
 * can act on, and would make the stored string more identifying than it needs
 * to be.
 */
export function describeDevice(ua: string | null): string {
  if (!ua) return "Unknown device";

  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /OPR\//.test(ua)
      ? "Opera"
      : /Chrome\//.test(ua)
        ? "Chrome"
        : /Safari\//.test(ua) && !/Chrome/.test(ua)
          ? "Safari"
          : /Firefox\//.test(ua)
            ? "Firefox"
            : null;

  const os = /Windows/.test(ua)
    ? "Windows"
    : /iPhone|iPad|iPod/.test(ua)
      ? "iOS"
      : /Android/.test(ua)
        ? "Android"
        : /Mac OS X|Macintosh/.test(ua)
          ? "macOS"
          : /Linux/.test(ua)
            ? "Linux"
            : null;

  if (browser && os) return `${browser} on ${os}`;
  return browser ?? os ?? "Unknown device";
}
