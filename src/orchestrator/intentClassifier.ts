export type AgentIntent =
  | "search"
  | "market"
  | "recommend"
  | "knowledge"
  | "email";

export interface IntentClassification {
  intents: AgentIntent[];
  isMixed: boolean;
}

export function classifyIntent(
  query: string,
): IntentClassification {
  const text = query.toLowerCase();

  const intents: AgentIntent[] = [];

  /*
   * Recommendation
   *
   * Check this before normal property search because:
   * "Show me homes similar to listing 123"
   * contains "show" + "homes".
   */
  const isRecommendation =
    /\b(similar to|similar homes|similar listings|recommend|recommendation|like listing|like this listing|comparable listing)\b/.test(
      text,
    );

  if (isRecommendation) {
    intents.push("recommend");
  }

  /*
   * Market statistics
   *
   * These should represent actual market analysis,
   * not simply definitions such as:
   * "What does DOM mean?"
   */
  const isMarket =
    /\b(median|average|inventory|market trend|market trends|price per square foot|months of inventory|sales count)\b/.test(
      text,
    ) ||
    /\bprices?\s+(?:are\s+)?(?:rising|falling|increasing|decreasing)\b/.test(
      text,
    ) ||
    /\b(days on market|average dom|median dom)\b/.test(
      text,
    );

  if (isMarket) {
    intents.push("market");
  }

  /*
   * Knowledge / RAG
   *
   * Definition-style questions.
   *
   * Do NOT classify market-statistics questions
   * such as "What is the median price?"
   * as knowledge.
   */
  const isDefinitionQuestion =
    /\bwhat does\b/.test(text) ||
    /\bwhat does .+ mean\b/.test(text) ||
    /\bdefine\b/.test(text) ||
    /\bdefinition of\b/.test(text) ||
    /\bmeaning of\b/.test(text) ||
    /\bwhat is .+ used for\b/.test(text) ||
    /\bexplain\b/.test(text);

  if (
    isDefinitionQuestion &&
    !isMarket
  ) {
    intents.push("knowledge");
  }

  /*
   * Property search
   *
   * Recommendation requests should NOT also
   * become normal property searches.
   */
  const isPropertySearch =
    /\b(find|search|show|looking for)\b/.test(
      text,
    ) &&
    /\b(home|homes|house|houses|property|properties|listing|listings|condo|condos|townhouse|townhouses)\b/.test(
      text,
    );

  if (
    isPropertySearch &&
    !isRecommendation
  ) {
    intents.push("search");
  }

  /*
   * Email drafting
   */
  const isEmail =
    /\b(draft an email|write an email|compose an email|email summary)\b/.test(
      text,
    );

  if (isEmail) {
    intents.push("email");
  }

  const uniqueIntents = [
    ...new Set(intents),
  ];

  return {
    intents: uniqueIntents,
    isMixed:
      uniqueIntents.length > 1,
  };
}