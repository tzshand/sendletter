// Shared check for Canner scheduled jobs calling our /api/cron/* routes.
//
// Canner sends an arbitrary header set; `x-cron-key` is the documented
// convention. The Authorization form is what the old Vercel cron used.

// Constant-time-ish comparison. The secret is high-entropy and this endpoint is
// not a realistic timing target, but string === on a credential is a bad habit
// to leave in a file that authorises charges or deletions.
function secretMatches(provided: string | null, expected: string | undefined): boolean {
  if (!provided || !expected || provided.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < provided.length; i++) {
    diff |= provided.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return diff === 0;
}

export function cronAuthorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  const bearer = req.headers.get("authorization")?.replace(/^Bearer /, "") ?? null;
  const cronKey = req.headers.get("x-cron-key");
  return secretMatches(cronKey, secret) || secretMatches(bearer, secret);
}
