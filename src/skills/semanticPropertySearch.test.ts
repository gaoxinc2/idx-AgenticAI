import {
  saveListingEmbedding,
} from "../db/listingEmbeddings";

import {
  findSimilarListingsFromVector,
} from "./semanticPropertySearch";

async function runTest() {
  await saveListingEmbedding(
    "TEST_A",
    "Family home with backyard",
    [1, 0, 0],
    "test-model",
  );

  await saveListingEmbedding(
    "TEST_B",
    "Downtown condo",
    [0, 1, 0],
    "test-model",
  );

  await saveListingEmbedding(
    "TEST_C",
    "Family house with outdoor space",
    [0.9, 0.1, 0],
    "test-model",
  );

  const queryEmbedding = [1, 0, 0];

  const results =
    await findSimilarListingsFromVector(
      queryEmbedding,
      3,
    );

  console.log("Results:");

  results.forEach((result, index) => {
    console.log(
      `${index + 1}. ${result.listingId}`,
    );
    console.log(
      `Similarity: ${result.similarity.toFixed(4)}`,
    );
    console.log(result.searchableText);
    console.log();
  });
}

runTest();