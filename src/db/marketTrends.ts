import { query } from "./mysql";

export interface MonthlyMarketTrend {
  month: string;
  sales: number;
  averageClosePrice: number;
  medianClosePrice: number;
  averagePricePerSqft: number;
  averageDaysOnMarket: number;
  listToCloseRatio: number;
  monthOverMonthPriceChange: number | null;
  yearOverYearPriceChange: number | null;
}

interface MonthlySummaryRow {
  month: string;
  sales: number;
  averageClosePrice: number;
  averagePricePerSqft: number;
  averageDaysOnMarket: number;
  listToCloseRatio: number;
}

interface MonthlyPriceRow {
  month: string;
  closePrice: number;
}

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

function calculatePercentChange(
  current: number,
  previous: number | undefined,
): number | null {
  if (previous === undefined || previous === 0) {
    return null;
  }

  return Number(
    (((current - previous) / previous) * 100).toFixed(1),
  );
}

export async function getMonthlyMarketTrend(
  city: string,
  months = 24,
): Promise<MonthlyMarketTrend[]> {
  const monthlySummarySql = `
    SELECT
      DATE_FORMAT(CloseDate, '%Y-%m') AS month,
      COUNT(*) AS sales,

      ROUND(AVG(ClosePrice), 0)
        AS averageClosePrice,

      ROUND(
        AVG(
          CASE
            WHEN LivingArea > 0
              AND ClosePrice / LivingArea BETWEEN 50 AND 5000
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
      ) AS listToCloseRatio

    FROM california_sold

    WHERE City = ?
      AND PropertyType = 'Residential'
      AND CloseDate >= DATE_SUB(CURDATE(), INTERVAL ? MONTH)
      AND ClosePrice > 0

    GROUP BY DATE_FORMAT(CloseDate, '%Y-%m')
    ORDER BY month ASC
  `;

  const monthlyRows = await query<MonthlySummaryRow>(
    monthlySummarySql,
    [city, months],
  );

  const monthlyPricesSql = `
    SELECT
      DATE_FORMAT(CloseDate, '%Y-%m') AS month,
      ClosePrice AS closePrice

    FROM california_sold

    WHERE City = ?
      AND PropertyType = 'Residential'
      AND CloseDate >= DATE_SUB(CURDATE(), INTERVAL ? MONTH)
      AND ClosePrice > 0

    ORDER BY CloseDate ASC, ClosePrice ASC
  `;

  const priceRows = await query<MonthlyPriceRow>(
    monthlyPricesSql,
    [city, months],
  );

  const pricesByMonth = new Map<string, number[]>();

  for (const row of priceRows) {
    const prices = pricesByMonth.get(row.month) ?? [];

    prices.push(Number(row.closePrice));
    pricesByMonth.set(row.month, prices);
  }

  const baseTrends = monthlyRows.map((row) => ({
    month: row.month,
    sales: Number(row.sales),
    averageClosePrice: Number(row.averageClosePrice),

    medianClosePrice: Math.round(
      calculateMedian(pricesByMonth.get(row.month) ?? []),
    ),

    averagePricePerSqft: Number(row.averagePricePerSqft),
    averageDaysOnMarket: Number(row.averageDaysOnMarket),
    listToCloseRatio: Number(row.listToCloseRatio),
  }));

  return baseTrends.map((trend, index) => {
    const previousMonth = baseTrends[index - 1];

    const currentDate = new Date(`${trend.month}-01T00:00:00`);

    const previousYearMonth = `${currentDate.getFullYear() - 1}-${String(
      currentDate.getMonth() + 1,
    ).padStart(2, "0")}`;

    const previousYear = baseTrends.find(
      (candidate) => candidate.month === previousYearMonth,
    );

    return {
      ...trend,

      monthOverMonthPriceChange: calculatePercentChange(
        trend.averageClosePrice,
        previousMonth?.averageClosePrice,
      ),

      yearOverYearPriceChange: calculatePercentChange(
        trend.averageClosePrice,
        previousYear?.averageClosePrice,
      ),
    };
  });
}