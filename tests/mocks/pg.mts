// Recording fake of the `pg` driver: the real db.ts runs and its SQL is captured.
export const queries: { text: string; params: unknown[] }[] = [];
let responder: (text: string, params: unknown[]) => unknown[] = () => [];
export const setResponder = (fn: typeof responder) => { responder = fn; };
export const reset = () => { queries.length = 0; responder = () => []; };
export class Pool {
  constructor() {}
  async query(text: string, params: unknown[] = []) {
    queries.push({ text, params });
    const rows = text.length > 3000 ? [] : responder(text, params);
    return { rows, rowCount: rows.length };
  }
  on() {}
}
