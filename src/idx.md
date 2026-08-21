# idx-AgenticAI

# Week 0 Setup Summary

Week 0 setup was successfully completed after configuring the local development environment, MySQL database, OpenClaw, and WhatsApp integration. A Python virtual environment was created and all required dependencies were installed. The idx_exchange MySQL database was created, and both rets_property.sql and california_sold.sql were imported successfully. During verification, the imported datasets contained fewer rows than stated in the internship handbook (rets_property: 53,122 rows; california_sold: 87,157 rows). 

## WhatsApp Listener Issue

During the final WhatsApp test, outbound sends initially failed with `No active WhatsApp Web listener (account: default)`, even though WhatsApp appeared linked and healthy. A basic gateway restart did not fully resolve the issue.

The problem was fixed after running the OpenClaw update/service refresh process, which installed missing configured plugins, including `clawhub:@openclaw/whatsapp`, refreshed the gateway service, and verified the updated gateway. After that, WhatsApp showed a fresh active transport connection and the message send command succeeded:

```bash
openclaw message send --channel whatsapp --target +12178190191 --message 'Hello from IDX Exchange agent'
```

# Week 2 Summary

Week 2 was successfully completed by implementing a natural language property search parser in TypeScript. A new `propertySearch` skill was created to convert free-text real estate search queries into structured filter objects that will be used to query the `rets_property` database in Week 3. The parser supports extracting the city, maximum price, minimum bedrooms, minimum bathrooms, minimum square footage, property type, pool preference, view preference, and maximum HOA fee from user queries.

## TypeScript Configuration

During testing, `ts-node` initially required manually specifying the CommonJS compiler option because the project did not contain a TypeScript configuration file. A `tsconfig.json` file was added with the module configured as `CommonJS`, allowing the parser to run directly with:

```bash

npx ts-node src/skills/propertySearch.test.ts

```

## Parser Validation

The parser was validated using more than 10 natural language property search queries covering different cities, budgets, property types, bedroom and bathroom counts, square footage, pools, views, and HOA limits. Each query was successfully converted into a structured filter object.

Example test query:

```text

Show me 4-bedroom single family homes in Irvine under $1.8M with 3.5 bathrooms, 2500 sqft, a pool, a view, and HOA under $400.

```

Output:

```text

{

  city: 'Irvine',

  maxPrice: 1800000,

  beds: 4,

  baths: 3.5,

  sqft: 2500,

  type: 'SingleFamilyResidence',

  pool: 'True',

  hasView: 'True',

  maxHoa: 400

}

```

## Files Created

- `src/skills/propertySearch.ts`

- `src/skills/propertySearch.test.ts`

- `tsconfig.json`

The completed parser will serve as the natural language front end for the parameterized MySQL property search implementation in Week 3.


# Week 3 – MLS Database Integration

## Objective
Integrate OpenClaw with the MLS databases by building a reusable MySQL connection layer, implementing active listing and sold comparable queries, and connecting them with the Week 2 NLP property parser.

## Tasks Completed

### 1. MySQL Connection Module
- Installed `mysql2` and `dotenv`.
- Configured database credentials using `.env`.
- Created a reusable MySQL connection pool in `src/db/mysql.ts`.
- Implemented a generic `query()` helper for parameterized SQL queries.
- Verified successful connection to the `idx_exchange` database.

**Test**

```bash
npx ts-node src/db/test.ts
```

Output:

```text
[ { count: 53122 } ]
```

---

### 2. Active Listing Search (`rets_property`)
- Created `searchActiveListings()` to query active MLS listings.
- Added support for filters from the Week 2 parser:
  - City
  - Maximum price
  - Bedrooms
  - Bathrooms
  - Square footage
  - Property type
  - Pool
  - View
- Implemented pagination using `LIMIT` and `OFFSET`.
- Sorted results by price (ascending).
- Used parameterized SQL (`?`) to prevent SQL injection.

**Implementation Notes**
- Updated the test filters to match the existing `PropertyFilters` type by using `null` for unused fields.
- Switched from `pool.execute()` to `pool.query()` to resolve the `mysqld_stmt_execute` error with parameterized pagination.
- Updated the `ListingRow` interface so the `baths` field accepts `number | string`, matching the MySQL return type.

**Test**

```bash
npx ts-node src/db/activeListings.test.ts
```

Successfully returned the first 10 matching active listings in Irvine under the specified filters.

---

### 3. Sold Comparables Query (`california_sold`)
- Created `getSoldComps()` to retrieve recently sold residential properties.
- Added filters for:
  - City
  - Number of months (default: 12)
- Returned the 50 most recent sold properties.
- Sorted results by closing date (descending).
- Used parameterized SQL queries.

**Test**

```bash
npx ts-node src/db/soldComps.test.ts
```

Successfully retrieved recent sold comparable properties for the selected city.

---

### 4. OpenClaw Property Search Skill
- Integrated the Week 2 NLP property parser with the Week 3 database queries.
- Created `propertySearchSkill.ts` to:
  - Parse natural language property requests.
  - Query active listings or sold comparables based on the user's request.
  - Format results into readable property cards.
- Added `propertySearchSkill.test.ts` to verify the complete workflow.

**Test**

```bash
npx ts-node src/skills/propertySearchSkill.test.ts
```

Successfully returned:
- Active property listings with formatted property cards.
- Recent sold comparable properties with formatted property cards.

## Files Created

```text
src/db/
├── mysql.ts
├── test.ts
├── activeListings.ts
├── activeListings.test.ts
├── soldComps.ts
└── soldComps.test.ts

src/skills/
├── propertySearchSkill.ts
└── propertySearchSkill.test.ts
```

## Status

Completed the Week 3 MLS Database Integration.

The OpenClaw property search skill now accepts natural language property requests, parses search filters, queries both MLS databases using parameterized SQL, and returns formatted active listings and sold comparable property cards.

# Week 4 – Multi-Turn Conversation Memory

## Objective

The goal of Week 4 was to extend the property search agent from a single-message workflow into a multi-turn conversation. Instead of requiring users to provide all search criteria in one message, the agent now remembers previous responses, asks follow-up questions for missing information, and performs the database search once enough details have been collected.

## Implementation

