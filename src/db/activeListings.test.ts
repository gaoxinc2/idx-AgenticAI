import { searchActiveListings } from "./activeListings";

async function run() {
  const listings = await searchActiveListings({
    city: "Irvine",
    maxPrice: 1500000,
    beds: 3,
    baths: null,
    sqft: null,
    type: null,
    pool: null,
    hasView: null,
    maxHoa: null,
  });

  console.log(listings);
}

run();