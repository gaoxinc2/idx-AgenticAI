import { classifyIntent } from "./intentClassifier";

const queries = [
  "Find me 3 bedroom homes in Irvine under $1.5M",
  "What is the median price in Irvine?",
  "Show me homes similar to listing 1118422731",
  "What does DOM mean?",
  "Find me affordable homes in Pasadena and tell me whether prices are rising",
  "Draft an email summarizing these listings",
];

for (const query of queries) {
  console.log("\nQuery:", query);
  console.log(classifyIntent(query));
}