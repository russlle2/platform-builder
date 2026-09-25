/** Approximate USD cost per 1M tokens (input / output) by model. */
const MODEL_RATES: Record<string, { input: number; output: number }> = {
  'gemini-2.0-flash': { input: 0.075, output: 0.3 },
  // Vertex AI gemini-2.5-flash pay-as-you-go (text), thinking disabled.
  'gemini-2.5-flash': { input: 0.3, output: 2.5 },
  'qwen3:30b-a3b': { input: 0, output: 0 },
  'nomic-embed-text': { input: 0, output: 0 },
};

/** Hard cloud-spend ceiling for the whole factory run. */
export const BUDGET_CAP_USD = 175;

export class BudgetExceededError extends Error {
  constructor(
    public readonly spentUSD: number,
    public readonly capUSD: number,
  ) {
    super(`Budget cap exceeded: $${spentUSD.toFixed(4)} >= $${capUSD.toFixed(2)}`);
    this.name = 'BudgetExceededError';
  }
}

interface SpendRecord {
  model: string;
  inputTokens: number;
  outputTokens: number;
  costUSD: number;
}

export class BudgetTracker {
  private totalSpendUSD = 0;
  private records: SpendRecord[] = [];

  estimateCost(inputTokens: number, outputTokens: number, model: string): number {
    const rates = MODEL_RATES[model] ?? { input: 0, output: 0 };
    return (
      (inputTokens / 1_000_000) * rates.input +
      (outputTokens / 1_000_000) * rates.output
    );
  }

  recordSpend(inputTokens: number, outputTokens: number, model: string): void {
    const cost = this.estimateCost(inputTokens, outputTokens, model);
    this.totalSpendUSD += cost;
    this.records.push({ model, inputTokens, outputTokens, costUSD: cost });
  }

  checkCap(capUSD = 175): void {
    if (this.totalSpendUSD >= capUSD) {
      throw new BudgetExceededError(this.totalSpendUSD, capUSD);
    }
  }

  get total(): number {
    return this.totalSpendUSD;
  }

  report(): string {
    const lines = [
      '── Budget Report ──',
      `  Total cloud spend: $${this.totalSpendUSD.toFixed(4)}`,
      `  Records: ${this.records.length}`,
    ];

    const byModel = new Map<string, { input: number; output: number; cost: number }>();
    for (const r of this.records) {
      const prev = byModel.get(r.model) ?? { input: 0, output: 0, cost: 0 };
      byModel.set(r.model, {
        input: prev.input + r.inputTokens,
        output: prev.output + r.outputTokens,
        cost: prev.cost + r.costUSD,
      });
    }

    for (const [model, stats] of byModel) {
      lines.push(
        `  ${model}: ${stats.input.toLocaleString()} in / ${stats.output.toLocaleString()} out → $${stats.cost.toFixed(4)}`,
      );
    }

    return lines.join('\n');
  }
}

/**
 * Shared budget tracker for the whole generation run. Cloud (Vertex) calls record
 * their token spend here and enforce BUDGET_CAP_USD; generate.mjs prints the report.
 */
export const budget = new BudgetTracker();
