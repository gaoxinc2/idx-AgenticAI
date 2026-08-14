// import {
//   calculateRecommendationScore,
// } from "./recommendationEngine";

// const target = {
//   listingId: "TARGET",
//   price: 1_000_000,
//   city: "Irvine",
//   propertyType: "Single Family Residence",
//   sqft: 2000,
// };

// const candidate = {
//   listingId: "CANDIDATE",
//   price: 1_040_000,
//   city: "Irvine",
//   propertyType: "Single Family Residence",
//   sqft: 2100,
// };

// const targetEmbedding = [1, 0, 0];

// const candidateEmbedding = [0.95, 0.05, 0];

// const score = calculateRecommendationScore(
//   target,
//   candidate,
//   targetEmbedding,
//   candidateEmbedding,
// );

// console.log(score);

import {
  recommendSimilarListings,
} from "./recommendationEngine";

async function runTest() {
  try {
    const targetListingId =
      process.argv[2];

    if (!targetListingId) {
      console.log(
        "Usage: npx ts-node src/skills/recommendationEngine.test.ts <listingId>",
      );

      process.exit(1);
    }

    console.log(
      `Finding recommendations for ${targetListingId}...\n`,
    );

    const results =
      await recommendSimilarListings(
        targetListingId,
        5,
      );

    if (results.length === 0) {
      console.log(
        "No recommendations found.",
      );

      return;
    }

    results.forEach((listing, index) => {
      console.log(
        `${index + 1}. ${listing.listingId}`,
      );

      console.log(
        `   ${listing.city} | ${listing.propertyType}`,
      );

      console.log(
        `   $${listing.price.toLocaleString()} | ${listing.sqft.toLocaleString()} sqft`,
      );

      console.log(
        `   Structured: ${listing.structuredScore}/60`,
      );

      console.log(
        `   Semantic: ${listing.semanticScore}/40`,
      );

      console.log(
        `   Total: ${listing.totalScore}/100`,
      );

      console.log("");
    });
  } catch (error) {
    console.error(
      "Recommendation test failed:",
      error,
    );
  } finally {
    process.exit();
  }
}

runTest();