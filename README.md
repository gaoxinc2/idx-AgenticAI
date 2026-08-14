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

```md
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