A session memory module was created in `src/memory/sessionMemory.ts` using a JavaScript `Map` to store conversation state for each user. Each session keeps track of search preferences such as city, maximum budget, bedrooms, bathrooms, square footage, property type, pool preference, view preference, HOA limit, previous search results, and the current conversation step. The session can also be reset when the user starts a new search.

A new conversational property search handler was implemented in `src/skills/conversationalPropertySearch.ts`. Each incoming message is first parsed using the existing `parsePropertyQuery()` function from Week 3. Only the filters found in the newest message are extracted and merged into the existing session, allowing previously entered preferences to remain unchanged.

After updating the session, the handler checks whether any required information is still missing. If so, it asks the user a follow-up question. Once the required filters have been collected, the handler converts the stored session into a `PropertyFilters` object and calls the existing `searchActiveListings()` function from Week 3 to retrieve matching MLS listings.

For example:

```text
User: Find homes in Irvine
Agent: What is your maximum budget for a home in Irvine?

User: Under $1.2M
Agent: What property type do you prefer: condo, townhouse, or single family?

User: Single family with at least 3 beds
Agent: I found 2 matching listings...
```

The final search remembers all previously entered information, including the city, budget, property type, and bedroom requirement.

## Database Updates

The active listing query in `src/db/activeListings.ts` was updated to include the property photo count by selecting:

```sql
PhotoCount AS photoCount
```

The `ListingRow` interface was updated accordingly, and the listing formatter was modified to display the address, city, ZIP code, price, bedrooms, bathrooms, square footage, and photo count using the correct database field names.

Example output:

```text
1. 14612 Mulberry
Irvine 92606
$1,049,000
3 beds, 2.0 baths
1420 sqft
46 photos

2. 164 Cherrybrook Lane
Irvine 92618
$1,180,000
3 beds, 3.0 baths
1353 sqft
24 photos
```

## Testing

Session memory was verified in `src/memory/sessionMemory.test.ts`, confirming that sessions could be created, updated, retrieved, and cleared correctly.

The complete multi-turn workflow was tested in `src/skills/conversationalPropertySearch.test.ts`. The test simulated a conversation where the user provided search preferences across multiple messages. The handler successfully remembered previous inputs, asked for missing information, executed the MySQL query after collecting enough filters, and returned formatted listing results with property details and photo counts.

## WhatsApp Testing Summary

Successfully tested the conversational property search through WhatsApp.

- Started a guided conversation by searching for homes in Irvine.
- The assistant collected search criteria step by step (budget, property type, and bedrooms).
- After all required information was provided, the assistant queried the MLS database and returned matching listings.
- Tested conversational memory by sending a follow-up request: **"Find homes in Irvine under 1.2M with a pool."**
- The assistant remembered the previous criteria (3-bedroom condo) and automatically applied the new pool preference without asking all questions again.
- Verified that multi-turn conversation, session memory, and dynamic search refinement work correctly through WhatsApp.

## Files Created

```text

src/memory/

├── sessionMemory.ts

└── sessionMemory.test.ts

src/skills/

├── conversationalPropertySearch.ts

└── conversationalPropertySearch.test.ts

```

## Files Updated

```text

src/skills/

└── propertySearch.ts

src/db/

└── activeListings.ts

```
## Status

Week 4 successfully introduced session-based conversation memory into the property search agent. The agent now supports natural multi-turn conversations by remembering user preferences across messages, prompting for missing information, reusing the Week 3 MLS search functionality, and returning detailed active listing results once sufficient search criteria have been collected.


# Week 5 – Market Statistics Agent

## Objective

The goal of Week 5 was to expand the real estate assistant beyond property searches by adding a market statistics agent. Instead of only returning active listings, the agent can now answer market-related questions such as average home prices, median prices, price per square foot, days on market, inventory levels, and monthly market trends using historical MLS sales data.

## Implementation

Three new database modules were created to calculate different market metrics from the `california_sold` and `rets_property` tables.

The first module, `src/db/marketSummary.ts`, generates a city-wide market summary for a selected time period. It calculates the total number of residential sales, average close price, median close price, average price per square foot, average days on market, and average list-to-close price ratio. Since MySQL does not provide a simple median function, the median sale price is calculated in TypeScript after retrieving and sorting all matching sale prices.

The second module, `src/db/marketTrends.ts`, analyzes monthly market activity. Residential sales are grouped by month to calculate monthly sales volume, average sale price, median sale price, average price per square foot, average days on market, and average list-to-close ratio. Additional calculations determine month-over-month and year-over-year price changes, allowing the agent to describe how the market has changed over time.

The third module, `src/db/inventoryComparison.ts`, combines active listings from the `rets_property` table with recent sales from `california_sold`. Using the average monthly sales pace over the previous ninety days, the module estimates months of inventory and classifies the market as a seller's market, balanced market, or buyer's market.

A new market statistics skill was implemented in `src/skills/marketStatisticsSkill.ts`. The skill parses natural-language market questions, identifies the requested city and statistic, calls the appropriate database function, and formats the results into readable responses. Supported questions include market summaries, average prices, median prices, price per square foot, days on market, inventory comparisons, and monthly market trends.

For example:

```text
User: What is the median price in Irvine?

Agent:
The median close price in Irvine over the last 12 months was $1,450,000.
This is based on 845 residential sales.
```

```text
User: Is Irvine currently a seller's market?

Agent:
Irvine Inventory Comparison

Active listings: 216
Sales in last 90 days: 247
Estimated monthly sales pace: 82.3
Months of inventory: 2.6

Market indicator: Seller's market
```

## Database Updates

Three new database query modules were added.

`marketSummary.ts` retrieves overall city statistics including:

- Total residential sales
- Average close price
- Median close price
- Average price per square foot
- Average days on market
- Average list-to-close ratio

`marketTrends.ts` groups residential sales by month and calculates:

- Monthly sales count
- Average close price
- Median close price
- Average price per square foot
- Average days on market
- Month-over-month price change
- Year-over-year price change

`inventoryComparison.ts` compares:

- Current active MLS listings
- Sales over the previous 30 days
- Sales over the previous 90 days
- Monthly sales pace
- Months of inventory
- Overall market condition

## Testing

Each database module was tested independently before integration.

