import { NextResponse } from "next/server";
import { buildPostman } from "@/lib/openapi";

export function GET() {
  return NextResponse.json(buildPostman(), { headers: { "cache-control": "public, max-age=300", "content-disposition": 'inline; filename="sendletter.postman_collection.json"' } });
}
