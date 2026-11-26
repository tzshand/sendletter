export class NextResponse extends Response {
  static json(body: unknown, init: { status?: number; headers?: Record<string, string> } = {}) {
    return new Response(JSON.stringify(body), { status: init.status ?? 200, headers: { "content-type": "application/json", ...(init.headers ?? {}) } });
  }
}

// next/server's after(): work that runs once the response is sent. Here it is
// collected so a test can wait for it with flushAfter().
const pending: Promise<unknown>[] = [];
export function after(fn: () => unknown) {
  pending.push(Promise.resolve().then(fn).catch(() => undefined));
}
export async function flushAfter() {
  while (pending.length) await pending.shift();
}
