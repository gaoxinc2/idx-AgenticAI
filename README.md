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

The goal of Week 6 was to begin adding semantic search capabilities to the property search agent. Instead of relying only on structured database filters such as city, price, and bedrooms, the agent was extended with the infrastructure required to search MLS listings based on the semantic meaning of natural-language descriptions using vector embeddings.

## Implementation

A new semantic search pipeline was designed to support embedding-based retrieval.

First, the official OpenAI Node SDK was added to the project and configured through environment variables. A reusable embedding helper (`src/ai/embeddings.ts`) was implemented to generate embedding vectors using the `text-embedding-3-small` model.

To store vector data, a new MySQL table named `listing_embeddings` was created. The table stores the MLS listing ID, a searchable text representation of the property, the embedding vector in JSON format, the embedding model used, and timestamps for creation and updates.

A new database module (`semanticListings.ts`) was then created to prepare MLS listings for embedding generation. Active listings with property remarks are converted into descriptive natural-language text by combining information such as property type, city, bedrooms, bathrooms, square footage, year built, price, and listing remarks. This text serves as the input for future embedding generation.

Another database helper (`listingEmbeddings.ts`) was implemented to save embeddings into MySQL using `INSERT ... ON DUPLICATE KEY UPDATE`, allowing existing vectors to be updated without creating duplicate records.

Although semantic search could not yet be completed due to an external API restriction, the entire database pipeline required for storing and retrieving embeddings was successfully implemented and validated.

## Database Updates

A new table was added to the `idx_exchange` database:

```text
listing_embeddings
```

The table contains:

- Listing ID
- Searchable listing description
- Embedding vector (JSON)
- Embedding model
- Created timestamp
- Updated timestamp

This table will serve as the vector store for future semantic property searches.

## Testing

Several components of the semantic search pipeline were tested independently.

The embedding helper successfully loaded the OpenAI SDK, environment variables, and embedding model configuration.

The semantic listing generator successfully loaded active MLS listings from the database and converted each listing into a descriptive natural-language document suitable for embedding.

The embedding storage module was tested locally using sample embedding vectors. Test vectors were successfully inserted into the `listing_embeddings` table and verified through MySQL, confirming that JSON vectors and upsert operations function correctly.

## Problem Encountered

When testing the OpenAI Embeddings API, requests returned the following error:

```text
403 Country, region, or territory not supported
```

The implementation itself was verified to be correct. The error originated from the OpenAI API before any embedding vectors were returned, indicating that API requests from the current network or region were not permitted.

Because embedding generation depends on the external API, this prevented real MLS listing embeddings from being generated during Week 6.

## Temporary Solution

To continue development despite the API restriction, the semantic search pipeline was developed in modular stages.

Instead of generating live embeddings, sample embedding vectors were used to verify:

- MySQL table creation
- JSON vector storage
- Upsert logic
- Retrieval of searchable listing data
- Database integration

This allowed the entire storage pipeline to be completed independently of the external API. Once API access becomes available, the temporary test vectors can be replaced with real embeddings generated by the existing `createEmbedding()` function without requiring changes to the database schema or storage logic.

## Files Created

```text
src/
├── ai/
│   ├── embeddings.ts
│   └── embeddings.test.ts
│
├── db/
│   ├── semanticListings.ts
│   ├── semanticListings.test.ts
│   ├── listingEmbeddings.ts
│   └── listingEmbeddings.test.ts
```

## Status

Week 6 established the foundation for semantic property search by implementing the embedding generation helper, semantic listing preparation, vector storage schema, and database persistence layer. While live embedding generation was temporarily blocked by an external OpenAI API regional restriction, the remainder of the semantic search infrastructure was completed and validated. Once API access becomes available, real embedding vectors can be generated and stored without requiring further architectural changes.