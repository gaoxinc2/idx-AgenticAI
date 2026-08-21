import { chunkText } from "./chunkText";
import { loadKnowledgeDocuments } from "./knowledgeDocuments";

import type {
  IndexedKnowledgeChunk,
} from "./types";

const EMBEDDING_SIZE = 256;

function hashWord(word: string): number {
  let hash = 0;

  for (let i = 0; i < word.length; i++) {
    hash =
      (hash * 31 + word.charCodeAt(i)) %
      EMBEDDING_SIZE;
  }

  return Math.abs(hash);
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function createLocalEmbedding(
  text: string
): number[] {
  const vector = new Array(
    EMBEDDING_SIZE
  ).fill(0);

  const words = tokenize(text);

  for (const word of words) {
    const index = hashWord(word);
    vector[index] += 1;
  }

  return vector;
}

export function createKnowledgeIndex():
  IndexedKnowledgeChunk[] {
  const documents =
    loadKnowledgeDocuments();

  const indexedChunks:
    IndexedKnowledgeChunk[] = [];

  for (const document of documents) {
    const documentChunks = chunkText(
      document.content,
      600,
      100
    );

    documentChunks.forEach(
      (content, index) => {
        indexedChunks.push({
          id: `${document.id}-${index}`,
          documentId: document.id,
          title: document.title,
          source: document.source,
          content,
          embedding:
            createLocalEmbedding(content),
        });
      }
    );
  }

  return indexedChunks;
}

export function createQueryEmbedding(
  query: string
): number[] {
  return createLocalEmbedding(query);
}