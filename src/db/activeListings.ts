import { query } from "./mysql";
import { PropertyFilters } from "../skills/propertySearch";

export interface ListingRow {
  L_ListingID: string;
  L_DisplayId: string;
  L_Address: string;
  L_City: string;
  L_Zip: string;
  price: number;
  beds: number;
  baths: number | string;
  sqft: number;
  type: string;
  status: string;
}

export async function searchActiveListings(
  filters: PropertyFilters,
  page = 1,
  limit = 10
) {
  const offset = (page - 1) * limit;

  let sql = `
    SELECT
      L_ListingID,
      L_DisplayId,
      L_Address,
      L_City,
      L_Zip,
      L_SystemPrice AS price,
      L_Keyword2 AS beds,
      LM_Dec_3 AS baths,
      LM_Int2_3 AS sqft,
      L_Type_ AS type,
      L_Status AS status
    FROM rets_property
    WHERE L_Status = "Active"
  `;

  const params: any[] = [];

  if (filters.city) {
    sql += " AND L_City = ?";
    params.push(filters.city);
  }

  if (filters.maxPrice) {
    sql += " AND L_SystemPrice <= ?";
    params.push(filters.maxPrice);
  }

  if (filters.beds) {
    sql += " AND L_Keyword2 >= ?";
    params.push(filters.beds);
  }

  if (filters.baths) {
    sql += " AND LM_Dec_3 >= ?";
    params.push(filters.baths);
  }

  if (filters.sqft) {
    sql += " AND LM_Int2_3 >= ?";
    params.push(filters.sqft);
  }

  if (filters.type) {
    sql += " AND L_Type_ = ?";
    params.push(filters.type);
  }

  sql += " ORDER BY L_SystemPrice ASC LIMIT ? OFFSET ?";

  params.push(limit);
  params.push(offset);

  return query<ListingRow>(sql, params);
}