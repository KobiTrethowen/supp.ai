import Anthropic from '@anthropic-ai/sdk';
import type { PubMedPaper, SupplementCount } from './types';

const client = new Anthropic();

export async function extractSearchKeyword(userGoal: string): Promise<string> {
  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 64,
    messages: [
      {
        role: 'user',
        content: `Extract a concise PubMed search keyword or short phrase (2-4 words max) that best represents the health topic from this user goal. Return only the keyword or phrase, nothing else — no punctuation, no explanation.

Goal: "${userGoal}"`,
      },
    ],
  });

  const text =
    response.content[0].type === 'text' ? response.content[0].text.trim() : '';
  return text || userGoal;
}

export async function findSupplementsInPapers(
  papers: PubMedPaper[]
): Promise<SupplementCount[]> {
  if (papers.length === 0) return [];

  const abstractsText = papers
    .map((p) => `PMID: ${p.pmid}\n${p.abstract || '(no abstract)'}`)
    .join('\n\n---\n\n');

  let response;
  try {
    response = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: `You are analyzing medical research abstracts to find supplements with evidence of effectiveness.

For each paper below, identify dietary supplements (vitamins, minerals, herbs, amino acids, probiotics, fatty acids, plant extracts, etc.) that the abstract reports as EFFECTIVE or BENEFICIAL for the health outcome studied.

ONLY include a supplement if the abstract's findings or conclusions indicate it had a positive, significant, or beneficial effect. Do NOT include a supplement if the abstract says it showed no significant effect, was not associated with improvement, had neutral or negative results, or if the evidence was inconclusive.

Return ONLY valid JSON — no explanation, no markdown, no code fences. Use this exact format:
[{"pmid":"12345","supplements":["Vitamin D","Omega-3"]},{"pmid":"67890","supplements":[]}]

If a paper mentions no supplements with positive results, return an empty array for its supplements field.

Papers:
${abstractsText}`,
        },
      ],
    });
  } catch {
    return [];
  }

  const raw =
    response.content[0].type === 'text' ? response.content[0].text.trim() : '';

  let parsed: { pmid: string; supplements: string[] }[];
  try {
    parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
  } catch {
    return [];
  }

  // Count paper-level frequency; normalize to lowercase for dedup, preserve display name
  const freq = new Map<string, { displayName: string; count: number; pmids: string[] }>();
  for (const entry of parsed) {
    if (!Array.isArray(entry.supplements)) continue;
    for (const name of entry.supplements) {
      const key = name.trim().toLowerCase();
      if (!key) continue;
      const existing = freq.get(key);
      if (existing) {
        existing.count += 1;
        existing.pmids.push(entry.pmid);
      } else {
        freq.set(key, { displayName: name.trim(), count: 1, pmids: [entry.pmid] });
      }
    }
  }

  if (freq.size === 0) return [];

  const sorted = Array.from(freq.values())
    .map(({ displayName, count, pmids }) => ({ name: displayName, paperCount: count, pmids }))
    .sort((a, b) => b.paperCount - a.paperCount);

  const maxCount = sorted[0].paperCount;
  return sorted.filter((s) => s.paperCount === maxCount);
}
