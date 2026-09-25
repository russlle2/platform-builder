/**
 * Draft image owners are opaque, server-issued UUID capabilities. Keeping this
 * predicate client-safe lets browser and server code share the same namespace
 * boundary without importing Node's crypto implementation.
 */
const DRAFT_IMAGE_OWNER_PATTERN =
  /^draft-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

export function isDraftImageOwner(value: string | null | undefined): value is string {
  return typeof value === 'string' && DRAFT_IMAGE_OWNER_PATTERN.test(value)
}
