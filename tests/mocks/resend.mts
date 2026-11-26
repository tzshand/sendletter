export const sent: { to: string; subject: string; html: string; attachments?: { filename: string; content: string }[] }[] = [];
export const clear = () => { sent.length = 0; };
export class Resend {
  constructor() {}
  emails = { send: async (msg: (typeof sent)[number]) => { sent.push(msg); return { data: { id: "email_1" } }; } };
}
