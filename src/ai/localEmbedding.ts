import crypto from "crypto";

const VECTOR_SIZE = 64;

/**
 * Temporary deterministic local embedding.
 *
 * Used while OpenAI embeddings are unavailable.
 * Produces the same vector every time for the same text.
 *
 * This is for development/testing of the recommendation pipeline,
 * not a replacement for text-embedding-3-small in production.
 */
export function createLocalEmbedding(
  text: string,
): number[] {
  const vector = new Array(VECTOR_SIZE).fill(0);

  const tokens = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);

  for (const token of tokens) {
    const hash = crypto
      .createHash("sha256")
      .update(token)
      .digest();

    const index =
      hash.readUInt32BE(0) % VECTOR_SIZE;

    const sign =
      hash.readUInt8(4) % 2 === 0 ? 1 : -1;

    vector[index] += sign;
  }

  const magnitude = Math.sqrt(
    vector.reduce(
      (sum, value) => sum + value * value,
      0,
    ),
  );

  if (magnitude === 0) {
    return vector;
  }

  return vector.map(
    (value) => value / magnitude,
  );
}