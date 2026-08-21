import { retrieveRelevantChunks } from "./ragRetriever";

export function buildRagContext(
  query: string,
  topK = 4
): string {
  const chunks = retrieveRelevantChunks(
    query,
    undefined,
    topK
  );

  const usefulChunks = chunks.filter(
    (chunk) => chunk.similarity > 0
  );

  if (usefulChunks.length === 0) {
    return "";
  }

  return usefulChunks
    .map((chunk, index) => {
      return [
        `[Source ${index + 1}]`,
        `Title: ${chunk.title}`,
        `File: ${chunk.source}`,
        `Score: ${chunk.similarity.toFixed(4)}`,
        "",
        chunk.content,
      ].join("\n");
    })
    .join("\n\n");
}

export function buildRagPrompt(
  query: string
): string {
  const context = buildRagContext(query);

  if (!context) {
    return `
You are an IDX Exchange real estate knowledge assistant.

There is no relevant information in the indexed knowledge sources.

Question:
${query}

Answer exactly:
I don't have enough information in the indexed knowledge sources to answer that.
`.trim();
  }

  return `
You are an IDX Exchange real estate knowledge assistant.

Answer the user's question using only the supplied source context.

Rules:
- Do not use outside knowledge.
- Do not invent MLS field meanings.
- Do not invent legal rules.
- If the context does not support the answer, say:
  "I don't have enough information in the indexed knowledge sources to answer that."
- Keep the answer concise and factual.

SOURCE CONTEXT:

${context}

QUESTION:

${query}

ANSWER:
`.trim();
}
export function answerFromContext(
  query: string
): string {
  const chunks = retrieveRelevantChunks(
    query,
    undefined,
    4
  );

  const usefulChunks = chunks.filter(
    (chunk) => chunk.similarity > 0
  );

  if (usefulChunks.length === 0) {
    return "I don't have enough information in the indexed knowledge sources to answer that.";
  }

  const bestChunk = usefulChunks[0];

  return [
    `Source: ${bestChunk.title}`,
    "",
    bestChunk.content,
  ].join("\n");
}