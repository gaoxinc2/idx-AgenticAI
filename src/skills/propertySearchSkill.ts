import { parsePropertyQuery } from "./propertySearch";
import {
  searchActiveListings,
  ListingRow,
} from "../db/activeListings";
import {
  getSoldComps,
  SoldRow,
} from "../db/soldComps";

function formatPrice(value: number | string | null): string {
  if (value === null || value === undefined) {
    return "N/A";
  }

  return `$${Number(value).toLocaleString()}`;
}

function formatActiveListing(listing: ListingRow): string {
  return [
    `${listing.L_Address}`,
    `${listing.L_City}, ${listing.L_Zip}`,
    `Price: ${formatPrice(listing.price)}`,
    `${listing.beds} beds | ${listing.baths} baths`,
    `${listing.sqft?.toLocaleString() ?? "N/A"} sqft`,
    `${listing.type}`,
    `Status: ${listing.status}`,
    `Listing ID: ${listing.L_DisplayId}`,
  ].join("\n");
}

function formatSoldComp(property: SoldRow): string {
  const closeDate = new Date(property.CloseDate).toLocaleDateString();

  return [
    `${property.UnparsedAddress}`,
    `${property.City}`,
    `Sold for ${formatPrice(property.ClosePrice)}`,
    `Closed: ${closeDate}`,
    `${property.BedroomsTotal} beds | ${property.BathroomsTotalInteger} baths`,
    `${property.LivingArea?.toLocaleString() ?? "N/A"} sqft`,
    `${property.PropertySubType}`,
    `${property.DaysOnMarket} days on market`,
    `Listing ID: ${property.ListingKey}`,
  ].join("\n");
}

export async function handlePropertySearch(
  message: string
): Promise<string> {
  const filters = await parsePropertyQuery(message);

  const wantsSoldComps =
    /sold|comps|comparables|recent sales|closed/i.test(message);

  if (!filters.city) {
    return "Please include a city in your property search.";
  }

  if (wantsSoldComps) {
    const soldProperties = await getSoldComps(filters.city, 12);

    if (soldProperties.length === 0) {
      return `No recent sold properties were found in ${filters.city}.`;
    }

    const cards = soldProperties
      .slice(0, 10)
      .map(formatSoldComp);

    return [
      `Found ${soldProperties.length} recent sold properties in ${filters.city}.`,
      "",
      ...cards.map((card, index) => `Property ${index + 1}\n${card}`),
    ].join("\n\n");
  }

  const activeListings = await searchActiveListings(
    filters,
    1,
    10
  );

  if (activeListings.length === 0) {
    return `No matching active listings were found in ${filters.city}.`;
  }

  const cards = activeListings.map(formatActiveListing);

  return [
    `Found ${activeListings.length} matching active listings in ${filters.city}.`,
    "",
    ...cards.map((card, index) => `Property ${index + 1}\n${card}`),
  ].join("\n\n");
}