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
  query: string;
}

export interface SearchError {
  error: string;
}
