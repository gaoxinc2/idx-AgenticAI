import {
  handleRecommendationQuestion,
} from "./recommendationSkill";

import { pool } from "../db/mysql";

async function runTest() {
  try {
    const listingId =
      process.argv[2];

    if (!listingId) {
      console.log(
        "Usage: npx ts-node src/skills/recommendationSkill.test.ts <listingId>",
      );

      process.exitCode = 1;
      return;
    }

    console.log(
      `Testing recommendations for listing ${listingId}...\n`,
    );

    const response =
      await handleRecommendationQuestion(
        listingId,
      );

    console.log(response);
  } catch (error) {
    console.error(
      "Recommendation skill test failed:",
      error,
    );

    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

runTest();