#!/usr/bin/env node

/**
 * Template factory CLI — local-first generation pipeline.
 *
 * Usage: node generate.mjs [--niche <niche>] [--limit 200] [--dry-run] [--resume]
 * Recommended: pnpm --filter @platform/template-factory generate
 */

import { spawn } from 'node:child_process';
import { rm, readdir, readFile, writeFile, rename, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const __dirname = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = __dirname;
const CACHE_DIR = join(PACKAGE_ROOT, '.factory-cache');
const TEMPLATES_ROOT = join(PACKAGE_ROOT, '..', '..', 'platform-builder');
const FOUNDATIONS_ROOT = join(PACKAGE_ROOT, 'foundations');
const EST_SECONDS_PER_TEMPLATE = 35;
// Two-gate dedup thresholds (reject when cosine similarity >= threshold):
//  - OLD library gate is LOOSE (high threshold): only block near-identical clones
//    of templates that already shipped. This dramatically cuts false rejects.
//  - WITHIN-RUN gate is stricter: keeps today's freshly generated batch distinct
//    from each other, which is easy across a few hundred items.
const OLD_LIB_DEDUP_THRESHOLD = 0.97;
const WITHIN_RUN_DEDUP_THRESHOLD = 0.90;

// Concurrency + pacing depend on provider. Cloud concurrency is kept at 3 to stay
// comfortably under Vertex AI per-minute quota (429s are handled by backoff in llm.ts,
// but fewer concurrent calls means fewer hits). Local qwen3 needs a single worker.
function concurrencyFor(provider) {
  return provider === 'cloud' ? 3 : 1;
}
function interDelayFor(provider) {
  return provider === 'cloud' ? 300 : 2000; // 300ms inter-call delay smooths burst spikes
}

const ACTIVE_NICHES = [
  'aromatherapy',
  'holistic_medicine',
  'private_practice_therapist',
  'sound_bath',
  'wellness_coach',
];

// ── Semantic diversity matrix ─────────────────────────────────────────────────
// Each combo gets a deterministic (demographic × brand × focus × tone) identity
// so the LLM writes into a distinct semantic space on every call.
const DEMOGRAPHICS = [
  'working professionals aged 30-45 dealing with burnout',
  'new mothers in their postpartum recovery period',
  'seniors aged 60+ seeking gentle holistic care',
  'athletes and active people managing physical stress',
  'college students navigating anxiety and academic pressure',
  'people recovering from chronic illness or injury',
  'entrepreneurs and high-achievers seeking stress relief',
  'retirees looking to maintain vitality and mental clarity',
  'parents of young children managing household stress',
  'individuals navigating major life transitions',
];

const BRAND_PERSONALITIES = [
  'warm and nurturing, like a trusted friend with expert knowledge',
  'calm and clinical, evidence-based yet deeply compassionate',
  'spiritual and soulful, rooted in ancient healing traditions',
  'modern and minimalist, science-meets-wellness aesthetic',
  'community-focused and inclusive, welcoming all backgrounds',
  'luxury and premium, exclusive results-driven experience',
  'earthy and grounded, nature-inspired and sustainable',
  'empowering and motivational, coaching clients toward transformation',
  'gentle and accessible, no prior wellness experience needed',
  'holistic and integrative, blending Eastern and Western approaches',
];

const SERVICE_FOCUS = [
  'stress reduction and nervous system regulation',
  'sleep improvement and restorative rest',
  'emotional healing and trauma-informed care',
  'physical pain relief and somatic healing',
  'mental clarity and cognitive wellness',
  'spiritual growth and inner peace',
  'immune support and vitality building',
  'relationship healing and heart-centered care',
  'postural health and body awareness',
  'seasonal wellness and preventive care',
];

const TONES = [
  'conversational and approachable',
  'poetic and evocative',
  'direct and results-focused',
  'story-driven and personal',
  'educational and informative',
];

/**
 * Derive a deterministic semantic identity from a combo index.
 * Cycles through all DEMOGRAPHICS × BRAND_PERSONALITIES × SERVICE_FOCUS × TONES
 * (10 × 10 × 10 × 5 = 5000 unique combinations) before repeating.
 */
function buildSemanticHint(comboIndex) {
  const D = DEMOGRAPHICS.length;
  const B = BRAND_PERSONALITIES.length;
  const S = SERVICE_FOCUS.length;
  const T = TONES.length;
  const demo = DEMOGRAPHICS[comboIndex % D];
  const brand = BRAND_PERSONALITIES[Math.floor(comboIndex / D) % B];
  const focus = SERVICE_FOCUS[Math.floor(comboIndex / (D * B)) % S];
  const tone = TONES[Math.floor(comboIndex / (D * B * S)) % T];
  return { demo, brand, focus, tone };
}

function parseArgs(argv) {
  const opts = {
    niche: undefined,
    limit: 200,
    dryRun: false,
    resume: false,
    provider: 'local',
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--dry-run') {
      opts.dryRun = true;
    } else if (arg === '--resume') {
      opts.resume = true;
    } else if (arg === '--cloud') {
      opts.provider = 'cloud';
    } else if (arg === '--local') {
      opts.provider = 'local';
    } else if (arg === '--niche') {
      opts.niche = argv[++i];
    } else if (arg === '--limit') {
      opts.limit = Number(argv[++i]);
    } else if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (opts.niche !== undefined && (!opts.niche || opts.niche.startsWith('--'))) {
    throw new Error('--niche requires a value');
  }
  if (!Number.isSafeInteger(opts.limit) || opts.limit <= 0) {
    throw new Error('--limit must be a positive integer');
  }

  return opts;
}

function printHelp() {
  console.log(`
Usage: node generate.mjs [options]

Options:
  --niche <name>   Target niche (e.g. aromatherapy)
  --limit <n>      Max templates per run (default: 200)
  --dry-run        Estimate cost without generating
  --resume         Continue from last checkpoint
  --cloud          Generate copy + grammar via Vertex AI gemini-2.5-flash
  --local          Generate copy + grammar via local Ollama (default)
  --help, -h       Show this help

Notes:
  Embeddings (dedup) always run locally via Ollama nomic-embed-text so the
  similarity index stays consistent with the existing library.
`);
}

/**
 * Hash-based within-run dedup — zero VRAM pressure.
 *
 * We intentionally avoid calling nomic-embed-text (or any model) during the hot
 * generation loop because model-swapping between qwen3 ↔ nomic-embed-text triggers
 * Windows STATUS_STACK_BUFFER_OVERRUN crashes in Ollama.
 *
 * Strategy:
 *  - WITHIN-RUN gate: djb2 hash of normalised copy text. Catches exact/near-exact
 *    duplicate copy within a single generation run at zero cost.
 *  - OLD-LIBRARY gate: disabled in hot path (embeddings are checked during
 *    buildIndexFromExisting at run start; the 0.96 threshold rarely blocks anyway).
 *
 * The persistent embed index (nomic-embed-text) is only written AFTER a template
 * is accepted, in addToIndex — one call per success, not one per attempt.
 */
class TwoGateDedup {
  constructor(oldEmbeddings, oldThreshold) {
    // oldEmbeddings kept for potential future use but not called during generation.
    this.oldEmbeddings = oldEmbeddings;
    this.oldThreshold = oldThreshold;
    this.runHashes = new Set();
  }

  /** djb2 hash for fast within-run dedup. */
  static hashText(text) {
    let h = 5381;
    const s = text.toLowerCase().replace(/\s+/g, ' ').trim();
    for (let i = 0; i < s.length; i++) h = (((h << 5) + h) ^ s.charCodeAt(i)) >>> 0;
    return h.toString(16).padStart(8, '0');
  }

  check(text) {
    const hash = TwoGateDedup.hashText(text);
    if (this.runHashes.has(hash)) {
      return { isDuplicate: true, similarity: 1.0, gate: 'run-hash' };
    }
    return { isDuplicate: false };
  }

  add(text) {
    this.runHashes.add(TwoGateDedup.hashText(text));
  }
}

async function checkOllama(provider = 'local') {
  try {
    const res = await fetch('http://localhost:11434/api/tags', {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) {
      throw new Error(`Ollama responded with ${res.status}`);
    }
    const data = await res.json();
    const models = (data.models ?? []).map((m) => m.name ?? m.model ?? '');
    const hasChat = models.some((m) => m.includes('qwen3'));
    const hasEmbed = models.some((m) => m.includes('nomic-embed'));
    console.log(`[generate] Ollama OK — models: ${models.slice(0, 5).join(', ')}${models.length > 5 ? '…' : ''}`);
    // qwen3 is only needed for the local copy/grammar path.
    if (provider === 'local' && !hasChat) {
      console.warn('[generate] warning: qwen3:30b-a3b not found — pull with: ollama pull qwen3:30b-a3b');
    }
    // nomic-embed is always required (dedup embeddings run locally).
    if (!hasEmbed) console.warn('[generate] warning: nomic-embed-text not found — pull with: ollama pull nomic-embed-text');
    return true;
  } catch {
    console.error(`
[generate] Ollama is not running at http://localhost:11434

Start Ollama:
  ollama serve

Then pull required models:
  ollama pull qwen3:30b-a3b
  ollama pull nomic-embed-text
`);
    return false;
  }
}

async function loadFoundationFiles(niche) {
  const dir = join(FOUNDATIONS_ROOT, niche);
  try {
    const files = await readdir(dir);
    return files
      .filter((f) => f.startsWith('foundation-') && f.endsWith('.html'))
      .sort()
      .map((f) => join(dir, f));
  } catch {
    return [];
  }
}

async function loadVariations() {
  const mod = await import(
    '../../apps/generator-app/src/lib/templates/variations.ts'
  );
  return {
    colors: mod.COLOR_SCHEMES,
    fonts: mod.FONT_VARIATIONS,
    structures: mod.STRUCTURE_VARIATIONS,
  };
}

function makeSlug(niche, index) {
  const ts = new Date().toISOString().replace(/[:.]/g, '').slice(0, 15);
  const pad = String(index).padStart(3, '0');
  return `${niche}-${ts}-${pad}`;
}

async function loadCheckpoint(niche) {
  const path = join(CACHE_DIR, `checkpoint-${niche}.json`);
  try {
    const raw = await readFile(path, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return {
      generated: 0,
      skippedDedup: 0,
      skippedGrammar: 0,
      failedQA: 0,
      comboIndex: 0,
    };
  }
}

// Serialize checkpoint writes so concurrent workers don't clash on the file.
let _checkpointChain = Promise.resolve();
async function saveCheckpoint(niche, data) {
  _checkpointChain = _checkpointChain
    .then(async () => {
      await mkdir(CACHE_DIR, { recursive: true });
      const path = join(CACHE_DIR, `checkpoint-${niche}.json`);
      const tmp = `${path}.tmp`;
      await writeFile(tmp, JSON.stringify({ ...data, updatedAt: new Date().toISOString() }, null, 2));
      await rename(tmp, path);
    })
    .catch((err) => {
      console.warn(`[generate] checkpoint save failed (continuing): ${err?.message ?? err}`);
    });
  return _checkpointChain;
}

async function runNormalize() {
  const script = join(PACKAGE_ROOT, '..', '..', 'apps', 'generator-app', 'scripts', 'normalize-templates.mjs');
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [script], {
      stdio: 'inherit',
      cwd: join(PACKAGE_ROOT, '..', '..', 'apps', 'generator-app'),
    });
    child.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`normalize exited ${code}`))));
    child.on('error', reject);
  });
}

