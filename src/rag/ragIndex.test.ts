import { createKnowledgeIndex } from "./ragIndex";

const index = createKnowledgeIndex();

console.log(`Indexed ${index.length} knowledge chunks`);

for (const item of index) {
  console.log("\n--------------------");
  console.log(`ID: ${item.id}`);
  console.log(`Source: ${item.source}`);
  console.log(`Embedding length: ${item.embedding.length}`);
  console.log(item.content.slice(0, 120));
}