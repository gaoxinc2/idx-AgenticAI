import {
  createLocalEmbedding,
} from "./localEmbedding";

function cosineSimilarity(
  a: number[],
  b: number[],
): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  return (
    dot /
    (Math.sqrt(normA) * Math.sqrt(normB))
  );
}

const textA =
  "Irvine property type 4 2000 sqft";

const textB =
  "Irvine property type 4 2100 sqft";

const textC =
  "Beverly Hills property type 2 5000 sqft";

const embeddingA =
  createLocalEmbedding(textA);

const embeddingB =
  createLocalEmbedding(textB);

const embeddingC =
  createLocalEmbedding(textC);

console.log(
  "Vector length:",
  embeddingA.length,
);

console.log(
  "A vs B:",
  cosineSimilarity(
    embeddingA,
    embeddingB,
  ).toFixed(4),
);

console.log(
  "A vs C:",
  cosineSimilarity(
    embeddingA,
    embeddingC,
  ).toFixed(4),
);