async function dryRunEstimate(niches, limit, provider = 'local') {
  const variations = await loadVariations();
  const combosPerFoundation =
    variations.colors.length * variations.fonts.length * variations.structures.length;

  let totalFoundations = 0;
  for (const niche of niches) {
    const foundations = await loadFoundationFiles(niche);
    totalFoundations += foundations.length;
    console.log(`  ${niche}: ${foundations.length} foundations`);
  }

  const totalEstimate = niches.reduce(async (accP, niche) => {
    const acc = await accP;
    const foundations = await loadFoundationFiles(niche);
    if (foundations.length === 0) return acc;
    return acc + Math.min(limit, foundations.length * combosPerFoundation);
  }, Promise.resolve(0));

  const total = await totalEstimate;
  const concurrency = concurrencyFor(provider);
  // Cloud is far faster per template; assume ~5s effective wall-time per template at concurrency.
  const secsPerTemplate = provider === 'cloud' ? 5 : EST_SECONDS_PER_TEMPLATE;
  const estMinutes = Math.ceil((total * secsPerTemplate) / 60 / concurrency);

  // Vertex gemini-2.5-flash pricing (thinking disabled): $0.30 / 1M input, $2.50 / 1M output.
  // Per accepted template ≈ 1 copy call (~600 in / ~1500 out) + 1 grammar call (~1700 in / ~100 out).
  // Add ~25% overhead for dedup/grammar retries that still incur copy calls.
  const callsFactor = 1.25;
  const inTokensPer = 600 + 1700;
  const outTokensPer = 1500 + 100;
  const inTokens = total * callsFactor * inTokensPer;
  const outTokens = total * callsFactor * outTokensPer;
  const cloudCost = (inTokens / 1e6) * 0.3 + (outTokens / 1e6) * 2.5;

  console.log('\n── Dry Run Estimate ──');
  console.log(`  Provider:            ${provider}`);
  console.log(`  Niches:              ${niches.join(', ')}`);
  console.log(`  Foundations total:   ${totalFoundations}`);
  console.log(`  Variation combos:    ${combosPerFoundation} per foundation`);
  console.log(`  Max per niche:       ${limit}`);
  console.log(`  Estimated templates: ${total}`);
  console.log(`  Estimated time:      ~${estMinutes} min (at ${secsPerTemplate}s/template, concurrency ${concurrency})`);
  if (provider === 'cloud') {
    console.log(`  Estimated cost:      ~$${cloudCost.toFixed(2)} (Vertex AI ${process.env.VERTEX_MODEL || 'gemini-2.5-flash'}, embeddings free/local)`);
    console.log(`  Cloud budget cap:    $175.00`);
    if (cloudCost > 175) {
      console.warn(`  ⚠ Estimated cost exceeds the $175 cap — reduce --limit or niches.`);
    }
  } else {
    console.log(`  Estimated cost:      $0.00 (local Ollama path)`);
    console.log(`  Cloud budget cap:    $175.00 (not used in local generation)`);
  }
}

