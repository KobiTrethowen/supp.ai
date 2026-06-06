@AGENTS.md

# supp.ai — Claude Code Context

## Project Overview

**supp.ai** is a web application that helps users discover science-backed supplements for their specific health goals and problems.

**User journey:**
1. User inputs their health goals (e.g. "improve focus", "reduce inflammation") and/or problems (e.g. "chronic fatigue", "poor sleep")
2. App queries the PubMed API (NCBI E-utilities) for relevant scientific literature
3. Claude AI reads the abstracts and synthesizes them into personalized supplement recommendations
4. User receives structured recommendations with supporting evidence from peer-reviewed research

## Implementation Status

| Part | Status |
|------|--------|
| Next.js scaffold | Done |
| PubMed search UI + API | Done — `app/page.tsx`, `app/api/search/route.ts`, `lib/pubmed.ts` |
| PubMed XML parsing | Done — `fast-xml-parser` in `lib/pubmed.ts` |
| Claude keyword extraction | Done — `extractSearchKeyword()` in `lib/claude.ts` using `claude-sonnet-4-6` |
| Claude supplement detection | Done — `findSupplementsInPapers()` in `lib/claude.ts` using `claude-haiku-4-5` |
| Top supplement highlight card | Done — prominent amber card as the sole result in `app/page.tsx`; only counts supplements reported as effective |
| Full Claude synthesis / recommendations | Not started — see future direction below |
| User goal/problem input form | Not started |

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js **16.2.7** (App Router, Turbopack) |
| Language | TypeScript (strict mode) |
| Styling | Tailwind CSS 4 |
| React | React 19 |
| XML parser | `fast-xml-parser` ^5 (for PubMed efetch responses) |
| AI | Anthropic Claude API — `claude-sonnet-4-6` (keyword extraction) + `claude-haiku-4-5` (supplement detection) |
| External API | PubMed E-utilities (NCBI) |
| Package manager | npm |
| Deployment | Vercel |

## Project Structure

```
supp.ai/
├── app/
│   ├── layout.tsx          # Root layout
│   ├── page.tsx            # Home page — search UI (client component)
│   └── api/
│       └── search/
│           └── route.ts    # GET /api/search?q= — queries PubMed, returns papers
├── components/
│   └── PaperCard.tsx       # Single paper result card (title, authors, abstract, link)
├── lib/
│   ├── pubmed.ts           # PubMed E-utilities API client + XML parser
│   ├── claude.ts           # Claude API calls: keyword extraction (Sonnet) + supplement detection (Haiku)
│   └── types.ts            # Shared TypeScript interfaces
└── AGENTS.md               # Next.js version-specific agent rules (do not delete)
```

## Key Commands

```bash
npm run dev          # Start dev server at http://localhost:3000
npm run build        # Production build
npm run lint         # ESLint
npx tsc --noEmit     # TypeScript type-check (no npm script alias exists)
```

## Data Flow Architecture

```
User types query → page.tsx form
        │
        ▼
GET /api/search?q={query}  (app/api/search/route.ts)
        │
        ├─► lib/claude.ts: extractSearchKeyword(query)   [claude-sonnet-4-6]
        │     Turns freeform goal into a concise PubMed keyword (2-4 words)
        │
        ├─► lib/pubmed.ts: searchPubMed(keyword, 10)
        │     Step 1 — esearch.fcgi: get matching PMIDs
        │     Step 2 — efetch.fcgi: fetch XML with titles, abstracts, authors
        │     Returns PubMedPaper[]
        │
        ├─► lib/claude.ts: findSupplementsInPapers(papers)   [claude-haiku-4-5]
        │     Single call: all 10 abstracts → JSON list of supplements per PMID
        │     TypeScript counts paper-level frequency, returns top SupplementCount[]
        │     (all supplements tied at the max count — handles ties)
        │
        ▼
page.tsx renders:
  - teal keyword banner ("Searching PubMed for: X")
  - amber supplement card ("Top evidence-backed supplement: Vitamin D — Effective in 7 of 10 papers analyzed")
  - fallback message if no effective supplements found (no paper list is shown)
```

## PubMed E-utilities API

**Base URL:** `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/`

**Key endpoints:**
- `esearch.fcgi` — search for paper IDs by keyword query (`retmode=json`)
- `efetch.fcgi` — fetch full records as XML (`rettype=abstract&retmode=xml`)

**Rate limits:**
- Without API key: 3 requests/second
- With API key: 10 requests/second

**Recommended query construction:**
- Combine user goals/supplements with `[MeSH Terms]` or `[tiab]` for title/abstract
- Filter by `hasabstract[text]` to ensure retrievable abstracts
- Limit to recent papers: `2015:2026[pdat]`

**XML parsing — important quirks:**
- Uses `fast-xml-parser` v5. Parser config in `lib/pubmed.ts` sets `isArray` for `PubmedArticle`, `Author`, `AbstractText` to handle single-result edge cases.
- `PMID` comes back as `{ '#text': number, '@_Version': '1' }` — use the `getText()` helper.
- `AbstractText` can be a string (simple abstract) or array of objects with `@_Label` (structured abstract like BACKGROUND/METHODS/RESULTS). `extractAbstract()` in `lib/pubmed.ts` handles both.
- Some papers have no `Abstract` node at all — handled gracefully (returns empty string).
- `PubDate` may have `Year` or only `MedlineDate` (e.g. "2023 Jan-Feb") — `extractYear()` handles both.

