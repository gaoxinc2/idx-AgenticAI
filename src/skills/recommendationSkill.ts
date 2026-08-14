import {
  recommendSimilarListings,
} from "./recommendationEngine";

import {
  validateWithComps,
  CompValidation,
} from "../db/compValidation";

export interface ValidatedRecommendation {
  listingId: string;
  city: string;
  propertyType: number;
  price: number;
  sqft: number;

  structuredScore: number;
  semanticScore: number;
  totalScore: number;

  searchableText: string;

  compValidation: CompValidation;
}

export async function getRecommendations(
  listingId: string,
  limit = 5,
): Promise<ValidatedRecommendation[]> {
  const recommendations =
    await recommendSimilarListings(
      listingId,
      limit,
    );

  // Validate all recommendations against sold comps
  const validated = await Promise.all(
    recommendations.map(
      async (listing) => {
        const compValidation =
          await validateWithComps(
            listing.city,
            listing.sqft,
            listing.price,
          );

        return {
          ...listing,
          compValidation,
        };
      },
    ),
  );

  return validated;
}

function formatPrice(
  value: number | null,
): string {
  if (value === null) {
    return "N/A";
  }

  return `$${Math.round(
    value,
  ).toLocaleString()}`;
}

function getPriceAssessment(
  deltaPct: number | null,
): string {
  if (deltaPct === null) {
    return "Insufficient recent comps";
  }

  if (deltaPct <= -5) {
    return "Below recent comp estimate";
  }

  if (deltaPct >= 5) {
    return "Above recent comp estimate";
  }

  return "Near recent comp estimate";
}

export async function handleRecommendationQuestion(
  listingId: string,
): Promise<string> {
  const recommendations =
    await getRecommendations(
      listingId,
      5,
    );

  if (recommendations.length === 0) {
    return `I couldn't find similar active listings for ${listingId}.`;
  }

  const lines: string[] = [
    `Top ${recommendations.length} recommendations similar to listing ${listingId}:`,
    "",
  ];

  recommendations.forEach(
    (listing, index) => {
      const comp =
        listing.compValidation;

      lines.push(
        `${index + 1}. Listing ${listing.listingId}`,
      );

      lines.push(
        `${listing.city} | Property Type ${listing.propertyType}`,
      );

      lines.push(
        `${formatPrice(listing.price)} | ${listing.sqft.toLocaleString()} sqft`,
      );

      lines.push(
        `Similarity: ${listing.totalScore}/100`,
      );

      lines.push(
        `  Structured: ${listing.structuredScore}/60`,
      );

      lines.push(
        `  Semantic: ${listing.semanticScore}/40`,
      );

      lines.push(
        `Recent comp estimate: ${formatPrice(
          comp.compPrice,
        )}`,
      );

      if (
        comp.avgPricePerSqft !== null
      ) {
        lines.push(
          `Average sold $/sqft: $${comp.avgPricePerSqft.toLocaleString()}`,
        );
      }

      lines.push(
        `Comp sales used: ${comp.compCount}`,
      );

      if (comp.deltaPct !== null) {
        lines.push(
          `List vs comps: ${
            comp.deltaPct >= 0 ? "+" : ""
          }${comp.deltaPct}%`,
        );
      }

      lines.push(
        `Assessment: ${getPriceAssessment(
          comp.deltaPct,
        )}`,
      );

      lines.push("");
    },
  );

  return lines.join("\n");
}