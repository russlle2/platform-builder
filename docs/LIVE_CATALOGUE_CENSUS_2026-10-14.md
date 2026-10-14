# DailyClarity live template metadata inventory

Every public metadata entry returned by five GET API requests; no page render or purchase performed.

Fetched: 2026-10-14T02:00:57.102103+00:00

| Niche | Actual API entries | Expected original catalogue | Difference |
| --- | ---: | ---: | ---: |
| aromatherapy | 1291 | 1292 | -1 |
| holistic_medicine | 1002 | 1002 | 0 |
| private_practice_therapist | 1087 | 1087 | 0 |
| sound_bath | 1001 | 1001 | 0 |
| wellness_coach | 1104 | 1104 | 0 |

Total: 5,485 metadata entries and 33,942 declared page references. The API exposes field counts rather than complete editable-field definitions.
Duplicate slug values across the complete response set: 0. Repeated display-name values: 2. Display-name repetition alone does not prove duplicate designs.

## Metadata findings

- `html_entity_in_snippet`: 30 entries.
- `possible_name_encoding_damage`: 5 entries.
- `empty_or_invalid_field_count`: 9 entries.
- `page_set_is_object_map`: 2 entries.
- `non_string_page_records`: 8 entries.
- `absolute_or_unusual_page_path`: 3 entries.
- `unresolved_token_in_summary`: 35 entries.

The execution retained flagged entries, a complete CSV, and raw per-niche API responses in `/workspace/dailyclarity-live-inventory/`. HTML entity flags identify literal entity syntax in returned display text and require UI inspection before being called a rendering bug. Encoding flags are heuristics.

The missing original slug cannot be identified from count differences alone. The original source inventory and certified manifest are absent. No assumption was made that the missing entry is the historically documented source without an index page. Page object maps and object-valued records were normalized for counting, while their original API shapes were flagged and preserved in the raw files.

This is a complete metadata enumeration, not a rendering certification. It does not verify page bodies, external assets, customizations, checkout, fulfillment, or publication.

Public sources (each requested with `?all=true`): [aromatherapy](https://dailyclarity.org/api/templates/aromatherapy?all=true), [holistic medicine](https://dailyclarity.org/api/templates/holistic_medicine?all=true), [private practice therapists](https://dailyclarity.org/api/templates/private_practice_therapist?all=true), [sound bath](https://dailyclarity.org/api/templates/sound_bath?all=true), [wellness coaches](https://dailyclarity.org/api/templates/wellness_coach?all=true).
