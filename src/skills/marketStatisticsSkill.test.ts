import {
  handleMarketStatisticsQuestion,
  parseMarketQuestion,
} from "./marketStatisticsSkill";

const testQuestions = [
  "What is the median price in Irvine?",
  "What is the average price in Pasadena?",
  "What is the average price per sq ft in Irvine?",
  "How long do homes stay on the market in Irvine?",
  "What is the list-to-close ratio in Irvine?",
  "Show me the market trend in Irvine.",
  "Is Irvine currently a buyer's market or seller's market?",
  "Give me a market summary for Newport Beach.",
  "What is the median price in Irvine over the last 6 months?",
  "What is the median price?",
];

async function runTests(): Promise<void> {
  for (const question of testQuestions) {
    console.log("\n================================");
    console.log(`Question: ${question}`);

    const parsed = parseMarketQuestion(question);

    console.log("Parsed:");
    console.log(parsed);

    const response =
      await handleMarketStatisticsQuestion(question);

    console.log("\nResponse:");
    console.log(response);
  }
}

runTests()
  .then(() => {
    console.log("\nAll market statistics tests completed.");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Market statistics test failed:", error);
    process.exit(1);
  });