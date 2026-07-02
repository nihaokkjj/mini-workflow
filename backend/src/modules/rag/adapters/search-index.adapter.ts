export interface IndexedSegment {
  segmentId: string;
  datasetId: string;
  documentId: string;
  content: string;
}

export interface SearchQuery {
  datasetIds: string[];
  query: string;
  topK: number;
}

export interface SearchHit {
  segmentId: string;
  score: number;
}

export interface SearchIndexAdapter {
  upsertSegments(segments: IndexedSegment[]): Promise<void>;
  deleteByDocument(documentId: string): Promise<void>;
  search(input: SearchQuery): Promise<SearchHit[]>;
}

export const SEARCH_INDEX_ADAPTER = Symbol("SEARCH_INDEX_ADAPTER");
