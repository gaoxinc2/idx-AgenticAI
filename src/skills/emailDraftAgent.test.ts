import { emailDraftAgent } from "./emailDraftAgent";

async function test() {
  const result = await emailDraftAgent(
    "Draft an email",
    "3 matching homes were found in Irvine under $1.5M.",
  );

  console.log("Subject:", result.subject);
  console.log("\nBody:\n");
  console.log(result.body);
}

test().catch(console.error);