import { pool } from "./mysql";

export async function saveListingEmbedding(
  listingId: string,
  searchableText: string,
  embedding: number[],
  model: string,
): Promise<void> {
  await pool.query(
    `
    INSERT INTO listing_embeddings
    (
      listing_id,
      searchable_text,
      embedding,
      embedding_model
    )
    VALUES (?, ?, ?, ?)

    ON DUPLICATE KEY UPDATE
      searchable_text = VALUES(searchable_text),
      embedding = VALUES(embedding),
      embedding_model = VALUES(embedding_model),
      updated_at = CURRENT_TIMESTAMP
    `,
    [
      listingId,
      searchableText,
      JSON.stringify(embedding),
      model,
    ],
  );
}