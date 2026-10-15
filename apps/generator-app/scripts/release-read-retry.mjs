import { AsyncLocalStorage } from 'node:async_hooks'

const TRANSIENT_STATUS = new Set([408, 429, 500, 502, 503, 504])
const TRANSIENT_CODE = new Set(['ECONNRESET', 'ETIMEDOUT', 'EAI_AGAIN', 'EPIPE', 'UND_ERR_CONNECT_TIMEOUT', 'UND_ERR_HEADERS_TIMEOUT', 'UND_ERR_BODY_TIMEOUT', 'UND_ERR_SOCKET'])
const ERROR_CLASSES = new Set(['Error', 'TypeError', 'SyntaxError', 'TimeoutError', 'AbortError', 'BlobsInternalError', 'ReleaseHttpError'])
const DELAYS = [1000, 3000]
const REASONS = new Map([
  ['Previous certified snapshot hashes do not match', 'snapshot_hash_mismatch'],
  ['Previous certified snapshot is incomplete', 'snapshot_incomplete'],
  ['Previous certified file bytes differ from the sealed receipt', 'snapshot_file_evidence_mismatch'],
  ['Immutable staging journal object conflict', 'immutable_conflict'],
  ['Unrelated staging deployment detected; no restore or overwrite is allowed', 'deployment_drift'],
  ['Staging deployment changed during immutable proof verification', 'deployment_drift'],
  ['Unrelated staging catalogue pointer detected', 'pointer_drift'],
  ['Unrelated staging profile change detected', 'profile_drift'],
  ['Original launch catalogue changed during staging transition', 'launch_catalogue_drift'],
  ['Staging state changed during runtime attestation', 'attestation_drift'],
  ['Staging transition state is not converged', 'transition_not_converged'],
  ['Exact existing staging certification hash is required', 'reuse_identity_required'],
  ['Existing staging certification differs from the approved reuse identity', 'reuse_identity_mismatch'],
  ['Existing staging catalogue evidence differs from the candidate', 'reuse_evidence_mismatch'],
  ['Immutable staging certification conflicts', 'immutable_certification_conflict'],
  ['Staging certification durable readback failed', 'certification_readback_failed'],
])
const REASON_CODES = new Set([...REASONS.values(), 'snapshot_object_missing_or_corrupt', 'immutable_conflict'])
function reasonCode(error) {
  if (REASON_CODES.has(error?.reasonCode)) return error.reasonCode
  if (REASONS.has(error?.message)) return REASONS.get(error.message)
  if (typeof error?.message === 'string' && error.message.startsWith('Previous certified object is missing or corrupt: ')) return 'snapshot_object_missing_or_corrupt'
  if (typeof error?.message === 'string' && /^Immutable rehabilitation (?:object has conflicting metadata: |catalogue object conflicts at |manifest object conflicts at )/.test(error.message)) return 'immutable_conflict'
  return null
}

export class ReleaseHttpError extends Error {
  constructor(status) {
    super('Release provider returned an unsuccessful HTTP response')
    this.name = 'ReleaseHttpError'
    this.status = status
  }
}

// Deliberately exclude messages, stacks, URLs, headers and provider bodies.
export function safeReleaseError(error) {
  const code = [error?.code, error?.cause?.code].find(value => TRANSIENT_CODE.has(value)) ?? null
  return {
    errorClass: ERROR_CLASSES.has(error?.name) ? error.name : 'Error',
    status: Number.isInteger(error?.status) && error.status >= 400 && error.status <= 599 ? error.status : null,
    code,
    reasonCode: reasonCode(error),
  }
}

function readError(error, status) {
  const safe = safeReleaseError(error)
  const result = new Error('Release provider read failed')
  result.name = safe.errorClass
  result.status = Number.isInteger(status) && status >= 400 ? status : safe.status
  result.code = safe.code
  result.reasonCode = safe.reasonCode
  return result
}

