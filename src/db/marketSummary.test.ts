import { getCityMarketSummary } from "./marketSummary";

async function runTest(): Promise<void> {
  try {
    const summary = await getCityMarketSummary("Irvine", 12);

    console.log("Irvine Market Summary:");
    console.log(summary);

    if (!summary) {
      console.log("No matching market data was found.");
      return;
    }

    console.log("\nVerification:");
    console.log(`City: ${summary.city}`);
    console.log(`Sold count: ${summary.soldCount}`);
    console.log(
      `Average close price: $${summary.averageClosePrice.toLocaleString(
        "en-US",
      )}`,
    );
    console.log(
      `Median close price: $${summary.medianClosePrice.toLocaleString(
        "en-US",
      )}`,
    );
    console.log(
      `Average price per sqft: $${summary.averagePricePerSqft.toLocaleString(
        "en-US",
      )}`,
    );
    console.log(
      `Average days on market: ${summary.averageDaysOnMarket}`,
    );
    console.log(
      `List-to-close ratio: ${summary.averageListToCloseRatio}%`,
    );
  } catch (error) {
    console.error("Market summary test failed:", error);
    process.exit(1);
  }
}

runTest();