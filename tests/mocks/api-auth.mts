export class ApiAuthError extends Error {
  status: number;
  constructor(status: number, message: string) { super(message); this.status = status; }
}
export async function validateApiKey() { return { accountId: "acct-1", keyId: "key-1" }; }
