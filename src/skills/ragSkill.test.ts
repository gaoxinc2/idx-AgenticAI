import {
  isRagQuestion,
  handleRagQuestion,
} from "./ragSkill";

async function main() {
  const questions = [
    "What does DOM mean?",
    "What is L_Status used for?",
    "What is escrow?",
  ];

  for (const question of questions) {
    console.log(
      "\n===================="
    );

    console.log(
      `Question: ${question}`
    );

    console.log(
      `RAG question: ${isRagQuestion(
        question
      )}`
    );

    const answer =
      await handleRagQuestion(
        question
      );

    console.log(answer);
  }
}

main().catch(console.error);