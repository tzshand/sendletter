// The machine-readable API assets: OpenAPI, Postman, llms.txt and the MCP server.
import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import path from "node:path";

process.env.DATABASE_URL = "postgres://test";

const { buildOpenApi, buildPostman } = await import("../src/lib/openapi.ts");
const llms = await import("../src/app/llms.txt/route.ts");

test("openapi: every endpoint is described, and the floor price comes from the code", () => {
  const spec = buildOpenApi();
  assert.equal(spec.openapi, "3.1.0");
  for (const p of ["/api/v1/letters", "/api/v1/letters/batch", "/api/v1/letters/{id}", "/api/v1/quote", "/api/v1/pricing", "/api/v1/webhooks", "/api/v1/webhooks/{id}", "/api/v1/webhooks/{id}/test"]) {
    assert.ok(spec.paths[p as keyof typeof spec.paths], p);
  }
  assert.match(spec.info.description, /\$1\.69/);
  // Every $ref resolves.
  const refs = [...JSON.stringify(spec).matchAll(/"\$ref":"#\/components\/schemas\/(\w+)"/g)].map((m) => m[1]);
  for (const r of refs) assert.ok((spec.components.schemas as Record<string, unknown>)[r], `missing schema ${r}`);
  assert.deepEqual((spec.components.schemas.CreateLetter.properties.colour as { default: boolean }).default, false);
});

test("postman: a collection with a test-key variable and an idempotency key on send", () => {
  const c = buildPostman();
  assert.match(String(c.variable.find((v) => v.key === "apiKey")!.value), /^sl_test_/);
  const send = c.item.find((i) => i.name.startsWith("Send a letter"))!;
  assert.ok(send.request.header.some((h) => h.key === "Idempotency-Key"));
  assert.ok(c.item.length >= 9);
});

test("llms.txt: states the prices and the honest limits", async () => {
  const text = await llms.GET().text();
  assert.match(text, /as low as \$1\.69/);
  assert.match(text, /no tracking/i);
  assert.match(text, /Idempotency-Key/);
  assert.match(text, /openapi\.json/);
  assert.match(text, /letters\/batch/);
});

function rpc(env: Record<string, string>, messages: object[]): Promise<Record<string, unknown>[]> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [path.resolve(import.meta.dirname, "../mcp/sendletter-mcp.mjs")], { env: { ...process.env, ...env }, stdio: ["pipe", "pipe", "inherit"] });
    let out = "";
    child.stdout.on("data", (d) => { out += d; });
    child.on("close", () => resolve(out.trim().split("\n").filter(Boolean).map((l) => JSON.parse(l))));
    child.on("error", reject);
    for (const m of messages) child.stdin.write(JSON.stringify(m) + "\n");
    child.stdin.end();
  });
}

test("mcp: lists its tools, and a live key refuses to send without confirm_live", async () => {
  const replies = await rpc({ SENDLETTER_API_KEY: "sl_live_" + "a".repeat(64), SENDLETTER_BASE_URL: "http://127.0.0.1:9" }, [
    { jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-03-26" } },
    { jsonrpc: "2.0", method: "notifications/initialized" },
    { jsonrpc: "2.0", id: 2, method: "tools/list" },
    { jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "send_letter", arguments: { to: { name: "A", line1: "1 St", city: "Toronto", province: "ON", postal_code: "M5V 1A1" }, from: { name: "B", line1: "2 St", city: "Toronto", province: "ON", postal_code: "M5V 1A1" }, body: "hi" } } },
    { jsonrpc: "2.0", id: 4, method: "nope" },
  ]);
  const byId = (id: number) => replies.find((r) => r.id === id) as { result?: { tools?: { name: string }[]; isError?: boolean; content?: { text: string }[] }; error?: { code: number } };
  assert.equal(byId(1).result!.tools, undefined);
  assert.deepEqual(byId(2).result!.tools!.map((t) => t.name), ["quote_letter", "send_letter", "send_letters", "get_letter", "list_letters", "cancel_letter"]);
  assert.equal(byId(3).result!.isError, true);
  assert.match(byId(3).result!.content![0].text, /confirm_live: true/);
  assert.equal(byId(4).error!.code, -32601);
});

const llmsFull = await import("../src/app/llms-full.txt/route.ts");
const schemaRoute = await import("../src/app/schema.json/route.ts");
const fs = await import("node:fs");

test("llms-full.txt and schema.json are generated from the rates: the floor price, batch, idempotency, no stale price", async () => {
  const text = await llmsFull.GET().text();
  assert.match(text, /\$1\.69/);
  assert.match(text, /\/api\/v1\/letters\/batch/);
  assert.match(text, /Idempotency-Key/);
  assert.match(text, /Retry-After/);
  assert.match(text, /full Canadian code/i);
  assert.doesNotMatch(text + (await llms.GET().text()), /\$3\.79/, "no stale flat price");
  const ld = await schemaRoute.GET().json();
  assert.equal(ld["@type"], "SoftwareApplication");
  assert.deepEqual(ld.offers.map((o: { price: string }) => o.price), ["3.49", "1.69"]);
});

test("no static file in public/ shadows a generated route (Next serves public/ first, so a stale copy would win)", () => {
  const root = path.resolve(import.meta.dirname, "..");
  const routes = fs.readdirSync(path.join(root, "src/app"), { withFileTypes: true })
    .filter((d) => d.isDirectory() && fs.existsSync(path.join(root, "src/app", d.name, "route.ts")))
    .map((d) => d.name);
  const publicFiles = new Set(fs.readdirSync(path.join(root, "public")));
  for (const r of routes) assert.equal(publicFiles.has(r), false, `public/${r} would shadow src/app/${r}/route.ts`);
  for (const f of ["openapi.json", "postman.json", "llms.txt", "llms-full.txt", "schema.json"]) assert.equal(publicFiles.has(f), false, `stale public/${f}`);
});
