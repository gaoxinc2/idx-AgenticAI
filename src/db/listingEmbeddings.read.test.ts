import {
  getStoredListingEmbeddings,
} from "./listingEmbeddings";

async function runTest() {
  const listings =
    await getStoredListingEmbeddings();

  console.log(
    `Loaded ${listings.length} stored embeddings`,
  );

  for (const listing of listings.slice(0, 3)) {
    console.log("Listing:", listing.listingId);
    console.log(
      "Vector length:",
      listing.embedding.length,
    );
  }
}

runTest();