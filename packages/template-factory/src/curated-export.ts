import { createHash, randomUUID } from 'node:crypto';
import {
  lstat,
  mkdtemp,
  mkdir,
  readFile,
  readdir,
  rename,
  rm,
  writeFile,
} from 'node:fs/promises';
import {
  basename,
  dirname,
  isAbsolute,
  join,
  parse,
  relative,
  resolve,
} from 'node:path';
import { fileURLToPath } from 'node:url';
import { assembleTemplate } from './assembler.js';
import type { CopyFAQ, CopyJSON, CopySection } from './copywriter.js';
import { runQA } from './qa.js';
import { PUBLICATION_CONTRACT_VERSION } from './template-contract.js';

const PACKAGE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const REPOSITORY_ROOT = resolve(PACKAGE_ROOT, '..', '..');
const FOUNDATIONS_ROOT = join(PACKAGE_ROOT, 'foundations');

export const CURATED_NICHES = [
  'aromatherapy',
  'holistic_medicine',
  'private_practice_therapist',
  'sound_bath',
  'wellness_coach',
] as const;

type CuratedNiche = (typeof CURATED_NICHES)[number];

interface CuratedCopySpec {
  title: string;
  serviceLabel: string;
  metaDescription: string;
  heroSubheadline: string;
  sections: CopySection[];
  faq: CopyFAQ[];
}

