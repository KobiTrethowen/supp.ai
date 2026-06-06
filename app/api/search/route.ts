import { NextRequest, NextResponse } from 'next/server';
import { searchPubMed } from '@/lib/pubmed';
import { extractSearchKeyword } from '@/lib/claude';
import type { SearchResponse, SearchError } from '@/lib/types';

export async function GET(
  request: NextRequest
): Promise<NextResponse<SearchResponse | SearchError>> {
  const query = request.nextUrl.searchParams.get('q')?.trim();

  if (!query) {
    return NextResponse.json({ error: 'Query parameter "q" is required' }, { status: 400 });
  }

  try {
    const keyword = await extractSearchKeyword(query);
    const papers = await searchPubMed(keyword, 10);
    return NextResponse.json({ papers, total: papers.length, query, keyword });
  } catch (err) {
    console.error('Search error:', err);
    return NextResponse.json(
      { error: 'Failed to fetch results. Please try again.' },
      { status: 502 }
    );
  }
}
