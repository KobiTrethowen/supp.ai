import Anthropic from '@anthropic-ai/sdk';
import type { PubMedPaper, SupplementCount } from './types';

const client = new Anthropic();

export async function rankSupplementsForGoal(
  userGoal: string
): Promise<{ supplements: string[]; goalKeyword: string }> {
  const fallback = { supplements: [], goalKeyword: '' };

  let response;
  try {
    response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 256,
      messages: [
        {
          role: 'user',
          content: `Given this health goal, do two things:
1. List the 3–5 most evidence-backed dietary supplements that could help, ranked by likelihood of effectiveness.
2. Extract a short 2–3 word keyword capturing the core health outcome (e.g. "protein intake", "sleep quality", "joint inflammation").

Return ONLY valid JSON in this exact format — no explanation, no markdown:
{"supplements":["Whey Protein","Creatine"],"goalKeyword":"protein intake"}

Goal: "${userGoal}"`,
        },
      ],
    });
  } catch (err) {
    console.error('rankSupplementsForGoal error:', err);
    return fallback;
  }

  const raw =
    response.content[0].type === 'text' ? response.content[0].text.trim() : '';
  const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');

  try {
    const parsed = JSON.parse(cleaned);
    if (!Array.isArray(parsed.supplements) || typeof parsed.goalKeyword !== 'string') {
      return fallback;
    }
    return { supplements: parsed.supplements, goalKeyword: parsed.goalKeyword };
  } catch (err) {
    console.error('rankSupplementsForGoal JSON parse error:', err, '\nRaw:', raw);
    return fallback;
  }
}

export async function countPositivePapersForSupplement(
  papers: PubMedPaper[],
  supplement: string,
  userGoal: string
): Promise<number> {
  if (papers.length === 0) return 0;

  const abstractsText = papers
    .map((p) => `PMID: ${p.pmid}\n${p.abstract || '(no abstract)'}`)
    .join('\n\n---\n\n');

  let response;
  try {
    response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 16,
      messages: [
        {
          role: 'user',
          content: `How many of the following research paper abstracts show positive or promising evidence that "${supplement}" helps with: "${userGoal}"?

Count only papers where the results support or suggest a beneficial effect. Do not count papers where the results were neutral, negative, or inconclusive.

Return ONLY a single integer (e.g. 3). No explanation.

Papers:
${abstractsText}`,
        },
      ],
    });
  } catch (err) {
    console.error('countPositivePapersForSupplement error:', err);
    return 0;
  }

  const raw =
    response.content[0].type === 'text' ? response.content[0].text.trim() : '';
  const num = parseInt(raw.match(/\d+/)?.[0] ?? '', 10);
  return isNaN(num) ? 0 : num;
}
