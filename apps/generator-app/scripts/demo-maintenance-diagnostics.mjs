import { stripVTControlCharacters } from 'node:util'

// These are observation labels, never a provider diagnosis or permission to retry.
// CLI27.4.2: commands/deploy/index.js, commands/deploy/deploy.js,
// commands/base-command.js and utils/command-helpers.js contain these messages.
// Its installed @netlify/config supplies the fixed config/parse/path messages.
const MESSAGES = [
  ['unsupported-context-without-build', /^--context flag is only available when using the --build flag$/],
  ['deploy-directory-missing', /^The deploy directory "[^"\r\n]{1,2048}" has not been found\. Did you forget to run 'netlify build'\?$/],
  ['deploy-directory-permission', /^Permission error when trying to access deploy folder$/],
  ['deploy-target-not-directory', /^Deploy target must be a path to a directory$/],
  ['functions-directory-permission', /^Permission error when trying to access functions folder$/],
  ['functions-target-not-directory', /^Functions folder must be a path to a directory$/],
  ['config-file-missing', /^Configuration file does not exist$/],
  ['config-parse-failed', /^Could not parse configuration file$/],
  ['config-read-failed', /^Could not read configuration file$/],
  ['config-path-outside-repo', /^Configuration property "[^"\r\n]{1,100}" "[^"\r\n]{1,2048}" must be inside the repository root directory\.$/],
  ['config-base-missing', /^Base directory does not exist: [^\r\n]{1,2048}$/],
  ['config-option-directory-missing', /^Option '[^'\r\n]{1,100}' points to a non-existing directory: [^\r\n]{1,2048}$/],
  ['authentication-required', /^Authentication required\. NETLIFY_AUTH_TOKEN is not set and (?:`netlify login --request <message>` can be used to authenticate\.|`netlify status` also informs us that you need to use `netlify login --request <message>` as a next step\.)$/],
  ['edge-bundle-failed', /^Deploy aborted due to error while bundling edge functions$/],
]
const MAX_STREAM_BYTES = 128 * 1024
const MAX_LINE_CHARS = 4096
const PROCESS_CODES = new Set(['ENOENT', 'EACCES', 'EPERM', 'ENOBUFS', 'ETIMEDOUT', 'ECONNRESET', 'EPIPE'])
const SIGNALS = new Set(['SIGTERM', 'SIGKILL', 'SIGINT', 'SIGABRT', 'SIGHUP', 'SIGPIPE'])
const HTTP_ERROR_NAMES = new Set(['JSONHTTPError', 'TextHTTPError', 'HTTPError'])
const own = (object, key) => object && (typeof object === 'object' || typeof object === 'function')
  ? Object.getOwnPropertyDescriptor(object, key)?.value : undefined
const httpStatus = value => Number.isInteger(value) && value >= 100 && value <= 599 ? value : null
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value)

function stream(value) {
  if (value === undefined || value === null) return { bytes: 0, text: '', truncated: false, unsupported: false }
  const buffer = Buffer.isBuffer(value)
  if (!buffer && typeof value !== 'string') return { bytes: null, text: '', truncated: false, unsupported: true }
  const bytes = buffer ? value.length : Buffer.byteLength(value, 'utf8')
  if (bytes > MAX_STREAM_BYTES) return { bytes, text: '', truncated: true, unsupported: false }
  return { bytes, text: buffer ? Buffer.prototype.toString.call(value, 'utf8') : value, truncated: false, unsupported: false }
}

/** Pure: never emits raw captured text, hashes of secrets, paths or provider values. */
export function classifyDemoUploadFailure(cause) {
  const stdout = stream(own(cause, 'stdout'))
  const stderr = stream(own(cause, 'stderr'))
  const status = own(cause, 'status'), code = own(cause, 'code'), signal = own(cause, 'signal')
  const outputTruncated = stdout.truncated || stderr.truncated
  const unsupportedOutputType = stdout.unsupported || stderr.unsupported
  const categories = new Set(), statuses = new Set()
  let jsonErrorObserved = false

  const inspectMessage = text => {
    if (typeof text !== 'string' || text.length > MAX_STREAM_BYTES) return
    for (const rawLine of stripVTControlCharacters(text).split(/\r?\n/)) {
      if (rawLine.length > MAX_LINE_CHARS) continue
      // onEnd/logError prefixes stderr with a platform marker and Error: even
      // under --json. Avoid matching arbitrary excerpts or quoted source lines.
      const line = rawLine.trim().replace(/^(?:›|»|⬥)\s+/, '').replace(/^(?:Error|Warning):\s*/, '')
      for (const [category, pattern] of MESSAGES) if (pattern.test(line)) categories.add(category)
    }
  }
  const inspectJson = text => {
    let parsed
    try { parsed = JSON.parse(text) } catch { return }
    if (!object(parsed)) return
    const error = own(parsed, 'error')
    const nested = object(error) ? error : null
    const name = own(parsed, 'name'), nestedName = own(nested, 'name')
    const message = own(parsed, 'message')
    // A successful CLI deployment JSON or an arbitrary numeric field is not an
    // error report. Only these explicit error envelopes are eligible.
    if (typeof error !== 'string' && !nested && !HTTP_ERROR_NAMES.has(name)
      && !(typeof message === 'string' && (name === 'Error' || own(parsed, 'success') === false))) return
    jsonErrorObserved = true
    for (const value of [message, typeof error === 'string' ? error : undefined, own(nested, 'message')]) inspectMessage(value)
    const observed = [own(parsed, 'status'), own(parsed, 'statusCode'), own(nested, 'status'), own(nested, 'statusCode')]
      .map(httpStatus).filter(value => value !== null)
    for (const value of observed) statuses.add(value)
    if (observed.length && (HTTP_ERROR_NAMES.has(name) || HTTP_ERROR_NAMES.has(nestedName))) categories.add('cli-http-error')
  }
  // Do not guess from a partial prefix/suffix or from one stream while the other
  // is unavailable: another omitted error could change the classification.
  if (!outputTruncated && !unsupportedOutputType) {
    for (const value of [stdout.text, stderr.text]) {
      const text = stripVTControlCharacters(value).trim()
      inspectMessage(text)
      inspectJson(text)
      // Bounded JSON-lines and Error: { ... } are accepted without copying text.
      for (const line of text.split(/\r?\n/)) if (line.length <= MAX_LINE_CHARS) {
        inspectJson(line.trim().replace(/^(?:›|»|⬥)\s+/, '').replace(/^Error:\s*/, ''))
      }
    }
  }
  return {
    version: 1,
    category: categories.size === 1 ? [...categories][0] : 'unknown',
    exitCode: Number.isInteger(status) && status >= 0 && status <= 255 ? status : null,
    errorCode: PROCESS_CODES.has(code) ? code : null,
    signal: SIGNALS.has(signal) ? signal : null,
    stdoutBytes: stdout.bytes, stderrBytes: stderr.bytes,
    outputTruncated, unsupportedOutputType,
    ambiguousCategory: categories.size > 1,
    jsonErrorObserved,
    httpStatus: statuses.size === 1 ? [...statuses][0] : null,
    ambiguousHttpStatus: statuses.size > 1,
  }
}
