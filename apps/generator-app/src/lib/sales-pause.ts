/** Pause new paid checkout sessions without interrupting existing orders or billing access. */
export function areSalesPaused(env: Record<string, string | undefined> = process.env): boolean {
  return env.DAILYCLARITY_SALES_PAUSED?.trim().toLowerCase() === 'true'
}
