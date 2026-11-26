export const intents: Record<string, unknown>[] = [];
export const refunds: Record<string, unknown>[] = [];
let failure: string | null = null;
let refundFailure: string | null = null;
export const clear = () => { intents.length = 0; refunds.length = 0; failure = null; refundFailure = null; for (const k of Object.keys(customers)) delete customers[k]; };
/** Make every refund fail with this message. */
export const failRefundsWith = (msg: string) => { refundFailure = msg; };
/** Make the next card charge fail with this message. */
export const failNext = (msg = "Your card was declined.") => { failure = msg; };
// What Stripe knows about customers in tests: customers with a default card unless a test says otherwise.
export const customers: Record<string, { default?: string | null; cards: string[]; deleted?: boolean }> = {};
export const setCustomer = (id: string, c: { default?: string | null; cards?: string[]; deleted?: boolean }) => { customers[id] = { default: c.default ?? null, cards: c.cards ?? [], deleted: c.deleted }; };
export function getStripe() {
  return {
    customers: {
      retrieve: async (id: string) => {
        const c = customers[id] ?? { default: "pm_default", cards: ["pm_default"] };
        return { id, deleted: c.deleted, invoice_settings: { default_payment_method: c.default } };
      },
    },
    paymentMethods: {
      list: async ({ customer }: { customer: string }) => ({ data: (customers[customer]?.cards ?? ["pm_default"]).map((id) => ({ id })) }),
    },
    paymentIntents: {
      create: async (args: Record<string, unknown>) => {
        if (failure) { const m = failure; failure = null; throw new Error(m); }
        intents.push(args);
        return { id: `pi_${intents.length}` };
      },
    },
    refunds: {
      create: async (args: Record<string, unknown>) => { if (refundFailure) throw new Error(refundFailure); refunds.push(args); return { id: `re_${refunds.length}` }; },
    },
  };
}
