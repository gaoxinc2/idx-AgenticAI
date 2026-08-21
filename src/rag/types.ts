export interface KnowledgeDocument {
  id: string;
  title: string;
  source: string;
  content: string;
}

export interface KnowledgeChunk {
  id: string;
  documentId: string;
  title: string;
  source: string;
  content: string;
}

export interface IndexedKnowledgeChunk extends KnowledgeChunk {
  embedding: number[];
}

export interface RetrievedKnowledgeChunk extends IndexedKnowledgeChunk {
  similarity: number;
}