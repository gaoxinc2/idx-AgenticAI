import { handlePropertyConversation } from "./skills/conversationalPropertySearch";
import { pool } from "./db/mysql";
import { handleMarketStatisticsQuestion } from "./skills/marketStatisticsSkill";

function isMarketStatisticsQuestion(
  message: string,
): boolean {
  const normalized = message.toLowerCase();

  const marketKeywords = [
    "market summary",
    "market trend",
    "median price",
    "average price",
    "price per square foot",
    "price per sqft",
    "per sq ft",
    "per square foot",
    "days on market",
    "list-to-close",
    "list to close",
    "inventory",
    "active listings",
    "buyer's market",
    "buyers market",
    "seller's market",
    "sellers market",
    "month over month",
    "year over year",
    "going up",
    "going down",
  ];

  return marketKeywords.some((keyword) =>
    normalized.includes(keyword),
  );
}

async function main(): Promise<void> {
  const userId = process.argv[2];
  const message = process.argv.slice(3).join(" ");

  if (!userId || !message) {
    console.error(
      'Usage: npx ts-node src/whatsappPropertySearch.ts "<userId>" "<message>"',
    );
    process.exitCode = 1;
    return;
  }

  try {
    let response: string;

    // Week 5: Route market-statistics questions
    // to the market statistics skill.
    if (isMarketStatisticsQuestion(message)) {
      response = await handleMarketStatisticsQuestion(
        message,
      );
    } else {
      // Week 4: Keep the existing conversational
      // property-search flow unchanged.
      response = await handlePropertyConversation(
        userId,
        message,
      );
    }

    console.log(response);
  } catch (error) {
    console.error(
      "Property or market request failed:",
      error,
    );
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

main();