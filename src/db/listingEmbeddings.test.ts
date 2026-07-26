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