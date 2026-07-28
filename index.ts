/**
 * Count anime shows by protagonist gender using the AniList GraphQL API.
 *
 * Saves progress to results.json with totals at the top and a full show list.
 *
 * Usage:
 *   bun run index.ts                  # default: scans all anime
 *   bun run index.ts --pages=100      # custom page count
 *   bun run index.ts --per-page=50    # entries per page (max 50 for AniList)
 */

import { writeFileSync } from "node:fs";

const ANILIST_ENDPOINT = "https://graphql.anilist.co";
const OUTPUT_FILE = "results.json";

type CharacterNode = {
  id: number;
  name: { full: string };
  gender: string | null;
};

type MediaNode = {
  id: number;
  title: { romaji: string | null; english: string | null };
  characters: {
    nodes: CharacterNode[];
  };
};

type ShowEntry = {
  id: number;
  title: string;
  protagonists: { name: string; gender: string | null }[];
  classification: "female" | "male" | "mixed" | "other" | "none";
};

type Results = {
  totals: {
    total: number;
    female: number;
    male: number;
    mixed: number;
    femaleCombined: number;
    maleCombined: number;
    other: number;
    none: number;
  };
  shows: ShowEntry[];
};

type PageResponse = {
  Page: {
    pageInfo: { hasNextPage: boolean; currentPage: number };
    media: MediaNode[];
  };
};

const query = `
query ($page: Int, $perPage: Int) {
  Page(page: $page, perPage: $perPage) {
    pageInfo { hasNextPage currentPage }
    media(type: ANIME, sort: POPULARITY_DESC) {
      id
      title { romaji english }
      characters(role: MAIN) {
        nodes {
          id
          name { full }
          gender
        }
      }
    }
  }
}
`;

function parseArgs(argv: string[]): { pages: number; perPage: number } {
  const args: { pages: number; perPage: number } = {
    pages: 100000,
    perPage: 50,
  };
  for (const arg of argv.slice(2)) {
    const m = /^--([a-z-]+)=(.+)$/.exec(arg);
    if (!m) continue;
    const [, key, value] = m;
    if (key === "pages") args.pages = Number(value);
    if (key === "per-page") args.perPage = Math.min(Number(value), 50);
  }
  return args;
}

async function fetchPage(page: number, perPage: number, attempt = 0): Promise<PageResponse> {
  const res = await fetch(ANILIST_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ query, variables: { page, perPage } }),
  });
  if (res.status === 429) {
    const wait = Math.min(5000 * Math.pow(2, attempt), 60000);
    console.error(`Rate limited (429), waiting ${wait / 1000}s (attempt ${attempt + 1})...`);
    await Bun.sleep(wait);
    return fetchPage(page, perPage, attempt + 1);
  }
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  }
  const json = (await res.json()) as { data?: PageResponse; errors?: unknown };
  if (json.errors) throw new Error(`GraphQL errors: ${JSON.stringify(json.errors)}`);
  if (!json.data) throw new Error("No data returned");
  return json.data;
}

function genderOf(gender: string | null): "female" | "male" | "other" {
  const g = (gender ?? "").toLowerCase();
  if (g === "female" || g === "woman" || g === "girl") return "female";
  if (g === "male" || g === "man" || g === "boy") return "male";
  return "other";
}

function classifyShow(media: MediaNode): {
  classification: "female" | "male" | "mixed" | "other" | "none";
  protagonists: { name: string; gender: string | null }[];
} {
  const mains = media.characters.nodes;
  if (mains.length === 0) {
    return { classification: "none", protagonists: [] };
  }
  const protagonists = mains.map((c) => ({ name: c.name.full, gender: c.gender }));
  const genders = mains.map((c) => genderOf(c.gender));
  const hasFemale = genders.includes("female");
  const hasMale = genders.includes("male");
  let classification: "female" | "male" | "mixed" | "other";
  if (hasFemale && hasMale) classification = "mixed";
  else if (hasFemale) classification = "female";
  else if (hasMale) classification = "male";
  else classification = "other";
  return { classification, protagonists };
}

function saveResults(counts: Record<string, number>, shows: ShowEntry[]) {
  const results: Results = {
    totals: {
      total: shows.length,
      female: counts.female,
      male: counts.male,
      mixed: counts.mixed,
      femaleCombined: counts.female + counts.mixed,
      maleCombined: counts.male + counts.mixed,
      other: counts.other,
      none: counts.none,
    },
    shows,
  };
  writeFileSync(OUTPUT_FILE, JSON.stringify(results, null, 2));
}

async function main() {
  const { pages, perPage } = parseArgs(process.argv);
  const counts = { female: 0, male: 0, mixed: 0, other: 0, none: 0 };
  const shows: ShowEntry[] = [];

  for (let page = 1; page <= pages; page++) {
    const data = await fetchPage(page, perPage);
    for (const media of data.Page.media) {
      const { classification, protagonists } = classifyShow(media);
      counts[classification]++;
      shows.push({
        id: media.id,
        title: media.title.english ?? media.title.romaji ?? `#${media.id}`,
        protagonists,
        classification,
      });
    }
    console.log(
      `Page ${page}/${pages} done (total ${shows.length}) — ` +
        `female: ${counts.female}, male: ${counts.male}, mixed: ${counts.mixed}, femaleCombined: ${counts.female + counts.mixed}, maleCombined: ${counts.male + counts.mixed}, other: ${counts.other}, none: ${counts.none}`,
    );
    saveResults(counts, shows);
    if (!data.Page.pageInfo.hasNextPage) {
      console.log("No more pages available.");
      break;
    }
    await Bun.sleep(1000);
  }

  saveResults(counts, shows);
  console.log(`\n=== Results saved to ${OUTPUT_FILE} ===`);
  console.log(`Total shows scanned: ${shows.length}`);
  console.log(`Shows with a female protagonist (only): ${counts.female}`);
  console.log(`Shows with a male protagonist (only):   ${counts.male}`);
  console.log(`Shows with mixed protag (M+F):         ${counts.mixed}`);
  console.log(`Female combined (female + mixed):       ${counts.female + counts.mixed}`);
  console.log(`Male combined (male + mixed):           ${counts.male + counts.mixed}`);
  console.log(`Shows with other/unknown protag:        ${counts.other}`);
  console.log(`Shows with no main character:            ${counts.none}`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
