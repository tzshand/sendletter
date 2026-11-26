export class NextResponse extends Response {
  static json(body: unknown, init: { status?: number; headers?: Record<string, string> } = {}) {
    return new Response(JSON.stringify(body), { status: init.status ?? 200, headers: { "content-type": "application/json", ...(init.headers ?? {}) } });
  }
}
