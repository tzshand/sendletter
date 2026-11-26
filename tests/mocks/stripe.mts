export const intents: Record<string, unknown>[] = [];
export const clear = () => { intents.length = 0; };
export function getStripe() {
  return { paymentIntents: { create: async (args: Record<string, unknown>) => { intents.push(args); return { id: `pi_${intents.length}` }; } } };
}
