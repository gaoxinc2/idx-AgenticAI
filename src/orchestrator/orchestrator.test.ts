import { orchestrate } from "./orchestrator";

async function runTest(
  query: string,
  userId: string,
) {
  console.log(
    "\n====================================",
  );

  console.log("QUERY:");
  console.log(query);

  const result =
    await orchestrate(
      query,
      userId,
    );

  console.log("\nINTENTS:");
  console.log(result.intents);

  console.log("\nMIXED:");
  console.log(result.mixed);

  console.log("\nRESPONSE:");
  console.log(result.response);
}

async function main() {
  await runTest(
    "Find me 3 bedroom homes in Irvine under $1.5M",
    "week9-search-test",
  );

  await runTest(
    "What is the median home price in Irvine?",
    "week9-market-test",
  );

  await runTest(
    "Show me homes similar to listing 1118422731",
    "week9-recommend-test",
  );

  await runTest(
    "What does DOM mean?",
    "week9-rag-test",
  );

  await runTest(
    "Find me affordable homes in Pasadena and tell me whether prices are rising",
    "week9-mixed-test",
  );
}

main().catch(console.error);