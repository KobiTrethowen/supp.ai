export interface PubMedPaper {
  pmid: string;
  title: string;
  abstract: string;
  authors: string[];
  journal: string;
  year: string;
  url: string;
}

export interface SupplementCount {
  name: string;
  paperCount: number;
  pmids: string[];
}

export interface SearchResponse {
  papers: PubMedPaper[];
  total: number;
  query: string;
  keyword: string;
  topSupplements: SupplementCount[];
}

export interface SearchError {
  error: string;
}