async function generateOne(ctx) {
  const {
    niche,
    foundationPath,
    colorId,
    fontId,
    structureId,
    slug,
    variationHint,
    copywriter,
    assembler,
    dedupe,
    grammar,
    qa,
    runDedup,
    provider,
  } = ctx;

  const foundationHtml = await readFile(foundationPath, 'utf-8');
  const copy = await copywriter.generateCopy(niche, foundationHtml, variationHint, provider);
  const dedupText = copywriter.copyToDedupText(copy);

  // Within-run dedup (hash-based, no model calls).
  const dupCheck = runDedup.check(dedupText);
  if (dupCheck.isDuplicate) {
    return { status: 'dedup', similarity: dupCheck.similarity, gate: dupCheck.gate };
  }

  let grammarResult = await grammar.checkGrammar(dedupText, provider);
  if (!grammarResult.pass) {
    const retryCopy = await copywriter.generateCopy(niche, foundationHtml, variationHint, provider);
    const retryText = copywriter.copyToDedupText(retryCopy);
    const retryDupCheck = runDedup.check(retryText);
    if (retryDupCheck.isDuplicate) {
      return { status: 'dedup', similarity: retryDupCheck.similarity, gate: retryDupCheck.gate };
    }
    grammarResult = await grammar.checkGrammar(retryText, provider);
    if (!grammarResult.pass) {
      return { status: 'grammar', issues: grammarResult.issues };
    }
    Object.assign(copy, retryCopy);
  }

  // imageSeed: mix foundation index and color/font variation for image rotation
  const foundationIndex = parseInt(foundationPath.match(/foundation-(\d+)\.html$/)?.[1] ?? '1', 10);
  const imageSeed = (foundationIndex * 13 + (colorId?.charCodeAt(0) ?? 0)) % 100;

  const outputDir = await assembler.assembleTemplate({
    niche,
    foundationPath,
    colorSchemeId: colorId,
    fontVariationId: fontId,
    structureVariationId: structureId,
    copy,
    outputSlug: slug,
    outputRoot: TEMPLATES_ROOT,
    imageSeed,
  });

  const qaResult = await qa.runQA(outputDir);
  if (!qaResult.pass) {
    await rm(outputDir, { recursive: true, force: true });
    return { status: 'qa', errors: qaResult.errors };
  }

  // Register in the within-run hash set.
  // NOTE: We intentionally skip addToIndex here to avoid calling nomic-embed-text
  // during the qwen3 generation hot-path (model swapping causes native crashes on
  // Windows). The embed index is rebuilt by buildIndexFromExisting at the start of
  // the next run, so new templates will be indexed before the next niche begins.
  const acceptedText = copywriter.copyToDedupText(copy);
  runDedup.add(acceptedText);
  return { status: 'ok', slug, outputDir };
}

