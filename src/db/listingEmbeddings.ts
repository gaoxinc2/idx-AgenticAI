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

export interface StoredListingEmbedding {
  listingId: string;
  searchableText: string;
  embedding: number[];
}

export async function getStoredListingEmbeddings():
Promise<StoredListingEmbedding[]> {
  const [rows] = await pool.query(
    `
    SELECT
      listing_id,
      searchable_text,
      embedding
    FROM listing_embeddings
    `,
  );

  return (rows as any[]).map((row) => ({
    listingId: row.listing_id,
    searchableText: row.searchable_text,
    embedding:
      typeof row.embedding === "string"
        ? JSON.parse(row.embedding)
        : row.embedding,
  }));
}

export async function getListingEmbedding(
  listingId: string,
): Promise<number[] | null> {
  const [rows] = await pool.query(
    `
    SELECT embedding
    FROM listing_embeddings
    WHERE listing_id = ?
    LIMIT 1
    `,
    [listingId],
  );

  const results = rows as any[];

  if (results.length === 0) {
    return null;
  }

  const embedding = results[0].embedding;

  return typeof embedding === "string"
    ? JSON.parse(embedding)
    : embedding;
}

export async function getListingEmbeddings(
  listingIds: string[],
): Promise<Map<string, number[]>> {
  const result = new Map<string, number[]>();

  if (listingIds.length === 0) {
    return result;
  }

  const placeholders = listingIds
    .map(() => "?")
    .join(", ");

  const [rows] = await pool.query(
    `
    SELECT
      listing_id,
      embedding
    FROM listing_embeddings
    WHERE listing_id IN (${placeholders})
    `,
    listingIds,
  );

  for (const row of rows as any[]) {
    const embedding =
      typeof row.embedding === "string"
        ? JSON.parse(row.embedding)
        : row.embedding;

    result.set(
      String(row.listing_id),
      embedding,
    );
  }

  return result;
}