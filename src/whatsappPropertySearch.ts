// import { handlePropertyConversation } from "./skills/conversationalPropertySearch";
// import { pool } from "./db/mysql";
// import { handleMarketStatisticsQuestion } from "./skills/marketStatisticsSkill";
// import {
//   handleRecommendationQuestion,
// } from "./skills/recommendationSkill";

// function isMarketStatisticsQuestion(
//   message: string,
// ): boolean {
//   const normalized = message.toLowerCase();

//   const marketKeywords = [
//     "market summary",
//     "market trend",
//     "median price",
//     "average price",
//     "price per square foot",
//     "price per sqft",
//     "per sq ft",
//     "per square foot",
//     "days on market",
//     "list-to-close",
//     "list to close",
//     "inventory",
//     "active listings",
//     "buyer's market",
//     "buyers market",
//     "seller's market",
//     "sellers market",
//     "month over month",
//     "year over year",
//     "going up",
//     "going down",
//   ];

//   return marketKeywords.some((keyword) =>
//     normalized.includes(keyword),
//   );
// }

// // Week 7: Detect recommendation requests
// // and extract the target listing ID.
// function extractRecommendationListingId(
//   message: string,
// ): string | null {
//   const patterns = [
//     /similar to listing\s+([A-Za-z0-9_-]+)/i,
//     /recommend.*listing\s+([A-Za-z0-9_-]+)/i,
//     /like listing\s+([A-Za-z0-9_-]+)/i,
//   ];

//   for (const pattern of patterns) {
//     const match = message.match(pattern);

//     if (match) {
//       return match[1];
//     }
//   }

//   return null;
// }

// async function main(): Promise<void> {
//   const userId = process.argv[2];
//   const message = process.argv.slice(3).join(" ");

//   if (!userId || !message) {
//     console.error(
//       'Usage: npx ts-node src/whatsappPropertySearch.ts "<userId>" "<message>"',
//     );
//     process.exitCode = 1;
//     return;
//   }

//   try {
//     let response: string;

//     // Week 7: Route recommendation requests FIRST.
//     const recommendationListingId =
//       extractRecommendationListingId(message);

//     if (recommendationListingId) {
//       response =
//         await handleRecommendationQuestion(
//           recommendationListingId,
//         );
//     }

//     // Week 5: Route market-statistics questions.
//     else if (
//       isMarketStatisticsQuestion(message)
//     ) {
//       response =
//         await handleMarketStatisticsQuestion(
//           message,
//         );
//     }

//     // Week 4: Existing conversational
//     // property-search flow.
//     else {
//       response =
//         await handlePropertyConversation(
//           userId,
//           message,
//         );
//     }

//     console.log(response);
//   } catch (error) {
//     console.error(
//       "Property, market, or recommendation request failed:",
//       error,
//     );

//     process.exitCode = 1;
//   } finally {
//     await pool.end();
//   }
// }

// main();

import {
  orchestrate,
} from "./orchestrator/orchestrator";

import {
  pool,
} from "./db/mysql";

async function main(): Promise<void> {
  const userId = process.argv[2];
  const message = process.argv
    .slice(3)
    .join(" ");

  if (!userId || !message) {
    console.error(
      'Usage: npx ts-node src/whatsappPropertySearch.ts "<userId>" "<message>"',
    );

    process.exitCode = 1;
    return;
  }

  try {
    const result =
      await orchestrate(
        message,
        userId,
      );

    console.log(
      result.response,
    );
  } catch (error) {
    console.error(
      "Orchestrator request failed:",
      error,
    );

    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

main();