`marketSummary.test.ts` verified that market summaries returned valid statistics for a selected city, including average and median sale prices, price per square foot, days on market, and list-to-close ratios.

`marketTrends.test.ts` confirmed that monthly sales were grouped correctly and that month-over-month and year-over-year price changes were calculated accurately.

`inventoryComparison.test.ts` verified the inventory calculations by comparing active listings with recent sales and confirming that the months of inventory and market condition matched the expected values.

Finally, `marketStatisticsSkill.test.ts` tested the complete natural-language workflow. Questions covering market summaries, median prices, average prices, price per square foot, inventory, market trends, and missing city information were parsed successfully and returned correctly formatted responses.

## Files Created

```text
src/db/
├── marketSummary.ts
├── marketSummary.test.ts
├── marketTrends.ts
├── marketTrends.test.ts
├── inventoryComparison.ts
└── inventoryComparison.test.ts

src/skills/
├── marketStatisticsSkill.ts
└── marketStatisticsSkill.test.ts
```

## Files Updated

```text
src/
├── whatsappPropertySearch.ts

~/.openclaw/workspace/skills/
└── property-search/
    └── SKILL.md
```

---


## WhatsApp Integration

The Week 5 market statistics agent was integrated into the existing WhatsApp property search workflow.

During testing, all market-statistics functions worked correctly when executed locally through `whatsappPropertySearch.ts`. However, identical questions sent through WhatsApp returned general web-based responses from the language model instead of querying the local MLS database.

The issue was not with the TypeScript implementation. The OpenClaw `property-search` skill only described property-search capabilities, so market-statistics questions such as *"Show me the market trend in Irvine"* were not recognized as belonging to the local skill.

The solution consisted of two updates:

- Added routing logic in `whatsappPropertySearch.ts` to detect market-statistics questions and invoke `handleMarketStatisticsQuestion()`, while preserving the existing Week 4 conversational property-search workflow.
- Updated the OpenClaw `property-search` `SKILL.md` to advertise support for market-statistics queries, including market trends, median price, average price, inventory, price per square foot, days on market, and buyer's/seller's market requests.

After these changes, both property searches and market-statistics questions are correctly routed through the local MLS database from WhatsApp instead of falling back to general web responses.

## Status

Week 5 successfully introduced a dedicated market statistics agent capable of answering natural-language questions using historical MLS sales data. The implementation includes comprehensive market summaries, monthly trend analysis, inventory comparisons, and formatted statistical responses.

The market statistics agent was fully integrated into the existing WhatsApp property search workflow. Property-search requests continue to use the Week 4 conversational flow, while market-statistics questions are automatically routed to the new market statistics skill. Testing confirmed that both workflows operate correctly through the local application and OpenClaw WhatsApp integration, with all responses sourced from the local MLS database.

# Week 6 – Semantic Property Search with Embeddings

## Objective

The goal of Week 6 was to expand the property search agent by adding the foundation for semantic search using embeddings. Instead of relying only on structured filters such as city, price, bedrooms, and property type, semantic search allows the system to compare the meaning of a user's natural-language request with property listing descriptions and return the most relevant matches.

## Implementation

Several new modules were created to support embedding generation, storage, retrieval, and cosine similarity search.

The first module, `src/ai/embeddings.ts`, integrates the OpenAI Node SDK and uses the `text-embedding-3-small` model to convert text into numerical embedding vectors. These vectors represent the semantic meaning of property descriptions and user search queries.

The second module, `src/db/semanticListings.ts`, retrieves active properties from the `rets_property` table and converts each listing into searchable text. Important MLS fields such as property type, city, bedrooms, bathrooms, square footage, year built, price, and listing remarks are combined into one description that can be converted into an embedding.

The third module, `src/db/listingEmbeddings.ts`, stores the searchable text and embedding vectors in a new MySQL table called `listing_embeddings`. The module uses `INSERT ... ON DUPLICATE KEY UPDATE` so an existing listing embedding can be updated without creating a duplicate. It was later extended with `getStoredListingEmbeddings()` to retrieve stored vectors for similarity comparisons.

A cosine similarity helper was implemented in `src/ai/cosineSimilarity.ts`. The function compares two embedding vectors and returns a similarity score. Higher scores represent vectors that are more similar in meaning.

Finally, `src/skills/semanticPropertySearch.ts` combines the database retrieval and cosine similarity logic. It loads the stored listing embeddings, compares them against a query vector, sorts the results from highest to lowest similarity, and returns the top matching properties.

For example, the local semantic search test returned:

```text
Results:

1. TEST_A
Similarity: 1.0000
Family home with backyard

2. TEST_C
Similarity: 0.9939
Family house with outdoor space

3. TEST123
Similarity: 0.2673
Test listing for semantic search.
```

The results confirmed that listings represented by similar vectors were ranked higher than less-related listings.

## Database Updates

A new `listing_embeddings` table was added to the `idx_exchange` database.

The table stores:

- Listing ID
- Searchable listing description
- Embedding vector in JSON format
- Embedding model
- Created timestamp
- Updated timestamp

The `listing_id` field is unique so that each property has one current embedding record.

The `listingEmbeddings.ts` database module supports:

- Saving embedding vectors
- Updating existing embedding vectors
- Retrieving stored vectors
- Converting stored JSON embeddings back into TypeScript number arrays

These stored vectors can then be passed to the cosine similarity function for semantic ranking.

## Cosine Similarity Search

Cosine similarity was implemented to compare the query vector with each stored property vector.

The semantic property search process follows this workflow:

```text
User Query Vector
        ↓
Load Stored Listing Embeddings
        ↓
Calculate Cosine Similarity
        ↓
Assign Similarity Score
        ↓
Sort Highest to Lowest
        ↓
Return Top Matching Listings
```

Local testing used sample vectors because live OpenAI embedding generation was unavailable from the current development region.

The test successfully produced similarity scores of:

```text
TEST_A   → 1.0000
TEST_C   → 0.9939
TEST123  → 0.2673
```

This confirmed that the cosine similarity implementation correctly identifies and ranks the most similar vectors.

## Testing

Each module was tested independently before combining them into the semantic property search workflow.

`embeddings.test.ts` tested the OpenAI embedding helper and confirmed that the SDK, environment variables, and embedding model were configured correctly. The request successfully reached the OpenAI API but was blocked by a regional access restriction.

