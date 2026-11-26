// Shared plumbing for the authenticated /api/v1 endpoints: key check, per-key
// rate limit, and one error shape ({ error, code }) with the right status codes.

import { NextResponse } from "next/server";
import { validateApiKey, ApiAuthError, type ApiCaller } from "./api-auth";
import { checkRate, rateHeaders } from "./rate-limit";
import { DbConnectionError } from "./db";

export type ApiHandler = (caller: ApiCaller, headers: Record<string, string>) => Promise<Response>;

export const apiError = (status: number, error: string, code: string, extra: Record<string, unknown> = {}, headers: Record<string, string> = {}) =>
  NextResponse.json({ error, code, ...extra }, { status, headers });

export async function withApi(req: Request, handler: ApiHandler): Promise<Response> {
  let hdrs: Record<string, string> = {};
  try {
    const caller = await validateApiKey(req);
    const rate = checkRate(caller.keyId);
    hdrs = rateHeaders(rate);
    if (!rate.ok) return apiError(429, "Too many requests. Slow down and retry after the delay in Retry-After.", "rate_limited", {}, hdrs);
    const res = await handler(caller, hdrs);
    for (const [k, v] of Object.entries(hdrs)) res.headers.set(k, v);
    return res;
  } catch (e) {
    if (e instanceof ApiAuthError) return apiError(e.status, e.message, e.code, {}, hdrs);
    if (e instanceof DbConnectionError) {
      console.error("API: database unreachable:", e.message);
      return apiError(503, "Service temporarily unavailable. Please retry.", "service_unavailable", {}, { ...hdrs, "Retry-After": "30" });
    }
    console.error("API error:", e);
    return apiError(500, "Internal server error", "internal_error", {}, hdrs);
  }
}

export const MAX_JSON_DEPTH = 32;

/** Deepest nesting of objects and arrays in a parsed JSON value, counted without recursion. */
export function jsonDepth(v: unknown): number {
  let max = 0;
  const stack: [unknown, number][] = [[v, 1]];
  while (stack.length) {
    const [x, d] = stack.pop()!;
    if (x && typeof x === "object") {
      if (d > max) max = d;
      if (max > MAX_JSON_DEPTH) return max; // no need to walk further
      for (const c of Array.isArray(x) ? x : Object.values(x as object)) stack.push([c, d + 1]);
    }
  }
  return max;
}

/**
 * Read a request body as a JSON object. Refuses bad JSON, non-objects, and nesting deeper than
 * MAX_JSON_DEPTH (a few thousand levels of nesting would otherwise overflow the stack in
 * recursive code further down and surface as a 500).
 */
export async function readJsonObject(req: Request, headers: Record<string, string> = {}):
  Promise<{ ok: true; body: Record<string, unknown> } | { ok: false; res: Response }> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return { ok: false, res: apiError(400, "Invalid JSON in request body. Ensure all strings are properly escaped.", "invalid_json", {}, headers) };
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, res: apiError(400, "Request body must be a JSON object", "invalid_body", {}, headers) };
  }
  if (jsonDepth(body) > MAX_JSON_DEPTH) {
    return { ok: false, res: apiError(400, `Request body is nested more than ${MAX_JSON_DEPTH} levels deep`, "invalid_body", {}, headers) };
  }
  return { ok: true, body: body as Record<string, unknown> };
}

export const isUuid = (s: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
