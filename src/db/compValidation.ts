import { pool } from "./mysql";

export interface CompValidation {
  compPrice: number | null;
  listPrice: number;
  compCount: number;
  avgPricePerSqft: number | null;
  deltaPct: number | null;
}

export async function validateWithComps(
  city: string,
  sqft: number,
  listPrice: number,
): Promise<CompValidation> {
  if (
    !city ||
    !Number.isFinite(sqft) ||
    sqft <= 0 ||
    !Number.isFinite(listPrice) ||
    listPrice <= 0
  ) {
    return {
      compPrice: null,
      listPrice,
      compCount: 0,
      avgPricePerSqft: null,
      deltaPct: null,
    };
  }

  // Handbook requirement: ±20% of subject living area
  const minSqft = sqft * 0.8;
  const maxSqft = sqft * 1.2;

  const sql = `
    SELECT
      AVG(
        ClosePrice / NULLIF(LivingArea, 0)
      ) AS avg_ppsf,
      COUNT(*) AS comp_count
    FROM california_sold
    WHERE City = ?
      AND PropertyType = 'Residential'
      AND LivingArea BETWEEN ? AND ?
      AND CloseDate BETWEEN
          DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
          AND CURDATE()
      AND ClosePrice IS NOT NULL
      AND ClosePrice > 0
      AND LivingArea IS NOT NULL
      AND LivingArea > 0
  `;

  const [rows] = await pool.query<any[]>(
    sql,
    [city, minSqft, maxSqft],
  );

  const avgPpsf = Number(
    rows[0]?.avg_ppsf ?? 0,
  );

  const compCount = Number(
    rows[0]?.comp_count ?? 0,
  );

  if (
    !Number.isFinite(avgPpsf) ||
    avgPpsf <= 0 ||
    compCount === 0
  ) {
    return {
      compPrice: null,
      listPrice,
      compCount: 0,
      avgPricePerSqft: null,
      deltaPct: null,
    };
  }

  // Estimated value based on recent sold $/sqft
  const compPrice = avgPpsf * sqft;

  // Positive = listing above comp estimate
  // Negative = listing below comp estimate
  const deltaPct =
    ((listPrice - compPrice) /
      compPrice) *
    100;

  return {
    compPrice: Math.round(compPrice),

    listPrice: Math.round(listPrice),

    compCount,

    avgPricePerSqft:
      Math.round(avgPpsf * 100) / 100,

    deltaPct:
      Math.round(deltaPct * 10) / 10,
  };
}