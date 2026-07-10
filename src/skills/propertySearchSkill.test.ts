import { handlePropertySearch } from "./propertySearchSkill";
import { pool } from "../db/mysql";

async function run() {
  try {
    console.log("ACTIVE LISTING TEST\n");

    const activeResult = await handlePropertySearch(
      "Show me 3-bedroom homes in Irvine under $1.5M"
    );

    console.log(activeResult);

    console.log("\n============================\n");
    console.log("SOLD COMPS TEST\n");

    const soldResult = await handlePropertySearch(
      "Show me recent sold comps in Irvine"
    );

    console.log(soldResult);
  } catch (error) {
    console.error("Property skill test failed:", error);
  } finally {
    await pool.end();
  }
}

run();