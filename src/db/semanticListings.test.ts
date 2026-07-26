import { getListingsForEmbedding } from "./semanticListings";

async function runTest() {
  const listings = await getListingsForEmbedding(3);

  console.log(`Loaded ${listings.length} listings\n`);

  listings.forEach((listing, index) => {
    console.log(`Listing ${index + 1}`);
    console.log("ID:", listing.listingId);
    console.log(listing.searchableText);
    console.log("--------------------------------");
  });
}

runTest();