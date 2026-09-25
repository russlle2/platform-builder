export const PRODUCTION_NETLIFY_SITE_ID: string
export const CERTIFIED_STORE: 'templates-rehab-certified'
export const CERTIFIED_TOTAL: number
export function forEachBounded<T>(items: T[], operation: (item: T, index: number) => Promise<void>, concurrency?: number): Promise<void>
export interface Certification { version: 1; profile: 'rehab-certified'; releaseSha: string; catalogHash: string; manifestHash: string; fullGateHash: string; sourceCatalogHash: string; templateEvidenceHash: string; fileEvidenceHash: string; sourceTemplates: number; certifiedTemplates: number; neutralFallbacks: number; customizationDiagnostics: number; files: number; pages: number }
export interface CertifiedPointer { version: 1; profile: 'rehab-certified'; catalogHash: string; catalogKey: string; manifestHash: string; manifestKey: string; sourceTemplates: number; releaseSha: string; certificationHash: string; certificationKey: string; activatedAt: string }
export function canonicalDigest(value: unknown): string
export function assertCatalogDeployment(env: Readonly<Record<string, string | undefined>>, environment: 'staging' | 'production'): void
export function validateCertification(value: unknown, expected?: Partial<Certification>): Certification
export function createCertifiedPointer(receipt: Certification, activatedAt?: string): CertifiedPointer
export function validateCertifiedPointer(value: unknown): CertifiedPointer
