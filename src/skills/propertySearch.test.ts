import { parsePropertyQuery } from "./propertySearch";

const queries = [
  "Show me 3-bedroom condos in Irvine under $1.5M with a pool.",
  "Find single family homes in Pasadena under 1200000 with a view.",
  "2 bed condo in Newport Beach under 900k",
  "Homes in San Diego with 4 bedrooms and 3 baths",
  "Townhome in Irvine under 1m with pool",
  "Land in Riverside under 500k",
  "House in Anaheim with 3 beds",
  "Condominium in Los Angeles under $750,000",
  "Single family in Santa Monica under 2 million with view",
  "3 bedroom townhouse in Irvine under $1.2m hoa under 500",
  "Show me 4-bedroom single family homes in Irvine under $1.8M with 3.5 bathrooms, 2500 sqft, a pool, a view, and HOA under $400."
];

async function runTests() {
  for (const query of queries) {
    const filters = await parsePropertyQuery(query);
    console.log("\nQUERY:", query);
    console.log("FILTERS:", filters);
  }
}

runTests();
