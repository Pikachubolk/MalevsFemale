# Male vs Female Anime Protagonists

This repo queries the [AniList GraphQL API](https://docs.anilist.co/) and classifies each anime by the gender mix of its `MAIN` characters.

## Why this project exists (important context)

This project is a data-collection and classification exercise, not a social verdict engine.

The goal is to:

- collect structured protagonist data from AniList,
- split shows into clear buckets (`female`, `male`, `mixed`, `other`, `none`),
- and make it easier to inspect broad trends.

This should **not** be interpreted as:

- "proof" that one side is better represented in absolute reality,
- proof of intent by studios or the anime industry,
- or a final statement about gender representation quality.

It **can** be used as:

- a starting point for research,
- a reproducible baseline for further analysis,
- or a fun technical project for exploring anime metadata.

Please take the results with a grain of salt, even when the data pipeline itself is consistent.

## What each script does

| Script | Pagination mode | Sort mode | Scope |
|---|---|---|---|
| `index.ts` | Cursor-like (`id_greater`) | `ID` ascending | Scans all available anime IDs until no results are returned |
| `pages.ts` | Page/offset (`page`, `perPage`) | `POPULARITY_DESC` | Scans up to AniList's page-offset cap (effectively top ~5,000 shows when `perPage=50`) |

Run:

```bash
bun run index.ts
bun run index.ts --per-page=50

bun run pages.ts
bun run pages.ts --pages=50
bun run pages.ts --per-page=50
```

### Scope note about 5,000 and beyond

- `pages.ts` is intentionally bounded by AniList's offset/page limitations and is effectively a "top ~5,000 by popularity" dataset when using `perPage=50`.
- `index.ts` is designed to go beyond 5,000 by stepping through IDs with `id_greater`.
- **Important caveat requested for this repository:** data distributions may change when scanning far above 5,000 entries, but that larger-scope comparison has not been fully tested/documented here yet due to time constraints.

## Exact classification rules

Each show uses only `characters(role: MAIN)`.

1. Raw AniList gender values are normalized:
   - `female`, `woman`, `girl` -> `female`
   - `male`, `man`, `boy` -> `male`
   - anything else (including `null`) -> `other`
2. Final `classification` is:
   - `none`: no `MAIN` characters
   - `mixed`: at least one normalized `female` and at least one normalized `male`
   - `female`: has `female` and no `male`
   - `male`: has `male` and no `female`
   - `other`: has `MAIN` characters but none normalize to `female`/`male`

### What "accurate" means in this repository

When this README says the output "should be accurate," it means:

- the scripts apply the rules above deterministically,
- counts in `totals` are mechanically derived from stored `shows[]` entries,
- and rerunning with the same endpoint behavior should produce the same style of classification.

It does **not** mean:

- AniList source metadata is perfect,
- character gender values are always present/consistent,
- or that this captures every possible interpretation of "protagonist."

## Output files and field meanings

- `index.ts` writes `results.json`
- `pages.ts` writes `results_pages.json`
- Both scripts overwrite output from the start of a run and save after every page/batch.

`totals` fields:

- `total`: number of shows processed in this run
- `female`: shows classified as `female`
- `male`: shows classified as `male`
- `mixed`: shows classified as `mixed`
- `femaleCombined`: `female + mixed` (shows with at least one female main character)
- `maleCombined`: `male + mixed` (shows with at least one male main character)
- `other`: shows classified as `other`
- `none`: shows classified as `none`

Each `shows[]` entry contains:

- `id`: AniList media ID
- `title`: `english`, otherwise `romaji`, otherwise `#<id>`
- `protagonists`: list of `MAIN` characters with raw AniList gender values
- `classification`: one of `female | male | mixed | other | none`

### Detailed interpretation of each bucket

- `female`:
  - all recognized genders among `MAIN` characters resolve to female terms,
  - no recognized male term appears.
- `male`:
  - all recognized genders among `MAIN` characters resolve to male terms,
  - no recognized female term appears.
- `mixed`:
  - at least one recognized female term and at least one recognized male term appear.
- `other`:
  - there are `MAIN` characters, but no value mapped to recognized male/female terms.
  - this can include null/unknown/non-binary/other labels depending on AniList entries.
- `none`:
  - AniList returned no `MAIN` characters for that anime entry.

`femaleCombined` and `maleCombined` are overlap-aware convenience counters, not exclusive populations:

- `femaleCombined = female + mixed`
- `maleCombined = male + mixed`

So `femaleCombined + maleCombined` can exceed `total` because every `mixed` show contributes to both.

## Current sample result (top 5,000 by popularity)

| Category | Count |
|---|---|
| Female only | 971 |
| Male only | 938 |
| Mixed (both M+F) | 2,585 |
| **Female combined (female + mixed)** | **3,556** |
| **Male combined (male + mixed)** | **3,523** |
| Other / unknown gender | 463 |
| No main character listed | 43 |

## Operational details

- Requires [Bun](https://bun.sh/) and internet access.
- Retries HTTP 429 with exponential backoff (up to 60s delay between retries).
- Waits 1 second between successful requests to reduce API pressure.
- Results depend on AniList's community-maintained character metadata (which can be missing or inconsistent).

## Responsible reading of the results

Please do not treat this output as "oh my god, there are more female leads than male leads" or the reverse, in isolation.

A raw count difference can be caused by many factors, including:

- popularity-sorted sampling effects,
- mixed-cast counting behavior,
- metadata completeness differences across eras/franchises,
- ongoing edits in AniList's community dataset,
- and differences in how "lead/protagonist" is represented in character role tags.

If you want to investigate questions like possible gender exclusion/censorship patterns, this repository can serve as a first-pass dataset generator, but meaningful conclusions require additional qualitative and statistical work beyond these counts.
