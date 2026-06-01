# Demo Video Recording

Automated Playwright recordings of every niche walkthrough for DailyClarity Platform Builder.

## Dependencies

`@playwright/test` and `tsx` are already in `devDependencies`. Install with:

```bash
pnpm install
npx playwright install chromium
```

## Running the recorder

Start the local dev server first (optional — defaults to https://dailyclarity.org):

```bash
pnpm dev
```

Then record all six videos:

```bash
pnpm record:demos
# or with a local dev server:
BASE_URL=http://localhost:3000 pnpm record:demos
```

## Output locations

| Type | Path |
|---|---|
| Raw Playwright `.webm` | `test-results/demo-recordings/raw/<scenario-id>/` |
| Final `.mp4` | `public/demo-videos/` |

## Videos produced

| File | Scenario |
|---|---|
| `platform-builder-walkthrough.mp4` | General platform demo |
| `aromatherapy-walkthrough.mp4` | Sol Botanica Aromatherapy |
| `holistic-medicine-walkthrough.mp4` | Root & Radiance Integrative Health |
| `private-practice-therapist-walkthrough.mp4` | Safe Harbor Therapy Collective |
| `sound-bath-walkthrough.mp4` | Resonance Room Sound Healing |
| `wellness-coach-walkthrough.mp4` | Vital Path Wellness Coaching |

## Manual ffmpeg conversion

If ffmpeg is not on your PATH, the script prints the exact command needed. Example:

```bash
ffmpeg -y -i "test-results/demo-recordings/raw/aromatherapy/page@abc.webm" \
  -vf "setpts=0.5882*PTS,fade=t=in:st=0:d=0.5:color=black" \
  -r 30 -c:v libx264 -profile:v baseline -level:v 4.0 \
  -pix_fmt yuv420p -colorspace bt709 -color_primaries bt709 -color_trc bt709 \
  -crf 28 -movflags +faststart \
  "public/demo-videos/aromatherapy-walkthrough.mp4"
```

## Uploading to the repo

Videos are large — add them to `.gitignore` or use Git LFS:

```bash
# Option A — Git LFS (recommended)
git lfs install
git lfs track "public/demo-videos/*.mp4"
git add .gitattributes public/demo-videos/
git commit -m "feat(demos): add niche walkthrough videos"
git push

# Option B — ignore from git, host externally (CDN/S3/Cloudflare R2)
echo "public/demo-videos/" >> .gitignore
```

## Keeping file sizes under control

- CRF 28 + 1.7× speed keeps most videos under 5 MB.
- Increase `CRF` in `record-demo-videos.ts` (max ~35) to shrink further.
- Decrease `SPEED` if the video feels too rushed.
- Re-run any single scenario by temporarily filtering `SCENARIOS` in `demo-scenarios.ts`.
