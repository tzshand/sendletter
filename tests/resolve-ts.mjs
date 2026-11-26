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
};

const withExt = (p) => (fs.existsSync(p) ? p : fs.existsSync(p + ".ts") ? p + ".ts" : p + ".tsx");

export async function resolve(specifier, context, nextResolve) {
  if (MOCKS[specifier]) return { url: pathToFileURL(path.join(root, MOCKS[specifier])).href, shortCircuit: true };
  if (specifier === "@electric-sql/pglite" && process.env.PGLITE_DIR) {
    // Optional: tests/pg-real.test.mts runs against a real Postgres (PGlite) when this points at an install of it.
    return { url: pathToFileURL(path.join(process.env.PGLITE_DIR, "node_modules/@electric-sql/pglite/dist/index.js")).href, shortCircuit: true };
  }
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

// JSON modules (the guides under src/content/guides) need an import attribute
// under plain Node; the bundler does not. Serve them as ES modules instead.
export async function load(url, context, nextLoad) {
  if (url.endsWith(".json")) {
    const text = fs.readFileSync(new URL(url), "utf8");
    return { format: "module", source: `export default ${text};`, shortCircuit: true };
  }
  return nextLoad(url, context);
}
