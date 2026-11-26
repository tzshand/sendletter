export const intents: Record<string, unknown>[] = [];
export const refunds: Record<string, unknown>[] = [];
let failure: string | null = null;
let refundFailure: string | null = null;
export const clear = () => { intents.length = 0; refunds.length = 0; failure = null; refundFailure = null; };
/** Make every refund fail with this message. */
export const failRefundsWith = (msg: string) => { refundFailure = msg; };
/** Make the next card charge fail with this message. */
export const failNext = (msg = "Your card was declined.") => { failure = msg; };
export function getStripe() {
  return {
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
