# Promotional sample selection follow-up

The previous selection could replace an unavailable reviewed sample with an unreviewed match. A featured catalogue flag or explicit sample URL could also bypass the intended selection. This app-only follow-up makes curated marketing and sample choices explicit: only eligible entries present in the active publishable gallery can appear. An empty curated group stays empty and offers another sample practice or a personal preview. Personal matching, exact-template continuation, saved customer choices, catalogue access and purchase ownership retain their existing scope.

The homepage picker uses actual sample availability. The sample editor offers a clearly labeled practice selector and another-sample action. Sample browsing reports its own count, uses fictional details, cannot submit a lead or open checkout, and restores the separate personal draft. Samples continue requesting `original/original/original` with no custom theme. The separate original-colors default change is not included in this branch; the two changes need combined validation when integrated.

The homepage derives niche counts and sample availability together from one validated gallery load. This avoids six repeated registry validations per request while retaining the existing catalogue loading, validation, deduplication, cache lifetime, and empty-selection policy; it is a source-level work reduction, not a measured latency claim.

## Current bounded selection

One therapist design and three wellness designs remain eligible when available in the active catalogue:

- `private_practice_therapist-2026-02-16T06-31-06-120Z-010`
- `wellness-spec-2026-02-16T01-20-21-384Z-026`
- `wellness-spec-2026-02-16T01-22-17-887Z-012`
- `wellness-spec-2026-02-16T01-25-40-222Z-017`

Aromatherapy, holistic medicine and sound bath have intentionally empty promotional/sample selections. Nine additional designs were held after the 17 October local review; the three previous holds remain. No tested replacement was supported.

| Held design | Observed reason |
| --- | --- |
| `aromatherapy-2026-02-16T18-54-45-056Z-049` | Native black VIP heading over dark artwork measured about 1.26:1. |
| `aromatherapy-MORE-2026-02-17T13-26-31-190Z-006` | Both advertised guided-exercise controls leave their modal hidden at both tested widths. |
| `holistic_medicine-2026-02-16T19-08-26-139Z-002` | Native gradient CTA measured 2.25:1; the mobile menu remains hidden despite expanded state. |
| `holistic_medicine-2026-02-16T19-12-28-938Z-003` | Exposed mobile hamburger does not change state or visible links. |
| `holistic_medicine-2026-02-16T19-40-45-346Z-009` | Ineffective mobile hamburger and dark footer links individually measured 1.87:1. |
| `sound_bath-2026-02-16T12-44-01-156Z-022` | Opened mobile menu intercepts its toggle; Escape does not close it. |
| `sound_bath-MORE-2026-02-17T10-55-55-742Z-023` | Long desktop header CTA paints into navigation text; affected text measured 1.01:1. |
| `private_practice_therapist-MORE-2026-02-17T07-50-08-089Z-030` | Long CTA overlaps a secondary mobile action and preceding desktop navigation text. |
| `private_practice_therapist-2026-02-16T06-14-10-990Z-005` | Exposed mobile hamburger is ineffective. |

These observations come from retained homepages composed with the actual renderer/runtime from `2cef706966041eda0dd72af0636b67d96e4731c7`, at 1440×1000 and 390×844. The targeted boundary copy includes a long business name and CTA; it is not each live sample's exact short default text. Ordinary menu/modal clicks and measured native text/CTA issues support subtraction. Inclusion does not certify every page, interaction, font/device, palette or accessibility requirement.

Retained evidence is under `/workspace/audit/personalized-contrast-2cef/`, `/workspace/audit/original-colors-default-2cef/composed-default/`, `/workspace/audit/showcase-alternatives-2cef/`, and `/workspace/audit/showcase-extension-2cef/`. The alternatives directory contains `curation-recommendation.json` with the exact supported subset and hold reasons. The follow-up validation record is `/workspace/audit/showcase-selection-followup-2cef/VERIFICATION.md`.

## Release scope

This subtraction repairs app selection behavior; it does not repair a held design. No renderer, factory, template artifact, security policy, payment flow, provider setting or certification gate changes. Release closure must still verify unchanged protected inputs. App CI and the normal SHA-bound preparation, staging and release process remain required; local tests and screenshots are not production or full-catalogue certification.
