import { chat, type Provider } from './llm.js';

/**
 * Structured semantic variation hint.
 * Drives the LLM into a distinct demographic × brand × focus × tone space
 * so each template generates meaningfully different copy.
 */
export interface CopyVariation {
  targetDemographic: string;
  brandPersonality: string;
  serviceFocus: string;
  tone: string;
  /** Visual variation descriptor (color/font/structure) from the visual combo. */
  visualHint?: string;
}

export interface CopySection {
  id: string;
  heading: string;
  body: string;
}

export interface CopyFAQ {
  q: string;
  a: string;
}

export interface CopyJSON {
  title: string;
  metaDescription: string;
  heroHeadline: string;
  heroSubheadline: string;
  sections: CopySection[];
  faq: CopyFAQ[];
  ctaLabel: string;
  practitionerTagline: string;
}

const COPY_SCHEMA = {
  type: 'object',
  properties: {
    title: { type: 'string' },
    metaDescription: { type: 'string' },
    heroHeadline: { type: 'string' },
    heroSubheadline: { type: 'string' },
    practitionerTagline: { type: 'string' },
    sections: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          heading: { type: 'string' },
          body: { type: 'string' },
        },
        required: ['id', 'heading', 'body'],
      },
    },
    faq: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          q: { type: 'string' },
          a: { type: 'string' },
        },
        required: ['q', 'a'],
      },
    },
    ctaLabel: { type: 'string' },
  },
  required: [
    'title',
    'metaDescription',
    'heroHeadline',
    'heroSubheadline',
    'practitionerTagline',
    'sections',
    'faq',
    'ctaLabel',
  ],
};

function extractPlaceholders(html: string): string[] {
  const tokens = new Set<string>();
  const re = /\{\{\s*([A-Za-z0-9_]+)\s*\}\}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) tokens.add(m[1]!);
  return [...tokens];
}

function nicheLabel(niche: string): string {
  return niche.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function validateCopyJSON(data: unknown): CopyJSON {
  if (!data || typeof data !== 'object') {
    throw new Error('Copy response is not an object');
  }
  const d = data as Record<string, unknown>;

  const required = [
    'title',
    'metaDescription',
    'heroHeadline',
    'heroSubheadline',
    'practitionerTagline',
    'ctaLabel',
  ] as const;

  for (const key of required) {
    if (typeof d[key] !== 'string' || !(d[key] as string).trim()) {
      throw new Error(`Missing or invalid copy field: ${key}`);
    }
  }

  if (!Array.isArray(d.sections) || d.sections.length < 2) {
    throw new Error('Copy must include at least 2 sections');
  }

  if (!Array.isArray(d.faq) || d.faq.length < 2) {
    throw new Error('Copy must include at least 2 FAQ items');
  }

  const sections = d.sections.map((s, i) => {
    const sec = s as Record<string, unknown>;
    if (
      typeof sec.id !== 'string' ||
      typeof sec.heading !== 'string' ||
      typeof sec.body !== 'string'
    ) {
      throw new Error(`Invalid section at index ${i}`);
    }
    return { id: sec.id, heading: sec.heading, body: sec.body };
  });

  const faq = d.faq.map((f, i) => {
    const item = f as Record<string, unknown>;
    if (typeof item.q !== 'string' || typeof item.a !== 'string') {
      throw new Error(`Invalid FAQ at index ${i}`);
    }
    return { q: item.q, a: item.a };
  });

  return {
    title: d.title as string,
    metaDescription: d.metaDescription as string,
    heroHeadline: d.heroHeadline as string,
    heroSubheadline: d.heroSubheadline as string,
    practitionerTagline: d.practitionerTagline as string,
    sections,
    faq,
    ctaLabel: d.ctaLabel as string,
  };
}

function parseCopyResponse(raw: string): CopyJSON {
  const cleaned = raw
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();
  return validateCopyJSON(JSON.parse(cleaned));
}

/**
 * Strip CSS, JS, and HTML tags from foundation HTML, keeping only text content
 * and placeholder tokens. Reduces prompt size from ~8000 to ~800 chars,
 * dramatically speeding up LLM prefill time.
 */
function stripFoundationForPrompt(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s{3,}/g, '\n')
    .trim()
    .slice(0, 1200); // keep concise — placeholders + brief section labels
}

