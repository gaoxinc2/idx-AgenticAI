import { getMonthlyMarketTrend } from "./marketTrends";

async function runTest(): Promise<void> {
  try {
    const trends = await getMonthlyMarketTrend("Irvine", 24);

    console.log(`Found ${trends.length} monthly trend records.`);

    console.table(
      trends.map((trend) => ({
        month: trend.month,
        sales: trend.sales,
        averagePrice: trend.averageClosePrice,
        medianPrice: trend.medianClosePrice,
        pricePerSqft: trend.averagePricePerSqft,
        averageDOM: trend.averageDaysOnMarket,
        listToClose: trend.listToCloseRatio,
        monthOverMonth: trend.monthOverMonthPriceChange,
        yearOverYear: trend.yearOverYearPriceChange,
      })),
    );

    if (trends.length === 0) {
      console.log(
        "No trend data was found. Try increasing the number of months.",
      );
      return;
    }

    const latest = trends[trends.length - 1];

    console.log("\nLatest month verification:");
    console.log(`Month: ${latest.month}`);
    console.log(`Sales: ${latest.sales}`);
    console.log(
      `Average price: $${latest.averageClosePrice.toLocaleString(
        "en-US",
      )}`,
    );
    console.log(
      `Median price: $${latest.medianClosePrice.toLocaleString(
        "en-US",
      )}`,
    );
    console.log(
      `Average price per sqft: $${latest.averagePricePerSqft.toLocaleString(
        "en-US",
      )}`,
    );
    console.log(
      `Month-over-month change: ${
        latest.monthOverMonthPriceChange ?? "N/A"
      }%`,
    );
    console.log(
      `Year-over-year change: ${
        latest.yearOverYearPriceChange ?? "N/A"
      }%`,
    );
  } catch (error) {
    console.error("Market trend test failed:", error);
    process.exit(1);
  }
}

runTest();