`semanticListings.test.ts` verified that active MLS listings could be retrieved from `rets_property` and converted into searchable natural-language descriptions containing the important property information.

`listingEmbeddings.test.ts` tested the embedding storage logic using sample vectors. The vectors were successfully stored in the MySQL `listing_embeddings` table as JSON data.

`listingEmbeddings.read.test.ts` verified that stored embeddings could be retrieved from MySQL and converted back into number arrays for similarity calculations.

`cosineSimilarity.test.ts` tested the similarity calculation using simple vectors. Identical vectors returned a similarity score of `1`, while unrelated test vectors returned a score of `0`.

Finally, `semanticPropertySearch.test.ts` tested the complete local similarity search workflow. The test loaded stored vectors, calculated cosine similarity for each listing, sorted the results by similarity score, and successfully returned the highest-ranked listings.

## Problem Encountered

During testing, the OpenAI Embeddings API returned:

```text
403 Country, region, or territory not supported
```

The TypeScript implementation successfully reached the OpenAI API, but the request was rejected because development was being performed from Hong Kong, where the API request was subject to a regional access restriction.

Because the OpenAI API is responsible for converting real property descriptions and user queries into embeddings, real MLS embeddings could not be generated from the current development environment.

## Temporary Solution

To continue development despite the API restriction, sample embedding vectors were used to test the remaining semantic search pipeline locally.

The temporary vectors allowed the following functionality to be completed and verified:

- MySQL embedding storage
- Embedding retrieval
- JSON vector conversion
- Cosine similarity calculation
- Similarity ranking
- Top-result selection

Instead of generating the query vector through the OpenAI API, the local test supplied a sample vector directly. This allowed the cosine similarity search to be developed independently of the external API.

Once OpenAI API access is available, the sample query vector can be replaced with a real embedding generated from the user's free-text request using `createEmbedding()`. The existing storage, cosine similarity, and ranking logic can then be reused without architectural changes.

## Files Created

```text
src/ai/
├── embeddings.ts
├── embeddings.test.ts
├── cosineSimilarity.ts
└── cosineSimilarity.test.ts

src/db/
├── semanticListings.ts
├── semanticListings.test.ts
├── listingEmbeddings.ts
├── listingEmbeddings.test.ts
└── listingEmbeddings.read.test.ts

src/skills/
├── semanticPropertySearch.ts
└── semanticPropertySearch.test.ts
```

## Files Updated

```text
src/db/
└── listingEmbeddings.ts
```

The `listingEmbeddings.ts` module was updated to retrieve stored embedding vectors in addition to saving them, allowing the vectors to be used by the cosine similarity search.

## Status

Week 6 successfully introduced the foundation for semantic property search using embeddings and cosine similarity. The implementation now supports converting MLS listings into searchable descriptions, storing and retrieving embedding vectors, calculating cosine similarity scores, ranking listings by semantic similarity, and returning the most relevant results.

The cosine similarity search was successfully tested locally using sample vectors. Live OpenAI embedding generation remains temporarily unavailable because of the regional API restriction encountered while developing from Hong Kong. Once API access is available, the temporary vectors can be replaced with real listing and query embeddings without changing the existing semantic search architecture.

# Week 7 – Hybrid Property Recommendation Engine

## Objective

The goal of Week 7 was to expand the real estate assistant by adding a hybrid property recommendation engine. Instead of only searching for properties using filters or semantic similarity, the new recommendation system can take a specific active listing and return similar properties by combining structured MLS data with embedding-based similarity.

The recommendation engine calculates a score out of 100 points. Structured property similarity contributes up to 60 points, while semantic similarity contributes up to 40 points.

The recommended properties are then validated using historical sales from the `california_sold` table. This allows the system to compare each recommendation's asking price against recent comparable sales and provide a simple pricing assessment.

## Implementation

Several new modules were created to support local embedding generation, real MLS embedding population, hybrid recommendation scoring, and comparable-sales validation.

The first module, `src/ai/localEmbedding.ts`, was created as a temporary local embedding helper. Since live OpenAI embedding generation was unavailable during development, the helper generates deterministic 64-dimensional vectors from listing text. The text is normalized, split into tokens, hashed using SHA-256, mapped into vector positions, and normalized into a fixed-length embedding.

The same listing text always generates the same vector, allowing the semantic recommendation pipeline to be tested without depending on the external embedding API.

The second module, `src/db/populateListingEmbeddings.ts`, retrieves real active properties from the `rets_property` table and converts selected MLS fields into searchable text. The searchable text includes the city, property type, approximate square footage, and approximate listing price.

For example:

```text
city Beverly Hills property type 4 approximately 3750 square feet approximately 4000000 dollars
```

The searchable text is passed to the local embedding helper and stored in the existing `listing_embeddings` table using:

```text
embedding_model = local-test-64
```

This allowed real active MLS listings to use the Week 6 embedding storage infrastructure.

The main hybrid recommendation logic was implemented in `src/skills/recommendationEngine.ts`. The engine loads active MLS properties from `rets_property`, loads their corresponding stored vectors from `listing_embeddings`, calculates structured similarity and semantic similarity, combines the scores, sorts the results, and returns the top five recommendations.

The structured score contributes a maximum of 60 points:

```text
Price similarity          → 20 points
Property type similarity  → 15 points
City similarity           → 15 points
Square footage similarity → 10 points
```

Price similarity is scored using the difference between the target property and candidate listing:

```text
Difference < $50,000   → 20 points
Difference < $150,000  → 12 points
Difference < $300,000  → 5 points
```

Square footage similarity is scored using:

```text
Difference < 300 sqft → 10 points
Difference < 700 sqft → 5 points
```

Semantic similarity contributes up to 40 points and is calculated using cosine similarity:

```text
semantic score = cosine similarity × 40
```

The final hybrid score is therefore:

```text
structured score + semantic score = total score / 100
```

For example:

```text
Structured: 25/60
Semantic: 30.06/40
Total: 55.06/100
```

The target listing is excluded from its own recommendation results, and all candidate properties are sorted from highest to lowest total score.

## Local Embedding Helper

At the beginning of Week 7, the existing `listing_embeddings` table contained only the Week 6 test records:

