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