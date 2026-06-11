import { NextRequest, NextResponse } from 'next/server';
import { searchPubMed } from '@/lib/pubmed';
import { rankSupplementsForGoal, countPositivePapersForSupplement } from '@/lib/claude';
import type { PubMedPaper, SupplementCount, SearchResponse, SearchError } from '@/lib/types';

export async function GET(
  request: NextRequest
): Promise<NextResponse<SearchResponse | SearchError>> {
  const query = request.nextUrl.searchParams.get('q')?.trim();

  if (!query) {
    return NextResponse.json({ error: 'Query parameter "q" is required' }, { status: 400 });
  }

  try {
    const { supplements: candidates, goalKeyword } = await rankSupplementsForGoal(query);

    let topSupplements: SupplementCount[] = [];
    let papers: PubMedPaper[] = [];
    let keyword = '';

    for (const supplement of candidates) {
      const searchTerm = goalKeyword ? `${supplement} ${goalKeyword}` : supplement;
      const candidatePapers = await searchPubMed(searchTerm, 10);
      if (candidatePapers.length === 0) continue;

      const positiveCount = await countPositivePapersForSupplement(candidatePapers, supplement, query);
      if (positiveCount >= 2) {
        papers = candidatePapers;
        keyword = searchTerm;
        topSupplements = [{
          name: supplement,
          paperCount: positiveCount,
          pmids: candidatePapers.map((p) => p.pmid),
        }];
        break;
      }
    }

    return NextResponse.json({ papers, total: papers.length, query, keyword, topSupplements });
  } catch (err) {
    console.error('Search error:', err);
    return NextResponse.json(
      { error: 'Failed to fetch results. Please try again.' },
      { status: 502 }
    );
  }
}
