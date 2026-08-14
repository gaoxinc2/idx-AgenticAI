import { cosineSimilarity } from "./cosineSimilarity";

const vectorA = [1, 0, 0];
const vectorB = [1, 0, 0];
const vectorC = [0, 1, 0];

console.log(
  "A vs B:",
  cosineSimilarity(vectorA, vectorB),
);

console.log(
  "A vs C:",
  cosineSimilarity(vectorA, vectorC),
);