@AGENTS.md

# supp.ai — Claude Code Context

## Project Overview

**supp.ai** is a web application that helps users discover science-backed supplements for their specific health goals and problems.

**User journey:**
1. User inputs their health goals (e.g. "improve focus", "reduce inflammation") and/or problems (e.g. "chronic fatigue", "poor sleep")
2. App queries the PubMed API (NCBI E-utilities) for relevant scientific literature
3. Claude AI reads the abstracts and synthesizes them into personalized supplement recommendations
4. User receives structured recommendations with supporting evidence from peer-reviewed research

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14+ (App Router) |
| Language | TypeScript (strict mode) |
| Styling | Tailwind CSS |
| AI | Anthropic Claude API (`claude-sonnet-4-6`) |
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
│   └── types.ts            # Shared TypeScript interfaces
└── AGENTS.md               # Next.js version-specific agent rules (do not delete)
```

## Key Commands

```bash
npm run dev          # Start dev server at http://localhost:3000
npm run build        # Production build
npm run lint         # ESLint
npm run type-check   # tsc --noEmit
```

## Data Flow Architecture

```
User types query → page.tsx form
        │
        ▼
GET /api/search?q={query}  (app/api/search/route.ts)
        │
        ├─► lib/pubmed.ts: searchPubMed(query)
        │     Step 1 — esearch.fcgi: get matching PMIDs
        │     Step 2 — efetch.fcgi: fetch XML with titles, abstracts, authors
        │     Returns PubMedPaper[]
        │
        ▼
page.tsx renders PaperCard for each result
```

## PubMed E-utilities API

**Base URL:** `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/`

**Key endpoints:**
- `esearch.fcgi` — search for paper IDs by keyword query
- `efetch.fcgi` — fetch full records (abstracts) by ID list

**Rate limits:**
- Without API key: 3 requests/second
- With API key: 10 requests/second

**Recommended query construction:**
- Combine user goals/supplements with `[MeSH Terms]` or `[tiab]` for title/abstract
- Filter by `hasabstract[text]` to ensure retrievable abstracts
- Limit to recent papers: `2015:2026[pdat]`

**XML parsing:** Uses `fast-xml-parser` npm package. See `lib/pubmed.ts` for extraction logic.

**Environment variable:** `NCBI_API_KEY` (optional but recommended)

## Claude API (next step — not yet implemented)

**Model:** `claude-sonnet-4-6` (default — good balance of cost and capability)

**Planned usage:**
- After PubMed search returns papers, send abstracts to Claude
- Claude synthesizes evidence into structured supplement recommendations
- Returns `SupplementRecommendation[]` (name, mechanism, evidence quality, dosage, caveats)

**Environment variable:** `ANTHROPIC_API_KEY`

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
- Add a disclaimer: recommendations are for informational purposes, not medical advice
- Cache PubMed results where possible (Next.js `fetch` cache with `revalidate: 3600`)
- Error states: handle PubMed API failures gracefully