export function createReleaseReadAccess({ fetch: fetchImpl = globalThis.fetch, sleep = ms => new Promise(resolve => setTimeout(resolve, ms)), onRetry = () => {}, onRead = () => {} } = {}) {
  const context = new AsyncLocalStorage()
  // The installed Blobs SDK drops response.status from BlobsInternalError.
  // Observe it inside this read's async context; leave fetch/SDK semantics intact,
  // including normal 404 -> null handling and the SDK's own data-request retries.
  const observedFetch = async (...args) => {
    const state = context.getStore()
    if (state) state.status = null
    const response = await fetchImpl(...args)
    if (state) state.status = response.status
    return response
  }
  const read = async operation => {
    for (let attempt = 0; ; attempt++) {
      const state = { status: null }
      try {
        return await context.run(state, operation)
      } catch (original) {
        const error = readError(original, state.status)
        const safe = safeReleaseError(error)
        const transient = safe.reasonCode === null && (safe.status !== null ? TRANSIENT_STATUS.has(safe.status) : TRANSIENT_CODE.has(safe.code) || safe.errorClass === 'TimeoutError')
        if (!transient || attempt === DELAYS.length) throw error
        onRetry({ nextAttempt: attempt + 2, ...safe })
        await sleep(DELAYS[attempt])
      }
    }
  }
  return {
    fetch: observedFetch,
    read,
    store: store => new Proxy(store, {
      get(target, property) {
        const value = Reflect.get(target, property, target)
        if (typeof value !== 'function') return value
        if (!['get', 'getMetadata'].includes(property)) return value.bind(target)
        return async (...args) => {
          const result = await read(() => value.apply(target, args))
          onRead({ method: property })
          return result
        }
      },
    }),
  }
}

const PHASES = new Set(['initialization', 'check-journal-source', 'check-release', 'verify-candidate', 'capture-baseline', 'guard-before-upload', 'upload-snapshot', 'reuse-snapshot', 'write-certification', 'verify-snapshot', 'activate-pointer', 'activate-profile', 'write-deployment-proof', 'guard-before-deploy', 'deploy-application', 'bind-deployment', 'attest-runtime', 'preserve-attestation', 'load-journal', 'preserve-journal', 'restore-transition', 'connected-target', 'completed'])

export function createReleaseDiagnostics(label, { emit = value => console.log(JSON.stringify(value)), now = Date.now } = {}) {
  if (!['staging-catalogue', 'certified-release'].includes(label)) throw new Error('Unknown release diagnostic label')
  let phase = 'initialization', lastProgress = now(), reads = { get: 0, getMetadata: 0 }, retries = 0, expectedFiles = null
  const failures = new WeakMap()
  const snapshot = event => ({ kind: 'release-diagnostic', label, event, phase, completedReads: { ...reads }, readRetries: retries, expectedFiles })
  const setPhase = (next, detail = {}) => {
    if (!PHASES.has(next)) throw new Error('Unknown release diagnostic phase')
    phase = next; reads = { get: 0, getMetadata: 0 }; retries = 0; lastProgress = now()
    expectedFiles = Number.isSafeInteger(detail.expectedFiles) && detail.expectedFiles >= 0 ? detail.expectedFiles : null
    emit(snapshot('phase'))
  }
  return {
    phase: setPhase,
    run: async (next, operation, detail) => {
      setPhase(next, detail)
      try { return await operation() } catch (error) {
        if (error && typeof error === 'object' && !failures.has(error)) failures.set(error, phase)
        throw error
      }
    },
    read: ({ method }) => {
      if (!Object.hasOwn(reads, method)) return
      reads[method]++
      if (now() - lastProgress >= 30_000) { lastProgress = now(); emit(snapshot('progress')) }
    },
    retry: event => {
      retries++
      emit({ ...snapshot('read-retry'), nextAttempt: event.nextAttempt, ...safeReleaseError({ name: event.errorClass, status: event.status, code: event.code, reasonCode: event.reasonCode }) })
    },
    failure: error => emit({ ...snapshot('failure'), phase: error && typeof error === 'object' ? failures.get(error) ?? phase : phase, ...safeReleaseError(error) }),
  }
}
