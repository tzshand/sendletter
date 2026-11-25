// Runs the Next.js CLI from a working directory whose drive letter is upper-case.
//
// Why: Git Bash and VS Code terminals on Windows hand Node a lower-case drive
// ("c:\Users\..."). Next then loads its own modules under two spellings of the
// same path, and every page fails to prerender with
//   Invariant: Expected workStore to be initialized
// (the shared state lives in a module that was loaded twice). Building from
// "C:\Users\..." works. On Linux (Canner) and from an already-upper-case path
// this is a plain pass-through to `next`.
//
//   node scripts/next-cli.mjs build

import { spawnSync } from "node:child_process";
import path from "node:path";

const upperDrive = (p) => (process.platform === "win32" && /^[a-z]:/.test(p) ? p[0].toUpperCase() + p.slice(1) : p);

const cwd = upperDrive(process.cwd());
const nextBin = path.join(cwd, "node_modules", "next", "dist", "bin", "next");

const result = spawnSync(process.execPath, [nextBin, ...process.argv.slice(2)], {
  cwd,
  stdio: "inherit",
  env: process.env,
});

if (result.error) {
  console.error(`next-cli: could not run ${nextBin}: ${result.error.message}`);
  process.exit(1);
}
process.exit(result.status ?? 1);
