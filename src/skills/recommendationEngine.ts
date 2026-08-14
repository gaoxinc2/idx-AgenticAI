export interface RecommendationListing {
  listingId: string;
  price: number;
  city: string;
  propertyType: number;
  sqft: number;
}

export interface RecommendationScore {
  structuredScore: number;
  semanticScore: number;
  totalScore: number;
}

export function cosineSimilarity(
  a: number[],
  b: number[],
): number {
  if (
    a.length === 0 ||
    b.length === 0 ||
    a.length !== b.length
  ) {
    return 0;
  }

  let dotProduct = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    magnitudeA += a[i] * a[i];
    magnitudeB += b[i] * b[i];
  }

  if (
    magnitudeA === 0 ||
    magnitudeB === 0
  ) {
    return 0;
  }

  return (
    dotProduct /
    (
      Math.sqrt(magnitudeA) *
      Math.sqrt(magnitudeB)
    )
  );
}

export function calculateRecommendationScore(
  target: RecommendationListing,
  candidate: RecommendationListing,
  targetEmbedding: number[],
  candidateEmbedding: number[],
): RecommendationScore {
  let structuredScore = 0;

  // Price similarity — max 20 points
  const priceDiff = Math.abs(
    target.price - candidate.price,
  );

  if (priceDiff < 50_000) {
    structuredScore += 20;
  } else if (priceDiff < 150_000) {
    structuredScore += 12;
  } else if (priceDiff < 300_000) {
    structuredScore += 5;
  }

  // Property type — max 15 points
  if (
    target.propertyType ===
    candidate.propertyType
  ) {
    structuredScore += 15;
  }

  // City — max 15 points
  if (
    target.city &&
    candidate.city &&
    target.city.toLowerCase() ===
      candidate.city.toLowerCase()
  ) {
    structuredScore += 15;
  }

  // Square footage — max 10 points
  const sqftDiff = Math.abs(
    target.sqft - candidate.sqft,
  );

  if (sqftDiff < 300) {
    structuredScore += 10;
  } else if (sqftDiff < 700) {
    structuredScore += 5;
  }

  // Semantic similarity — max 40 points
  const similarity = cosineSimilarity(
    targetEmbedding,
    candidateEmbedding,
  );

  const normalizedSimilarity = Math.max(
    0,
    Math.min(1, similarity),
  );

  const semanticScore =
    normalizedSimilarity * 40;

  return {
    structuredScore:
      Math.round(structuredScore * 100) /
      100,

    semanticScore:
      Math.round(semanticScore * 100) /
      100,

    totalScore:
      Math.round(
        (
          structuredScore +
          semanticScore
        ) * 100,
      ) / 100,
  };
}

import { pool } from "../db/mysql";

import {
  getStoredListingEmbeddings,
} from "../db/listingEmbeddings";

export interface RankedRecommendation
  extends RecommendationListing {
  searchableText: string;
  structuredScore: number;
  semanticScore: number;
  totalScore: number;
}

interface RawListing {
  listingId: string;
  price: number;
  city: string;
  propertyType: number;
  sqft: number;
}

async function getActiveRecommendationListings(): Promise<
  RawListing[]
> {
  const sql = `
    SELECT
      L_ListingID AS listingId,
      L_SystemPrice AS price,
      L_City AS city,
      L_Keyword2 AS propertyType,
      LM_Int2_3 AS sqft
    FROM rets_property
    WHERE L_Status = 'Active'
      AND L_SystemPrice IS NOT NULL
      AND L_City IS NOT NULL
      AND L_Keyword2 IS NOT NULL
      AND LM_Int2_3 IS NOT NULL
      AND LM_Int2_3 > 0
  `;

  const [rows] =
    await pool.query<any[]>(sql);

  return rows.map((row) => ({
    listingId: String(row.listingId),
    price: Number(row.price),
    city: String(row.city ?? ""),
    propertyType: Number(
      row.propertyType,
    ),
    sqft: Number(row.sqft),
  }));
}

export async function recommendSimilarListings(
  targetListingId: string,
  limit = 5,
): Promise<RankedRecommendation[]> {
  const listings =
    await getActiveRecommendationListings();

  const embeddings =
    await getStoredListingEmbeddings();

  const embeddingMap = new Map(
    embeddings.map((item) => [
      String(item.listingId),
      item,
    ]),
  );

  const target = listings.find(
    (listing) =>
      listing.listingId ===
      String(targetListingId),
  );

  if (!target) {
    throw new Error(
      `Target listing ${targetListingId} was not found among active listings.`,
    );
  }

  const targetStoredEmbedding =
    embeddingMap.get(
      String(targetListingId),
    );

  if (!targetStoredEmbedding) {
    throw new Error(
      `No stored embedding found for listing ${targetListingId}.`,
    );
  }

  const recommendations: RankedRecommendation[] =
    [];

  for (const candidate of listings) {
    // Never recommend the target itself
    if (
      candidate.listingId ===
      String(targetListingId)
    ) {
      continue;
    }

    const candidateStoredEmbedding =
      embeddingMap.get(
        candidate.listingId,
      );

    // Hybrid scoring requires a stored embedding
    if (!candidateStoredEmbedding) {
      continue;
    }

    const scores =
      calculateRecommendationScore(
        target,
        candidate,
        targetStoredEmbedding.embedding,
        candidateStoredEmbedding.embedding,
      );

    recommendations.push({
      ...candidate,

      searchableText:
        candidateStoredEmbedding.searchableText,

      structuredScore:
        scores.structuredScore,

      semanticScore:
        scores.semanticScore,

      totalScore:
        scores.totalScore,
    });
  }

  recommendations.sort(
    (a, b) =>
      b.totalScore - a.totalScore,
  );

  return recommendations.slice(
    0,
    limit,
  );
}