import {
  classifyIntent,
  AgentIntent,
} from "./intentClassifier";

import {
  handlePropertyConversation,
} from "../skills/conversationalPropertySearch";

import {
  handleMarketStatisticsQuestion,
} from "../skills/marketStatisticsSkill";

import {
  recommendSimilarListings,
} from "../skills/recommendationEngine";

import {
  handleRagQuestion,
} from "../skills/ragSkill";

import {
  emailDraftAgent,
} from "../skills/emailDraftAgent";


export interface OrchestratorResult {
  intents: AgentIntent[];
  mixed: boolean;
  response: string;
}


/**
 * Extract a listing ID from a recommendation request.
 *
 * Example:
 * "Show me homes similar to listing 1118422731"
 * → "1118422731"
 */
function extractListingId(
  query: string,
): string | null {
  const match =
    query.match(/\b\d{6,}\b/);

  return match
    ? match[0]
    : null;
}


/**
 * Remove the market-analysis portion from a
 * mixed property-search query.
 *
 * Example:
 *
 * "Find me affordable homes in Pasadena
 * and tell me whether prices are rising"
 *
 * becomes:
 *
 * "Find me affordable homes in Pasadena"
 */
function getPropertySearchQuery(
  query: string,
): string {
  const separators = [
    /\s+and\s+tell\s+me\s+whether/i,
    /\s+and\s+tell\s+me\s+if/i,
    /\s+and\s+tell\s+me\s+what/i,
    /\s+and\s+what\s+is/i,
    /\s+and\s+how\s+is/i,
  ];

  let cleanedQuery = query;

  for (const separator of separators) {
    cleanedQuery =
      cleanedQuery.split(
        separator,
      )[0];
  }

  return cleanedQuery.trim();
}


/**
 * Format recommendation results
 * into a readable response.
 */
function formatRecommendations(
  recommendations: Awaited<
    ReturnType<
      typeof recommendSimilarListings
    >
  >,
): string {
  if (
    recommendations.length === 0
  ) {
    return "I could not find any similar active listings.";
  }

  const formatted =
    recommendations.map(
      (listing, index) => {
        return [
          `${index + 1}. Listing ${listing.listingId}`,
          listing.city,
          `$${Number(
            listing.price,
          ).toLocaleString()}`,
          `${listing.sqft.toLocaleString()} sqft`,
          `Structured score: ${listing.structuredScore}/60`,
          `Semantic score: ${listing.semanticScore}/40`,
          `Total score: ${listing.totalScore}/100`,
        ].join("\n");
      },
    );

  return [
    `I found ${recommendations.length} similar listings:`,
    "",
    formatted.join("\n\n"),
  ].join("\n");
}


/**
 * Main Week 9 orchestrator.
 *
 * It classifies the user's request,
 * sends it to the correct agent(s),
 * and combines the results.
 */
export async function orchestrate(
  query: string,
  userId: string,
): Promise<OrchestratorResult> {
  const classification =
    classifyIntent(query);

  const intents =
    classification.intents;

  /**
   * No recognized intent.
   */
  if (
    intents.length === 0
  ) {
    return {
      intents: [],
      mixed: false,
      response:
        "I'm not sure how to help with that. Try asking about properties, market trends, similar listings, or real estate terminology.",
    };
  }


  /**
   * Create one task for each detected intent.
   *
   * Mixed-intent requests can therefore
   * run multiple agents.
   */
  const tasks = intents.map(
    async (intent) => {
      switch (intent) {

        /**
         * Property Search Agent
         *
         * Uses the Week 4 conversational
         * property search and session memory.
         */
        case "search": {
          const propertyQuery =
            getPropertySearchQuery(
              query,
            );

          const response =
            await handlePropertyConversation(
              userId,
              propertyQuery,
            );

          return {
            intent,
            response,
          };
        }


        /**
         * Market Statistics Agent
         *
         * Uses the Week 5 market
         * statistics system.
         */
        case "market": {
          const response =
            await handleMarketStatisticsQuestion(
              query,
            );

          return {
            intent,

            response:
              typeof response ===
              "string"
                ? response
                : JSON.stringify(
                    response,
                    null,
                    2,
                  ),
          };
        }


        /**
         * Recommendation Agent
         *
         * Uses the Week 7 hybrid
         * recommendation engine.
         */
        case "recommend": {
          const listingId =
            extractListingId(
              query,
            );

          if (
            !listingId
          ) {
            return {
              intent,

              response:
                "Please provide the listing ID you want recommendations for.",
            };
          }

          try {
            const recommendations =
              await recommendSimilarListings(
                listingId,
                5,
              );

            return {
              intent,

              response:
                formatRecommendations(
                  recommendations,
                ),
            };
          } catch (error) {
            const message =
              error instanceof Error
                ? error.message
                : String(
                    error,
                  );

            return {
              intent,

              response:
                `I could not generate recommendations. ${message}`,
            };
          }
        }


        /**
         * RAG / Knowledge Agent
         *
         * Uses the Week 8
         * document-aware RAG system.
         */
        case "knowledge": {
          const response =
            await handleRagQuestion(
              query,
            );

          return {
            intent,

            response:
              typeof response ===
              "string"
                ? response
                : JSON.stringify(
                    response,
                    null,
                    2,
                  ),
          };
        }


        /**
         * Email Draft Agent
         */
        case "email": {
          const draft =
            await emailDraftAgent(
              query,
            );

          return {
            intent,

            response: [
              `Subject: ${draft.subject}`,
              "",
              draft.body,
            ].join("\n"),
          };
        }


        default: {
          return {
            intent,

            response:
              "That request is not supported yet.",
          };
        }
      }
    },
  );


  /**
   * Run all detected agents.
   *
   * For mixed-intent requests,
   * they run concurrently.
   */
  const results =
    await Promise.all(
      tasks,
    );


  /**
   * Single-agent result.
   */
  if (
    results.length === 1
  ) {
    return {
      intents,
      mixed: false,
      response:
        results[0].response,
    };
  }


  /**
   * Mixed-agent result.
   *
   * Add a heading for each
   * agent response.
   */
  const combinedResponse =
    results
      .map(
        (result) => {
          return [
            getHeading(
              result.intent,
            ),
            result.response,
          ].join("\n");
        },
      )
      .join("\n\n");


  return {
    intents,
    mixed: true,
    response:
      combinedResponse,
  };
}


/**
 * Headings used when multiple
 * agents respond to one request.
 */
function getHeading(
  intent: AgentIntent,
): string {
  switch (intent) {
    case "search":
      return "PROPERTY RESULTS";

    case "market":
      return "MARKET ANALYSIS";

    case "recommend":
      return "SIMILAR LISTINGS";

    case "knowledge":
      return "REAL ESTATE INFORMATION";

    case "email":
      return "EMAIL DRAFT";
  }
}