```text
TEST_A
TEST_B
TEST_C
TEST123
```

A database query confirmed that none of the active MLS listings had a matching stored embedding:

```text
active_with_embeddings = 0
```

Because the OpenAI embedding API was unavailable, real MLS listings could not immediately be embedded using `text-embedding-3-small`.

To continue development, a local deterministic embedding helper was created in:

```text
src/ai/localEmbedding.ts
```

The helper generates a 64-dimensional vector by:

- Normalizing the input text
- Splitting the text into tokens
- Hashing each token with SHA-256
- Mapping each token into one of 64 vector positions
- Assigning deterministic positive or negative values
- Normalizing the final vector

The helper was tested using similar and unrelated property descriptions. Similar descriptions produced higher cosine similarity scores than unrelated descriptions.

This local helper is intended only as a temporary development fallback. Once OpenAI embedding access becomes available, the `local-test-64` vectors can be replaced by real `text-embedding-3-small` embeddings without changing the recommendation architecture.

## Database Updates

The existing `listing_embeddings` table from Week 6 was reused for Week 7.

Real active listings from `rets_property` were converted into searchable text and stored with local embeddings.

Example stored records included:

```text
1118422731
city Beverly Hills property type 4 approximately 3750 square feet approximately 4000000 dollars
local-test-64
```

```text
1118405579
city Carmel Valley property type 4 approximately 2750 square feet approximately 2900000 dollars
local-test-64
```

This connected real MLS listing IDs with stored embedding vectors and allowed the hybrid recommendation engine to operate on real data.

The recommendation engine uses the following fields from `rets_property`:

- `L_ListingID`
- `L_SystemPrice`
- `L_City`
- `L_Keyword2`
- `LM_Int2_3`
- `L_Status`

During development, it was discovered that `L_Keyword2` contains numeric property-type codes instead of property-type names.

For example:

```text
1
2
3
4
5
6
```

The recommendation interface was therefore changed from:

```text
propertyType: string
```

to:

```text
propertyType: number
```

Candidate properties now receive the 15 property-type similarity points when their numeric property-type code matches the target listing.

## Recommendation Testing

The recommendation engine was tested using the real active listing:

```text
Listing ID: 1118422731
City: Beverly Hills
Price: $3,950,000
Property Type: 4
Square Feet: 3,677
```

The test command was:

```bash
npx ts-node src/skills/recommendationEngine.test.ts 1118422731
```

The recommendation engine successfully returned five real MLS properties ranked by hybrid score:

```text
1. 1114632206
   Carmel Valley | 4
   $1,595,000 | 3,597 sqft
   Structured: 25/60
   Semantic: 30.06/40
   Total: 55.06/100

2. 1117769987
   Eastvale | 4
   $1,060,000 | 3,257 sqft
   Structured: 20/60
   Semantic: 29.81/40
   Total: 49.81/100

3. 1114685551
   Glendora | 6
   $3,998,000 | 6,789 sqft
   Structured: 20/60
   Semantic: 29.81/40
   Total: 49.81/100

4. 1114971480
   Diamond Bar | 5
   $3,980,000 | 6,352 sqft
   Structured: 20/60
   Semantic: 29.33/40
   Total: 49.33/100

5. 1116237080
   Lake Arrowhead | 4
   $985,000 | 3,087 sqft
   Structured: 20/60
   Semantic: 28.64/40
   Total: 48.64/100
```

This confirmed that the recommendation engine successfully:

- Loaded real active MLS listings
- Loaded stored embeddings
- Calculated structured similarity
- Calculated cosine similarity
- Generated semantic similarity scores
- Combined both scores into a score out of 100
- Excluded the target property
- Ranked candidates correctly
- Returned the top five recommendations

## Comparable Sales Validation

A new database module, `src/db/compValidation.ts`, was created to validate each recommended property's asking price using historical sales from `california_sold`.

The module searches for comparable properties using:

- Same city
- `PropertyType = Residential`
- Living area within ±20% of the recommendation
- Close date within the previous six months
- Valid close price
- Valid living area

The system calculates the average sold price per square foot:

```text
Average $/sqft =
Average of ClosePrice / LivingArea
```

The estimated comp-supported value is then calculated using:

```text
Estimated Comp Value =
Average Sold $/sqft × Recommendation Square Footage
```

The asking price is compared against this estimate using:

```text
(List Price - Comp Estimate)
----------------------------
       Comp Estimate

× 100
```

The resulting percentage is stored as `deltaPct`.

## Comparable Sales Testing

The comp validation module was tested independently using the Beverly Hills property.

The test command was:

```bash
npx ts-node src/db/compValidation.test.ts
```

The result was:

```text
Comp validation result:
{
  compPrice: 5765154,
  listPrice: 3950000,
  compCount: 32,
  avgPricePerSqft: 1567.9,
  deltaPct: -31.5
}
```

Formatted:

```text
Comps used: 32
Average sold $/sqft: $1567.9
Estimated comp value: $5,765,154
List price: $3,950,000
Difference: -31.5%
```

This confirmed that the comparable-sales query, average price-per-square-foot calculation, estimated comp value, and price difference calculation all worked correctly.

## Recommendation Skill

A higher-level recommendation skill was implemented in:

```text
src/skills/recommendationSkill.ts
```

The skill combines the recommendation engine with comparable-sales validation.

The workflow is:

```text
Target Listing
        ↓
Hybrid Recommendation Engine
        ↓
Top 5 Similar Listings
        ↓
Validate Each Listing
Using california_sold
        ↓
Calculate Comp Estimate
        ↓
Compare List Price
        ↓
Format Final Response
```

Each recommendation includes:

- Listing ID
- City
- Property type
- Listing price
- Square footage
- Structured similarity score
- Semantic similarity score
- Total similarity score
- Estimated comp-supported value
- Average sold price per square foot
- Number of comparable sales used
- List-price difference from the comp estimate
- Pricing assessment

The pricing assessment uses:

```text
Delta <= -5%
→ Below recent comp estimate

Delta between -5% and +5%
→ Near recent comp estimate

Delta >= +5%
→ Above recent comp estimate
```

The wording is intentionally conservative because the current comp model does not account for every property characteristic, such as exact neighborhood, renovation quality, condition, views, lot characteristics, or special amenities.

