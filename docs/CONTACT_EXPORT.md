# Private owner contact export

`GET /api/admin/contacts/export` remains protected by the existing internal-admin bearer-token guard. It reads the existing server-only Supabase configuration. This change adds no collection, mail sender, address verification, database grants, schema changes, or ownership changes. Every success and error response uses `Cache-Control: private, no-store`.

## Scope and completeness

The export includes intake contacts and modal leads, including phone-only leads. `since` accepts a real ISO calendar date or an ISO timestamp with timezone; impossible dates return 400. `niche` filters intake contacts and, as before, excludes modal leads because those records have no niche. `X-Export-Lead-Scope` makes that exclusion explicit.

Rows are retrieved in UUID order using a cursor after the last actual returned row. Each request asks for an exact count and at most 500 rows. A lower provider row cap therefore does not skip records. Remaining counts and a final count for each table or email batch must agree; missing counts, premature empty pages, invalid ordering, or query failures return an error instead of a partial CSV.

An export has a 25-second request deadline, at most 128 database requests (including count checks), and at most 10,000 source records across contacts and matched drafts. Excessive scope returns 413 with instructions to narrow `since` or `niche`. No truncated-success response is produced. Large numbers of email batches or a very low provider row cap can reach the request limit before the record limit.

`X-Export-As-Of` is the generated time cutoff for contact creation and draft updates. Ordinary later inserts are excluded; legacy null timestamps remain included unless `since` excludes them. Count differences observed during pagination return 409. **This is bounded retrieval completeness, not a transactionally consistent multi-table snapshot.** Separate HTTP queries can observe content changes, or membership changes with the same count. A draft updated after the cutoff can be absent from the summary. `X-Export-Complete: true` means all selected pages/count checks completed within these limits; it does not establish historical consent completeness. Atomic historical snapshots would require a separate database design.

Success headers report exported rows, intake source records, modal source records, and matched draft records separately. These counts can differ because email duplicates become one CSV row. CSV output is sorted by the preferred record's creation timestamp, then stable ID.

## Identity and preferences

The original seven contact columns remain first. Equal trimmed, lowercased email addresses are grouped for this operational export. Intake details take priority. A later modal phone fills a blank intake phone but never replaces a nonblank one. Records are never grouped by phone: each phone-only lead keeps its UUID in `lead_record_id`. `source_record_count` and the combined `source` values disclose email grouping. A shared email is not evidence that multiple submissions are the same verified person.

Draft lookup is limited to exported email addresses, in bounded batches. The database projection selects only `draft_id`, `email`, `updated_at`, and three JSON leaves under `communicationPreferences`: `marketingEmailOptIn`, `recordedAt`, and `noticeVersion`. It never selects the full profile, business description, health/client prose, images, or authentication data. PostgREST string literals escape backslashes and double quotes before the SDK encodes the URL; unusual stored addresses cannot expand the email filter.

Additional preference columns summarize browser-submitted metadata:

| `marketing_preference` | Meaning |
| --- | --- |
| `opted_in_unverified` | Every matching draft contains boolean `true`. |
| `opted_out_unverified` | Every matching draft contains boolean `false`. |
| `conflicting_unverified` | Matching drafts include both boolean choices. |
| `incomplete_unverified` | A boolean choice is mixed with missing or invalid values. |
| `invalid_unverified` | Values exist but none are valid booleans. |
| `not_recorded` | No choice is recorded in the matched drafts, or there are no matched drafts. |

The source column identifies `browser_draft` or `not_recorded`. Notice versions are limited to the known `preview-followup-2026-10-16`, `preview-followup-2026-10-24`, `unrecognized`, or `not_recorded`; arbitrary notice text is never exported. The October24 notice accompanies optional initial contact details and explains browser-only storage until an account email is supplied. Older records retain their original version. The two timestamp columns separately show the latest parseable client-supplied preference time and latest matched draft update time. They are aggregate summaries, not an audit trail tying a specific choice to verified delivery or identity.

**None of these statuses is campaign eligibility, verified-address consent, permission for SMS, or a global unsubscribe/suppression decision.** Missing preferences never become permission. Conflicting drafts are not resolved by trusting a client timestamp. This endpoint does not consult unrelated subscriber tables or infer that their state governs these leads. A campaign system would need a dedicated, verified preference and suppression model before using this export for sending.

CSV values remain formula-inert, including prefixes hidden by leading whitespace, and embedded quotes/newlines are escaped. Provider errors are reduced to fixed public categories; the route does not log contact payloads, filter URLs, or credentials.

## Local validation and reference review

Focused route tests exercise the installed real Supabase JavaScript client against a synthetic fetch implementation: authorization, multiple pages, lower row caps, phone-only records, email grouping and phone fallback, preference conflicts/missing/invalid values, leaf projections, escaped filter literals, CSV injection, count/truncation failures, concurrent inserts, request/record bounds, privacy headers, and invalid calendar dates. App TypeScript and changed-file lint checks are also required. These checks do not prove live database contents, provider configuration, or production deployment; no real customer queries or emails are needed for them.

Reviewed current [Supabase changelog](https://supabase.com/changelog), the [Data API table-exposure change](https://supabase.com/changelog/45329-breaking-change-tables-not-exposed-to-data-and-graphql-api-automatically), [JSON projection guide](https://supabase.com/docs/guides/database/json), [JavaScript range reference](https://supabase.com/docs/reference/javascript/range), and [PostgREST literal escaping](https://github.com/PostgREST/postgrest/blob/main/docs/references/api/url_grammar.rst). Existing authorized tables are used without changing their exposure, grants, or RLS.
