#!/usr/bin/env node
// A minimal Model Context Protocol server for the sendletter API, so an AI agent
// can quote, send, check and cancel physical letters. No dependencies: it speaks
// JSON-RPC 2.0 over stdio, one JSON message per line.
//
//   SENDLETTER_API_KEY=sl_test_...  node mcp/sendletter-mcp.mjs
//   SENDLETTER_BASE_URL=https://sendletter.app   (optional)
//
// With a test key (sl_test_) nothing is printed, mailed or billed. With a live key
// (sl_live_) send_letter mails real mail and spends real money, so it refuses
// unless the call says confirm_live: true.

import { createInterface } from "node:readline";
import { randomUUID } from "node:crypto";

const BASE = (process.env.SENDLETTER_BASE_URL || "https://sendletter.app").replace(/\/$/, "");
const KEY = process.env.SENDLETTER_API_KEY || "";
const LIVE = KEY.startsWith("sl_live_");

const address = {
  type: "object",
  properties: {
    name: { type: "string" }, line1: { type: "string" }, line2: { type: "string" }, city: { type: "string" },
    province: { type: "string", description: "e.g. ON" }, postal_code: { type: "string", description: "e.g. M5V 2T6" }, country: { type: "string", description: "CA for the recipient" },
  },
  required: ["name", "line1", "city", "province", "postal_code"],
};

const TOOLS = [
  {
    name: "quote_letter",
    description: "Price a letter without sending it. Returns the total in cents and the breakdown. Free and has no side effects.",
    inputSchema: { type: "object", properties: { pages: { type: "integer", minimum: 1 }, letter_size: { enum: ["standard", "large", "legal"] }, colour: { type: "boolean" } }, required: ["pages"] },
  },
  {
    name: "send_letter",
    description: "Print and mail a letter to a Canadian address. With a test key nothing is mailed or billed. With a live key this mails real mail and charges real money, and requires confirm_live: true. Canadian recipients only; no tracking beyond queued/printed/mailed.",
    inputSchema: {
      type: "object",
      properties: {
        to: address, from: address,
        body: { type: "string", description: "The letter text." },
        salutation: { type: "string" }, closing: { type: "string" }, signature: { type: "string" },
        letter_size: { enum: ["standard", "large", "legal"] }, colour: { type: "boolean" }, reference: { type: "string" },
        idempotency_key: { type: "string", description: "Reuse the same key when retrying so a second letter is never mailed. One is generated if omitted." },
        confirm_live: { type: "boolean", description: "Required to send with a live key." },
      },
      required: ["to", "from", "body"],
    },
  },
  {
    name: "send_letters",
    description: "Send up to 100 letters in ONE request (counts as one against the rate limit). Use this instead of calling send_letter in a loop. Each item has the same fields as send_letter. With a live key this mails real mail and charges real money, and requires confirm_live: true. Reuse the same idempotency_key to safely retry the whole batch.",
    inputSchema: {
      type: "object",
      properties: {
        letters: { type: "array", maxItems: 100, items: { type: "object", properties: { to: address, from: address, body: { type: "string" }, salutation: { type: "string" }, closing: { type: "string" }, signature: { type: "string" }, letter_size: { enum: ["standard", "large", "legal"] }, colour: { type: "boolean" }, reference: { type: "string" } }, required: ["to", "from", "body"] } },
        idempotency_key: { type: "string", description: "Required to retry safely: the same batch with the same key creates only the letters not created before. One is generated if omitted." },
        confirm_live: { type: "boolean" },
      },
      required: ["letters"],
    },
  },
  { name: "get_letter", description: "Get a letter and its status (queued, printed, mailed, cancelled).", inputSchema: { type: "object", properties: { id: { type: "string" } }, required: ["id"] } },
  { name: "list_letters", description: "List recent letters, newest first.", inputSchema: { type: "object", properties: { limit: { type: "integer", minimum: 1, maximum: 100 } } } },
  { name: "cancel_letter", description: "Cancel a letter that is still queued. Its billing is voided or refunded. A printed letter cannot be cancelled.", inputSchema: { type: "object", properties: { id: { type: "string" } }, required: ["id"] } },
];

