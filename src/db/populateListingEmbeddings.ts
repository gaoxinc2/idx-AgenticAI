import { pool } from "./mysql";

import {
  createLocalEmbedding,
} from "../ai/localEmbedding";

interface ActiveListingRow {
  listingId: string;
  city: string;
  price: number;
  propertyType: number;
  sqft: number;
}

async function getActiveListings(
  limit = 1000,
): Promise<ActiveListingRow[]> {
  const sql = `
    SELECT
      L_ListingID AS listingId,
      L_City AS city,
      L_SystemPrice AS price,
      L_Keyword2 AS propertyType,
      LM_Int2_3 AS sqft
    FROM rets_property
    WHERE L_Status = 'Active'
      AND L_ListingID IS NOT NULL
      AND L_City IS NOT NULL
      AND L_SystemPrice IS NOT NULL
      AND LM_Int2_3 IS NOT NULL
      AND LM_Int2_3 > 0
    LIMIT ?
  `;

  const [rows] =
    await pool.query<any[]>(
      sql,
      [limit],
    );

  return rows.map((row) => ({
    listingId: String(row.listingId),
    city: String(row.city),
    price: Number(row.price),
    propertyType: Number(
      row.propertyType,
    ),
    sqft: Number(row.sqft),
  }));
}

function buildSearchableText(
  listing: ActiveListingRow,
): string {
  /*
   * Temporary searchable text.
   *
   * We are only using confirmed MLS columns
   * for now. Later we can add listing remarks,
   * amenities, views, pool, etc.
   */

  const roundedPrice =
    Math.round(
      listing.price / 100_000,
    ) * 100_000;

  const roundedSqft =
    Math.round(
      listing.sqft / 250,
    ) * 250;

  return [
    `city ${listing.city}`,
    `property type ${listing.propertyType}`,
    `approximately ${roundedSqft} square feet`,
    `approximately ${roundedPrice} dollars`,
  ].join(" ");
}

async function storeEmbedding(
  listing: ActiveListingRow,
): Promise<void> {
  const searchableText =
    buildSearchableText(listing);

  const embedding =
    createLocalEmbedding(
      searchableText,
    );

  const sql = `
    INSERT INTO listing_embeddings (
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
  `;

  await pool.query(sql, [
    listing.listingId,
    searchableText,
    JSON.stringify(embedding),
    "local-test-64",
  ]);
}

async function main() {
  try {
    const limit =
      Number(process.argv[2]) || 1000;

    console.log(
      `Loading up to ${limit} active listings...`,
    );

    const listings =
      await getActiveListings(limit);

    console.log(
      `Found ${listings.length} listings.`,
    );

    let completed = 0;

    for (const listing of listings) {
      await storeEmbedding(listing);

      completed++;

      if (
        completed % 100 === 0 ||
        completed === listings.length
      ) {
        console.log(
          `Stored ${completed}/${listings.length}`,
        );
      }
    }

    console.log(
      "\nFinished populating listing embeddings.",
    );
  } catch (error) {
    console.error(
      "Failed to populate embeddings:",
      error,
    );
  } finally {
    await pool.end();
  }
}

main();