## Complete Recommendation Testing

The complete recommendation pipeline was tested using:

```bash
npx ts-node src/skills/recommendationSkill.test.ts 1118422731
```

The system returned five recommended active properties and performed individual historical comp analysis for each listing.

For example:

```text
1. Listing 1114632206
Carmel Valley | Property Type 4
$1,595,000 | 3,597 sqft
Similarity: 55.06/100
  Structured: 25/60
  Semantic: 30.06/40
Recent comp estimate: $2,947,816
Average sold $/sqft: $819.52
Comp sales used: 10
List vs comps: -45.9%
Assessment: Below recent comp estimate
```

Another recommendation returned:

```text
2. Listing 1117769987
Eastvale | Property Type 4
$1,060,000 | 3,257 sqft
Similarity: 49.81/100
  Structured: 20/60
  Semantic: 29.81/40
Recent comp estimate: $1,039,574
Average sold $/sqft: $319.18
Comp sales used: 71
List vs comps: +2%
Assessment: Near recent comp estimate
```

This confirmed that recommendation ranking and comparable-sales validation successfully operate together in one workflow.

## Problems Encountered

The first issue was that the `listing_embeddings` table contained only the four Week 6 test embeddings. None of the real active MLS listings had matching vectors, so the hybrid recommendation engine initially had no real candidates to compare.

This was solved by creating `populateListingEmbeddings.ts`, which retrieves real active MLS listings, creates searchable listing text, generates local embeddings, and stores them in `listing_embeddings`.

The second issue was that live OpenAI embeddings could not be generated because of the existing API access and connection problems from Week 6.

To avoid blocking Week 7 development, `localEmbedding.ts` was created. The helper generates deterministic 64-dimensional vectors locally, allowing the entire recommendation system to be developed and tested without external embedding generation.

The third issue was the property-type field. The recommendation engine initially assumed `L_Keyword2` contained string property names. Database inspection showed that the field actually contains numeric codes.

The recommendation interface was updated so `propertyType` is stored as a number and property types are compared using direct numeric equality.

The fourth issue was discovered while inspecting `california_sold`. One historical record contained:

```text
CloseDate = 2072-06-29
```

A query that only checked whether the close date was greater than six months ago would incorrectly include this future record.

The comp query was changed from a one-sided condition to:

```sql
CloseDate BETWEEN
    DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
    AND CURDATE()
```

This prevents invalid future dates from entering the recent comparable-sales calculation.

Another limitation discovered during comp testing was that the number of available comps varies by location.

For example:

```text
Eastvale → 71 comps
Glendora → 1 comp
Diamond Bar → 2 comps
```

The current implementation includes `compCount` in every recommendation so the amount of supporting historical data remains visible. A future version could add a minimum comp threshold or confidence score.

## WhatsApp Integration

The Week 7 recommendation engine was integrated into the existing `whatsappPropertySearch.ts` routing workflow.

A recommendation listing-ID detector was added to recognize requests such as:

```text
Show me homes similar to listing 1118422731
```

The routing order is now:

```text
Incoming Message
        ↓
Recommendation Request?
        ↓ No
Market Statistics Question?
        ↓ No
Conversational Property Search
```

Recommendation questions are routed to:

```text
handleRecommendationQuestion()
```

Market-statistics questions continue to use:

```text
handleMarketStatisticsQuestion()
```

All remaining property-search requests continue to use the existing Week 4 conversational workflow:

```text
handlePropertyConversation()
```

During the first routing test, the recommendation request:

```bash
npx ts-node src/whatsappPropertySearch.ts test-user "Show me homes similar to listing 1118422731"
```

incorrectly returned:

```text
Current session: { conversationStep: 1 }
What city would you like to search in?
```

The recommendation detector had been implemented, but it was not being called inside the main routing function. Because of this, recommendation requests were falling through to the normal conversational property-search agent.

The solution was to call `extractRecommendationListingId()` before checking market-statistics questions or invoking the normal property-search workflow.

The existing property-search route was tested again using:

```bash
npx ts-node src/whatsappPropertySearch.ts test-user "Find homes in Irvine"
```

Result:

```text
Current session: { conversationStep: 1, city: 'Irvine' }
What is your maximum budget for a home in Irvine?
```

This confirmed that the Week 7 routing changes preserved the existing Week 4 property-search behavior.

## Files Created

```text
src/ai/
├── localEmbedding.ts
└── localEmbedding.test.ts

src/db/
├── populateListingEmbeddings.ts
├── compValidation.ts
└── compValidation.test.ts

src/skills/
├── recommendationEngine.ts
├── recommendationEngine.test.ts
├── recommendationSkill.ts
└── recommendationSkill.test.ts
```

## Files Updated

```text
src/
└── whatsappPropertySearch.ts
```

The existing Week 6 `listing_embeddings` infrastructure was reused for storing and retrieving real listing vectors.

## Status

Week 7 successfully introduced a hybrid property recommendation engine that combines structured MLS similarity with embedding-based semantic similarity.

The recommendation engine can now take a real active MLS listing, compare it against other active properties, calculate a structured score out of 60, calculate a semantic score out of 40, combine the scores into a total similarity score out of 100, rank the candidates, and return the top five recommendations.

Each recommended property is also validated using historical sales from `california_sold`. The system calculates average sold price per square foot, estimates a comparable-sales-supported property value, compares the current asking price against that estimate, and returns a simple below, near, or above recent comp assessment.

A temporary deterministic local embedding helper was introduced because real OpenAI embedding generation remained unavailable during development. Real MLS listings are currently stored using the `local-test-64` embedding model. Once OpenAI API access is available, these temporary vectors can be replaced with `text-embedding-3-small` embeddings without changing the recommendation engine, cosine similarity logic, database storage, ranking system, or comp-validation architecture.

The Week 7 recommendation skill was integrated into the existing WhatsApp/CLI routing system while preserving both the Week 4 conversational property search and the Week 5 market statistics agent.

The complete Week 7 workflow now supports:

```text
Target Active Listing
        ↓
Structured MLS Similarity
        +
Semantic Vector Similarity
        ↓
Hybrid Score / 100
        ↓
Top 5 Active Recommendations
        ↓
Historical Sold Comp Validation
        ↓
Estimated Comp Value
        ↓
Price Assessment
        ↓
Formatted Recommendation Response
```

