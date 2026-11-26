import { NextResponse } from "next/server";
import { buildOpenApi } from "@/lib/openapi";

export function GET() {
  return NextResponse.json(buildOpenApi(), { headers: { "cache-control": "public, max-age=300", "access-control-allow-origin": "*" } });
}
