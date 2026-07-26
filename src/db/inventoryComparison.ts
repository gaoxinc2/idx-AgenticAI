import { query } from "./mysql";

export interface InventoryComparison {
  city: string;
  activeListings: number;
  soldLast30Days: number;
  soldLast90Days: number;
  monthlySalesPace: number;
  monthsOfInventory: number | null;
  marketCondition: string;
}

interface CountRow {
  count: number;
}

function describeMarket(
  monthsOfInventory: number | null,
): string {
  if (monthsOfInventory === null) {
    return "Insufficient sales data";
  }

  if (monthsOfInventory < 4) {
    return "Seller's market";
  }

  if (monthsOfInventory <= 6) {
    return "Balanced market";
  }

  return "Buyer's market";
}

export async function getInventoryComparison(
  city: string,
): Promise<InventoryComparison> {
  const activeListingsSql = `
    SELECT COUNT(*) AS count
    FROM rets_property
    WHERE L_Status = 'Active'
      AND L_City = ?
  `;

  const soldLast30DaysSql = `
    SELECT COUNT(*) AS count
    FROM california_sold
    WHERE City = ?
      AND PropertyType = 'Residential'
      AND CloseDate >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
  `;

  const soldLast90DaysSql = `
    SELECT COUNT(*) AS count
    FROM california_sold
    WHERE City = ?
      AND PropertyType = 'Residential'
      AND CloseDate >= DATE_SUB(CURDATE(), INTERVAL 90 DAY)
  `;

  const [activeRows, sold30Rows, sold90Rows] =
    await Promise.all([
      query<CountRow>(activeListingsSql, [city]),
      query<CountRow>(soldLast30DaysSql, [city]),
      query<CountRow>(soldLast90DaysSql, [city]),
    ]);

  const activeListings = Number(activeRows[0]?.count ?? 0);
  const soldLast30Days = Number(sold30Rows[0]?.count ?? 0);
  const soldLast90Days = Number(sold90Rows[0]?.count ?? 0);

  const monthlySalesPace = Number(
    (soldLast90Days / 3).toFixed(1),
  );

  const monthsOfInventory =
    monthlySalesPace > 0
      ? Number(
          (activeListings / monthlySalesPace).toFixed(1),
        )
      : null;

  return {
    city,
    activeListings,
    soldLast30Days,
    soldLast90Days,
    monthlySalesPace,
    monthsOfInventory,
    marketCondition: describeMarket(monthsOfInventory),
  };
}