import { loadKnowledgeDocuments } from "./knowledgeDocuments";

const documents = loadKnowledgeDocuments();

console.log(`Loaded ${documents.length} knowledge documents`);

for (const document of documents) {
  console.log(`\n${document.title}`);
  console.log(`Source: ${document.source}`);
  console.log(`Characters: ${document.content.length}`);
}