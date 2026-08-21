import {
  buildRagContext,
  buildRagPrompt,
  answerFromContext,
} from "./ragAnswer";

const query =
  "What does XYZ_UNKNOWN_999 mean?";

console.log(
  "=== RETRIEVED CONTEXT ==="
);

console.log(
  buildRagContext(query)
);

console.log(
  "\n=== RAG PROMPT ==="
);

console.log(
  buildRagPrompt(query)
);

console.log(
  "\n=== ANSWER ==="
);

console.log(
  answerFromContext(query)
);