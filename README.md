# Male vs Female Anime Protagonists

This repo queries the [AniList GraphQL API](https://docs.anilist.co/) and classifies each anime by the gender mix of its `MAIN` characters.

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
