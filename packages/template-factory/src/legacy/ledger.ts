import { createHash, randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { DatabaseSync, type SQLInputValue } from 'node:sqlite';
import {
  DEFAULT_AI_DOLLAR_CAP_USD,
  DEFAULT_AI_TOKEN_CAP,
  LEGACY_SCHEMA_VERSION,
  type IssueInput,
  type LeasedTemplate,
  type LedgerStatus,
  type LegacyAliasRecord,
  type LegacyArtifactRecord,
  type LegacyCommandName,
  type LegacyIssueRecord,
  type LegacyPageRecord,
  type LegacyRenderRecord,
  type LegacyRunRecord,
  type LegacyTemplateInput,
  type LegacyTemplateRecord,
  type ModelBudgetSnapshot,
  type ModelUsageInput,
  type RunState,
  type TemplateStage,
  type TerminalDisposition,
} from './types.js';

export interface LegacyLedgerOptions {
  databasePath: string;
  aiDollarCapUsd?: number;
  aiTokenCap?: number;
  busyTimeoutMs?: number;
}

export interface CreateRunInput {
  command: LegacyCommandName;
  ruleVersion: string;
  sourceRoot: string;
  workRoot: string;
  options?: unknown;
  resumedFromRunId?: string | null;
  id?: string;
}

export interface CompleteTemplateLeaseInput {
  templateId: number;
  leaseToken: string;
  stage: TemplateStage;
  terminalDisposition?: TerminalDisposition | null;
  resultHash?: string | null;
  qualityReceipt?: string | null;
  resolveIssues?: boolean;
}

export interface LeaseTemplatesInput {
  stages: readonly TemplateStage[];
  legacySlugs?: readonly string[];
  claimedStage: TemplateStage;
  owner: string;
  limit: number;
  leaseMs?: number;
  maxAttempts?: number;
  runId?: string | null;
}

export interface PageInput {
  templateId: number;
  relativePath: string;
  role?: string | null;
  sourceHash: string;
  resultHash?: string | null;
  stage?: string;
  visibleTextLength?: number | null;
}

export interface TransformationInput {
  templateId: number;
  runId?: string | null;
  pageId?: number | null;
  ruleCode: string;
  ruleVersion: string;
  beforeHash?: string | null;
  afterHash?: string | null;
  fingerprint?: string | null;
  details?: unknown;
}

export interface RenderInput {
  templateId: number;
  runId?: string | null;
  pageId: number;
  artifactHash: string;
  ruleVersion: string;
  viewport: 'desktop' | 'mobile' | string;
  width: number;
  height: number;
  status: 'pending' | 'running' | 'passed' | 'failed';
  screenshotHash?: string | null;
  perceptualHash?: string | null;
  ssim?: number | null;
  consoleErrors?: number;
  failedRequests?: number;
  axeCritical?: number;
  axeSerious?: number;
  horizontalOverflowPx?: number | null;
  artifactPath?: string | null;
  error?: string | null;
}

export interface AliasInput {
  legacySlug: string;
  templateId: number;
  clusterId?: number | null;
  designId: string;
  contentPresetId: string;
  themePresetId: string;
  qualityReceipt: string;
  status?: 'candidate' | 'passing' | 'rejected';
}

export interface ArtifactInput {
  runId?: string | null;
  templateId?: number | null;
  kind: string;
  contentHash: string;
  relativePath: string;
  byteSize: number;
  metadata?: unknown;
}

export interface ListTemplatesOptions {
  stages?: readonly TemplateStage[];
  dispositions?: readonly (TerminalDisposition | null)[];
  niche?: string;
  limit?: number;
  offset?: number;
}

export interface ListIssuesOptions {
  templateId?: number;
  unresolved?: boolean;
  severity?: string;
  /** Return only facts scoped to each template's current source, rule, and artifact. */
  current?: boolean;
  limit?: number;
  offset?: number;
}

export interface ListArtifactsOptions {
  templateId?: number;
  runId?: string;
  kind?: string;
  limit?: number;
  offset?: number;
}

type SqlRow = Record<string, SQLInputValue>;

function nowIso(): string {
  return new Date().toISOString();
}

function json(value: unknown): string {
  return JSON.stringify(value ?? null);
}

function auditFingerprint(kind: 'issue' | 'transformation', fields: readonly unknown[]): string {
  return createHash('sha256')
    .update(kind)
    .update('\0')
    .update(fields.map((value) => value === null || value === undefined ? '' : String(value)).join('\0'))
    .digest('hex');
}

function parsedJson(value: SQLInputValue): unknown {
  try {
    return JSON.parse(String(value));
  } catch {
    return null;
  }
}

function parseRun(row: SqlRow | undefined): LegacyRunRecord | null {
  if (!row) return null;
  return {
    id: String(row.id),
    command: String(row.command) as LegacyCommandName,
    ruleVersion: String(row.rule_version),
    sourceRoot: String(row.source_root),
    workRoot: String(row.work_root),
    state: String(row.state) as RunState,
    resumedFromRunId: row.resumed_from_run_id === null ? null : String(row.resumed_from_run_id),
    optionsJson: String(row.options_json),
    startedAt: String(row.started_at),
    updatedAt: String(row.updated_at),
    completedAt: row.completed_at === null ? null : String(row.completed_at),
    error: row.error === null ? null : String(row.error),
  };
}

function parseTemplate(row: SqlRow): LegacyTemplateRecord {
  return {
    id: Number(row.id),
    legacySlug: String(row.legacy_slug),
    niche: String(row.niche),
    sourcePath: String(row.source_path),
    sourceHash: String(row.source_hash),
    foundationId: row.foundation_id === null ? null : String(row.foundation_id),
    pageCount: Number(row.page_count),
    ruleVersion: String(row.rule_version),
    stage: String(row.stage) as TemplateStage,
    terminalDisposition: row.terminal_disposition === null ? null : String(row.terminal_disposition) as TerminalDisposition,
    resultHash: row.result_hash === null ? null : String(row.result_hash),
    qualityReceipt: row.quality_receipt === null ? null : String(row.quality_receipt),
    attempts: Number(row.attempts),
    leaseOwner: row.lease_owner === null ? null : String(row.lease_owner),
    leaseExpiresAt: row.lease_expires_at === null ? null : String(row.lease_expires_at),
    lastRunId: row.last_run_id === null ? null : String(row.last_run_id),
    lastError: row.last_error === null ? null : String(row.last_error),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function parsePage(row: SqlRow): LegacyPageRecord {
  return {
    id: Number(row.id),
    templateId: Number(row.template_id),
    relativePath: String(row.relative_path),
    role: row.role === null ? null : String(row.role),
    sourceHash: String(row.source_hash),
    resultHash: row.result_hash === null ? null : String(row.result_hash),
    stage: String(row.stage),
    visibleTextLength: row.visible_text_length === null ? null : Number(row.visible_text_length),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function parseRender(row: SqlRow): LegacyRenderRecord {
  return {
    id: Number(row.id),
    templateId: Number(row.template_id),
    pageId: Number(row.page_id),
    runId: row.run_id === null ? null : String(row.run_id),
    artifactHash: String(row.artifact_hash),
    ruleVersion: String(row.rule_version),
    viewport: String(row.viewport),
    width: Number(row.width),
    height: Number(row.height),
    status: String(row.status) as LegacyRenderRecord['status'],
    screenshotHash: row.screenshot_hash === null ? null : String(row.screenshot_hash),
    perceptualHash: row.perceptual_hash === null ? null : String(row.perceptual_hash),
    ssim: row.ssim === null ? null : Number(row.ssim),
    consoleErrors: Number(row.console_errors),
    failedRequests: Number(row.failed_requests),
    axeCritical: Number(row.axe_critical),
    axeSerious: Number(row.axe_serious),
    horizontalOverflowPx: row.horizontal_overflow_px === null ? null : Number(row.horizontal_overflow_px),
    artifactPath: row.artifact_path === null ? null : String(row.artifact_path),
    error: row.error === null ? null : String(row.error),
    attempts: Number(row.attempts),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function parseAlias(row: SqlRow): LegacyAliasRecord {
  return {
    legacySlug: String(row.legacy_slug),
    templateId: Number(row.template_id),
    clusterId: row.cluster_id === null ? null : Number(row.cluster_id),
    designId: String(row.design_id),
    contentPresetId: String(row.content_preset_id),
    themePresetId: String(row.theme_preset_id),
    qualityReceipt: String(row.quality_receipt),
    status: String(row.status) as LegacyAliasRecord['status'],
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function parseIssue(row: SqlRow): LegacyIssueRecord {
  return {
    id: Number(row.id),
    templateId: Number(row.template_id),
    pageId: row.page_id === null ? null : Number(row.page_id),
    runId: row.run_id === null ? null : String(row.run_id),
    code: String(row.code),
    severity: String(row.severity) as LegacyIssueRecord['severity'],
    message: String(row.message),
    fingerprint: row.fingerprint === null ? null : String(row.fingerprint),
    sourceHash: row.source_hash === null || row.source_hash === undefined ? null : String(row.source_hash),
    ruleVersion: row.rule_version === null || row.rule_version === undefined ? null : String(row.rule_version),
    artifactHash: row.artifact_hash === null || row.artifact_hash === undefined ? null : String(row.artifact_hash),
    details: parsedJson(row.details_json),
    resolved: Number(row.resolved) === 1,
    createdAt: String(row.created_at),
    resolvedAt: row.resolved_at === null ? null : String(row.resolved_at),
  };
}

function parseArtifact(row: SqlRow): LegacyArtifactRecord {
  return {
    id: Number(row.id),
    runId: row.run_id === null ? null : String(row.run_id),
    templateId: row.template_id === null ? null : Number(row.template_id),
    kind: String(row.kind),
    contentHash: String(row.content_hash),
    relativePath: String(row.relative_path),
    byteSize: Number(row.byte_size),
    metadata: parsedJson(row.metadata_json),
    createdAt: String(row.created_at),
  };
}

function rowsToCounts(rows: SqlRow[], key: string): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const row of rows) {
    counts[String(row[key])] = Number(row.count);
  }
  return counts;
}

/** Durable WAL-backed state for restartable catalogue rehabilitation. */
export class LegacyLedger {
  readonly databasePath: string;
  readonly aiDollarCapUsd: number;
  readonly aiTokenCap: number;
  private readonly database: DatabaseSync;

  constructor(options: LegacyLedgerOptions) {
    this.databasePath = resolve(options.databasePath);
    this.aiDollarCapUsd = options.aiDollarCapUsd ?? DEFAULT_AI_DOLLAR_CAP_USD;
    this.aiTokenCap = options.aiTokenCap ?? DEFAULT_AI_TOKEN_CAP;
    mkdirSync(dirname(this.databasePath), { recursive: true });
    this.database = new DatabaseSync(this.databasePath, {
      enableForeignKeyConstraints: true,
      timeout: options.busyTimeoutMs ?? 15_000,
    });
    this.database.exec('PRAGMA journal_mode = WAL');
    this.database.exec('PRAGMA synchronous = NORMAL');
    this.database.exec('PRAGMA foreign_keys = ON');
    this.migrate();
  }

  close(): void {
    this.database.close();
  }

  private migrate(): void {
    let currentVersion = Number((this.database.prepare('PRAGMA user_version').get() as SqlRow).user_version);
    if (currentVersion > LEGACY_SCHEMA_VERSION) {
      throw new Error(`Ledger schema ${currentVersion} is newer than supported schema ${LEGACY_SCHEMA_VERSION}`);
    }

    if (currentVersion < 1) {
      this.database.exec(`
        BEGIN IMMEDIATE;
        CREATE TABLE IF NOT EXISTS runs (
          id TEXT PRIMARY KEY,
          command TEXT NOT NULL,
          rule_version TEXT NOT NULL,
          source_root TEXT NOT NULL,
          work_root TEXT NOT NULL,
          state TEXT NOT NULL CHECK (state IN ('running', 'completed', 'failed', 'cancelled')),
          resumed_from_run_id TEXT REFERENCES runs(id),
          options_json TEXT NOT NULL DEFAULT '{}',
          started_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          completed_at TEXT,
          error TEXT
        );

        CREATE TABLE IF NOT EXISTS templates (
          id INTEGER PRIMARY KEY,
          legacy_slug TEXT NOT NULL UNIQUE,
          niche TEXT NOT NULL,
          source_path TEXT NOT NULL UNIQUE,
          source_hash TEXT NOT NULL,
          foundation_id TEXT,
          page_count INTEGER NOT NULL DEFAULT 0,
          rule_version TEXT NOT NULL,
          stage TEXT NOT NULL,
          terminal_disposition TEXT,
          result_hash TEXT,
          quality_receipt TEXT,
          attempts INTEGER NOT NULL DEFAULT 0,
          lease_owner TEXT,
          lease_token TEXT,
          lease_expires_at TEXT,
          last_run_id TEXT REFERENCES runs(id),
          last_error TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS pages (
          id INTEGER PRIMARY KEY,
          template_id INTEGER NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
          relative_path TEXT NOT NULL,
          role TEXT,
          source_hash TEXT NOT NULL,
          result_hash TEXT,
          stage TEXT NOT NULL DEFAULT 'discovered',
          visible_text_length INTEGER,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          UNIQUE(template_id, relative_path)
        );

        CREATE TABLE IF NOT EXISTS issues (
          id INTEGER PRIMARY KEY,
          template_id INTEGER NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
          page_id INTEGER REFERENCES pages(id) ON DELETE CASCADE,
          run_id TEXT REFERENCES runs(id),
          code TEXT NOT NULL,
          severity TEXT NOT NULL,
          message TEXT NOT NULL,
          fingerprint TEXT,
          details_json TEXT NOT NULL DEFAULT 'null',
          resolved INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL,
          resolved_at TEXT
        );

        CREATE TABLE IF NOT EXISTS transformations (
          id INTEGER PRIMARY KEY,
          template_id INTEGER NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
          page_id INTEGER REFERENCES pages(id) ON DELETE CASCADE,
          run_id TEXT REFERENCES runs(id),
          rule_code TEXT NOT NULL,
          rule_version TEXT NOT NULL,
          before_hash TEXT,
          after_hash TEXT,
          details_json TEXT NOT NULL DEFAULT 'null',
          created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS renders (
          id INTEGER PRIMARY KEY,
          template_id INTEGER NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
          page_id INTEGER NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
          run_id TEXT REFERENCES runs(id),
          viewport TEXT NOT NULL,
          width INTEGER NOT NULL,
          height INTEGER NOT NULL,
          status TEXT NOT NULL,
          screenshot_hash TEXT,
          perceptual_hash TEXT,
          ssim REAL,
          console_errors INTEGER NOT NULL DEFAULT 0,
          failed_requests INTEGER NOT NULL DEFAULT 0,
          axe_critical INTEGER NOT NULL DEFAULT 0,
          axe_serious INTEGER NOT NULL DEFAULT 0,
          horizontal_overflow_px REAL,
          artifact_path TEXT,
          error TEXT,
          attempts INTEGER NOT NULL DEFAULT 1,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          UNIQUE(template_id, page_id, viewport)
        );

        CREATE TABLE IF NOT EXISTS dedupe_clusters (
          id INTEGER PRIMARY KEY,
          niche TEXT NOT NULL,
          structural_hash TEXT NOT NULL,
          canonical_template_id INTEGER REFERENCES templates(id),
          method TEXT NOT NULL,
          dom_similarity REAL,
          desktop_ssim REAL,
          mobile_ssim REAL,
          max_phash_distance INTEGER,
          decision TEXT NOT NULL DEFAULT 'candidate',
          evidence_json TEXT NOT NULL DEFAULT 'null',
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          UNIQUE(niche, structural_hash)
        );

        CREATE TABLE IF NOT EXISTS aliases (
          legacy_slug TEXT PRIMARY KEY,
          template_id INTEGER NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
          cluster_id INTEGER REFERENCES dedupe_clusters(id),
          design_id TEXT NOT NULL,
          content_preset_id TEXT NOT NULL,
          theme_preset_id TEXT NOT NULL,
          quality_receipt TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'candidate',
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS artifacts (
          id INTEGER PRIMARY KEY,
          run_id TEXT REFERENCES runs(id),
          template_id INTEGER REFERENCES templates(id) ON DELETE CASCADE,
          kind TEXT NOT NULL,
          content_hash TEXT NOT NULL,
          relative_path TEXT NOT NULL,
          byte_size INTEGER NOT NULL,
          metadata_json TEXT NOT NULL DEFAULT 'null',
          created_at TEXT NOT NULL,
          UNIQUE(kind, content_hash, relative_path)
        );

        CREATE TABLE IF NOT EXISTS model_usage (
          id INTEGER PRIMARY KEY,
          run_id TEXT REFERENCES runs(id),
          template_id INTEGER REFERENCES templates(id) ON DELETE SET NULL,
          request_key TEXT NOT NULL UNIQUE,
          model TEXT NOT NULL,
          status TEXT NOT NULL,
          estimated_input_tokens INTEGER NOT NULL DEFAULT 0,
          estimated_output_tokens INTEGER NOT NULL DEFAULT 0,
          actual_input_tokens INTEGER NOT NULL DEFAULT 0,
          actual_output_tokens INTEGER NOT NULL DEFAULT 0,
          estimated_cost_usd REAL NOT NULL DEFAULT 0,
          actual_cost_usd REAL NOT NULL DEFAULT 0,
          batch_id TEXT,
          response_id TEXT,
          error TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );

        CREATE INDEX IF NOT EXISTS templates_stage_lease_idx ON templates(stage, lease_expires_at, attempts);
        CREATE INDEX IF NOT EXISTS templates_disposition_idx ON templates(terminal_disposition);
        CREATE INDEX IF NOT EXISTS pages_template_idx ON pages(template_id);
        CREATE INDEX IF NOT EXISTS issues_open_idx ON issues(resolved, severity, code);
        CREATE INDEX IF NOT EXISTS transformations_template_idx ON transformations(template_id, rule_code);
        CREATE INDEX IF NOT EXISTS renders_status_idx ON renders(status, viewport);
        CREATE INDEX IF NOT EXISTS model_usage_status_idx ON model_usage(status);
        PRAGMA user_version = 1;
        COMMIT;
      `);
      currentVersion = 1;
    }

    if (currentVersion < 2) {
      // v1 kept only one render per template/page/viewport. Its rows cannot be
      // proven to belong to the template's current candidate artifact, so retain
      // them as explicitly unscoped history. Fresh v2 evidence is keyed to the
      // exact artifact hash and rule version and is the only evidence considered
      // by current-status and catalogue-composition queries.
      this.database.exec(`
        BEGIN IMMEDIATE;
        ALTER TABLE renders RENAME TO renders_v1;
        CREATE TABLE renders (
          id INTEGER PRIMARY KEY,
          template_id INTEGER NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
          page_id INTEGER NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
          run_id TEXT REFERENCES runs(id),
          artifact_hash TEXT NOT NULL,
          rule_version TEXT NOT NULL,
          viewport TEXT NOT NULL,
          width INTEGER NOT NULL,
          height INTEGER NOT NULL,
          status TEXT NOT NULL,
          screenshot_hash TEXT,
          perceptual_hash TEXT,
          ssim REAL,
          console_errors INTEGER NOT NULL DEFAULT 0,
          failed_requests INTEGER NOT NULL DEFAULT 0,
          axe_critical INTEGER NOT NULL DEFAULT 0,
          axe_serious INTEGER NOT NULL DEFAULT 0,
          horizontal_overflow_px REAL,
          artifact_path TEXT,
          error TEXT,
          attempts INTEGER NOT NULL DEFAULT 1,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          UNIQUE(template_id, page_id, viewport, artifact_hash, rule_version)
        );
        INSERT INTO renders (
          id, template_id, page_id, run_id, artifact_hash, rule_version,
          viewport, width, height, status, screenshot_hash, perceptual_hash,
          ssim, console_errors, failed_requests, axe_critical, axe_serious,
          horizontal_overflow_px, artifact_path, error, attempts, created_at,
          updated_at
        )
        SELECT
          id, template_id, page_id, run_id,
          'legacy-unscoped:' || id,
          COALESCE((SELECT rule_version FROM runs WHERE runs.id = renders_v1.run_id), 'legacy-unscoped'),
          viewport, width, height, status, screenshot_hash, perceptual_hash,
          ssim, console_errors, failed_requests, axe_critical, axe_serious,
          horizontal_overflow_px, artifact_path, error, attempts, created_at,
          updated_at
        FROM renders_v1;
        DROP TABLE renders_v1;
        CREATE INDEX IF NOT EXISTS renders_status_idx ON renders(status, viewport);
        CREATE INDEX IF NOT EXISTS renders_current_idx
          ON renders(template_id, artifact_hash, rule_version, page_id, viewport);
        PRAGMA user_version = 2;
        COMMIT;
      `);
      currentVersion = 2;
    }

    if (currentVersion < 3) {
      // Audit rows are durable facts, not attempt logs. Interrupted work can
      // replay the same deterministic repair in the same run, so fingerprint
      // and uniquify those facts while retaining different runs as history.
      this.database.exec('BEGIN IMMEDIATE');
      try {
        this.database.exec('ALTER TABLE transformations ADD COLUMN fingerprint TEXT');

        const issueRows = this.database.prepare(`
          SELECT id, code, severity, message, details_json
          FROM issues WHERE fingerprint IS NULL
        `).all() as SqlRow[];
        const setIssueFingerprint = this.database.prepare('UPDATE issues SET fingerprint = ? WHERE id = ?');
        for (const row of issueRows) {
          setIssueFingerprint.run(auditFingerprint('issue', [
            row.code, row.severity, row.message, row.details_json,
          ]), row.id);
        }

        const transformationRows = this.database.prepare(`
          SELECT id, rule_code, rule_version, before_hash, after_hash, details_json
          FROM transformations
        `).all() as SqlRow[];
        const setTransformationFingerprint = this.database.prepare(
          'UPDATE transformations SET fingerprint = ? WHERE id = ?',
        );
        for (const row of transformationRows) {
          setTransformationFingerprint.run(auditFingerprint('transformation', [
            row.rule_code,
            row.rule_version,
            row.before_hash,
            row.after_hash,
            row.details_json,
          ]), row.id);
        }

        // Keep the newest replay because it contains the most recent resolved
        // state/details, then enforce one row per logical fact per run.
        this.database.exec(`
          DELETE FROM issues
          WHERE fingerprint IS NOT NULL AND id NOT IN (
            SELECT MAX(id) FROM issues
            WHERE fingerprint IS NOT NULL
            GROUP BY template_id, IFNULL(page_id, -1), IFNULL(run_id, ''), code, fingerprint
          );
          DELETE FROM transformations
          WHERE fingerprint IS NOT NULL AND id NOT IN (
            SELECT MAX(id) FROM transformations
            WHERE fingerprint IS NOT NULL
            GROUP BY template_id, IFNULL(page_id, -1), IFNULL(run_id, ''),
              rule_code, rule_version, fingerprint
          );
          CREATE UNIQUE INDEX IF NOT EXISTS issues_run_fingerprint_unique_idx
            ON issues(template_id, IFNULL(page_id, -1), IFNULL(run_id, ''), code, fingerprint)
            WHERE fingerprint IS NOT NULL;
          CREATE UNIQUE INDEX IF NOT EXISTS transformations_run_fingerprint_unique_idx
            ON transformations(
              template_id, IFNULL(page_id, -1), IFNULL(run_id, ''),
              rule_code, rule_version, fingerprint
            ) WHERE fingerprint IS NOT NULL;
          PRAGMA user_version = 3;
          COMMIT;
        `);
      } catch (error) {
        this.database.exec('ROLLBACK');
        throw error;
      }
      currentVersion = 3;
    }

    if (currentVersion < 4) {
      // Issue rows used to be attempt history without a durable statement of
      // which source/rule/artifact they described. Preserve that history, but
      // attach the best provable scope so current status/report queries cannot
      // surface stale failures after a source, rule, or candidate changes.
      this.database.exec(`
        BEGIN IMMEDIATE;
        ALTER TABLE issues ADD COLUMN source_hash TEXT;
        ALTER TABLE issues ADD COLUMN rule_version TEXT;
        ALTER TABLE issues ADD COLUMN artifact_hash TEXT;
        UPDATE issues SET
          source_hash = (SELECT source_hash FROM templates WHERE templates.id = issues.template_id),
          rule_version = COALESCE(
            (SELECT rule_version FROM runs WHERE runs.id = issues.run_id),
            (SELECT rule_version FROM templates WHERE templates.id = issues.template_id)
          ),
          artifact_hash = (SELECT result_hash FROM templates WHERE templates.id = issues.template_id);
        CREATE INDEX IF NOT EXISTS issues_current_idx
          ON issues(resolved, template_id, rule_version, source_hash, artifact_hash);
        PRAGMA user_version = 4;
        COMMIT;
      `);
      currentVersion = 4;
    }
  }

  private transaction<T>(operation: () => T): T {
    this.database.exec('BEGIN IMMEDIATE');
    try {
      const result = operation();
      this.database.exec('COMMIT');
      return result;
    } catch (error) {
      this.database.exec('ROLLBACK');
      throw error;
    }
  }

  journalMode(): string {
    return String((this.database.prepare('PRAGMA journal_mode').get() as SqlRow).journal_mode);
  }

  createRun(input: CreateRunInput): LegacyRunRecord {
    const id = input.id ?? randomUUID();
    const timestamp = nowIso();
    this.database.prepare(`
      INSERT INTO runs (
        id, command, rule_version, source_root, work_root, state,
        resumed_from_run_id, options_json, started_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, 'running', ?, ?, ?, ?)
    `).run(
      id,
      input.command,
      input.ruleVersion,
      resolve(input.sourceRoot),
      resolve(input.workRoot),
      input.resumedFromRunId ?? null,
      json(input.options ?? {}),
      timestamp,
      timestamp,
    );
    return this.getRun(id) as LegacyRunRecord;
  }

  getRun(id: string): LegacyRunRecord | null {
    return parseRun(this.database.prepare('SELECT * FROM runs WHERE id = ?').get(id) as SqlRow | undefined);
  }

  latestRun(): LegacyRunRecord | null {
    return parseRun(this.database.prepare('SELECT * FROM runs ORDER BY started_at DESC, rowid DESC LIMIT 1').get() as SqlRow | undefined);
  }

  findResumableRun(command: LegacyCommandName, sourceRoot: string, ruleVersion: string): LegacyRunRecord | null {
    return parseRun(this.database.prepare(`
      SELECT * FROM runs
      WHERE command = ? AND source_root = ? AND rule_version = ? AND state IN ('running', 'failed', 'cancelled')
      ORDER BY started_at DESC, rowid DESC
      LIMIT 1
    `).get(command, resolve(sourceRoot), ruleVersion) as SqlRow | undefined);
  }

  resumeRun(id: string): LegacyRunRecord {
    const timestamp = nowIso();
    const result = this.database.prepare(`
      UPDATE runs SET state = 'running', updated_at = ?, completed_at = NULL, error = NULL WHERE id = ?
    `).run(timestamp, id);
    if (Number(result.changes) !== 1) throw new Error(`Unknown run: ${id}`);
    return this.getRun(id) as LegacyRunRecord;
  }

  finishRun(id: string, state: Exclude<RunState, 'running'>, error?: string | null): void {
    const timestamp = nowIso();
    const result = this.database.prepare(`
      UPDATE runs SET state = ?, error = ?, updated_at = ?, completed_at = ? WHERE id = ?
    `).run(state, error ?? null, timestamp, timestamp, id);
    if (Number(result.changes) !== 1) throw new Error(`Unknown run: ${id}`);
  }

  cancelOrphanedRuns(exceptRunId?: string | null): number {
    const timestamp = nowIso();
    const reason = 'Superseded after the prior compiler process lock was no longer active; durable template stages remain resumable.';
    const result = exceptRunId
      ? this.database.prepare(`
        UPDATE runs SET state = 'cancelled', error = ?, updated_at = ?, completed_at = ?
        WHERE state = 'running' AND id <> ?
      `).run(reason, timestamp, timestamp, exceptRunId)
      : this.database.prepare(`
        UPDATE runs SET state = 'cancelled', error = ?, updated_at = ?, completed_at = ?
        WHERE state = 'running'
      `).run(reason, timestamp, timestamp);
    return Number(result.changes);
  }

  heartbeatRun(id: string): void {
    const result = this.database.prepare('UPDATE runs SET updated_at = ? WHERE id = ?').run(nowIso(), id);
    if (Number(result.changes) !== 1) throw new Error(`Unknown run: ${id}`);
  }

  /**
   * Reconcile one inventory record. The compiler writer lock guarantees there
   * is no live worker while inventory runs, so an unchanged transient stage is
   * necessarily abandoned work from a stopped process. Normalize it to its
   * retry checkpoint while clearing the stale lease; otherwise a fresh run
   * could strand the row forever because no worker leases transient stages.
   */
  upsertTemplate(runId: string | null, input: LegacyTemplateInput, ruleVersion: string): LegacyTemplateRecord {
    const timestamp = nowIso();
    this.database.prepare(`
      INSERT INTO templates (
        legacy_slug, niche, source_path, source_hash, foundation_id, page_count,
        rule_version, stage, terminal_disposition, last_run_id, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(legacy_slug) DO UPDATE SET
        niche = excluded.niche,
        source_path = excluded.source_path,
        source_hash = excluded.source_hash,
        foundation_id = excluded.foundation_id,
        page_count = excluded.page_count,
        rule_version = excluded.rule_version,
        stage = CASE
          WHEN templates.source_hash <> excluded.source_hash OR templates.rule_version <> excluded.rule_version
            OR templates.niche <> excluded.niche
          THEN excluded.stage
          WHEN templates.stage = 'repairing' THEN 'repair_pending'
          WHEN templates.stage = 'rendering' THEN 'render_pending'
          WHEN templates.stage = 'clustered' THEN 'verified'
          ELSE templates.stage END,
        terminal_disposition = CASE
          WHEN templates.source_hash <> excluded.source_hash OR templates.rule_version <> excluded.rule_version
            OR templates.niche <> excluded.niche
          THEN excluded.terminal_disposition ELSE templates.terminal_disposition END,
        result_hash = CASE
          WHEN templates.source_hash <> excluded.source_hash OR templates.rule_version <> excluded.rule_version
            OR templates.niche <> excluded.niche
          THEN NULL ELSE templates.result_hash END,
        quality_receipt = CASE
          WHEN templates.source_hash <> excluded.source_hash OR templates.rule_version <> excluded.rule_version
            OR templates.niche <> excluded.niche
          THEN NULL ELSE templates.quality_receipt END,
        attempts = CASE
          WHEN templates.source_hash <> excluded.source_hash OR templates.rule_version <> excluded.rule_version
            OR templates.niche <> excluded.niche
          THEN 0
          WHEN templates.stage IN ('repairing', 'rendering', 'clustered') AND templates.attempts > 0
          THEN templates.attempts - 1
          ELSE templates.attempts END,
        lease_owner = NULL,
        lease_token = NULL,
        lease_expires_at = NULL,
        last_run_id = excluded.last_run_id,
        last_error = NULL,
        updated_at = excluded.updated_at
    `).run(
      input.legacySlug,
      input.niche,
      resolve(input.sourcePath),
      input.sourceHash,
      input.foundationId ?? null,
      input.pageCount ?? 0,
      ruleVersion,
      input.stage ?? 'discovered',
      input.terminalDisposition ?? null,
      runId,
      timestamp,
      timestamp,
    );
    return this.getTemplateBySlug(input.legacySlug) as LegacyTemplateRecord;
  }

  getTemplateBySlug(legacySlug: string): LegacyTemplateRecord | null {
    const row = this.database.prepare('SELECT * FROM templates WHERE legacy_slug = ?').get(legacySlug) as SqlRow | undefined;
    return row ? parseTemplate(row) : null;
  }

  getTemplate(id: number): LegacyTemplateRecord | null {
    const row = this.database.prepare('SELECT * FROM templates WHERE id = ?').get(id) as SqlRow | undefined;
    return row ? parseTemplate(row) : null;
  }

  listTemplates(options: ListTemplatesOptions = {}): LegacyTemplateRecord[] {
    if (options.stages?.length === 0 || options.dispositions?.length === 0) return [];
    const clauses: string[] = [];
    const parameters: SQLInputValue[] = [];

    if (options.stages) {
      clauses.push(`stage IN (${options.stages.map(() => '?').join(', ')})`);
      parameters.push(...options.stages);
    }
    if (options.dispositions) {
      const values = options.dispositions.filter((value): value is TerminalDisposition => value !== null);
      const includesNull = options.dispositions.includes(null);
      const dispositionClauses: string[] = [];
      if (values.length > 0) {
        dispositionClauses.push(`terminal_disposition IN (${values.map(() => '?').join(', ')})`);
        parameters.push(...values);
      }
      if (includesNull) dispositionClauses.push('terminal_disposition IS NULL');
      clauses.push(`(${dispositionClauses.join(' OR ')})`);
    }
    if (options.niche !== undefined) {
      clauses.push('niche = ?');
      parameters.push(options.niche);
    }

    let query = `SELECT * FROM templates${clauses.length > 0 ? ` WHERE ${clauses.join(' AND ')}` : ''} ORDER BY niche, legacy_slug, id`;
    if (options.limit !== undefined) {
      if (!Number.isSafeInteger(options.limit) || options.limit <= 0) throw new Error('limit must be a positive integer');
      query += ' LIMIT ?';
      parameters.push(options.limit);
    } else if (options.offset !== undefined) {
      query += ' LIMIT -1';
    }
    if (options.offset !== undefined) {
      if (!Number.isSafeInteger(options.offset) || options.offset < 0) throw new Error('offset must be a non-negative integer');
      query += ' OFFSET ?';
      parameters.push(options.offset);
    }

    return (this.database.prepare(query).all(...parameters) as SqlRow[]).map(parseTemplate);
  }

  getPage(id: number): LegacyPageRecord | null {
    const row = this.database.prepare('SELECT * FROM pages WHERE id = ?').get(id) as SqlRow | undefined;
    return row ? parsePage(row) : null;
  }

  listPages(templateId: number): LegacyPageRecord[] {
    return (this.database.prepare(`
      SELECT * FROM pages WHERE template_id = ? ORDER BY relative_path, id
    `).all(templateId) as SqlRow[]).map(parsePage);
  }

  /**
   * Synchronize the source-page inventory without destroying durable repair and
   * render checkpoints. An unchanged catalogue scan leaves existing page rows
   * untouched; a source/rule change retires the previous page set before the
   * current source pages are reintroduced as inventory work. Retiring instead
   * of deleting preserves artifact-scoped render history through the page FK.
   */
  reconcileInventoryPages(
    templateId: number,
    pages: readonly Omit<PageInput, 'templateId' | 'resultHash' | 'stage' | 'visibleTextLength'>[],
    resetExisting: boolean,
  ): number[] {
    return this.transaction(() => {
      const timestamp = nowIso();
      if (resetExisting) {
        this.database.prepare(`
          UPDATE pages SET result_hash = NULL, stage = 'superseded',
            visible_text_length = NULL, updated_at = ?
          WHERE template_id = ?
        `).run(timestamp, templateId);
      }

      const existing = new Map(this.listPages(templateId).map((page) => [page.relativePath, page]));
      const pageIds: number[] = [];
      for (const page of pages) {
        const relativePath = page.relativePath.replace(/\\/g, '/');
        const prior = existing.get(relativePath);
        if (!resetExisting && prior?.sourceHash === page.sourceHash) {
          pageIds.push(prior.id);
          continue;
        }
        pageIds.push(this.upsertPage({
          templateId,
          relativePath,
          role: page.role,
          sourceHash: page.sourceHash,
          stage: 'inventoried',
        }));
      }
      return pageIds;
    });
  }

  listRenders(templateId?: number): LegacyRenderRecord[] {
    const rows = templateId === undefined
      ? this.database.prepare(`
          SELECT renders.* FROM renders
          JOIN templates ON templates.id = renders.template_id
          WHERE renders.artifact_hash = templates.result_hash
            AND renders.rule_version = templates.rule_version
          ORDER BY renders.template_id, renders.page_id, renders.viewport, renders.id
        `).all()
      : this.database.prepare(`
          SELECT renders.* FROM renders
          JOIN templates ON templates.id = renders.template_id
          WHERE renders.template_id = ?
            AND renders.artifact_hash = templates.result_hash
            AND renders.rule_version = templates.rule_version
          ORDER BY renders.page_id, renders.viewport, renders.id
        `).all(templateId);
    return (rows as SqlRow[]).map(parseRender);
  }

  /** All retained render evidence, including superseded artifacts and rules. */
  listRenderHistory(templateId?: number): LegacyRenderRecord[] {
    const rows = templateId === undefined
      ? this.database.prepare('SELECT * FROM renders ORDER BY template_id, page_id, viewport, artifact_hash, rule_version, id').all()
      : this.database.prepare(`
          SELECT * FROM renders WHERE template_id = ?
          ORDER BY page_id, viewport, artifact_hash, rule_version, id
        `).all(templateId);
    return (rows as SqlRow[]).map(parseRender);
  }

  listAliases(status?: LegacyAliasRecord['status'] | readonly LegacyAliasRecord['status'][]): LegacyAliasRecord[] {
    const statuses = status === undefined ? undefined : typeof status === 'string' ? [status] : [...status];
    if (statuses?.length === 0) return [];
    const rows = statuses
      ? this.database.prepare(`
          SELECT * FROM aliases WHERE status IN (${statuses.map(() => '?').join(', ')})
          ORDER BY legacy_slug
        `).all(...statuses)
      : this.database.prepare('SELECT * FROM aliases ORDER BY legacy_slug').all();
    return (rows as SqlRow[]).map(parseAlias);
  }

  listIssues(options: ListIssuesOptions = {}): LegacyIssueRecord[] {
    const clauses: string[] = [];
    const parameters: SQLInputValue[] = [];
    if (options.templateId !== undefined) {
      clauses.push('issues.template_id = ?');
      parameters.push(options.templateId);
    }
    if (options.unresolved !== undefined) {
      clauses.push('issues.resolved = ?');
      parameters.push(options.unresolved ? 0 : 1);
    }
    if (options.severity !== undefined) {
      clauses.push('issues.severity = ?');
      parameters.push(options.severity);
    }
    if (options.current) {
      clauses.push('issues.source_hash = templates.source_hash');
      clauses.push('issues.rule_version = templates.rule_version');
      clauses.push('(issues.artifact_hash IS NULL OR issues.artifact_hash = templates.result_hash)');
    }
    const from = options.current
      ? 'issues JOIN templates ON templates.id = issues.template_id'
      : 'issues';
    let query = `SELECT issues.* FROM ${from}${clauses.length > 0 ? ` WHERE ${clauses.join(' AND ')}` : ''} ORDER BY issues.template_id, COALESCE(issues.page_id, 0), issues.id`;
    if (options.limit !== undefined) {
      if (!Number.isSafeInteger(options.limit) || options.limit <= 0) throw new Error('limit must be a positive integer');
      query += ' LIMIT ?';
      parameters.push(options.limit);
    } else if (options.offset !== undefined) {
      query += ' LIMIT -1';
    }
    if (options.offset !== undefined) {
      if (!Number.isSafeInteger(options.offset) || options.offset < 0) throw new Error('offset must be a non-negative integer');
      query += ' OFFSET ?';
      parameters.push(options.offset);
    }
    return (this.database.prepare(query).all(...parameters) as SqlRow[]).map(parseIssue);
  }

  listArtifacts(options: ListArtifactsOptions = {}): LegacyArtifactRecord[] {
    const clauses: string[] = [];
    const parameters: SQLInputValue[] = [];
    if (options.templateId !== undefined) {
      clauses.push('template_id = ?');
      parameters.push(options.templateId);
    }
    if (options.runId !== undefined) {
      clauses.push('run_id = ?');
      parameters.push(options.runId);
    }
    if (options.kind !== undefined) {
      clauses.push('kind = ?');
      parameters.push(options.kind);
    }
    let query = `SELECT * FROM artifacts${clauses.length > 0 ? ` WHERE ${clauses.join(' AND ')}` : ''} ORDER BY kind, relative_path, content_hash, id`;
    if (options.limit !== undefined) {
      if (!Number.isSafeInteger(options.limit) || options.limit <= 0) throw new Error('limit must be a positive integer');
      query += ' LIMIT ?';
      parameters.push(options.limit);
    } else if (options.offset !== undefined) {
      query += ' LIMIT -1';
    }
    if (options.offset !== undefined) {
      if (!Number.isSafeInteger(options.offset) || options.offset < 0) throw new Error('offset must be a non-negative integer');
      query += ' OFFSET ?';
      parameters.push(options.offset);
    }
    return (this.database.prepare(query).all(...parameters) as SqlRow[]).map(parseArtifact);
  }

  leaseTemplates(input: LeaseTemplatesInput): LeasedTemplate[] {
    if (input.stages.length === 0) return [];
    if (input.legacySlugs?.length === 0) return [];
    if (!Number.isSafeInteger(input.limit) || input.limit <= 0) throw new Error('Lease limit must be a positive integer');
    const leaseMs = input.leaseMs ?? 5 * 60_000;
    const maxAttempts = input.maxAttempts ?? 3;
    const timestamp = nowIso();
    const expiresAt = new Date(Date.now() + leaseMs).toISOString();
    const placeholders = input.stages.map(() => '?').join(', ');
    const slugFilter = input.legacySlugs
      ? `AND legacy_slug IN (${input.legacySlugs.map(() => '?').join(', ')})`
      : '';

    return this.transaction(() => {
      const candidates = this.database.prepare(`
        SELECT id FROM templates
        WHERE stage IN (${placeholders})
          ${slugFilter}
          AND attempts < ?
          AND (lease_expires_at IS NULL OR lease_expires_at <= ?)
        ORDER BY niche, legacy_slug
        LIMIT ?
      `).all(...input.stages, ...(input.legacySlugs ?? []), maxAttempts, timestamp, input.limit) as SqlRow[];

      const leased: LeasedTemplate[] = [];
      const claim = this.database.prepare(`
        UPDATE templates SET
          stage = ?, attempts = attempts + 1, lease_owner = ?, lease_token = ?,
          lease_expires_at = ?, last_run_id = COALESCE(?, last_run_id), last_error = NULL, updated_at = ?
        WHERE id = ? AND (lease_expires_at IS NULL OR lease_expires_at <= ?)
      `);

      for (const candidate of candidates) {
        const leaseToken = randomUUID();
        const id = Number(candidate.id);
        const claimed = claim.run(
          input.claimedStage,
          input.owner,
          leaseToken,
          expiresAt,
          input.runId ?? null,
          timestamp,
          id,
          timestamp,
        );
        if (Number(claimed.changes) === 1) {
          leased.push({ ...(this.getTemplate(id) as LegacyTemplateRecord), leaseToken });
        }
      }
      return leased;
    });
  }

  renewLease(templateId: number, leaseToken: string, leaseMs = 5 * 60_000): boolean {
    const timestamp = nowIso();
    const expiresAt = new Date(Date.now() + leaseMs).toISOString();
    const result = this.database.prepare(`
      UPDATE templates SET lease_expires_at = ?, updated_at = ?
      WHERE id = ? AND lease_token = ? AND lease_expires_at > ?
    `).run(expiresAt, timestamp, templateId, leaseToken, timestamp);
    return Number(result.changes) === 1;
  }

  completeTemplateLease(input: CompleteTemplateLeaseInput): boolean {
    return this.transaction(() => {
      const timestamp = nowIso();
      const result = this.database.prepare(`
        UPDATE templates SET
          stage = ?, terminal_disposition = ?, result_hash = COALESCE(?, result_hash),
          quality_receipt = COALESCE(?, quality_receipt), lease_owner = NULL,
          lease_token = NULL, lease_expires_at = NULL, attempts = 0,
          last_error = NULL, updated_at = ?
        WHERE id = ? AND lease_token = ?
      `).run(
        input.stage,
        input.terminalDisposition ?? null,
        input.resultHash ?? null,
        input.qualityReceipt ?? null,
        timestamp,
        input.templateId,
        input.leaseToken,
      );
      if (Number(result.changes) !== 1) return false;
      if (input.resolveIssues) {
        this.database.prepare(`
          UPDATE issues SET resolved = 1, resolved_at = ?
          WHERE template_id = ? AND resolved = 0
        `).run(timestamp, input.templateId);
      }
      return true;
    });
  }

  failTemplateLease(templateId: number, leaseToken: string, retryStage: TemplateStage, error: string): boolean {
    const result = this.database.prepare(`
      UPDATE templates SET stage = ?, lease_owner = NULL, lease_token = NULL,
        lease_expires_at = NULL, last_error = ?, updated_at = ?
      WHERE id = ? AND lease_token = ?
    `).run(retryStage, error, nowIso(), templateId, leaseToken);
    return Number(result.changes) === 1;
  }

  releaseExpiredLeases(retryStage?: TemplateStage): number {
    const timestamp = nowIso();
    const statement = retryStage
      ? this.database.prepare(`
          UPDATE templates SET stage = ?, lease_owner = NULL, lease_token = NULL,
            lease_expires_at = NULL,
            attempts = CASE WHEN attempts > 0 THEN attempts - 1 ELSE 0 END,
            updated_at = ?
          WHERE lease_expires_at IS NOT NULL AND lease_expires_at <= ?
      `)
      : this.database.prepare(`
          UPDATE templates SET
            stage = CASE stage
              WHEN 'repairing' THEN 'repair_pending'
              WHEN 'rendering' THEN 'render_pending'
              WHEN 'clustered' THEN 'verified'
              ELSE stage
            END,
            lease_owner = NULL, lease_token = NULL,
            lease_expires_at = NULL,
            attempts = CASE WHEN attempts > 0 THEN attempts - 1 ELSE 0 END,
            updated_at = ?
          WHERE lease_expires_at IS NOT NULL AND lease_expires_at <= ?
        `);
    const result = retryStage ? statement.run(retryStage, timestamp, timestamp) : statement.run(timestamp, timestamp);
    return Number(result.changes);
  }

  /**
   * Reclaim leases owned by a run that is being explicitly resumed. The caller
   * is responsible for ensuring the former process has exited; this is used by
   * the restart-on-failure runner after a crash or machine restart.
   */
  recoverRunLeases(runId: string): number {
    const result = this.database.prepare(`
      UPDATE templates SET
        stage = CASE stage
          WHEN 'repairing' THEN 'repair_pending'
          WHEN 'rendering' THEN 'render_pending'
          WHEN 'clustered' THEN 'verified'
          ELSE stage
        END,
        lease_owner = NULL,
        lease_token = NULL,
        lease_expires_at = NULL,
        attempts = CASE WHEN attempts > 0 THEN attempts - 1 ELSE 0 END,
        updated_at = ?
      WHERE last_run_id = ? AND lease_token IS NOT NULL
    `).run(nowIso(), runId);
    return Number(result.changes);
  }

  cancelRunAndRecoverLeases(runId: string, reason: string): number {
    return this.transaction(() => {
      const timestamp = nowIso();
      const leases = this.database.prepare(`
        UPDATE templates SET
          stage = CASE stage
            WHEN 'repairing' THEN 'repair_pending'
            WHEN 'rendering' THEN 'render_pending'
            WHEN 'clustered' THEN 'verified'
            ELSE stage
          END,
          lease_owner = NULL,
          lease_token = NULL,
          lease_expires_at = NULL,
          attempts = CASE WHEN attempts > 0 THEN attempts - 1 ELSE 0 END,
          updated_at = ?
        WHERE last_run_id = ? AND lease_token IS NOT NULL
      `).run(timestamp, runId);
      const run = this.database.prepare(`
        UPDATE runs SET state = 'cancelled', error = ?, updated_at = ?, completed_at = ?
        WHERE id = ?
      `).run(reason, timestamp, timestamp, runId);
      if (Number(run.changes) !== 1) throw new Error(`Unknown run: ${runId}`);
      return Number(leases.changes);
    });
  }

  upsertPage(input: PageInput): number {
    const timestamp = nowIso();
    this.database.prepare(`
      INSERT INTO pages (
        template_id, relative_path, role, source_hash, result_hash, stage,
        visible_text_length, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(template_id, relative_path) DO UPDATE SET
        role = excluded.role, source_hash = excluded.source_hash,
        result_hash = excluded.result_hash, stage = excluded.stage,
        visible_text_length = excluded.visible_text_length, updated_at = excluded.updated_at
    `).run(
      input.templateId,
      input.relativePath.replace(/\\/g, '/'),
      input.role ?? null,
      input.sourceHash,
      input.resultHash ?? null,
      input.stage ?? 'discovered',
      input.visibleTextLength ?? null,
      timestamp,
      timestamp,
    );
    return Number((this.database.prepare(
      'SELECT id FROM pages WHERE template_id = ? AND relative_path = ?',
    ).get(input.templateId, input.relativePath.replace(/\\/g, '/')) as SqlRow).id);
  }

  addIssue(input: IssueInput): number {
    const detailsJson = json(input.details);
    const fingerprint = input.fingerprint ?? auditFingerprint('issue', [
      input.code, input.severity, input.message, detailsJson,
    ]);
    const template = this.getTemplate(input.templateId);
    if (!template) throw new Error(`Unknown template for issue ${input.code}: ${input.templateId}`);
    const sourceHash = input.sourceHash === undefined ? template.sourceHash : input.sourceHash;
    const ruleVersion = input.ruleVersion === undefined ? template.ruleVersion : input.ruleVersion;
    const artifactHash = input.artifactHash === undefined ? template.resultHash : input.artifactHash;
    const timestamp = nowIso();
    this.database.prepare(`
      INSERT INTO issues (
        template_id, page_id, run_id, code, severity, message, fingerprint,
        source_hash, rule_version, artifact_hash, details_json, resolved,
        created_at, resolved_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT DO NOTHING
    `).run(
      input.templateId,
      input.pageId ?? null,
      input.runId ?? null,
      input.code,
      input.severity,
      input.message,
      fingerprint,
      sourceHash,
      ruleVersion,
      artifactHash,
      detailsJson,
      input.resolved ? 1 : 0,
      timestamp,
      input.resolved ? timestamp : null,
    );
    const row = this.database.prepare(`
      SELECT id FROM issues
      WHERE template_id = ? AND page_id IS ? AND run_id IS ? AND code = ? AND fingerprint = ?
    `).get(
      input.templateId,
      input.pageId ?? null,
      input.runId ?? null,
      input.code,
      fingerprint,
    ) as SqlRow | undefined;
    if (!row) throw new Error(`Could not record issue ${input.code}`);
    this.database.prepare(`
      UPDATE issues SET severity = ?, message = ?, source_hash = ?, rule_version = ?,
        artifact_hash = ?, details_json = ?, resolved = ?, resolved_at = ?
      WHERE id = ?
    `).run(
      input.severity,
      input.message,
      sourceHash,
      ruleVersion,
      artifactHash,
      detailsJson,
      input.resolved ? 1 : 0,
      input.resolved ? timestamp : null,
      row.id,
    );
    return Number(row.id);
  }

  resolveIssue(issueId: number): boolean {
    const result = this.database.prepare(`
      UPDATE issues SET resolved = 1, resolved_at = ? WHERE id = ? AND resolved = 0
    `).run(nowIso(), issueId);
    return Number(result.changes) === 1;
  }

  resolveTemplateIssues(templateId: number): number {
    const result = this.database.prepare(`
      UPDATE issues SET resolved = 1, resolved_at = ?
      WHERE template_id = ? AND resolved = 0
    `).run(nowIso(), templateId);
    return Number(result.changes);
  }

  /**
   * Move a terminal mapping back to the narrowest safe checkpoint after a
   * final evidence audit discovers damage that happened outside a worker
   * lease (for example a missing receipt or a corrupted candidate cache).
   * Derived aliases are rejected until composition proves them again.
   */
  requeueTemplateAfterEvidenceFailure(
    templateId: number,
    stage: 'repair_pending' | 'render_pending',
    reason: string,
    runId?: string | null,
  ): boolean {
    return this.transaction(() => {
      const timestamp = nowIso();
      const result = this.database.prepare(`
        UPDATE templates SET
          stage = ?, terminal_disposition = NULL,
          result_hash = CASE WHEN ? = 'repair_pending' THEN NULL ELSE result_hash END,
          quality_receipt = NULL, attempts = 0,
          lease_owner = NULL, lease_token = NULL, lease_expires_at = NULL,
          last_run_id = COALESCE(?, last_run_id), last_error = ?, updated_at = ?
        WHERE id = ? AND stage = 'complete'
      `).run(stage, stage, runId ?? null, reason, timestamp, templateId);
      if (Number(result.changes) !== 1) return false;
      this.database.prepare(`
        UPDATE aliases SET status = 'rejected', updated_at = ? WHERE template_id = ?
      `).run(timestamp, templateId);
      if (stage === 'repair_pending') {
        this.database.prepare(`
          UPDATE pages SET stage = 'inventoried', result_hash = NULL,
            visible_text_length = NULL, updated_at = ?
          WHERE template_id = ? AND stage <> 'superseded'
        `).run(timestamp, templateId);
      }
      return true;
    });
  }

  addTransformation(input: TransformationInput): number {
    const detailsJson = json(input.details);
    const fingerprint = input.fingerprint ?? auditFingerprint('transformation', [
      input.ruleCode,
      input.ruleVersion,
      input.beforeHash,
      input.afterHash,
      detailsJson,
    ]);
    this.database.prepare(`
      INSERT INTO transformations (
        template_id, page_id, run_id, rule_code, rule_version, before_hash,
        after_hash, fingerprint, details_json, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT DO NOTHING
    `).run(
      input.templateId,
      input.pageId ?? null,
      input.runId ?? null,
      input.ruleCode,
      input.ruleVersion,
      input.beforeHash ?? null,
      input.afterHash ?? null,
      fingerprint,
      detailsJson,
      nowIso(),
    );
    const row = this.database.prepare(`
      SELECT id FROM transformations
      WHERE template_id = ? AND page_id IS ? AND run_id IS ?
        AND rule_code = ? AND rule_version = ? AND fingerprint = ?
    `).get(
      input.templateId,
      input.pageId ?? null,
      input.runId ?? null,
      input.ruleCode,
      input.ruleVersion,
      fingerprint,
    ) as SqlRow | undefined;
    if (!row) throw new Error(`Could not record transformation ${input.ruleCode}`);
    this.database.prepare(`
      UPDATE transformations SET before_hash = ?, after_hash = ?, details_json = ?
      WHERE id = ?
    `).run(input.beforeHash ?? null, input.afterHash ?? null, detailsJson, row.id);
    return Number(row.id);
  }

  upsertRender(input: RenderInput): number {
    const timestamp = nowIso();
    this.database.prepare(`
      INSERT INTO renders (
        template_id, page_id, run_id, artifact_hash, rule_version,
        viewport, width, height, status,
        screenshot_hash, perceptual_hash, ssim, console_errors, failed_requests,
        axe_critical, axe_serious, horizontal_overflow_px, artifact_path, error,
        attempts, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
      ON CONFLICT(template_id, page_id, viewport, artifact_hash, rule_version) DO UPDATE SET
        run_id = excluded.run_id, width = excluded.width, height = excluded.height,
        status = excluded.status, screenshot_hash = excluded.screenshot_hash,
        perceptual_hash = excluded.perceptual_hash, ssim = excluded.ssim,
        console_errors = excluded.console_errors, failed_requests = excluded.failed_requests,
        axe_critical = excluded.axe_critical, axe_serious = excluded.axe_serious,
        horizontal_overflow_px = excluded.horizontal_overflow_px,
        artifact_path = excluded.artifact_path, error = excluded.error,
        attempts = renders.attempts + 1, updated_at = excluded.updated_at
    `).run(
      input.templateId,
      input.pageId,
      input.runId ?? null,
      input.artifactHash,
      input.ruleVersion,
      input.viewport,
      input.width,
      input.height,
      input.status,
      input.screenshotHash ?? null,
      input.perceptualHash ?? null,
      input.ssim ?? null,
      input.consoleErrors ?? 0,
      input.failedRequests ?? 0,
      input.axeCritical ?? 0,
      input.axeSerious ?? 0,
      input.horizontalOverflowPx ?? null,
      input.artifactPath ?? null,
      input.error ?? null,
      timestamp,
      timestamp,
    );
    return Number((this.database.prepare(`
      SELECT id FROM renders
      WHERE template_id = ? AND page_id = ? AND viewport = ?
        AND artifact_hash = ? AND rule_version = ?
    `).get(input.templateId, input.pageId, input.viewport, input.artifactHash, input.ruleVersion) as SqlRow).id);
  }

  upsertDedupeCluster(input: {
    niche: string;
    structuralHash: string;
    canonicalTemplateId?: number | null;
    method: string;
    domSimilarity?: number | null;
    desktopSsim?: number | null;
    mobileSsim?: number | null;
    maxPhashDistance?: number | null;
    decision?: string;
    evidence?: unknown;
  }): number {
    const timestamp = nowIso();
    this.database.prepare(`
      INSERT INTO dedupe_clusters (
        niche, structural_hash, canonical_template_id, method, dom_similarity,
        desktop_ssim, mobile_ssim, max_phash_distance, decision, evidence_json,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(niche, structural_hash) DO UPDATE SET
        canonical_template_id = excluded.canonical_template_id, method = excluded.method,
        dom_similarity = excluded.dom_similarity, desktop_ssim = excluded.desktop_ssim,
        mobile_ssim = excluded.mobile_ssim, max_phash_distance = excluded.max_phash_distance,
        decision = excluded.decision, evidence_json = excluded.evidence_json,
        updated_at = excluded.updated_at
    `).run(
      input.niche,
      input.structuralHash,
      input.canonicalTemplateId ?? null,
      input.method,
      input.domSimilarity ?? null,
      input.desktopSsim ?? null,
      input.mobileSsim ?? null,
      input.maxPhashDistance ?? null,
      input.decision ?? 'candidate',
      json(input.evidence),
      timestamp,
      timestamp,
    );
    return Number((this.database.prepare(`
      SELECT id FROM dedupe_clusters WHERE niche = ? AND structural_hash = ?
    `).get(input.niche, input.structuralHash) as SqlRow).id);
  }

  upsertAlias(input: AliasInput): void {
    const timestamp = nowIso();
    this.database.prepare(`
      INSERT INTO aliases (
        legacy_slug, template_id, cluster_id, design_id, content_preset_id,
        theme_preset_id, quality_receipt, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(legacy_slug) DO UPDATE SET
        template_id = excluded.template_id, cluster_id = excluded.cluster_id,
        design_id = excluded.design_id, content_preset_id = excluded.content_preset_id,
        theme_preset_id = excluded.theme_preset_id, quality_receipt = excluded.quality_receipt,
        status = excluded.status, updated_at = excluded.updated_at
    `).run(
      input.legacySlug,
      input.templateId,
      input.clusterId ?? null,
      input.designId,
      input.contentPresetId,
      input.themePresetId,
      input.qualityReceipt,
      input.status ?? 'candidate',
      timestamp,
      timestamp,
    );
  }

  addArtifact(input: ArtifactInput): number {
    this.database.prepare(`
      INSERT INTO artifacts (
        run_id, template_id, kind, content_hash, relative_path, byte_size,
        metadata_json, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(kind, content_hash, relative_path) DO UPDATE SET
        run_id = excluded.run_id, template_id = excluded.template_id,
        byte_size = excluded.byte_size, metadata_json = excluded.metadata_json
    `).run(
      input.runId ?? null,
      input.templateId ?? null,
      input.kind,
      input.contentHash,
      input.relativePath.replace(/\\/g, '/'),
      input.byteSize,
      json(input.metadata),
      nowIso(),
    );
    return Number((this.database.prepare(`
      SELECT id FROM artifacts WHERE kind = ? AND content_hash = ? AND relative_path = ?
    `).get(input.kind, input.contentHash, input.relativePath.replace(/\\/g, '/')) as SqlRow).id);
  }

  /**
   * Atomically reserves estimated usage before a cloud request. Returns false at
   * either cap, allowing callers to take the deterministic neutral fallback.
   * requestKey is idempotent, so resume never double-reserves the same fragment.
   */
  reserveModelUsage(input: Omit<ModelUsageInput, 'status'>): boolean {
    return this.transaction(() => {
      const existing = this.database.prepare('SELECT id FROM model_usage WHERE request_key = ?').get(input.requestKey);
      if (existing) return true;

      const estimatedTokens = (input.estimatedInputTokens ?? 0) + (input.estimatedOutputTokens ?? 0);
      const estimatedCost = input.estimatedCostUsd ?? 0;
      const budget = this.modelBudgetSnapshot();
      if (
        budget.accountedTokens + estimatedTokens > this.aiTokenCap ||
        budget.accountedCostUsd + estimatedCost > this.aiDollarCapUsd
      ) {
        return false;
      }

      const timestamp = nowIso();
      this.database.prepare(`
        INSERT INTO model_usage (
          run_id, template_id, request_key, model, status,
          estimated_input_tokens, estimated_output_tokens,
          actual_input_tokens, actual_output_tokens,
          estimated_cost_usd, actual_cost_usd, batch_id, response_id,
          error, created_at, updated_at
        ) VALUES (?, ?, ?, ?, 'reserved', ?, ?, 0, 0, ?, 0, ?, ?, ?, ?, ?)
      `).run(
        input.runId ?? null,
        input.templateId ?? null,
        input.requestKey,
        input.model,
        input.estimatedInputTokens ?? 0,
        input.estimatedOutputTokens ?? 0,
        estimatedCost,
        input.batchId ?? null,
        input.responseId ?? null,
        input.error ?? null,
        timestamp,
        timestamp,
      );
      return true;
    });
  }

  reconcileModelUsage(input: ModelUsageInput): void {
    const timestamp = nowIso();
    const result = this.database.prepare(`
      UPDATE model_usage SET
        status = ?, actual_input_tokens = ?, actual_output_tokens = ?,
        actual_cost_usd = ?, batch_id = COALESCE(?, batch_id),
        response_id = COALESCE(?, response_id), error = ?, updated_at = ?
      WHERE request_key = ?
    `).run(
      input.status,
      input.actualInputTokens ?? 0,
      input.actualOutputTokens ?? 0,
      input.actualCostUsd ?? 0,
      input.batchId ?? null,
      input.responseId ?? null,
      input.error ?? null,
      timestamp,
      input.requestKey,
    );
    if (Number(result.changes) !== 1) throw new Error(`No model usage reservation for ${input.requestKey}`);
  }

  modelBudgetSnapshot(): ModelBudgetSnapshot {
    const row = this.database.prepare(`
      SELECT
        COALESCE(SUM(estimated_input_tokens + estimated_output_tokens), 0) AS estimated_tokens,
        COALESCE(SUM(actual_input_tokens + actual_output_tokens), 0) AS actual_tokens,
        COALESCE(SUM(CASE
          WHEN status IN ('failed', 'cancelled') THEN actual_input_tokens + actual_output_tokens
          WHEN actual_input_tokens + actual_output_tokens > 0 THEN actual_input_tokens + actual_output_tokens
          ELSE estimated_input_tokens + estimated_output_tokens END), 0) AS accounted_tokens,
        COALESCE(SUM(estimated_cost_usd), 0) AS estimated_cost_usd,
        COALESCE(SUM(actual_cost_usd), 0) AS actual_cost_usd,
        COALESCE(SUM(CASE
          WHEN status IN ('failed', 'cancelled') THEN actual_cost_usd
          WHEN actual_cost_usd > 0 THEN actual_cost_usd
          ELSE estimated_cost_usd END), 0) AS accounted_cost_usd
      FROM model_usage
    `).get() as SqlRow;
    const accountedTokens = Number(row.accounted_tokens);
    const accountedCostUsd = Number(row.accounted_cost_usd);
    return {
      estimatedTokens: Number(row.estimated_tokens),
      actualTokens: Number(row.actual_tokens),
      accountedTokens,
      estimatedCostUsd: Number(row.estimated_cost_usd),
      actualCostUsd: Number(row.actual_cost_usd),
      accountedCostUsd,
      tokenCap: this.aiTokenCap,
      dollarCapUsd: this.aiDollarCapUsd,
      tokensRemaining: Math.max(0, this.aiTokenCap - accountedTokens),
      dollarsRemaining: Math.max(0, this.aiDollarCapUsd - accountedCostUsd),
      exhausted: accountedTokens >= this.aiTokenCap || accountedCostUsd >= this.aiDollarCapUsd,
    };
  }

  status(): LedgerStatus {
    const runs = this.database.prepare('SELECT state, COUNT(*) AS count FROM runs GROUP BY state').all() as SqlRow[];
    const stages = this.database.prepare('SELECT stage, COUNT(*) AS count FROM templates GROUP BY stage').all() as SqlRow[];
    const dispositions = this.database.prepare(`
      SELECT COALESCE(terminal_disposition, 'pending') AS disposition, COUNT(*) AS count
      FROM templates GROUP BY COALESCE(terminal_disposition, 'pending')
    `).all() as SqlRow[];
    const issues = this.database.prepare(`
      SELECT issues.severity, COUNT(*) AS count
      FROM issues
      JOIN templates ON templates.id = issues.template_id
      WHERE issues.resolved = 0
        AND issues.source_hash = templates.source_hash
        AND issues.rule_version = templates.rule_version
        AND (issues.artifact_hash IS NULL OR issues.artifact_hash = templates.result_hash)
      GROUP BY issues.severity
    `).all() as SqlRow[];
    const renders = this.database.prepare(`
      SELECT renders.status, COUNT(*) AS count FROM renders
      JOIN templates ON templates.id = renders.template_id
      WHERE renders.artifact_hash = templates.result_hash
        AND renders.rule_version = templates.rule_version
      GROUP BY renders.status
    `).all() as SqlRow[];
    const renderHistoryCount = Number((this.database.prepare(
      'SELECT COUNT(*) AS count FROM renders',
    ).get() as SqlRow).count);

    return {
      schemaVersion: LEGACY_SCHEMA_VERSION,
      databasePath: this.databasePath,
      latestRun: this.latestRun(),
      runsByState: rowsToCounts(runs, 'state'),
      templatesByStage: rowsToCounts(stages, 'stage'),
      templatesByDisposition: rowsToCounts(dispositions, 'disposition'),
      unresolvedIssuesBySeverity: rowsToCounts(issues, 'severity'),
      renderCounts: rowsToCounts(renders, 'status'),
      renderHistoryCount,
      modelBudget: this.modelBudgetSnapshot(),
    };
  }

  reportData(): LedgerStatus & {
    totals: { templates: number; pages: number; issues: number; transformations: number; renders: number; renderHistory: number; aliases: number; artifacts: number };
  } {
    const row = this.database.prepare(`
      SELECT
        (SELECT COUNT(*) FROM templates) AS templates,
        (SELECT COUNT(*) FROM pages) AS pages,
        (SELECT COUNT(*) FROM issues) AS issues,
        (SELECT COUNT(*) FROM transformations) AS transformations,
        (SELECT COUNT(*) FROM renders
          JOIN templates ON templates.id = renders.template_id
          WHERE renders.artifact_hash = templates.result_hash
            AND renders.rule_version = templates.rule_version) AS renders,
        (SELECT COUNT(*) FROM renders) AS render_history,
        (SELECT COUNT(*) FROM aliases) AS aliases,
        (SELECT COUNT(*) FROM artifacts) AS artifacts
    `).get() as SqlRow;
    return {
      ...this.status(),
      totals: {
        templates: Number(row.templates),
        pages: Number(row.pages),
        issues: Number(row.issues),
        transformations: Number(row.transformations),
        renders: Number(row.renders),
        renderHistory: Number(row.render_history),
        aliases: Number(row.aliases),
        artifacts: Number(row.artifacts),
      },
    };
  }
}
