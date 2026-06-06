import { XMLParser } from 'fast-xml-parser';
import type { PubMedPaper } from './types';

const BASE_URL = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils';

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  textNodeName: '#text',
  isArray: (name) =>
    ['PubmedArticle', 'Author', 'AbstractText', 'MeshHeading'].includes(name),
});

function getText(node: unknown): string {
  if (typeof node === 'string') return node;
  if (typeof node === 'number') return String(node);
  if (node && typeof node === 'object') {
    const obj = node as Record<string, unknown>;
    if ('#text' in obj) return String(obj['#text']);
  }
  return '';
}

function extractAbstract(abstractText: unknown): string {
  if (!abstractText) return '';
  if (typeof abstractText === 'string') return abstractText;
  if (Array.isArray(abstractText)) {
    return abstractText
      .map((item) => {
        if (typeof item === 'string') return item;
        if (item && typeof item === 'object') {
          const obj = item as Record<string, unknown>;
          const label = obj['@_Label'] ? `${obj['@_Label']}: ` : '';
          const text = '#text' in obj ? String(obj['#text']) : '';
          return label + text;
        }
        return '';
      })
      .filter(Boolean)
      .join(' ');
  }
  return getText(abstractText);
}

function extractAuthors(authorList: unknown): string[] {
  if (!authorList || typeof authorList !== 'object') return [];
  const list = authorList as Record<string, unknown>;
  const authors = list['Author'];
  if (!Array.isArray(authors)) return [];

  return authors
    .map((author) => {
      if (typeof author !== 'object' || !author) return '';
      const a = author as Record<string, unknown>;
      const last = getText(a['LastName']);
      const initials = getText(a['Initials']);
      if (!last) return getText(a['CollectiveName']);
      return initials ? `${last} ${initials}` : last;
    })
    .filter(Boolean);
}

function extractYear(pubDate: unknown): string {
  if (!pubDate || typeof pubDate !== 'object') return '';
  const date = pubDate as Record<string, unknown>;
  if (date['Year']) return getText(date['Year']);
  // Some articles only have MedlineDate like "2023 Jan-Feb"
  const medline = getText(date['MedlineDate']);
  return medline ? medline.slice(0, 4) : '';
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseArticles(xml: string): PubMedPaper[] {
  const parsed = parser.parse(xml);
  const articleSet = parsed?.PubmedArticleSet;
  if (!articleSet) return [];

  const articles: unknown[] = Array.isArray(articleSet.PubmedArticle)
    ? articleSet.PubmedArticle
    : [];

  return articles
    .map((article): PubMedPaper | null => {
      if (typeof article !== 'object' || !article) return null;
      const a = article as Record<string, unknown>;
      const citation = a['MedlineCitation'] as Record<string, unknown>;
      if (!citation) return null;

      const pmidNode = citation['PMID'];
      const pmid = getText(pmidNode) || String(pmidNode);

      const articleData = citation['Article'] as Record<string, unknown>;
      if (!articleData) return null;

      const title = getText(articleData['ArticleTitle']);

      const abstractNode = articleData['Abstract'] as Record<string, unknown> | undefined;
      const abstract = abstractNode
        ? extractAbstract(abstractNode['AbstractText'])
        : '';

      const authors = extractAuthors(articleData['AuthorList']);

      const journal = articleData['Journal'] as Record<string, unknown> | undefined;
      const journalTitle = journal ? getText((journal['Title'] as unknown) ?? '') : '';

      const journalIssue = journal?.['JournalIssue'] as Record<string, unknown> | undefined;
      const pubDate = journalIssue?.['PubDate'];
      const year = extractYear(pubDate);

      return {
        pmid,
        title,
        abstract,
        authors,
        journal: journalTitle,
        year,
        url: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`,
      };
    })
    .filter((p): p is PubMedPaper => p !== null && Boolean(p.pmid));
}

export async function searchPubMed(
  query: string,
  maxResults = 10
): Promise<PubMedPaper[]> {
  const apiKey = process.env.NCBI_API_KEY;

  // Step 1: esearch — get matching PMIDs
  const searchUrl = new URL(`${BASE_URL}/esearch.fcgi`);
  searchUrl.searchParams.set('db', 'pubmed');
  searchUrl.searchParams.set('term', query);
  searchUrl.searchParams.set('retmax', String(maxResults));
  searchUrl.searchParams.set('retmode', 'json');
  searchUrl.searchParams.set('sort', 'relevance');
  if (apiKey) searchUrl.searchParams.set('api_key', apiKey);

  const searchRes = await fetch(searchUrl.toString(), { next: { revalidate: 3600 } });
  if (!searchRes.ok) throw new Error(`PubMed search failed: ${searchRes.status}`);

  const searchData = await searchRes.json();
  const ids: string[] = searchData?.esearchresult?.idlist ?? [];
  if (ids.length === 0) return [];

  // Step 2: efetch — get full records as XML
  const fetchUrl = new URL(`${BASE_URL}/efetch.fcgi`);
  fetchUrl.searchParams.set('db', 'pubmed');
  fetchUrl.searchParams.set('id', ids.join(','));
  fetchUrl.searchParams.set('rettype', 'abstract');
  fetchUrl.searchParams.set('retmode', 'xml');
  if (apiKey) fetchUrl.searchParams.set('api_key', apiKey);

  const fetchRes = await fetch(fetchUrl.toString(), { next: { revalidate: 3600 } });
  if (!fetchRes.ok) throw new Error(`PubMed fetch failed: ${fetchRes.status}`);

  const xml = await fetchRes.text();
  return parseArticles(xml);
}