Week 7 successfully completed the hybrid recommendation and comparable-sales validation layer of the real estate assistant.

# Week 8 – Retrieval-Augmented Generation (RAG)

## Objective

The goal of Week 8 was to add a document-aware Retrieval-Augmented Generation (RAG) system to the real estate assistant. Instead of answering knowledge questions using only model knowledge, the system retrieves relevant information from local source documents and uses that information as grounded context.

The RAG system currently supports questions about real estate terminology, MLS field definitions, and market terminology.

## Implementation

The Week 8 RAG pipeline follows:

```text
User Question
      ↓
Knowledge Documents
      ↓
Text Chunking
      ↓
Knowledge Index
      ↓
Relevant Chunk Retrieval
      ↓
Grounded Context
      ↓
RAG Answer
```

Knowledge documents are stored in:

```text
src/knowledge/
```

The initial knowledge base contains:

```text
real-estate-glossary.md
mls-fields.md
market-metrics.md
```

`real-estate-glossary.md` contains terminology such as DOM, escrow, comparable sales, cap rate, and list-to-close price ratio.

`mls-fields.md` contains documentation for fields used by the existing `rets_property` and `california_sold` database workflows.

`market-metrics.md` contains terminology from the Week 5 market statistics agent, including median close price, average price per square foot, inventory, days on market, and list-to-close ratio.

The document loader in `src/rag/knowledgeDocuments.ts` reads the knowledge files and converts them into structured documents.

The chunking module in `src/rag/chunkText.ts` divides documents into overlapping sections of approximately 600 characters with 100 characters of overlap.

The indexing module in `src/rag/ragIndex.ts` converts the chunks into searchable knowledge records.

The retrieval logic in `src/rag/ragRetriever.ts` compares a user's question against the indexed chunks and returns the most relevant sources.

Because live OpenAI embeddings remained unavailable during development, Week 8 currently uses deterministic local lexical retrieval as a development fallback. The architecture allows real semantic embeddings to replace this fallback later without changing the rest of the RAG pipeline.

## Grounded Answer Generation

`src/rag/ragAnswer.ts` takes retrieved chunks and builds grounded context for the answer.

The prompt instructs the assistant to answer using only retrieved source information and avoid inventing unsupported MLS definitions or real estate information.

For example:

```text
What is L_Status used for?
```

retrieved:

```text
MLS Field Definitions
```

with the relevant definition:

```text
L_Status

Current listing status.

The property search system uses Active to identify currently active listings.
```

A higher-level RAG skill was added in:

```text
src/skills/ragSkill.ts
```

The skill identifies knowledge questions and routes them through the RAG pipeline.

## Testing

The RAG system was successfully tested with several types of questions:

```text
What does DOM mean?
→ Real Estate Glossary

What is L_Status used for?
→ MLS Field Definitions

What is escrow?
→ Real Estate Glossary

What is a list-to-close price ratio?
→ Real Estate Glossary / Market Statistics Metrics
```

The system was also tested with a nonexistent MLS field:

```text
What does XYZ_UNKNOWN_999 mean?
```

No relevant source was found, and the system correctly returned:

```text
I don't have enough information in the indexed knowledge sources to answer that.
```

This confirmed that the grounding layer can prevent unsupported definitions from being returned.

## Problems Encountered

Live OpenAI embeddings remained unavailable because of the API access limitation encountered during Week 6. A local retrieval fallback was therefore used so the RAG architecture could still be developed and tested.

The initial local implementation used hashed vectors, but hash collisions caused unrelated documents to sometimes rank above the correct source.

The fallback retrieval system was changed to lexical token matching, which produced more reliable results for explicit MLS fields and real estate terminology.

Another issue occurred when generic words such as `mean` caused an unknown MLS field to match unrelated documents. Additional stop-word filtering was added so unsupported fields correctly return no relevant context.

## Files Created

```text
src/knowledge/
├── real-estate-glossary.md
├── mls-fields.md
└── market-metrics.md

src/rag/
├── types.ts
├── chunkText.ts
├── chunkText.test.ts
├── knowledgeDocuments.ts
├── knowledgeDocuments.test.ts
├── ragIndex.ts
├── ragIndex.test.ts
├── ragRetriever.ts
├── ragRetriever.test.ts
├── ragAnswer.ts
└── ragAnswer.test.ts

src/skills/
├── ragSkill.ts
└── ragSkill.test.ts
```

## Status

Week 8 successfully implemented the core document-aware RAG pipeline. The assistant can load knowledge documents, divide them into chunks, retrieve relevant information, build grounded context, and reject questions that are not supported by the indexed sources.

The current knowledge base contains representative real estate terminology, MLS field documentation, and Week 5 market terminology.

Additional authoritative sources can be added later, including:

- Complete `rets_property` and `california_sold` field mappings
- IDX Exchange internal documentation
- California real estate law summaries
- California disclosure requirements
- Additional market reports and real estate terminology

These sources can be added to `src/knowledge/` without changing the core RAG architecture.

Once OpenAI embedding access becomes available, the current local retrieval fallback can be replaced with real semantic embeddings without changing the document loading, chunking, grounding, or RAG skill workflow.

# Week 9 – Multi-Agent Orchestration

## Objective

The goal of Week 9 was to combine the specialized real estate agents developed in previous weeks into a single multi-agent orchestration system.

Instead of manually routing each request inside the WhatsApp entry point, the system now classifies the user's intent and automatically sends the request to the appropriate agent. The orchestrator also supports mixed-intent requests that require multiple agents to work together.

## Implementation

The Week 9 orchestration pipeline follows:

```text
User Request
      ↓
Single Entry Point
      ↓
Intent Classifier
      ↓
Orchestrator
      ↓
Specialized Agent(s)
      ↓
Combined Response
```

The intent classifier was added in:

```text
src/orchestrator/intentClassifier.ts
```

It currently recognizes five types of requests:

```text
search
market
recommend
knowledge
email
```

These intents correspond to the existing property search, market statistics, recommendation, RAG knowledge, and email drafting agents.

For example:

```text
Find me 3 bedroom homes in Irvine under $1.5M
→ search

What is the median home price in Irvine?
→ market

Show me homes similar to listing 1118422731
→ recommend

What does DOM mean?
→ knowledge
```

