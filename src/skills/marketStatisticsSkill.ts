import {
  getCityMarketSummary,
  type CityMarketSummary,
} from "../db/marketSummary";

import {
  getMonthlyMarketTrend,
  type MonthlyMarketTrend,
} from "../db/marketTrends";

import {
  getInventoryComparison,
  type InventoryComparison,
} from "../db/inventoryComparison";

type MarketQuestionType =
  | "summary"
  | "average-price"
  | "median-price"
  | "price-per-sqft"
  | "days-on-market"
  | "list-to-close"
  | "trend"
  | "inventory";

export interface ParsedMarketQuestion {
  city: string | null;
  type: MarketQuestionType;
  months: number;
}

const supportedCities = [
  "Irvine",
  "Pasadena",
  "Los Angeles",
  "San Diego",
  "Anaheim",
  "Newport Beach",
  "Santa Monica",
  "Riverside",
];

function extractCity(message: string): string | null {
  const normalized = message.toLowerCase();

  const matchingCity = supportedCities.find((city) =>
    normalized.includes(city.toLowerCase()),
  );

  return matchingCity ?? null;
}

function extractMonths(message: string): number {
  const match = message.match(
    /(?:last|past|over)\s+(\d+)\s+months?/i,
  );

  if (!match) {
    return 12;
  }

  return Number(match[1]);
}

function detectQuestionType(
  message: string,
): MarketQuestionType {
  const normalized = message.toLowerCase();

  if (
    normalized.includes("inventory") ||
    normalized.includes("active listings") ||
    normalized.includes("buyer's market") ||
    normalized.includes("buyers market") ||
    normalized.includes("seller's market") ||
    normalized.includes("sellers market")
  ) {
    return "inventory";
  }

  if (
    normalized.includes("trend") ||
    normalized.includes("over time") ||
    normalized.includes("month over month") ||
    normalized.includes("year over year") ||
    normalized.includes("going up") ||
    normalized.includes("going down")
  ) {
    return "trend";
  }

  if (
    normalized.includes("price per square foot") ||
    normalized.includes("price per sqft") ||
    normalized.includes("per sq ft") ||
    normalized.includes("per square foot")
  ) {
    return "price-per-sqft";
  }

  if (
    normalized.includes("median") &&
    normalized.includes("price")
  ) {
    return "median-price";
  }

  if (
    normalized.includes("average") &&
    normalized.includes("price")
  ) {
    return "average-price";
  }

  if (
    normalized.includes("days on market") ||
    normalized.includes("dom") ||
    normalized.includes("how long")
  ) {
    return "days-on-market";
  }

  if (
    normalized.includes("list-to-close") ||
    normalized.includes("list to close") ||
    normalized.includes("asking price") ||
    normalized.includes("negotiation")
  ) {
    return "list-to-close";
  }

  return "summary";
}

export function parseMarketQuestion(
  message: string,
): ParsedMarketQuestion {
  return {
    city: extractCity(message),
    type: detectQuestionType(message),
    months: extractMonths(message),
  };
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPercent(value: number | null): string {
  if (value === null) {
    return "N/A";
  }

  const sign = value > 0 ? "+" : "";

  return `${sign}${value.toFixed(1)}%`;
}

function formatSummary(
  summary: CityMarketSummary,
  months: number,
): string {
  return [
    `${summary.city} Market Summary`,
    `Period: Last ${months} months`,
    "",
    `Sold properties: ${summary.soldCount}`,
    `Average close price: ${formatCurrency(
      summary.averageClosePrice,
    )}`,
    `Median close price: ${formatCurrency(
      summary.medianClosePrice,
    )}`,
    `Average price per sq ft: ${formatCurrency(
      summary.averagePricePerSqft,
    )}`,
    `Average days on market: ${summary.averageDaysOnMarket}`,
    `Average list-to-close ratio: ${summary.averageListToCloseRatio}%`,
  ].join("\n");
}

function formatTrend(
  city: string,
  trends: MonthlyMarketTrend[],
): string {
  if (trends.length === 0) {
    return `I could not find recent market trend data for ${city}.`;
  }

  const recentTrends = trends.slice(-12);

  const lines = recentTrends.map((trend) =>
    [
      trend.month,
      `${formatCurrency(trend.averageClosePrice)} average`,
      `${trend.sales} sales`,
      `${trend.averageDaysOnMarket} DOM`,
      `${formatPercent(
        trend.monthOverMonthPriceChange,
      )} MoM`,
      `${formatPercent(
        trend.yearOverYearPriceChange,
      )} YoY`,
    ].join(" | "),
  );

  return [
    `${city} Monthly Market Trend`,
    "",
    ...lines,
  ].join("\n");
}

function formatInventory(
  inventory: InventoryComparison,
): string {
  return [
    `${inventory.city} Inventory Comparison`,
    "",
    `Active listings: ${inventory.activeListings}`,
    `Sales in last 30 days: ${inventory.soldLast30Days}`,
    `Sales in last 90 days: ${inventory.soldLast90Days}`,
    `Estimated monthly sales pace: ${inventory.monthlySalesPace}`,
    `Months of inventory: ${
      inventory.monthsOfInventory ?? "N/A"
    }`,
    `Market indicator: ${inventory.marketCondition}`,
  ].join("\n");
}

export async function handleMarketStatisticsQuestion(
  message: string,
): Promise<string> {
  const parsed = parseMarketQuestion(message);

  if (!parsed.city) {
    return [
      "Which California city would you like to analyze?",
      "",
      'Example: "What is the median price in Irvine?"',
    ].join("\n");
  }

  if (parsed.type === "inventory") {
    const inventory = await getInventoryComparison(
      parsed.city,
    );

    return formatInventory(inventory);
  }

  if (parsed.type === "trend") {
    const trendMonths = Math.max(parsed.months, 24);

    const trends = await getMonthlyMarketTrend(
      parsed.city,
      trendMonths,
    );

    return formatTrend(parsed.city, trends);
  }

  const summary = await getCityMarketSummary(
    parsed.city,
    parsed.months,
  );

  if (!summary) {
    return `I could not find recent residential sales data for ${parsed.city}.`;
  }

  switch (parsed.type) {
    case "average-price":
      return [
        `The average close price in ${parsed.city} over the last ${parsed.months} months was ${formatCurrency(
          summary.averageClosePrice,
        )}.`,
        `This is based on ${summary.soldCount} residential sales.`,
      ].join("\n");

    case "median-price":
      return [
        `The median close price in ${parsed.city} over the last ${parsed.months} months was ${formatCurrency(
          summary.medianClosePrice,
        )}.`,
        `This is based on ${summary.soldCount} residential sales.`,
      ].join("\n");

    case "price-per-sqft":
      return [
        `The average price per square foot in ${parsed.city} over the last ${parsed.months} months was ${formatCurrency(
          summary.averagePricePerSqft,
        )}.`,
        "Only properties with valid living-area values were included.",
      ].join("\n");

    case "days-on-market":
      return `Residential properties in ${parsed.city} spent an average of ${summary.averageDaysOnMarket} days on market over the last ${parsed.months} months.`;

    case "list-to-close":
      return [
        `The average list-to-close ratio in ${parsed.city} was ${summary.averageListToCloseRatio}% over the last ${parsed.months} months.`,
        summary.averageListToCloseRatio >= 100
          ? "On average, properties closed at or above their latest list price."
          : "On average, properties closed below their latest list price.",
      ].join("\n");

    default:
      return formatSummary(summary, parsed.months);
  }
}