// Test-only module resolver, registered via register.mjs.
//  - The app's source imports "./thing" and "@/lib/thing" (the bundler resolves the
//    extension and alias); plain Node needs real file URLs.
//  - A few external modules are swapped for in-memory fakes (tests/mocks) so the real
//    route handlers run without a database, Stripe, or a mail provider.
import { pathToFileURL } from "node:url";
import path from "node:path";
import fs from "node:fs";

const root = path.resolve(import.meta.dirname, "..");
const MOCKS = {
  "pg": "tests/mocks/pg.mts",
  "next/server": "tests/mocks/next-server.mts",
  "resend": "tests/mocks/resend.mts",
  "@/lib/stripe": "tests/mocks/stripe.mts",
  "@/lib/api-auth": "tests/mocks/api-auth.mts",
};

const withExt = (p) => (fs.existsSync(p) ? p : fs.existsSync(p + ".ts") ? p + ".ts" : p + ".tsx");

export async function resolve(specifier, context, nextResolve) {
  if (MOCKS[specifier]) return { url: pathToFileURL(path.join(root, MOCKS[specifier])).href, shortCircuit: true };
  if (specifier.startsWith("@/")) {
    return { url: pathToFileURL(withExt(path.join(root, "src", specifier.slice(2)))).href, shortCircuit: true };
  }
  try {
    return await nextResolve(specifier, context);
  } catch (e) {
    if (e && e.code === "ERR_MODULE_NOT_FOUND" && specifier.startsWith(".") && !/\.[cm]?[jt]sx?$/.test(specifier)) {
      return nextResolve(`${specifier}.ts`, context);
    }
    throw e;
  }
}
