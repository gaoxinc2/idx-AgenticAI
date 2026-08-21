import { retrieveRelevantChunks } from "./ragRetriever";
const query =
  "What does XYZ_UNKNOWN_999 mean?";

const results = retrieveRelevantChunks(
  query,
  undefined,
  3
);

console.log(`Query: ${query}`);

results.forEach((result, index) => {
  console.log(`\n${index + 1}. ${result.title}`);
  console.log(
    `Similarity: ${result.similarity.toFixed(4)}`
  );
  console.log(`Source: ${result.source}`);
  console.log(result.content);
});