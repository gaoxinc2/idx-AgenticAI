import { saveListingEmbedding } from "./listingEmbeddings";

async function runTest() {
  await saveListingEmbedding(
    "TEST123",
    "Test listing for semantic search.",
    [0.1, 0.2, 0.3],
    "text-embedding-3-small",
  );

  console.log("Embedding saved successfully.");
}

runTest();

import {
  getListingEmbedding,
} from "./listingEmbeddings";

async function run() {
  const listingId = process.argv[2];

  if (!listingId) {
    console.log(
      "Provide a listing ID."
    );
    return;
  }

  const embedding =
    await getListingEmbedding(listingId);

  if (!embedding) {
    console.log(
      "No embedding found."
    );
    return;
  }

  console.log(
    "Embedding dimensions:",
    embedding.length
  );

  console.log(
    "First 5 values:",
    embedding.slice(0, 5)
  );
}

run()
  .catch(console.error)
  .finally(() => process.exit());