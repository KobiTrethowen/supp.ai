import { NextRequest, NextResponse } from 'next/server';
import { searchPubMed } from '@/lib/pubmed';
import type { SearchResponse, SearchError } from '@/lib/types';

export async function GET(
  request: NextRequest
): Promise<NextResponse<SearchResponse | SearchError>> {
  const query = request.nextUrl.searchParams.get('q')?.trim();

  if (!query) {
    return NextResponse.json({ error: 'Query parameter "q" is required' }, { status: 400 });
  }

  try {
    const papers = await searchPubMed(query, 10);
    return NextResponse.json({ papers, total: papers.length, query });
  } catch (err) {
    console.error('PubMed search error:', err);
    return NextResponse.json(
      { error: 'Failed to fetch results from PubMed. Please try again.' },
      { status: 502 }
    );
  }
}