const COPY_SPECS: Record<CuratedNiche, CuratedCopySpec> = {
  aromatherapy: {
    title: 'Botanical Aromatherapy Practice',
    serviceLabel: 'aromatherapy',
    metaDescription: 'Clear information about aromatic consultations, custom blend guidance, and practical next steps.',
    heroSubheadline: 'Explore aromatic options through a calm, clearly explained consultation process.',
    sections: [
      { id: 'consultations', heading: 'Personal consultations', body: 'Begin with a conversation about preferences, routines, and the kind of practical support you are seeking.' },
      { id: 'blend-guidance', heading: 'Custom blend guidance', body: 'Review clearly labeled aromatic options with straightforward instructions for storage and everyday use.' },
      { id: 'next-steps', heading: 'Simple next steps', body: 'Receive an organized summary so you can decide which options fit comfortably into your routine.' },
    ],
    faq: [
      { q: 'How do I begin?', a: 'Send an inquiry with your availability and the practice will reply with the next available options.' },
      { q: 'Can I ask questions first?', a: 'Yes. The first conversation is a good time to clarify the process and decide whether it fits your needs.' },
      { q: 'Are instructions included?', a: 'Available options are explained with practical handling, storage, and use information.' },
      { q: 'Can the process be adjusted?', a: 'Preferences and practical constraints can be discussed before any next step is selected.' },
    ],
  },
  holistic_medicine: {
    title: 'Integrative Care Practice',
    serviceLabel: 'integrative care',
    metaDescription: 'A clear introduction to an integrative practice, its consultation process, and available services.',
    heroSubheadline: 'Understand the practice, available services, and next steps before requesting a conversation.',
    sections: [
      { id: 'approach', heading: 'A coordinated approach', body: 'Start with a structured conversation about priorities, relevant context, and the services the practice provides.' },
      { id: 'services', heading: 'Services explained clearly', body: 'Review the scope of each offering, how appointments work, and what information is useful before you begin.' },
      { id: 'planning', heading: 'An organized plan', body: 'Use a straightforward summary of options and scheduling details to make an informed next-step decision.' },
    ],
    faq: [
      { q: 'What happens during the first conversation?', a: 'The practice explains its scope, listens to your priorities, and answers process questions.' },
      { q: 'How are services selected?', a: 'Available services are discussed in relation to your stated preferences and practical needs.' },
      { q: 'Can I review details before booking?', a: 'Yes. You can ask for scheduling and service information before choosing an appointment.' },
      { q: 'How do I contact the practice?', a: 'Use the inquiry form and the practice will reply using the contact details you provide.' },
    ],
  },
  private_practice_therapist: {
    title: 'Private Therapy Practice',
    serviceLabel: 'therapy services',
    metaDescription: 'A welcoming overview of therapy services, practice approach, scheduling, and first-contact options.',
    heroSubheadline: 'Learn about the practice and request a private introductory conversation when you are ready.',
    sections: [
      { id: 'approach', heading: 'A thoughtful first step', body: 'Review the practice approach and use a simple inquiry to ask about fit, availability, and scheduling.' },
      { id: 'services', heading: 'Clear service information', body: 'Understand appointment formats, areas of focus, and practical policies before deciding how to proceed.' },
      { id: 'process', heading: 'A respectful process', body: 'Move at a comfortable pace with clear expectations for communication, scheduling, and next steps.' },
    ],
    faq: [
      { q: 'Can I ask about fit before scheduling?', a: 'Yes. An introductory inquiry can cover availability, appointment format, and general practice fit.' },
      { q: 'Are remote appointments available?', a: 'Use the inquiry form to ask which appointment formats are currently offered in your location.' },
      { q: 'When will I receive a reply?', a: 'The practice can state its current response window when it follows up on your inquiry.' },
      { q: 'What should I include in my message?', a: 'Share only basic scheduling and contact information. Private details can wait for a secure conversation.' },
    ],
  },
  sound_bath: {
    title: 'Sound Immersion Practice',
    serviceLabel: 'sound bath sessions',
    metaDescription: 'Explore sound bath formats, session preparation, studio details, and straightforward booking steps.',
    heroSubheadline: 'See how sessions are structured, what to bring, and how to request an upcoming time.',
    sections: [
      { id: 'sessions', heading: 'Session formats', body: 'Compare individual, small-group, and event options with clear descriptions of timing and setting.' },
      { id: 'preparation', heading: 'Prepare with ease', body: 'Review practical information about arrival, clothing, comfort items, and studio expectations.' },
      { id: 'schedule', heading: 'Choose a next step', body: 'Ask about current availability and select a session format that works for your schedule.' },
    ],
    faq: [
      { q: 'What should I bring?', a: 'The studio can confirm recommended comfort items and any supplies already provided.' },
      { q: 'How long are sessions?', a: 'Session length depends on the selected format and is confirmed before booking.' },
      { q: 'Are group options available?', a: 'Use the inquiry form to ask about current group, private, and event availability.' },
      { q: 'Can I ask accessibility questions?', a: 'Yes. Share the practical accommodation you need and the studio will explain available options.' },
    ],
  },
  wellness_coach: {
    title: 'Wellness Coaching Practice',
    serviceLabel: 'wellness coaching',
    metaDescription: 'A practical introduction to wellness coaching, program formats, communication, and next steps.',
    heroSubheadline: 'Explore a structured coaching process designed around clear priorities and practical action.',
    sections: [
      { id: 'priorities', heading: 'Clarify your priorities', body: 'Use the first conversation to identify a useful focus and understand the coaching options available.' },
      { id: 'programs', heading: 'Flexible program formats', body: 'Compare session structures, communication rhythms, and scheduling choices before selecting a format.' },
      { id: 'action', heading: 'Practical next steps', body: 'Turn the conversation into a clear, manageable plan that can be reviewed and adjusted over time.' },
    ],
    faq: [
      { q: 'How does coaching begin?', a: 'Start with a conversation about priorities, format, and whether the available approach feels useful.' },
      { q: 'Are virtual sessions available?', a: 'Ask the practice which in-person and virtual formats are currently offered.' },
      { q: 'How often do sessions happen?', a: 'Scheduling depends on the selected format and is agreed before the coaching process begins.' },
      { q: 'Can the focus change over time?', a: 'Yes. Priorities can be reviewed together as circumstances and practical needs change.' },
    ],
  },
};

const EDITIONS = [
  'Clear Path',
  'Calm Focus',
  'Open Door',
  'Modern Practice',
  'Quiet Confidence',
  'Warm Welcome',
  'Essential',
  'Studio',
  'Compass',
  'Gather',
  'Signature',
  'Simple Start',
] as const;

const APPROACH_WORDS = [
  'clear',
  'calm',
  'welcoming',
  'modern',
  'thoughtful',
  'warm',
  'focused',
  'flexible',
  'grounded',
  'collaborative',
  'considered',
  'simple',
] as const;

export interface CuratedExportOptions {
  outputRoot: string;
  niches?: readonly string[];
  limitPerNiche?: number;
  replace?: boolean;
}

export interface CuratedTemplateReceipt {
  niche: CuratedNiche;
  slug: string;
  foundation: string;
  sha256: string;
}

export interface CuratedExportReport {
  contractVersion: number;
  templateCount: number;
  countsByNiche: Record<string, number>;
  templates: CuratedTemplateReceipt[];
}