function buildPrompt(
  niche: string,
  foundationHtml: string,
  variationHint: string | CopyVariation,
  placeholders: string[],
): string {
  const label = nicheLabel(niche);
  const foundationContext = stripFoundationForPrompt(foundationHtml);

  // Build the semantic preamble and uniqueness constraint when a structured hint
  // is provided. These appear first so the LLM anchors on the identity before
  // reading any other instructions.
  let semanticPreamble = '';
  let visualHintLine = '';
  let uniquenessConstraint = '';

  if (typeof variationHint === 'object') {
    semanticPreamble = [
      `TARGET DEMOGRAPHIC: ${variationHint.targetDemographic}`,
      `BRAND PERSONALITY: ${variationHint.brandPersonality}`,
      `PRIMARY SERVICE FOCUS: ${variationHint.serviceFocus}`,
      `WRITING TONE: ${variationHint.tone}`,
      '',
      'You MUST write copy specifically for this demographic, in this brand voice, focusing on this service area.',
      'Every hero headline, section heading, and FAQ must directly address this combination.',
      'Do NOT write generic wellness copy — be specific to the target above.',
      '',
    ].join('\n');

    if (variationHint.visualHint) {
      visualHintLine = `Variation style hint: ${variationHint.visualHint}`;
    }

    uniquenessConstraint = [
      '',
      `UNIQUENESS REQUIREMENT: This copy must feel completely distinct from other ${label} sites.`,
      `Avoid: "journey", "transform", "holistic", "wellness journey", "healing journey", "unlock", "discover your".`,
      `Use specific, concrete language about ${variationHint.serviceFocus} for ${variationHint.targetDemographic}.`,
    ].join('\n');
  } else {
    visualHintLine = variationHint ? `Variation style hint: ${variationHint}` : '';
  }

  return [
    semanticPreamble,
    `Generate unique, grammatically correct website copy for a ${label} practice.`,
    `The niche "${label}" must appear prominently in titles and headings.`,
    ...(visualHintLine ? [visualHintLine] : []),
    '',
    'Placeholder tokens to fill (your JSON values map to these):',
    placeholders.map((p) => `{{${p}}}`).join(', '),
    '',
    'Requirements:',
    '- Write original copy — no clichés, no lorem ipsum',
    '- Tone: professional, warm, trustworthy, niche-appropriate',
    '- title: page title (include niche name and a unique angle)',
    '- metaDescription: 120-160 chars SEO description',
    '- heroHeadline + heroSubheadline: compelling homepage hero',
    '- practitionerTagline: short brand tagline for {{TAGLINE}}',
    '- sections: 3-5 content sections with id, heading, body (50-120 words each)',
    '- faq: 4 questions with helpful answers (use "you/your" not "I/my")',
    '- ctaLabel: primary call-to-action button text',
    '- All pronouns must use second-person ("you/your") consistently',
    '',
    'Foundation structure context (stripped, for section reference only):',
    foundationContext,
    uniquenessConstraint,
  ].join('\n');
}

/**
 * Generate niche copy as structured JSON from a foundation skeleton.
 */
export async function generateCopy(
  niche: string,
  foundationHtml: string,
  variationHint: string | CopyVariation,
  provider: Provider = 'local',
): Promise<CopyJSON> {
  const placeholders = extractPlaceholders(foundationHtml);
  const prompt = buildPrompt(niche, foundationHtml, variationHint, placeholders);

  let lastError: Error | null = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const raw = await chat(
        [{ role: 'user', content: prompt }],
        { schema: COPY_SCHEMA, temperature: 0.85 },
        provider,
      );
      return parseCopyResponse(raw);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt === 0) {
        await new Promise((r) => setTimeout(r, 500));
      }
    }
  }

  throw new Error(
    `generateCopy failed after 2 attempts: ${lastError?.message ?? 'unknown error'}`,
  );
}

/** Flatten copy JSON into searchable text for dedup indexing. */
export function copyToDedupText(copy: CopyJSON): string {
  const parts = [
    copy.title,
    copy.metaDescription,
    copy.heroHeadline,
    copy.heroSubheadline,
    copy.practitionerTagline,
    ...copy.sections.flatMap((s) => [s.heading, s.body]),
    ...copy.faq.flatMap((f) => [f.q, f.a]),
    copy.ctaLabel,
  ];
  return parts.join('\n');
}
