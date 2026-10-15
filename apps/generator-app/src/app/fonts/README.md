# Application fonts

These local fonts keep application builds independent of Google Fonts responses.
They preserve the existing Barlow Condensed heading weights (400, 600, 700) and
Sora body weights (300, 400, 600, 700). Sora's single variable file supplies all
four requested weights. The original complete character sets are retained.
Customer template font presets are separate from these application fonts.

Sources are the Google Fonts repository at commit
`67bc647ce1910e92f461bcc82aae30f21d21a9cc`, retrieved on 2026-10-15.
`provenance.json` records the immutable source URLs, original TTF SHA-256 hashes,
and bundled WOFF2 SHA-256 hashes. The accompanying OFL files are the original
SIL Open Font License 1.1 notices for each family.

The upstream versions are Barlow Condensed 1.408 and Sora 2.000, matching the
Google Fonts CSS responses checked during this change. The files were converted
from TTF to WOFF2 using the existing system FontTools installation; no outlines,
weights, character sets, or metrics were edited, and no build dependency was
added. FontTools round-trip checks verified character maps, glyph counts,
horizontal metrics, ascent, and descent. ASCII advance widths also matched the
currently served Google Fonts versions.

To reproduce the conversion, download each pinned source from `provenance.json`
and verify its source hash, then use FontTools (version recorded in that file):

```python
from fontTools.ttLib import TTFont

font = TTFont(source_path, recalcTimestamp=False)
font.flavor = 'woff2'
font.save(output_path)
```

The application loads these files through `next/font/local`, retaining local
preloads, fallback metric adjustment, and `font-display: swap`. The four unique
WOFF2 files total 165,228 bytes; licenses and provenance are not browser assets.
