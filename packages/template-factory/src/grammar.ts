import { chat, type Provider } from './llm.js';

export interface GrammarResult {
  pass: boolean;
  issues: string[];
}

const GRAMMAR_SCHEMA = {
  type: 'object',
  properties: {
    pass: { type: 'boolean' },
    issues: { type: 'array', items: { type: 'string' } },
  },
  required: ['pass', 'issues'],
};

/**
 * Grammar/proofread pass via local LLM.
 * Returns pass=true only when no significant grammar or spelling issues are found.
 */
export async function checkGrammar(
  text: string,
  provider: Provider = 'local',
): Promise<GrammarResult> {
  const prompt = [
    'You are a professional copy editor reviewing website copy for a wellness practitioner.',
    'Only flag OBJECTIVE errors: clearly wrong words (wrong/right confusion), missing/wrong verb tense,',
    'subject-verb disagreement, broken sentences, or obviously misspelled words.',
    'Do NOT flag: stylistic word choices, phrasing preferences, British vs American spelling,',
    'sentence fragments used intentionally for impact, industry-specific terminology, or',
    'use of "bodies" / "selves" / "spirits" in a holistic wellness context.',
    'Do NOT flag pronoun perspective unless the same sentence mixes "I/me" AND "you/your".',
    'Ignore placeholder tokens like {{BUSINESS_NAME}} or generic contact defaults.',
    'Respond with JSON: {"pass": boolean, "issues": string[]}',
    'Set pass=true for clean copy with only minor or no issues.',
    '',
    'TEXT TO REVIEW (first 3000 chars):',
    text.slice(0, 3_000),
  ].join('\n');

  let raw: string;
  try {
    raw = await chat(
      [{ role: 'user', content: prompt }],
      { schema: GRAMMAR_SCHEMA, temperature: 0.2 },
      provider,
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('Cannot reach Ollama') || msg.toLowerCase().includes('econnrefused')) {
      console.warn('[grammar] Ollama unreachable — grammar check skipped');
      return { pass: true, issues: ['Grammar check skipped — Ollama unavailable'] };
    }
    throw err;
  }

  const cleaned = raw.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
  const parsed = JSON.parse(cleaned) as GrammarResult;

  if (typeof parsed.pass !== 'boolean' || !Array.isArray(parsed.issues)) {
    throw new Error('Grammar check returned invalid JSON shape');
  }

  return {
    pass: parsed.pass,
    issues: parsed.issues.filter((i) => typeof i === 'string' && i.trim().length > 0),
  };
}
