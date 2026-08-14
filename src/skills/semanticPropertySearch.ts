import {
  getStoredListingEmbeddings,
} from "../db/listingEmbeddings";

import {
  cosineSimilarity,
} from "../ai/cosineSimilarity";

import {
  createEmbedding,
} from "../ai/embeddings";

export interface SemanticSearchResult {
  listingId: string;
  searchableText: string;
  similarity: number;
}

export async function findSimilarListingsFromVector(
  queryEmbedding: number[],
  topK = 5,
): Promise<SemanticSearchResult[]> {
  const listings =
    await getStoredListingEmbeddings();

  const scored = listings.map((listing) => ({
    listingId: listing.listingId,
    searchableText: listing.searchableText,
    similarity: cosineSimilarity(
      queryEmbedding,
      listing.embedding,
    ),
  }));

  scored.sort(
    (a, b) => b.similarity - a.similarity,
  );

  return scored.slice(0, topK);
}

export async function findSimilarListings(
  query: string,
  topK = 5,
): Promise<SemanticSearchResult[]> {
  const queryEmbedding =
    await createEmbedding(query);

  return findSimilarListingsFromVector(
    queryEmbedding,
    topK,
  );
}