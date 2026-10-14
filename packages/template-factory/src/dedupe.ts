import { mkdir, readdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cosineSimilarity, localEmbed } from './llm.js';

const KNOWN_NICHES = [
  'aromatherapy',
  'holistic_medicine',
  'private_practice_therapist',
  'sound_bath',
  'wellness_coach',
];

/** Infer niche from a slug by checking known niche prefixes. */
function nicheFromSlug(slug: string): string | undefined {
  for (const n of KNOWN_NICHES) {
    if (slug.startsWith(n)) return n;
  }
  return undefined;
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = join(__dirname, '..');
const INDEX_PATH = join(PACKAGE_ROOT, '.factory-cache', 'embed-index.json');

interface EmbedEntry {
  slug: string;
  niche?: string;
  embedding: number[];
}

interface EmbedIndexData {
  version: 1;
  entries: EmbedEntry[];
  builtAt?: string;
  /** Fingerprint of the slug list at index-build time; used to detect stale cache. */
  sourceHash?: string;
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\{\{[^}]+\}\}/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** djb2-based hash of a string → 8-char hex string. */
function hashString(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = (((h << 5) + h) ^ s.charCodeAt(i)) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

/** Stable fingerprint for a set of slugs: "<count>:<hash of sorted join>". */
function computeSourceHash(slugs: string[]): string {
  const sorted = [...slugs].sort().join('\n');
  return `${slugs.length}:${hashString(sorted)}`;
}

const BATCH_SIZE = 5;

export class EmbedIndex {
  private entries: EmbedEntry[] = [];
  private loaded = false;
  private sourceHash: string | undefined = undefined;
  // Serializes index writes so concurrent workers never clash on the same file
  // (a clashing writeFile throws, which Node treats as a fatal unhandled rejection).
  private saveChain: Promise<void> = Promise.resolve();

  async load(): Promise<void> {
    if (this.loaded) return;
    try {
      const raw = await readFile(INDEX_PATH, 'utf-8');
      const data = JSON.parse(raw) as EmbedIndexData;
      this.entries = data.entries ?? [];
      this.sourceHash = data.sourceHash;
    } catch {
      this.entries = [];
    }
    this.loaded = true;
  }

  async save(newSourceHash?: string): Promise<void> {
    const hash = newSourceHash ?? this.sourceHash;
    // Chain writes so only one runs at a time; swallow errors so a transient
    // write failure can never crash the whole generation run.
    this.saveChain = this.saveChain
      .then(() => this.writeIndexFile(hash))
      .catch((err) => {
        console.warn(`[dedupe] index save failed (continuing): ${err?.message ?? err}`);
      });
    return this.saveChain;
  }

  private async writeIndexFile(hash?: string): Promise<void> {
    await mkdir(dirname(INDEX_PATH), { recursive: true });
    const data: EmbedIndexData = {
      version: 1,
      entries: this.entries,
      builtAt: new Date().toISOString(),
      sourceHash: hash,
    };
    // Write to a temp file then atomically rename to avoid partial/corrupt reads.
    const tmp = `${INDEX_PATH}.tmp`;
    await writeFile(tmp, JSON.stringify(data, null, 2), 'utf-8');
    await rename(tmp, INDEX_PATH);
  }

  get size(): number {
    return this.entries.length;
  }

  /**
   * Snapshot of embeddings for a niche, used to seed the "old library" dedup gate.
   * Capture this once at niche start (before any new templates are added this run)
   * so it represents only the pre-existing library.
   */
  async getNicheEmbeddings(niche?: string): Promise<number[][]> {
    await this.load();
    const candidates = niche
      ? this.entries.filter((e) => {
          const entryNiche = e.niche ?? nicheFromSlug(e.slug);
          return !entryNiche || entryNiche === niche;
        })
      : this.entries;
    return candidates.map((e) => e.embedding.slice());
  }

  /**
   * Check whether text is a near-duplicate of indexed copy.
   * When `niche` is provided, only compares against entries from the same niche.
   * Returns { isDuplicate, maxSimilarity } for diagnostic logging.
   */
  async checkDuplicate(
    text: string,
    threshold = 0.78,
    niche?: string,
  ): Promise<{ isDuplicate: boolean; maxSimilarity: number; matchedSlug?: string }> {
    await this.load();
    const embedding = await localEmbed(text);

    const candidates = niche
      ? this.entries.filter((e) => {
          const entryNiche = e.niche ?? nicheFromSlug(e.slug);
          // include entry if its niche matches or is unknown (can't determine)
          return !entryNiche || entryNiche === niche;
        })
      : this.entries;

    let maxSimilarity = 0;
    let matchedSlug: string | undefined;

    for (const entry of candidates) {
      const similarity = cosineSimilarity(embedding, entry.embedding);
      if (similarity > maxSimilarity) {
        maxSimilarity = similarity;
        if (similarity >= threshold) matchedSlug = entry.slug;
      }
      if (similarity >= threshold) {
        return { isDuplicate: true, maxSimilarity: similarity, matchedSlug: entry.slug };
      }
    }

    return { isDuplicate: false, maxSimilarity };
  }

  /**
   * Check whether text is a near-duplicate of indexed copy.
   * When `niche` is provided, only compares against entries from the same niche.
   */
  async isDuplicate(text: string, threshold = 0.78, niche?: string): Promise<boolean> {
    const result = await this.checkDuplicate(text, threshold, niche);
    return result.isDuplicate;
  }

  /**
   * Add text embedding to the dedup index keyed by slug.
   */
  async addToIndex(slug: string, text: string, niche?: string): Promise<void> {
    await this.load();
    const embedding = await localEmbed(text);
    this.entries = this.entries.filter((e) => e.slug !== slug);
    this.entries.push({ slug, niche, embedding });
    await this.save(); // preserves existing sourceHash
  }

  /**
   * Scan existing templates, extract text from index.html, embed, and populate index.
   *
   * Stale-cache detection: computes a hash of all available slug names and compares
   * with the hash stored in the cache file. If they differ (new templates added or
   * removed), the existing index is cleared and fully rebuilt.
   *
   * Batching: embedding requests are sent in groups of BATCH_SIZE (20) so Ollama is
   * never hit with hundreds of concurrent requests.
   */
  async buildIndexFromExisting(templatesRoot: string): Promise<number> {
    await this.load();

    // Collect all (slug, nichePath) pairs available on disk.
    let nicheDirs: string[];
    try {
      nicheDirs = await readdir(templatesRoot);
    } catch {
      console.warn(`[dedupe] templates root not found: ${templatesRoot}`);
      return 0;
    }

    const allItems: Array<{ slug: string; niche: string; indexPath: string }> = [];
    for (const niche of nicheDirs) {
      if (niche.startsWith('.')) continue;
      const nichePath = join(templatesRoot, niche);
      let templateDirs: string[];
      try {
        templateDirs = await readdir(nichePath);
      } catch {
        continue;
      }
      for (const slug of templateDirs) {
        if (slug.startsWith('.') || slug.startsWith('_')) continue;
        allItems.push({ slug, niche, indexPath: join(nichePath, slug, 'index.html') });
      }
    }

    // Stale-cache check: if the slug list changed, do a surgical update
    // (remove stale entries for deleted templates, add new ones) rather than
    // clearing everything and rebuilding from scratch.
    const freshHash = computeSourceHash(allItems.map((i) => i.slug));
    if (this.sourceHash !== undefined && this.sourceHash !== freshHash) {
      const currentSlugs = new Set(allItems.map((i) => i.slug));
      const before = this.entries.length;
      // Drop entries whose slugs no longer exist on disk.
      this.entries = this.entries.filter((e) => currentSlugs.has(e.slug));
      const removed = before - this.entries.length;
      if (removed > 0) {
        console.log(`[dedupe] source hash changed — pruned ${removed} deleted entries`);
      }
    }

    const existing = new Set(this.entries.map((e) => e.slug));
    const pending = allItems.filter((i) => !existing.has(i.slug));

    if (pending.length === 0) {
      console.log(`[dedupe] embed index up to date (${this.entries.length} entries)`);
      return 0;
    }

    console.log(`[dedupe] indexing ${pending.length} new templates in batches of ${BATCH_SIZE}…`);
    let added = 0;

    for (let i = 0; i < pending.length; i += BATCH_SIZE) {
      const batch = pending.slice(i, i + BATCH_SIZE);

      // Read all HTML files in the batch (sequential I/O is fine).
      const texts: Array<{ slug: string; niche: string; text: string }> = [];
      for (const item of batch) {
        try {
          const html = await readFile(item.indexPath, 'utf-8');
          const text = stripHtml(html);
          if (text.length >= 50) {
            texts.push({ slug: item.slug, niche: item.niche, text });
          }
        } catch {
          // skip templates without readable index.html
        }
      }

      // Embed sequentially within each batch to avoid overwhelming Ollama.
      for (const { slug, niche, text } of texts) {
        try {
          const embedding = await localEmbed(text);
          this.entries.push({ slug, niche, embedding });
          added++;
        } catch (err) {
          console.warn('[dedupe] embed failed for template:', slug, err);
        }
      }

      console.log(`[dedupe] indexed ${Math.min(i + BATCH_SIZE, pending.length)}/${pending.length}…`);
      // Checkpoint after each batch to avoid losing progress on interruption.
      await this.save(freshHash);
    }

    console.log(
      `[dedupe] embed index: ${this.entries.length} total (${added} newly indexed)`,
    );
    return added;
  }
}

/** Singleton index used by the generation pipeline. */
export const embedIndex = new EmbedIndex();

// Legacy function exports for backward compatibility
export async function isDuplicate(
  text: string,
  threshold = 0.78,
  niche?: string,
): Promise<boolean> {
  return embedIndex.isDuplicate(text, threshold, niche);
}

export async function addToIndex(slug: string, text: string, niche?: string): Promise<void> {
  return embedIndex.addToIndex(slug, text, niche);
}

export async function buildIndexFromExisting(templatesRoot: string): Promise<number> {
  return embedIndex.buildIndexFromExisting(templatesRoot);
}

// Re-export for RunDedup in generate.mjs
export { localEmbed, cosineSimilarity };