**Environment variable:** `NCBI_API_KEY` (optional but recommended)

## Claude API (integrated)

**File:** `lib/claude.ts` — two exported functions:

### `extractSearchKeyword(userGoal: string): Promise<string>`
- Model: `claude-sonnet-4-6`
- Converts a freeform user goal (e.g. "I can't sleep") into a concise PubMed keyword (e.g. "sleep quality insomnia")
- Called first in the search route before PubMed

### `findSupplementsInPapers(papers: PubMedPaper[]): Promise<SupplementCount[]>`
- Model: `claude-haiku-4-5` (~$0.005/search)
- Single API call with all paper abstracts
- Prompt asks for JSON: `[{"pmid":"...","supplements":["Vitamin D","Omega-3"]}]`
- Only supplements the abstract reports as **effective or beneficial** are included — neutral, inconclusive, or negative results are excluded
- TypeScript counts paper-level frequency (normalized lowercase for dedup, original casing for display)
- Returns all supplements tied at the highest count
- Gracefully returns `[]` on API errors or unparseable JSON

**Environment variable:** `ANTHROPIC_API_KEY`

## Future Direction — Full Claude Synthesis

The next major step is full supplement recommendations using Claude Sonnet. Planned type:

```typescript
interface SupplementRecommendation {
  name: string;
  mechanism: string;
  evidenceQuality: 'strong' | 'moderate' | 'preliminary';
  typicalDosage: string;
  caveats: string[];
  supportingPmids: string[];
}
```

## Environment Variables

Create a `.env.local` file (never commit this):

```bash
ANTHROPIC_API_KEY=sk-ant-...
NCBI_API_KEY=...          # Optional, from https://www.ncbi.nlm.nih.gov/account/
```

## TypeScript Conventions

- Strict mode enabled (`"strict": true` in tsconfig.json)
- Prefer server components; use `"use client"` only when interactivity requires it
- All API responses typed — define response shapes in `lib/types.ts`
- No `any` — use `unknown` and narrow types properly
- Use `zod` for runtime validation of external API responses if needed

## Key Types (`lib/types.ts`)

```typescript
interface PubMedPaper {
  pmid: string;
  title: string;
  abstract: string;
  authors: string[];
  journal: string;
  year: string;
  url: string;
}

interface SupplementCount {
  name: string;       // display name, e.g. "Vitamin D"
  paperCount: number; // how many papers mention this supplement
  pmids: string[];    // PMIDs of papers that mention it
}

interface SearchResponse {
  papers: PubMedPaper[];
  total: number;
  query: string;                     // original user goal input
  keyword: string;                   // PubMed keyword extracted by Claude Sonnet
  topSupplements: SupplementCount[]; // supplements tied at max paper count (may be 1+)
}
```

## Git & GitHub Workflow

**Commit and push after every meaningful change.** This project uses frequent, granular commits so we can roll back to any point.

**Remote:** `https://github.com/KobiTrethowen/supp.ai` (private repo)

**Commit convention:**
- Commit after each logical unit of work (new file, feature, fix, config change)
- Push to `main` immediately after committing
- Use clear, descriptive commit messages focused on the "why"
- Never batch multiple unrelated changes into one commit

**Commands:**
```bash
git add <specific-files>
git commit -m "message"
git push origin main
```

**What to commit:** All source files, config, CLAUDE.md updates.
**Never commit:** `.env.local`, secrets, `node_modules/`, `.next/`

## Conventions & Notes

- API routes live in `app/api/` — never expose API keys to the client
- PubMed calls happen server-side only (in API routes)
- Claude API calls will also be server-side only
- Disclaimer text is already in `app/page.tsx` footer: "Results are from the PubMed database. This is not medical advice."
- PubMed fetch cache: `{ next: { revalidate: 3600 } }` — already set in `lib/pubmed.ts`
- The `@AGENTS.md` line at the top of this file is **required** — it injects Next.js 16-specific rules for the AI agent. Do not remove it.
- `package.json` name is `supp-ai` (was `supp-scaffold` from the scaffold — already corrected)

## Known Issues / Gotchas

- **Node.js version:** The project runs on Node 23. `eslint-visitor-keys` warns about engine mismatch — harmless, ignore it.
- **Workspace root warning:** Next.js detects a lockfile at `/Users/kobitrethowen/package-lock.json` and warns about workspace root. Set `turbopack.root` in `next.config.ts` if this becomes a problem.
- **Scaffolding note:** `create-next-app` overwrites `CLAUDE.md` with `@AGENTS.md` and replaces `.git`. If re-scaffolding is ever needed, scaffold in a temp dir and copy only non-hidden files (`cp -r /tmp/scaffold/* .` not `cp -r /tmp/scaffold/. .`).
