export interface PubMedPaper {
  pmid: string;
  title: string;
  abstract: string;
  authors: string[];
  journal: string;
  year: string;
  url: string;
}

export interface SearchResponse {
  papers: PubMedPaper[];
  total: number;
  query: string;    // original user goal input
  keyword: string;  // PubMed search term extracted by Claude
}

export interface SearchError {
  error: string;
}
