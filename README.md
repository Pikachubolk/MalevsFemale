# Male vs Female Anime Protagonists

Counts how many anime shows have a female protagonist, a male protagonist, or both, using the [AniList GraphQL API](https://docs.anilist.co/).

## Results (5,000 most popular shows)

| Category | Count |
|---|---|
| Female only | 971 |
| Male only | 938 |
| Mixed (both M+F) | 2,585 |
| **Female combined (female + mixed)** | **3,556** |
| **Male combined (male + mixed)** | **3,523** |
| Other / unknown gender | 463 |
| No main character listed | 43 |

## Scripts

### `index.ts` — Cursor-based (scans all anime)

Uses `id_greater` cursor pagination to bypass AniList's 5,000 entry offset limit. Scans all anime sorted by ID.

```bash
bun run index.ts
```

### `pages.ts` — Page-based (top 5,000 by popularity)

Uses offset-based pagination sorted by popularity. AniList caps this at 5,000 entries.

```bash
bun run pages.ts                  # default: 100 pages (~5000 entries)
bun run pages.ts --pages=50       # custom page count
bun run pages.ts --per-page=50    # entries per page (max 50)
```

## How it works

- Queries AniList for anime (sorted by popularity for `pages.ts`, by ID for `index.ts`).
- For each show, fetches all characters with the `MAIN` role.
- Classifies each show based on the genders of its main characters:
  - **female** — all main characters are female
  - **male** — all main characters are male
  - **mixed** — has both male and female main characters
  - **other** — main characters exist but none are clearly male/female
  - **none** — no main characters listed
- `femaleCombined` = female + mixed (all shows with at least one female protag)
- `maleCombined` = male + mixed (all shows with at least one male protag)

## Output

Progress is saved to `results.json` (index.ts) / `results_pages.json` (pages.ts) after every page, so you can Ctrl+C at any time without losing data.

```json
{
  "totals": {
    "total": 5000,
    "female": 971,
    "male": 938,
    "mixed": 2585,
    "femaleCombined": 3556,
    "maleCombined": 3523,
    "other": 463,
    "none": 43
  },
  "shows": [
    {
      "id": 16498,
      "title": "Attack on Titan",
      "protagonists": [
        { "name": "Mikasa Ackerman", "gender": "Female" },
        { "name": "Eren Yeager", "gender": "Male" }
      ],
      "classification": "mixed"
    }
  ]
}
```

## Requirements

- [Bun](https://bun.sh/) runtime
- Internet access (queries the AniList API)

## Notes

- Gender data depends on AniList's community-maintained character entries, which may be incomplete or null.
- Both scripts include exponential backoff for AniList's rate limiting (HTTP 429).
- A 1-second delay is used between requests to be polite to the API.
- `index.ts` can scan beyond 5,000 entries because it uses cursor-based pagination (`id_greater`) instead of page offsets.