export function buildCuratedCopy(niche: CuratedNiche, editionIndex: number): CopyJSON {
  const spec = COPY_SPECS[niche];
  const slot = ((editionIndex % EDITIONS.length) + EDITIONS.length) % EDITIONS.length;
  const edition = EDITIONS[slot]!;
  const approach = APPROACH_WORDS[slot]!;
  return {
    title: `${spec.title} — ${edition}`,
    metaDescription: spec.metaDescription,
    heroHeadline: `A ${approach} way to explore ${spec.serviceLabel}`,
    heroSubheadline: spec.heroSubheadline,
    practitionerTagline: `${edition}: clear information and practical next steps`,
    ctaLabel: 'Start a conversation',
    sections: spec.sections.map((section) => ({ ...section })),
    faq: spec.faq.map((item) => ({ ...item })),
  };
}

function isPathInside(parent: string, candidate: string): boolean {
  const rel = relative(resolve(parent), resolve(candidate));
  return rel === '' || (!rel.startsWith('..') && !isAbsolute(rel));
}

function assertSafeOutputRoot(outputRoot: string): string {
  const target = resolve(outputRoot);
  if (target === parse(target).root || isPathInside(target, REPOSITORY_ROOT)) {
    throw new Error(`Refusing unsafe curated output root: ${target}`);
  }
  if (isPathInside(target, FOUNDATIONS_ROOT) || isPathInside(FOUNDATIONS_ROOT, target)) {
    throw new Error(`Curated output must stay separate from checked-in foundations: ${target}`);
  }
  return target;
}

async function sortedFiles(root: string, current = root): Promise<string[]> {
  const files: string[] = [];
  const entries = (await readdir(current, { withFileTypes: true }))
    .sort((a, b) => a.name.localeCompare(b.name));
  for (const entry of entries) {
    const full = join(current, entry.name);
    if (entry.isSymbolicLink()) throw new Error(`Curated output contains a symbolic link: ${full}`);
    if (entry.isDirectory()) files.push(...await sortedFiles(root, full));
    else if (entry.isFile()) files.push(relative(root, full).replace(/\\/g, '/'));
  }
  return files;
}

async function hashDirectory(directory: string): Promise<string> {
  const hash = createHash('sha256');
  for (const file of await sortedFiles(directory)) {
    hash.update(file);
    hash.update('\0');
    hash.update(await readFile(join(directory, ...file.split('/'))));
    hash.update('\0');
  }
  return hash.digest('hex');
}

async function selectedFoundations(niche: CuratedNiche, limit: number): Promise<string[]> {
  return (await readdir(join(FOUNDATIONS_ROOT, niche), { withFileTypes: true }))
    .filter((entry) => entry.isFile() && /^foundation-\d+\.html$/.test(entry.name))
    .map((entry) => entry.name)
    .sort()
    .slice(0, limit);
}

async function outputExists(target: string): Promise<boolean> {
  try {
    const stats = await lstat(target);
    if (stats.isSymbolicLink() || !stats.isDirectory()) {
      throw new Error(`Curated output target must be a real directory: ${target}`);
    }
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false;
    throw error;
  }
}

async function installStagingDirectory(
  stagingRoot: string,
  target: string,
  replace: boolean,
): Promise<void> {
  const exists = await outputExists(target);
  if (!exists) {
    await rename(stagingRoot, target);
    return;
  }

  const existingEntries = await readdir(target);
  if (existingEntries.length > 0 && !replace) {
    throw new Error(`Curated output already exists; pass --replace to replace it atomically: ${target}`);
  }

  const backup = `${target}.previous-${randomUUID()}`;
  await rename(target, backup);
  try {
    await rename(stagingRoot, target);
  } catch (error) {
    await rename(backup, target);
    throw error;
  }
  await rm(backup, { recursive: true, force: true });
}