The main orchestration logic was added in:

```text
src/orchestrator/orchestrator.ts
```

The orchestrator receives the original user request, classifies its intent, calls the appropriate agent, and returns the result.

Existing functionality from previous weeks is reused rather than rebuilt:

```text
Property Search Agent
→ Week 4 conversational property search

Market Statistics Agent
→ Week 5 market analytics

Recommendation Agent
→ Week 7 hybrid recommendation engine

RAG Knowledge Agent
→ Week 8 document-aware RAG system
```

An email drafting agent was also added to support email-related requests.

## Mixed-Intent Routing

The orchestrator can detect more than one intent in the same request.

For example:

```text
Find me affordable homes in Pasadena and tell me whether prices are rising
```

is classified as:

```text
market
search
```

The orchestrator uses `Promise.all()` to run the required agents and combines their responses into a single result.

The property portion of a mixed request is cleaned before being passed to the existing property parser. This prevents market-related text from being incorrectly interpreted as part of a city name.

For example:

```text
Find me affordable homes in Pasadena and tell me whether prices are rising
```

is reduced to:

```text
Find me affordable homes in Pasadena
```

before being sent to the property search agent.

The market statistics agent can still analyze the original request.

## Single Entry Point

The existing WhatsApp entry point was simplified in:

```text
src/whatsappPropertySearch.ts
```

Previous versions manually checked whether a message was a property search, market statistics request, or recommendation request.

Week 9 replaces this manual routing with a single call to:

```text
orchestrate(message, userId)
```

The resulting architecture is:

```text
WhatsApp / OpenClaw
        ↓
whatsappPropertySearch.ts
        ↓
orchestrator.ts
        ↓
intentClassifier.ts
        ↓
Specialized Agent(s)
        ↓
Combined Response
```

The OpenClaw `SKILL.md` was also updated so supported real estate requests use the same orchestrator entry point.

## Testing

Each major intent was successfully tested through the orchestrator.

Property search:

```text
Find me 3 bedroom homes in Irvine under $1.5M

Intent:
search

Response:
What property type do you prefer: condo, townhouse, or single family?
```

Market statistics:

```text
What is the median home price in Irvine?

Intent:
market

Response:
The median close price in Irvine over the last 12 months was $1,520,000.
This is based on 991 residential sales.
```

Recommendation:

```text
Show me homes similar to listing 1118422731

Intent:
recommend
```

The recommendation agent successfully returned five similar active listings with structured, semantic, and total recommendation scores.

RAG knowledge:

```text
What does DOM mean?

Intent:
knowledge
```

The request was correctly routed to the Week 8 RAG agent and answered using the Real Estate Glossary.

The mixed-intent request was also successfully tested:

```text
Find me affordable homes in Pasadena and tell me whether prices are rising
```

The classifier returned:

```text
[ 'market', 'search' ]
```

and the final response contained both:

```text
MARKET ANALYSIS
Pasadena Market Summary
Period: Last 12 months

Sold properties: 498
Average close price: $1,539,977
Median close price: $1,277,500
Average price per sq ft: $823
Average days on market: 39.6
Average list-to-close ratio: 103%
```

and:

```text
PROPERTY RESULTS
What is your maximum budget for a home in Pasadena?
```

This confirmed that multiple agents can process a single request and return a combined response.

The same mixed-intent request was successfully tested through the final local entry point:

```bash
npx ts-node src/whatsappPropertySearch.ts week9-test "Find me affordable homes in Pasadena and tell me whether prices are rising"
```

## Problems Encountered

The initial intent classifier used broad keyword matching, which caused some requests to be routed to unnecessary agents.

For example:

```text
What is the median home price in Irvine?
```

was initially classified as both `market` and `knowledge`, while:

```text
What does DOM mean?
```

was initially classified as both `market` and `knowledge`.

Recommendation requests such as:

```text
Show me homes similar to listing 1118422731
```

were also initially classified as both `search` and `recommend`.

The classifier rules were refined so market statistics, knowledge definitions, property searches, and recommendation requests are separated more accurately.

Another issue occurred with mixed-intent requests. The complete message was initially passed to the property parser, causing:

```text
Pasadena and tell me whether prices are rising
```

to be interpreted as the city.

A property-query cleanup step was added so only the property-search portion is sent to the conversational property agent.

During final WhatsApp testing, the OpenClaw WhatsApp channel was unable to establish a stable WhatsApp Web connection. OpenClaw reported:

```text
WhatsApp Web connection closed during setup (status 408).
WebSocket was closed before the connection was established.
```

The local orchestrator continued to work correctly, indicating that this issue is external to the Week 9 TypeScript implementation and is likely related to the current proxy/network environment.

The same environment previously caused regional access limitations when testing the OpenAI Embeddings API.

## Temporary Solution

Week 9 functionality was validated locally using the same TypeScript entry point used by OpenClaw:

```bash
npx ts-node src/whatsappPropertySearch.ts week9-test "Find me affordable homes in Pasadena and tell me whether prices are rising"
```

The command successfully classified the request as both `market` and `search`, ran both agents, cleaned the property query correctly, and returned a combined response.

Full WhatsApp transport testing can be repeated when the WhatsApp WebSocket connection is available through the development network.

## Files Created

```text
src/orchestrator/
├── intentClassifier.ts
├── intentClassifier.test.ts
├── orchestrator.ts
└── orchestrator.test.ts

src/skills/
└── emailDraftAgent.ts
```

## Files Updated

```text
src/whatsappPropertySearch.ts

~/.openclaw/workspace/skills/property-search/
└── SKILL.md
```

## Status

Week 9 successfully implemented the core multi-agent orchestration system.

The assistant can now classify real estate requests and route them to the existing property search, market statistics, recommendation, RAG knowledge, and email drafting agents through a single orchestration layer.

Mixed-intent requests can invoke multiple agents concurrently and combine their results into one response. The existing multi-turn property session memory also continues to work through the new orchestrator.

The complete Week 9 workflow was successfully verified through the local OpenClaw entry-point command.

Final live WhatsApp testing is currently limited by the external WhatsApp WebSocket connection in the proxy/network environment rather than the orchestration implementation.