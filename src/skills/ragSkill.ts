import {
  answerFromContext,
} from "../rag/ragAnswer";

export function isRagQuestion(
  message: string
): boolean {
  const normalized =
    message.toLowerCase();

  const keywords = [
    "what does",
    "what is",
    "define",
    "meaning",
    "column",
    "columns",
    "field",
    "mls",
    "rets_property",
    "california_sold",
    "dom",
    "escrow",
    "comps",
    "cap rate",
    "list-to-close",
  ];

  return keywords.some(
    (keyword) =>
      normalized.includes(keyword)
  );
}

export async function handleRagQuestion(
  message: string
): Promise<string> {
  return answerFromContext(message);
}