export async function exportCuratedTemplates(
  options: CuratedExportOptions,
): Promise<CuratedExportReport> {
  const target = assertSafeOutputRoot(options.outputRoot);
  const limit = options.limitPerNiche ?? EDITIONS.length;
  if (!Number.isInteger(limit) || limit < 1 || limit > EDITIONS.length) {
    throw new Error(`limitPerNiche must be an integer from 1 to ${EDITIONS.length}`);
  }

  const requested = options.niches?.length ? [...new Set(options.niches)] : [...CURATED_NICHES];
  const invalid = requested.filter(
    (niche): niche is string => !CURATED_NICHES.includes(niche as CuratedNiche),
  );
  if (invalid.length > 0) throw new Error(`Unknown curated niche: ${invalid.join(', ')}`);
  const niches = requested as CuratedNiche[];

  await mkdir(dirname(target), { recursive: true });
  const stagingRoot = await mkdtemp(join(dirname(target), `.${basename(target)}-staging-`));
  const templates: CuratedTemplateReceipt[] = [];
  const countsByNiche: Record<string, number> = {};

  try {
    for (const niche of niches) {
      const foundations = await selectedFoundations(niche, limit);
      if (foundations.length !== limit) {
        throw new Error(`Expected ${limit} foundations for ${niche}; found ${foundations.length}`);
      }

      for (let index = 0; index < foundations.length; index += 1) {
        const foundation = foundations[index]!;
        const ordinal = String(index + 1).padStart(2, '0');
        const slug = `curated-v2-${niche.replace(/_/g, '-')}-${ordinal}`;
        const outputDir = await assembleTemplate({
          niche,
          foundationPath: join(FOUNDATIONS_ROOT, niche, foundation),
          colorSchemeId: 'original',
          fontVariationId: 'original',
          structureVariationId: 'original',
          copy: buildCuratedCopy(niche, index),
          outputSlug: slug,
          outputRoot: stagingRoot,
          imageSeed: index,
        });

        const qa = await runQA(outputDir);
        if (!qa.pass) {
          throw new Error(`${niche}/${foundation} failed curated QA: ${qa.errors.join('; ')}`);
        }
        templates.push({
          niche,
          slug,
          foundation,
          sha256: await hashDirectory(outputDir),
        });
      }
      countsByNiche[niche] = foundations.length;
    }

    const report: CuratedExportReport = {
      contractVersion: PUBLICATION_CONTRACT_VERSION,
      templateCount: templates.length,
      countsByNiche,
      templates,
    };
    await writeFile(
      join(stagingRoot, 'curated-report.json'),
      `${JSON.stringify(report, null, 2)}\n`,
      'utf-8',
    );
    await installStagingDirectory(stagingRoot, target, options.replace === true);
    return report;
  } catch (error) {
    await rm(stagingRoot, { recursive: true, force: true }).catch(() => undefined);
    throw error;
  }
}

interface CliOptions extends CuratedExportOptions {
  outputRoot: string;
}

export function parseCuratedExportArgs(argv: readonly string[]): CliOptions {
  let outputRoot = '';
  let replace = false;
  let limitPerNiche: number | undefined;
  const niches: string[] = [];

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]!;
    const nextValue = () => {
      const value = argv[index + 1];
      if (!value || value.startsWith('--')) throw new Error(`${arg} requires a value`);
      index += 1;
      return value;
    };
    // pnpm may forward its conventional argument separator to the script.
    if (arg === '--') continue;
    if (arg === '--output') outputRoot = nextValue();
    else if (arg.startsWith('--output=')) outputRoot = arg.slice('--output='.length);
    else if (arg === '--niche') niches.push(nextValue());
    else if (arg.startsWith('--niche=')) niches.push(arg.slice('--niche='.length));
    else if (arg === '--limit-per-niche') limitPerNiche = Number(nextValue());
    else if (arg.startsWith('--limit-per-niche=')) {
      limitPerNiche = Number(arg.slice('--limit-per-niche='.length));
    } else if (arg === '--replace') replace = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }

  if (!outputRoot.trim()) throw new Error('--output is required');
  return {
    outputRoot,
    replace,
    ...(niches.length > 0 ? { niches } : {}),
    ...(limitPerNiche === undefined ? {} : { limitPerNiche }),
  };
}

async function main(): Promise<void> {
  const options = parseCuratedExportArgs(process.argv.slice(2));
  const report = await exportCuratedTemplates(options);
  console.log(
    `[curated-export] Wrote ${report.templateCount} v${report.contractVersion} templates to ${resolve(options.outputRoot)}`,
  );
  for (const niche of Object.keys(report.countsByNiche).sort()) {
    console.log(`[curated-export] ${niche}: ${report.countsByNiche[niche]}`);
  }
}

const entryPoint = process.argv[1] ? resolve(process.argv[1]).toLowerCase() : '';
const modulePath = resolve(fileURLToPath(import.meta.url)).toLowerCase();
if (entryPoint === modulePath) {
  main().catch((error) => {
    console.error('[curated-export]', error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
