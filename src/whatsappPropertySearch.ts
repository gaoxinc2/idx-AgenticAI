import { handlePropertyConversation } from "./skills/conversationalPropertySearch";
import { pool } from "./db/mysql";

async function main(): Promise<void> {
  const userId = process.argv[2];
  const message = process.argv.slice(3).join(" ");

  if (!userId || !message) {
    console.error(
      'Usage: npx ts-node src/whatsappPropertySearch.ts "<userId>" "<message>"'
    );
    process.exitCode = 1;
    return;
  }

  try {
    const response = await handlePropertyConversation(
      userId,
      message
    );

    console.log(response);
  } catch (error) {
    console.error("Property search failed:", error);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

main();