import { handlePropertyConversation } from "./conversationalPropertySearch";
import { pool } from "../db/mysql";
async function runTest() {
  const userId = "test-user-1";

  let response = await handlePropertyConversation(
    userId,
    "reset"
  );

  console.log("\nUser: reset");
  console.log("Agent:", response);

  response = await handlePropertyConversation(
    userId,
    "Find homes in Irvine"
  );

  console.log("\nUser: Find homes in Irvine");
  console.log("Agent:", response);

  response = await handlePropertyConversation(
    userId,
    "Under $1.2M"
  );

  console.log("\nUser: Under $1.2M");
  console.log("Agent:", response);

  response = await handlePropertyConversation(
    userId,
    "Single family with at least 3 beds"
  );

  console.log(
    "\nUser: Single family with at least 3 beds"
  );
  console.log("Agent:", response);
}

runTest()
  .catch((error) => {
    console.error("Test failed:", error);
  })
  .finally(async () => {
    await pool.end();
  });