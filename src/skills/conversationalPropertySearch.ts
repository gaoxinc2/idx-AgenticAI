import { parsePropertyQuery } from "./propertySearch";
import { searchActiveListings } from "../db/activeListings";
import {
  getSession,
  updateSession,
  clearSession,
} from "../memory/sessionMemory";

export async function handlePropertyConversation(
  userId: string,
  message: string
): Promise<string> {
  // Reset the user's previous search.
  if (
    message.toLowerCase() === "reset" ||
    message.toLowerCase() === "start over"
  ) {
    clearSession(userId);

    return "Search cleared. What city would you like to search in?";
  }

  // Read the user's existing session.
  const currentSession = getSession(userId);

  // Parse only the newest message.
  const newFilters = await parsePropertyQuery(message);

  // Only save values that were actually found.
  const updates: Record<string, unknown> = {};

  if (newFilters.city != null) {
    updates.city = newFilters.city;
  }

  if (newFilters.maxPrice != null) {
    updates.maxPrice = newFilters.maxPrice;
  }

  if (newFilters.beds != null) {
    updates.beds = newFilters.beds;
  }

  if (newFilters.baths != null) {
    updates.baths = newFilters.baths;
  }

  if (newFilters.sqft != null) {
    updates.sqft = newFilters.sqft;
  }

  if (newFilters.type != null) {
    updates.type = newFilters.type;
  }

  if (newFilters.pool != null) {
    updates.pool = newFilters.pool;
  }

  if (newFilters.hasView != null) {
    updates.hasView = newFilters.hasView;
  }

  if (newFilters.maxHoa != null) {
    updates.maxHoa = newFilters.maxHoa;
  }

  updates.conversationStep =
    currentSession.conversationStep + 1;

  // Merge the newest information with the previous session.
  const session = updateSession(userId, updates);

  console.log("Current session:", session);

  // Ask follow-up questions.
  if (!session.city) {
    return "What city would you like to search in?";
  }

  if (!session.maxPrice) {
    return `What is your maximum budget for a home in ${session.city}?`;
  }

  if (!session.type) {
    return "What property type do you prefer: condo, townhouse, or single family?";
  }

  if (!session.beds) {
    return "How many bedrooms do you need?";
  }

  // All required filters are available.
  const searchFilters = {
    city: session.city,
    maxPrice: session.maxPrice,
    beds: session.beds,
    baths: session.baths ?? null,
    sqft: session.sqft ?? null,
    type: session.type,
    pool: session.pool ?? null,
    hasView: session.hasView ?? null,
    maxHoa: session.maxHoa ?? null,
  };

  // Run the Week 3 database search.
  const results = await searchActiveListings(
    searchFilters,
    1,
    5
  );
  console.log(results);

  if (results.length === 0) {
    return "I could not find any matching active listings. Try increasing your budget or changing your preferences.";
  }

  // Save the newest results in the session.
  updateSession(userId, {
    lastResults: results,
  });

  // Format the listings for WhatsApp.
  const formattedResults = results.map(

  (listing: any, index: number) => {

    return [

      `${index + 1}. ${listing.L_Address ?? "Address unavailable"}`,

      `${listing.L_City ?? ""} ${listing.L_Zip ?? ""}`.trim(),

      `$${Number(listing.price).toLocaleString()}`,

      `${listing.beds ?? "N/A"} beds, ${listing.baths ?? "N/A"} baths`,

      `${listing.sqft ?? "N/A"} sqft`,

      `${listing.photoCount ?? 0} photos`,

    ].join("\n");

  }

);

  return [
    `I found ${results.length} matching listings:`,
    "",
    formattedResults.join("\n\n"),
  ].join("\n");
}