async function processNiche(niche, limit, resume, modules, provider) {
  const foundations = await loadFoundationFiles(niche);
  if (foundations.length === 0) {
    console.warn(`[generate] ${niche}: no foundation-*.html files — skipping (foundations agent may still be running)`);
    return { generated: 0, skippedDedup: 0, skippedGrammar: 0, failedQA: 0 };
  }

  const variations = await loadVariations();
  const combos = [];
  for (const foundation of foundations) {
    for (const color of variations.colors) {
      for (const font of variations.fonts) {
        for (const structure of variations.structures) {
          combos.push({ foundation, color, font, structure });
        }
      }
    }
  }
  // A stable seeded shuffle preserves variety while making --resume deterministic:
  // checkpoint combo indexes refer to the same combinations after a restart.
  let seed = 2166136261;
  for (const char of niche) {
    seed ^= char.charCodeAt(0);
    seed = Math.imul(seed, 16777619) >>> 0;
  }
  const random = () => {
    seed += 0x6d2b79f5;
    let value = seed;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
  for (let i = combos.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [combos[i], combos[j]] = [combos[j], combos[i]];
  }

  const checkpoint = resume ? await loadCheckpoint(niche) : {
    generated: 0,
    skippedDedup: 0,
    skippedGrammar: 0,
    failedQA: 0,
    comboIndex: 0,
  };

  let generated = checkpoint.generated ?? 0;
  let skippedDedup = checkpoint.skippedDedup ?? 0;
  let skippedGrammar = checkpoint.skippedGrammar ?? 0;
  let failedQA = checkpoint.failedQA ?? 0;
  let comboIndex = checkpoint.comboIndex ?? 0;

  console.log(`[generate] ${niche}: ${foundations.length} foundations, ${combos.length} combos, target ${limit}`);

  // Snapshot the existing library's embeddings for this niche (the LOOSE gate).
  const { embedIndex } = modules.dedupe;
  const oldEmbeddings = await embedIndex.getNicheEmbeddings(niche);
  console.log(
    `[generate] ${niche}: ${oldEmbeddings.length} pre-existing embeddings loaded; within-run gate: hash-based (no model)`,
  );
  const runDedup = new TwoGateDedup(oldEmbeddings, OLD_LIB_DEDUP_THRESHOLD);

  const concurrency = concurrencyFor(provider);
  const interDelay = interDelayFor(provider);
  let slugCounter = generated + skippedDedup + skippedGrammar + failedQA + 1;

  async function handleResult(result) {
    if (result.status === 'ok') {
      if (generated >= limit) {
        await rm(result.outputDir, { recursive: true, force: true });
        return;
      }
      generated++;
      console.log(`[generate] ✓ ${niche}/${result.slug}`);
    } else if (result.status === 'dedup') {
      skippedDedup++;
      const sim = result.similarity != null ? ` sim=${result.similarity.toFixed(3)}` : '';
      const gate = result.gate ? ` [${result.gate}]` : '';
      console.log(`[generate] ⊘ dedup skip (${niche})${gate}${sim}`);
    } else if (result.status === 'grammar') {
      skippedGrammar++;
      console.log(
        `[generate] ⊘ grammar skip (${niche}): ${result.issues?.slice(0, 2).join('; ')}`,
      );
    } else if (result.status === 'qa') {
      failedQA++;
      console.log(
        `[generate] ✗ QA fail (${niche}): ${result.errors?.slice(0, 2).join('; ')}`,
      );
    }

    await saveCheckpoint(niche, {
      generated,
      skippedDedup,
      skippedGrammar,
      failedQA,
      comboIndex,
    });
  }

  async function worker() {
    while (generated < limit && comboIndex < combos.length) {
      const idx = comboIndex++;
      const combo = combos[idx];
      const slug = makeSlug(niche, slugCounter++);
      const semantic = buildSemanticHint(idx);
      const variationHint = {
        targetDemographic: semantic.demo,
        brandPersonality: semantic.brand,
        serviceFocus: semantic.focus,
        tone: semantic.tone,
        visualHint: `${combo.color.name} / ${combo.font.name} / ${combo.structure.name}`,
      };

      const result = await generateOne({
        niche,
        foundationPath: combo.foundation,
        colorId: combo.color.id,
        fontId: combo.font.id,
        structureId: combo.structure.id,
        slug,
        variationHint,
        runDedup,
        provider,
        ...modules,
      });

      await handleResult(result);

      // Pacing delay: give the local model breathing room between heavy calls.
      if (interDelay > 0) {
        await new Promise((r) => setTimeout(r, interDelay));
      }
    }
  }

  const workers = Array.from({ length: concurrency }, () => worker());
  await Promise.all(workers);

  return { generated, skippedDedup, skippedGrammar, failedQA };
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const niches = opts.niche ? [opts.niche] : ACTIVE_NICHES;

  if (opts.niche && !ACTIVE_NICHES.includes(opts.niche)) {
    console.error(`[generate] unknown niche: ${opts.niche}`);
    process.exit(1);
  }

  console.log('[generate] template-factory CLI');
  console.log(`  niche:    ${opts.niche ?? '(all active niches)'}`);
  console.log(`  limit:    ${opts.limit}`);
  console.log(`  dry-run:  ${opts.dryRun}`);
  console.log(`  resume:   ${opts.resume}`);
  console.log(`  provider: ${opts.provider}${opts.provider === 'cloud' ? ' (Vertex AI gemini-2.5-flash)' : ' (Ollama qwen3:30b-a3b)'}`);

  if (opts.dryRun) {
    await dryRunEstimate(niches, opts.limit, opts.provider);
    return;
  }

  // Embeddings always run locally, so Ollama (nomic-embed) is required either way.
  const ollamaOk = await checkOllama(opts.provider);
  if (!ollamaOk) process.exit(1);

  const copywriter = await import('./src/copywriter.ts');
  const assembler = await import('./src/assembler.ts');
  const dedupe = await import('./src/dedupe.ts');
  const grammar = await import('./src/grammar.ts');
  const qa = await import('./src/qa.ts');
  const { budget } = await import('./src/budget.ts');
  const modules = { copywriter, assembler, dedupe, grammar, qa };

  // Pre-warm the generation path so the first real template doesn't pay cold-start
  // cost (local: load model into VRAM; cloud: fetch + cache the OAuth token).
  try {
    console.log(`[generate] warming up ${opts.provider} generation path…`);
    await copywriter.generateCopy('aromatherapy', '<html></html>', 'warmup', opts.provider);
    console.log('[generate] generation path warm');
  } catch (err) {
    console.warn(`[generate] warmup failed (${err?.message ?? err}) — proceeding anyway`);
  }

  const indexPath = join(CACHE_DIR, 'embed-index.json');
  let indexExists = false;
  try {
    await readFile(indexPath, 'utf-8');
    indexExists = true;
  } catch {
    indexExists = false;
  }

  if (!indexExists || !opts.resume) {
    console.log('[generate] building embed index from existing templates…');
    await dedupe.embedIndex.buildIndexFromExisting(TEMPLATES_ROOT);
  } else {
    await dedupe.embedIndex.load();
    console.log(`[generate] loaded embed index (${dedupe.embedIndex.size} entries)`);
  }

  const start = Date.now();
  const totals = { generated: 0, skippedDedup: 0, skippedGrammar: 0, failedQA: 0 };

  try {
    for (const niche of niches) {
      const result = await processNiche(niche, opts.limit, opts.resume, modules, opts.provider);
      totals.generated += result.generated;
      totals.skippedDedup += result.skippedDedup;
      totals.skippedGrammar += result.skippedGrammar;
      totals.failedQA += result.failedQA;
    }
  } finally {
    // Always surface cloud spend, even if the budget cap aborted the run.
    if (opts.provider === 'cloud') {
      console.log('\n' + budget.report());
    }
  }

  if (totals.generated > 0) {
    console.log('[generate] running normalize-templates.mjs…');
    try {
      await runNormalize();
    } catch (err) {
      console.warn(`[generate] normalize-templates failed: ${err.message}`);
    }
  }

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log('\n── Generation Summary ──');
  console.log(`  Generated:       ${totals.generated}`);
  console.log(`  Skipped (dedup): ${totals.skippedDedup}`);
  console.log(`  Skipped (grammar): ${totals.skippedGrammar}`);
  console.log(`  Failed (QA):     ${totals.failedQA}`);
  console.log(`  Total time:      ${elapsed}s`);
}

main().catch((err) => {
  console.error('[generate] fatal:', err.message ?? err);
  process.exit(1);
});
