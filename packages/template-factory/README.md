# Template factory

Generates a small, reviewable set of multi-page templates from checked-in HTML
foundations. Editorial copy is resolved during generation, while customer-facing
identity and contact tokens remain in the output for preview and fulfillment.

## Safety contract

- Generated templates are written to the ignored root `platform-builder/`
  directory. They are never written into the app's `public/` tree.
- Runtime caches, checkpoints, and embedding indexes stay under the ignored
  `.factory-cache/` directory.
- `fields.json` is derived from tokens that actually remain in emitted HTML.
- QA rejects templates with no personalization tokens, unresolved editorial
  tokens, mismatched fields, token-valued defaults, or known synthetic contact
  data such as `hello@example.com`.
- Generation does not upload or publish anything. Use the generator app's Blob
  uploader separately, review its dry run, and opt into overwrites with
  `--force`.

## Commands

From the repository root:

```sh
pnpm --filter @platform/template-factory dry-run -- --niche aromatherapy --limit 10
pnpm --filter @platform/template-factory generate -- --niche aromatherapy --limit 10
pnpm --filter @platform/template-factory test
pnpm --filter @platform/template-factory lint
```

The default provider is local Ollama. Pass `--cloud` only after configuring the
required Google Cloud project and authentication described by the CLI errors.
Use `--resume` to continue a checkpointed run. Always inspect generated output
and QA results before uploading it.

## Deterministic curated export

For a network-free launch baseline, export one reviewed template from each of
the 60 checked-in foundations. This path does not call an LLM, does not fetch
images, removes synthetic proof blocks, emits generic contact forms, and runs
the v2 publication contract before it atomically installs the output directory.

```sh
pnpm --filter @platform/template-factory export:curated -- --output /absolute/path/to/curated-template-library
```

The exporter refuses to overwrite a non-empty directory unless `--replace` is
explicitly supplied. Use `--niche aromatherapy` (repeatable) or
`--limit-per-niche 2` for a smaller review set. It writes a deterministic
`curated-report.json` containing counts and a SHA-256 digest for every template.
The result is a template-library root accepted directly by the generator app's
uploader:

```sh
node apps/generator-app/scripts/upload-templates-to-blobs.mjs --dry-run --root /absolute/path/to/curated-template-library
```
