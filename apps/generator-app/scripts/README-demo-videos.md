# Demo Video Recording

Walkthrough videos for DailyClarity Platform Builder — used on `/demo`, `/demo/[niche]`, homepage “Watch Demo”, and niche “Watch Demo” buttons.

**Code wiring:** `src/lib/demo-videos.ts` maps each niche to `public/demo-videos/<name>.mp4`. Drop finished files there; no placeholder scripts needed once videos exist.

---

## Option A — Playwright (automated)

### Dependencies

```bash
pnpm install
npx playwright install chromium
```

### Run

```bash
pnpm --filter @platform-builder/generator-app dev
# other terminal:
BASE_URL=http://localhost:3000 pnpm --filter @platform-builder/generator-app record:demos
```

### Output

| Type | Path |
|------|------|
| Raw `.webm` | `test-results/demo-recordings/raw/<scenario-id>/` |
| Final `.mp4` | `public/demo-videos/` |

### Files produced

- `platform-builder-walkthrough.mp4`
- `aromatherapy-walkthrough.mp4`
- `holistic-medicine-walkthrough.mp4`
- `private-practice-therapist-walkthrough.mp4`
- `sound-bath-walkthrough.mp4`
- `wellness-coach-walkthrough.mp4`

### Manual ffmpeg (if script skips conversion)

```bash
ffmpeg -y -i "test-results/demo-recordings/raw/aromatherapy/page@abc.webm" \
  -vf "setpts=0.5882*PTS,fade=t=in:st=0:d=0.5:color=black" \
  -r 30 -c:v libx264 -profile:v baseline -level:v 4.0 \
  -pix_fmt yuv420p -colorspace bt709 -color_primaries bt709 -color_trc bt709 \
  -crf 28 -movflags +faststart \
  "public/demo-videos/aromatherapy-walkthrough.mp4"
```

---

## Option B — OBS (fastest fallback)

Use this if Playwright recording is a time sink. Less elegant, usually faster.

### Setup

1. Start local app:

   ```bash
   pnpm --filter @platform-builder/generator-app dev
   ```

2. Open: `http://localhost:3000/preview-your-business`

3. OBS settings:
   - **1920×1080**
   - **30 fps**
   - **mp4** or **mkv**

4. Record one video per niche (see checklist below).

5. Speed/compress with ffmpeg (see Option A example; target CRF 26–30).

6. Save each file under `public/demo-videos/` using the exact names in the list above.

### Manual recording checklist (each niche)

Start at `/preview-your-business`.

**Step 1 — Business info**

- Select niche.
- Fill Business Name, Owner / Contact Name, Email, Phone.
- Fill Address / Service Area, Tagline, Description, Services.
- Fill Existing Website if visible.

**Step 2 — Style**

- Pick 2–3 style vibes.
- Pick prose style.
- Pick color mood.
- Pick font/layout preferences if visible.

**Step 3 — Matching**

- Let matching screen appear.
- Pause ~2 seconds.

**Step 4 — Editor**

- Open editor; show live preview.
- Toggle edit mode if available.
- Edit one text block if possible.
- Show image swap / image library if possible (skip if upload blocked).

**Step 5 — Checkout flow (no real payment)**

- Go to `/pricing`; hover or click a plan card — **do not pay**.
- Go to `/success`.
- Go to `/portal?slug=demo-[niche]` (e.g. `demo-aromatherapy`).
- Stop recording.

Repeat for: platform overview (wellness_coach niche is fine for general demo), aromatherapy, holistic_medicine, private_practice_therapist, sound_bath, wellness_coach.

---

## Git upload (after videos exist)

Check sizes:

```bash
ls -lh apps/generator-app/public/demo-videos
# Windows: Get-ChildItem apps/generator-app/public/demo-videos | Format-Table Name, Length
```

If sizes are reasonable (aim for a few MB each after compression):

```bash
git checkout -b demo-videos
git add apps/generator-app/public/demo-videos
git add apps/generator-app/scripts
git add apps/generator-app/package.json
git commit -m "Add demo walkthrough recording system and videos"
git push -u origin demo-videos
```

Open a PR, or deploy the branch on Netlify if that is your flow.

**Large files:** use Git LFS (`git lfs track "apps/generator-app/public/demo-videos/*.mp4"`) or host on CDN and keep paths in `demo-videos.ts` pointed at URLs.

---

## Report back after upload

Copy/paste and fill in:

```
Videos uploaded.

Paths:
- apps/generator-app/public/demo-videos/platform-builder-walkthrough.mp4
- apps/generator-app/public/demo-videos/aromatherapy-walkthrough.mp4
- apps/generator-app/public/demo-videos/holistic-medicine-walkthrough.mp4
- apps/generator-app/public/demo-videos/private-practice-therapist-walkthrough.mp4
- apps/generator-app/public/demo-videos/sound-bath-walkthrough.mp4
- apps/generator-app/public/demo-videos/wellness-coach-walkthrough.mp4

Branch: demo-videos
File extensions: mp4
Any missing files: none
```

---

## Where videos play in the app

| Surface | Route / usage |
|---------|----------------|
| Demo hub | `/demo` |
| Platform demo | `/demo/platform-builder` |
| Niche demos | `/demo/aromatherapy`, `/demo/holistic_medicine`, `/demo/private_practice_therapist`, `/demo/sound_bath`, `/demo/wellness_coach` |
| Homepage | “Watch Demo” |
| Niche pages | “Watch Demo” on each `[niche]` page |

All paths come from `src/lib/demo-videos.ts` + `DemoVideoPlayer` component.

---

## Keeping file sizes small

- CRF **28** (raise toward **35** for smaller files).
- Speed up **1.6×–1.75×** in ffmpeg (`setpts`).
- H.264 baseline + `faststart` for web playback.
- Re-encode with Windows-friendly color tags: `-colorspace bt709 -color_primaries bt709 -color_trc bt709`
