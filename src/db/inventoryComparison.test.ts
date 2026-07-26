import { getInventoryComparison } from "./inventoryComparison";

async function runTest(): Promise<void> {
  try {
    const result = await getInventoryComparison("Irvine");

    console.log("Irvine Inventory Comparison:");
    console.log(result);

    console.log("\nVerification:");
    console.log(`City: ${result.city}`);
    console.log(`Active listings: ${result.activeListings}`);
    console.log(`Sales in last 30 days: ${result.soldLast30Days}`);
    console.log(`Sales in last 90 days: ${result.soldLast90Days}`);
    console.log(
      `Monthly sales pace: ${result.monthlySalesPace}`,
    );
    console.log(
      `Months of inventory: ${
        result.monthsOfInventory ?? "N/A"
      }`,
    );
    console.log(`Market condition: ${result.marketCondition}`);
  } catch (error) {
    console.error("Inventory comparison test failed:", error);
    process.exit(1);
  }
}

runTest()
  .then(() => {
    console.log("\nTest completed.");
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });