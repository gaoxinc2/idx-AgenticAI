import { createKnowledgeIndex } from "./ragIndex";

import type {
  IndexedKnowledgeChunk,
  RetrievedKnowledgeChunk,
} from "./types";

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}
const STOP_WORDS = new Set([
  "what",
  "is",
  "are",
  "in",
  "the",
  "a",
  "an",
  "for",
  "of",
  "to",
  "and",
  "does",
  "do",
  "used",
  "use",
  "mean",
  "means",
  "meaning",
  "define",
]);

function calculateLexicalScore(
  query: string,
  chunk: IndexedKnowledgeChunk
): number {
  const queryTokens = tokenize(query).filter(
    (token) => !STOP_WORDS.has(token)
  );

  const searchableText = [
    chunk.title,
    chunk.source,
    chunk.content,
  ]
    .join(" ")
    .toLowerCase();

  const documentTokens = new Set(
    tokenize(searchableText)
  );

  if (queryTokens.length === 0) {
    return 0;
  }

  let matches = 0;

  for (const token of queryTokens) {
    if (documentTokens.has(token)) {
      matches++;
    }
  }

  let score = matches / queryTokens.length;

  // Strong boost if the exact query term appears.
  for (const token of queryTokens) {
    if (
      token.includes("_") &&
      searchableText.includes(token)
    ) {
      score += 0.5;
    }
  }

  return score;
}

export function retrieveRelevantChunks(
  query: string,
  index: IndexedKnowledgeChunk[] = createKnowledgeIndex(),
  topK = 4
): RetrievedKnowledgeChunk[] {
  return index
    .map((chunk) => ({
      ...chunk,
      similarity: calculateLexicalScore(
        query,
        chunk
      ),
    }))
    .sort(
      (a, b) =>
        b.similarity - a.similarity
    )
    .slice(0, topK);
}