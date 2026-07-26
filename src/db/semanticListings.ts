import { pool } from "./mysql";

export interface SemanticListing {
  listingId: string;
  searchableText: string;
}

export async function getListingsForEmbedding(
  limit = 100,
): Promise<SemanticListing[]> {
  const [rows] = await pool.query(
    `
    SELECT
      L_ListingID,
      L_Type_,
      L_City,
      L_Keyword2,
      LM_Dec_3,
      LM_Int2_3,
      YearBuilt,
      L_SystemPrice,
      L_Remarks
    FROM rets_property
    WHERE L_Status = 'Active'
      AND L_Remarks IS NOT NULL
      AND TRIM(L_Remarks) <> ''
    LIMIT ?
    `,
    [limit],
  );

  return (rows as any[]).map((row) => ({
    listingId: row.L_ListingID,
    searchableText: [
      `${row.L_Type_} in ${row.L_City}.`,
      `${row.L_Keyword2} bedrooms.`,
      `${row.LM_Dec_3} bathrooms.`,
      `${row.LM_Int2_3} sqft.`,
      `Built in ${row.YearBuilt}.`,
      `Price $${Number(row.L_SystemPrice).toLocaleString()}.`,
      row.L_Remarks,
    ].join(" "),
  }));
}