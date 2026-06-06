import Anthropic from '@anthropic-ai/sdk';

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
