import "dotenv/config";
import OpenAI from "openai";

const apiKey = process.env.OPENAI_API_KEY;

if (!apiKey) {
  throw new Error(
    "OPENAI_API_KEY is missing. Add it to your .env file.",
  );
}

const openai = new OpenAI({
  apiKey,
});

const EMBEDDING_MODEL = "text-embedding-3-small";

export async function createEmbedding(
  text: string,
): Promise<number[]> {
  const cleanedText = text.trim();

  if (!cleanedText) {
    throw new Error("Cannot create an embedding for empty text.");
  }

  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: cleanedText,
    encoding_format: "float",
  });

  const embedding = response.data[0]?.embedding;

  if (!embedding) {
    throw new Error("OpenAI did not return an embedding.");
  }

  return embedding;
}

export function getEmbeddingModel(): string {
  return EMBEDDING_MODEL;
}