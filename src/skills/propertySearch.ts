export type PropertyFilters = {
  city: string | null;
  maxPrice: number | null;
  beds: number | null;
  baths: number | null;
  sqft: number | null;
  type: string | null;
  pool: "True" | null;
  hasView: "True" | null;
  maxHoa: number | null;
};

export async function parsePropertyQuery(query: string): Promise<PropertyFilters> {
  const q = query.toLowerCase();

  const cityMatch = query.match(/in\s+([A-Za-z\s]+?)(?:\s+under|\s+with|\s+at|\s+over|\s+below|$)/i);
  const priceMatch = query.match(/(?:under|below|less than|max)\s+\$?([\d,.]+)\s*(k|m|million)?/i);
  const bedsMatch = query.match(/(\d+)\s*[- ]?\s*(bed|beds|bedroom|bedrooms)/i);
  const bathsMatch = query.match(/(\d+(?:\.5)?)\s*[- ]?\s*(bath|baths|bathroom|bathrooms)/i);
  const sqftMatch = query.match(/(\d{3,5})\s*(sqft|sq ft|square feet)/i);
  const hoaMatch = query.match(/hoa\s*(?:under|below|less than|max)?\s*\$?(\d+)/i);

  const typeMap: Record<string, string> = {
    condo: "Condominium",
    condominium: "Condominium",
    townhome: "Townhouse",
    townhouse: "Townhouse",
    "single family": "SingleFamilyResidence",
    house: "SingleFamilyResidence",
    land: "UnimprovedLand",
  };

  const typeKey = Object.keys(typeMap).find((key) => q.includes(key));

  let maxPrice: number | null = null;
  if (priceMatch) {
    maxPrice = Number(priceMatch[1].replace(/,/g, ""));
    const unit = priceMatch[2]?.toLowerCase();

    if (unit === "k") maxPrice *= 1000;
    if (unit === "m" || unit === "million") maxPrice *= 1_000_000;
  }

  return {
    city: cityMatch?.[1]?.trim() || null,
    maxPrice,
    beds: bedsMatch ? Number(bedsMatch[1]) : null,
    baths: bathsMatch ? Number(bathsMatch[1]) : null,
    sqft: sqftMatch ? Number(sqftMatch[1]) : null,
    type: typeKey ? typeMap[typeKey] : null,
    pool: /pool/i.test(query) ? "True" : null,
    hasView: /view/i.test(query) ? "True" : null,
    maxHoa: hoaMatch ? Number(hoaMatch[1]) : null,
  };
}
