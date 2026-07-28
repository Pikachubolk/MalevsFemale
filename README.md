# Male vs Female Anime Protagonists

Counts how many anime shows have a female protagonist, a male protagonist, or both, using the [AniList GraphQL API](https://docs.anilist.co/).

## Results (5,000 shows scanned)

| Category | Count |
|---|---|
| Female only | 971 |
| Male only | 938 |
| Mixed (both M+F) | 2,585 |
| **Female combined (female + mixed)** | **3,556** |
| **Male combined (male + mixed)** | **3,523** |
| Other / unknown gender | 463 |
| No main character listed | 43 |

## How it works

- Queries AniList for anime sorted by popularity (`POPULARITY_DESC`).
- For each show, fetches all characters with the `MAIN` role.
- Classifies each show based on the genders of its main characters:
  - **female** — all main characters are female
  - **male** — all main characters are male
  - **mixed** — has both male and female main characters
  - **other** — main characters exist but none are clearly male/female
  - **none** — no main characters listed
- `femaleCombined` = female + mixed (all shows with at least one female protag)
- `maleCombined` = male + mixed (all shows with at least one male protag)

## Usage

```bash
# Scan all anime (stops automatically when no more pages)
bun run index.ts

# Custom page count
bun run index.ts --pages=100

# Entries per page (max 50)
bun run index.ts --per-page=50
```

## Output

Progress is saved to `results.json` after every page, so you can Ctrl+C at any time without losing data.

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
- The script includes exponential backoff for AniList's rate limiting (HTTP 429).
- A 1-second delay is used between pages to be polite to the API.