async function api(path, init = {}) {
  if (!KEY && path !== "/api/v1/quote") throw new Error("SENDLETTER_API_KEY is not set");
  const res = await fetch(BASE + path, {
    ...init,
    headers: { "content-type": "application/json", ...(KEY ? { authorization: `Bearer ${KEY}` } : {}), ...(init.headers || {}) },
  });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = { raw: text }; }
  if (!res.ok) throw new Error(`sendletter ${res.status} ${json.code || ""}: ${json.error || text}`);
  return json;
}

const CALLS = {
  quote_letter: (a) => api("/api/v1/quote", { method: "POST", body: JSON.stringify({ pages: a.pages, letter_size: a.letter_size, colour: a.colour }) }),
  send_letter: (a) => {
    if (LIVE && a.confirm_live !== true) {
      throw new Error("This key is LIVE: sending mails a real letter and charges real money. Call again with confirm_live: true to proceed, or use a test key (sl_test_).");
    }
    const to = { country: "CA", ...a.to };
    return api("/api/v1/letters", {
      method: "POST",
      headers: { "idempotency-key": a.idempotency_key || randomUUID() },
      body: JSON.stringify({
        mode: "draft", letter_size: a.letter_size, colour: a.colour, reference: a.reference, from: { country: "CA", ...a.from }, to,
        letter: { salutation: a.salutation, body: a.body, closing: a.closing, signature: a.signature },
      }),
    });
  },
  send_letters: (a) => {
    if (LIVE && a.confirm_live !== true) {
      throw new Error("This key is LIVE: sending mails real letters and charges real money. Call again with confirm_live: true to proceed, or use a test key (sl_test_).");
    }
    return api("/api/v1/letters/batch", {
      method: "POST",
      headers: { "idempotency-key": a.idempotency_key || randomUUID() },
      body: JSON.stringify({
        letters: (a.letters || []).map((l) => ({
          mode: "draft", letter_size: l.letter_size, colour: l.colour, reference: l.reference,
          from: { country: "CA", ...l.from }, to: { country: "CA", ...l.to },
          letter: { salutation: l.salutation, body: l.body, closing: l.closing, signature: l.signature },
        })),
      }),
    });
  },
  get_letter: (a) => api(`/api/v1/letters/${encodeURIComponent(a.id)}`),
  list_letters: (a) => api(`/api/v1/letters?limit=${a.limit || 20}`),
  cancel_letter: (a) => api(`/api/v1/letters/${encodeURIComponent(a.id)}`, { method: "DELETE" }),
};

const send = (msg) => process.stdout.write(JSON.stringify(msg) + "\n");

async function handle(msg) {
  const { id, method, params } = msg;
  if (method === "initialize") {
    return send({ jsonrpc: "2.0", id, result: { protocolVersion: params?.protocolVersion || "2025-03-26", capabilities: { tools: {} }, serverInfo: { name: "sendletter", version: "1.0.0" } } });
  }
  if (method === "notifications/initialized" || method?.startsWith("notifications/")) return;
  if (method === "ping") return send({ jsonrpc: "2.0", id, result: {} });
  if (method === "tools/list") return send({ jsonrpc: "2.0", id, result: { tools: TOOLS } });
  if (method === "tools/call") {
    const fn = CALLS[params?.name];
    if (!fn) return send({ jsonrpc: "2.0", id, error: { code: -32602, message: `Unknown tool ${params?.name}` } });
    try {
      const out = await fn(params.arguments || {});
      return send({ jsonrpc: "2.0", id, result: { content: [{ type: "text", text: JSON.stringify(out, null, 2) }] } });
    } catch (e) {
      return send({ jsonrpc: "2.0", id, result: { isError: true, content: [{ type: "text", text: e.message }] } });
    }
  }
  if (id !== undefined) send({ jsonrpc: "2.0", id, error: { code: -32601, message: `Method not found: ${method}` } });
}

createInterface({ input: process.stdin }).on("line", (line) => {
  if (!line.trim()) return;
  let msg;
  try { msg = JSON.parse(line); } catch { return send({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } }); }
  handle(msg).catch((e) => send({ jsonrpc: "2.0", id: msg.id ?? null, error: { code: -32603, message: e.message } }));
});
