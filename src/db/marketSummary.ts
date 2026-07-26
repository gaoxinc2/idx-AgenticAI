import { query } from "./mysql";

export interface CityMarketSummary {
  city: string;
  soldCount: number;
  averageClosePrice: number;
  medianClosePrice: number;
  averagePricePerSqft: number;
  averageDaysOnMarket: number;
  averageListToCloseRatio: number;
}

interface SummaryRow {
  city: string;
  soldCount: number;
  averageClosePrice: number;
  averagePricePerSqft: number;
  averageDaysOnMarket: number;
  averageListToCloseRatio: number;
}

interface PriceRow {
  closePrice: number;
}

/**
 * Calculates the median of a numeric array.
 */
function calculateMedian(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1] + sorted[middle]) / 2;
  }

  return sorted[middle];
}

/**
 * Returns a residential market summary for one California city.
 */
export async function getCityMarketSummary(
  city: string,
  months = 12,
): Promise<CityMarketSummary | null> {
  const summarySql = `
    SELECT
      City AS city,
      COUNT(*) AS soldCount,

      ROUND(AVG(ClosePrice), 0)
        AS averageClosePrice,

      ROUND(
        AVG(
          CASE
            WHEN LivingArea > 0
            THEN ClosePrice / LivingArea
            ELSE NULL
          END
        ),
        0
      ) AS averagePricePerSqft,

      ROUND(AVG(DaysOnMarket), 1)
        AS averageDaysOnMarket,

      ROUND(
        AVG(
          CASE
            WHEN ListPrice > 0
            THEN ClosePrice / ListPrice
            ELSE NULL
          END
        ) * 100,
        1
      ) AS averageListToCloseRatio

    FROM california_sold

    WHERE City = ?
      AND PropertyType = 'Residential'
      AND CloseDate >= DATE_SUB(CURDATE(), INTERVAL ? MONTH)
      AND ClosePrice > 0

    GROUP BY City
  `;

  const summaryRows = await query<SummaryRow>(summarySql, [
  city,
  months,
]);

if (summaryRows.length === 0) {
  return null;
}

const pricesSql = `
  SELECT
    ClosePrice AS closePrice
  FROM california_sold
  WHERE City = ?
    AND PropertyType = 'Residential'
    AND CloseDate >= DATE_SUB(CURDATE(), INTERVAL ? MONTH)
    AND ClosePrice > 0
  ORDER BY ClosePrice ASC
`;

const priceRows = await query<PriceRow>(pricesSql, [
  city,
  months,
]);

const row = summaryRows[0];

return {
  city: row.city,
  soldCount: Number(row.soldCount),
  averageClosePrice: Number(row.averageClosePrice),

  medianClosePrice: Math.round(
    calculateMedian(
      priceRows.map((price) => Number(price.closePrice)),
    ),
  ),

  averagePricePerSqft: Number(row.averagePricePerSqft),
  averageDaysOnMarket: Number(row.averageDaysOnMarket),
  averageListToCloseRatio: Number(
    row.averageListToCloseRatio,
  ),
};
}