import {
  createEmbedding,
  getEmbeddingModel,
} from "./embeddings";

async function runTest(): Promise<void> {
  try {
    const testText =
      "Modern three-bedroom home in Irvine with a pool and mountain view.";

    console.log("Creating test embedding...");
    console.log("Model:", getEmbeddingModel());

    const embedding = await createEmbedding(testText);

    console.log("Embedding created successfully.");
    console.log("Vector length:", embedding.length);
    console.log("First five values:", embedding.slice(0, 5));
  } catch (error) {
    console.error("Embedding test failed:", error);
    process.exitCode = 1;
  }
}

runTest();