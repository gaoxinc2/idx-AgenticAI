# idx-AgenticAI — Project Documentation

An OpenClaw-based real estate assistant that grew, week by week, from a simple
environment setup into a full multi-agent system: natural-language property
search, market statistics, semantic + hybrid recommendations, retrieval-
augmented Q&A, and an orchestrator that routes user requests to the right
agent — all reachable through WhatsApp.

## Contents

- [Week 0 — Environment Setup](#week-0--environment-setup)
- [Week 2 — Natural Language Property Search Parser](#week-2--natural-language-property-search-parser)
- [Week 3 — MLS Database Integration](#week-3--mls-database-integration)
- [Week 4 — Multi-Turn Conversation Memory](#week-4--multi-turn-conversation-memory)
- [Week 5 — Market Statistics Agent](#week-5--market-statistics-agent)
- [Week 6 — Semantic Property Search with Embeddings](#week-6--semantic-property-search-with-embeddings)
- [Week 7 — Hybrid Property Recommendation Engine](#week-7--hybrid-property-recommendation-engine)
- [Week 8 — Retrieval-Augmented Generation (RAG)](#week-8--retrieval-augmented-generation-rag)
- [Week 9 — Multi-Agent Orchestration](#week-9--multi-agent-orchestration)


Each week follows the same structure: **Objective → Implementation →
Testing → Problems & Solutions → Files → Status**, so the log is easy to
scan and easy to reproduce from.

---

## Week 0 — Environment Setup

### Objective
Stand up the local development environment: Python virtual environment,
MySQL database, OpenClaw, and WhatsApp integration.

### Implementation
- Created a Python virtual environment and installed all required dependencies.
- Created the `idx_exchange` MySQL database.
- Imported `rets_property.sql` and `california_sold.sql` successfully.

### Verification
- Row counts came in lower than the internship handbook stated:
  - `rets_property`: **53,122 rows**
  - `california_sold`: **87,157 rows**

### Problems & Solutions
**Problem:** WhatsApp outbound sends failed with
`No active WhatsApp Web listener (account: default)`, even though WhatsApp
appeared linked and healthy. A basic gateway restart did not fix it.

**Solution:** Ran the OpenClaw update/service refresh process, which:
1. Installed missing configured plugins, including `clawhub:@openclaw/whatsapp`.
2. Refreshed the gateway service.
3. Verified the updated gateway.

After this, WhatsApp showed a fresh active transport connection and the
following test succeeded:

```bash
openclaw message send --channel whatsapp --target +12178190191 --message 'Hello from IDX Exchange agent'
```

### Status
Environment, database, and WhatsApp messaging confirmed working.

---

## Week 2 — Natural Language Property Search Parser

### Objective
Build a TypeScript parser that converts free-text real estate search queries
into structured filter objects, to be used against `rets_property` in Week 3.

### Implementation
- Created a new `propertySearch` skill that extracts:
  - City
  - Maximum price
  - Minimum bedrooms
  - Minimum bathrooms
  - Minimum square footage
  - Property type
  - Pool preference
  - View preference
  - Maximum HOA fee

### TypeScript Configuration
- `ts-node` initially required manually specifying the `CommonJS` compiler
  option because the project had no `tsconfig.json`.
- Added a `tsconfig.json` with `module: "CommonJS"`, enabling:

```bash
npx ts-node src/skills/propertySearch.test.ts
```

### Testing
Validated with 10+ natural language queries covering different cities,
budgets, property types, bed/bath counts, square footage, pools, views, and
HOA limits. All queries converted correctly.

**Example**

Input:
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

### Files Created
```text
src/skills/propertySearch.ts
src/skills/propertySearch.test.ts
tsconfig.json
```

### Status
Parser complete and validated. Serves as the NLP front end for the
Week 3 parameterized MySQL search.

---

## Week 3 — MLS Database Integration

### Objective
Connect OpenClaw to the MLS databases: build a reusable MySQL connection
layer, implement active-listing and sold-comparable queries, and wire them
to the Week 2 parser.

### Implementation

**1. MySQL Connection Module**
- Installed `mysql2` and `dotenv`; configured credentials via `.env`.
- Built a reusable connection pool in `src/db/mysql.ts`.
- Implemented a generic `query()` helper for parameterized SQL.
- Verified connection to `idx_exchange`.

```bash
npx ts-node src/db/test.ts
```
```text
[ { count: 53122 } ]
```

**2. Active Listing Search (`rets_property`)**
- `searchActiveListings()` supports filters from the Week 2 parser: city, max
  price, bedrooms, bathrooms, square footage, property type, pool, view.
- Pagination via `LIMIT`/`OFFSET`; results sorted by price ascending.
- All SQL parameterized (`?`) to prevent injection.
- Implementation notes:
  - Test filters use `null` for unused fields to match the `PropertyFilters` type.
  - Switched `pool.execute()` → `pool.query()` to fix a `mysqld_stmt_execute`
    error with parameterized pagination.
  - `ListingRow.baths` widened to `number | string` to match MySQL's return type.

```bash
npx ts-node src/db/activeListings.test.ts
```
Returned the first 10 matching active listings in Irvine under the given filters.

**3. Sold Comparables Query (`california_sold`)**
- `getSoldComps()` retrieves recently sold residential properties, filtered
  by city and a months window (default 12).
- Returns the 50 most recent sales, sorted by closing date descending.
- Fully parameterized SQL.

```bash
npx ts-node src/db/soldComps.test.ts
```
Successfully retrieved recent sold comparables for the selected city.

**4. OpenClaw Property Search Skill**
- Integrated the Week 2 parser with the Week 3 queries in
  `propertySearchSkill.ts`:
  - Parses natural language requests.
  - Queries active listings or sold comps based on intent.
  - Formats results into readable property cards.

```bash
npx ts-node src/skills/propertySearchSkill.test.ts
```
Returned formatted active listing cards and sold comparable cards correctly.

### Files Created
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

### Status
Week 3 complete. Natural-language requests now parse into filters, query
both MLS databases with parameterized SQL, and return formatted results.

---

## Week 4 — Multi-Turn Conversation Memory

### Objective
Turn the single-message property search into a multi-turn conversation: the
agent remembers prior responses, asks follow-up questions for missing
information, and searches once enough criteria are collected.

### Implementation
- **Session memory** (`src/memory/sessionMemory.ts`): a `Map`-based store
  keyed per user, tracking city, max budget, bedrooms, bathrooms, square
  footage, property type, pool/view preference, HOA limit, previous results,
  and the current conversation step. Sessions can be reset for a new search.
- **Conversational handler** (`src/skills/conversationalPropertySearch.ts`):
  - Parses each incoming message with the existing `parsePropertyQuery()`.
  - Merges only the newly-found filters into the session, preserving earlier ones.
  - Asks a follow-up question if required fields are still missing.
  - Once complete, converts the session into a `PropertyFilters` object and
    calls `searchActiveListings()` from Week 3.

**Example conversation**
```text
User: Find homes in Irvine
Agent: What is your maximum budget for a home in Irvine?

User: Under $1.2M
Agent: What property type do you prefer: condo, townhouse, or single family?

User: Single family with at least 3 beds
Agent: I found 2 matching listings...
```

### Database Updates
- `src/db/activeListings.ts` now also selects `PhotoCount AS photoCount`.
- `ListingRow` interface and the listing formatter were updated to include
  address, city, ZIP, price, bedrooms, bathrooms, square footage, and photo count.

**Example output**
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

### Testing
- `sessionMemory.test.ts`: sessions can be created, updated, retrieved, and cleared.
- `conversationalPropertySearch.test.ts`: full multi-turn flow — filters
  collected across messages, follow-up questions asked correctly, MySQL
  query executed once complete, formatted results returned with photo counts.
- **WhatsApp test:** started a guided search for Irvine; the assistant
  collected budget, property type, and bedrooms step by step, then queried
  the MLS database. A follow-up message — *"Find homes in Irvine under
  1.2M with a pool"* — correctly reused the earlier 3-bedroom/condo
  criteria and applied the new pool filter without re-asking everything.

### Files Created
```text
src/memory/
├── sessionMemory.ts
└── sessionMemory.test.ts

src/skills/
├── conversationalPropertySearch.ts
└── conversationalPropertySearch.test.ts
```

### Files Updated
```text
src/skills/propertySearch.ts
src/db/activeListings.ts
```

### Status
Multi-turn session memory working end-to-end, including through WhatsApp.

---

## Week 5 — Market Statistics Agent

### Objective
Add a market statistics agent that answers questions like average/median
price, price per square foot, days on market, inventory, and monthly trends,
using historical MLS sales data.

### Implementation

**1. `src/db/marketSummary.ts` — city-wide market summary**
Calculates, for a given period:
- Total residential sales
- Average close price
- Median close price *(computed in TypeScript, since MySQL has no simple median function)*
- Average price per square foot
- Average days on market
- Average list-to-close price ratio

**2. `src/db/marketTrends.ts` — monthly trend analysis**
Groups sales by month and calculates:
- Monthly sales count
- Average / median close price
- Average price per square foot
- Average days on market
- Month-over-month and year-over-year price change

**3. `src/db/inventoryComparison.ts` — inventory & market condition**
- Combines active listings (`rets_property`) with recent sales (`california_sold`).
- Uses average monthly sales pace over the previous 90 days to estimate
  months of inventory.
- Classifies the market as **seller's**, **balanced**, or **buyer's**.

**4. `src/skills/marketStatisticsSkill.ts`**
Parses natural-language market questions, identifies the city and requested
statistic, calls the right database function, and formats a readable response.

**Examples**
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

### Testing
- `marketSummary.test.ts`: valid statistics returned for a selected city.
- `marketTrends.test.ts`: monthly grouping and MoM/YoY calculations verified.
- `inventoryComparison.test.ts`: inventory math matched expected values.
- `marketStatisticsSkill.test.ts`: full NLP workflow verified across
  summaries, median/average price, price/sqft, inventory, trends, and
  missing-city handling.

### Problems & Solutions
**Problem:** Locally, all market-statistics functions worked correctly, but
identical questions sent via WhatsApp returned generic web-based LLM
answers instead of querying the local MLS database. Root cause: the
OpenClaw `property-search` skill only described property-search
capabilities, so market questions weren't recognized as belonging to it.

**Solution:**
1. Added routing logic in `whatsappPropertySearch.ts` to detect
   market-statistics questions and call `handleMarketStatisticsQuestion()`,
   while preserving the Week 4 conversational search flow.
2. Updated the OpenClaw `property-search` `SKILL.md` to advertise support
   for market-statistics queries (trends, median/average price, inventory,
   price/sqft, days on market, buyer's/seller's market).

### Files Created
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

### Files Updated
```text
src/whatsappPropertySearch.ts
~/.openclaw/workspace/skills/property-search/SKILL.md
```

### Status
Market statistics agent fully implemented and integrated into WhatsApp.
Property searches continue via the Week 4 flow; market questions route to
the new skill — both confirmed to use the local MLS database rather than
falling back to generic web answers.

---

## Week 6 — Semantic Property Search with Embeddings

### Objective
Add the foundation for semantic search: compare the *meaning* of a user's
query against listing descriptions (not just structured filters) using
embeddings and cosine similarity.

### Implementation

- **`src/ai/embeddings.ts`** — integrates the OpenAI Node SDK, using
  `text-embedding-3-small` to convert text into embedding vectors.
- **`src/db/semanticListings.ts`** — retrieves active properties from
  `rets_property` and combines type, city, bedrooms, bathrooms, square
  footage, year built, price, and remarks into one searchable description.
- **`src/db/listingEmbeddings.ts`** — stores searchable text + embedding
  vectors in a new `listing_embeddings` table, using
  `INSERT ... ON DUPLICATE KEY UPDATE` to avoid duplicates. Later extended
  with `getStoredListingEmbeddings()` for similarity comparisons.
- **`src/ai/cosineSimilarity.ts`** — compares two vectors and returns a
  similarity score (higher = more similar).
- **`src/skills/semanticPropertySearch.ts`** — loads stored embeddings,
  compares them to a query vector, sorts by similarity, returns top matches.

**Example result**
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

### Semantic Search Workflow
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

### Database Updates
New `listing_embeddings` table (unique on `listing_id`), storing:
- Listing ID
- Searchable listing description
- Embedding vector (JSON)
- Embedding model
- Created / updated timestamps

### Testing
- `embeddings.test.ts`: SDK, env vars, and model config confirmed correct;
  request reached OpenAI but was blocked (see below).
- `semanticListings.test.ts`: active listings converted into searchable text correctly.
- `listingEmbeddings.test.ts`: sample vectors stored correctly as JSON.
- `listingEmbeddings.read.test.ts`: stored embeddings correctly retrieved
  and converted back to number arrays.
- `cosineSimilarity.test.ts`: identical vectors → similarity `1`; unrelated
  vectors → similarity `0`.
- `semanticPropertySearch.test.ts`: full local similarity search — load,
  score, sort, return top results — verified end-to-end.

### Problems & Solutions
**Problem:** The OpenAI Embeddings API returned:
```text
403 Country, region, or territory not supported
```
The TypeScript implementation reached the API correctly, but requests were
rejected because development was being done from Hong Kong, which is
subject to a regional access restriction. This meant real MLS/query
embeddings could not be generated.

**Temporary solution:** Used sample embedding vectors to test the rest of
the pipeline locally. This validated:
- MySQL embedding storage
- Embedding retrieval and JSON ⇄ array conversion
- Cosine similarity calculation
- Similarity ranking and top-result selection

Once OpenAI access is available, the sample query vector can be replaced by
a real `createEmbedding()` call — no changes needed to storage, similarity,
or ranking logic.

### Files Created
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

### Files Updated
```text
src/db/listingEmbeddings.ts   (added retrieval, not just saving)
```

### Status
Semantic search foundation complete and verified with sample vectors.
Note: Live OpenAI embedding generation blocked by regional restriction
(Hong Kong dev environment); architecture is ready to swap in real
embeddings without changes.

---

## Week 7 — Hybrid Property Recommendation Engine

### Objective
Given a specific active listing, recommend similar properties by combining
**structured MLS similarity** (up to 60 points) with **semantic/embedding
similarity** (up to 40 points) for a score out of 100 — then validate each
recommendation's asking price against recent comparable sales.

### Implementation

**1. Local embedding helper — `src/ai/localEmbedding.ts`**
A temporary, deterministic replacement for OpenAI embeddings (still
unavailable — see Week 6):
- Normalizes input text, splits into tokens.
- Hashes each token with SHA-256.
- Maps tokens into one of 64 vector positions with deterministic +/- values.
- Normalizes into a fixed 64-dimensional vector.
- Same text → same vector every time, so it's safe for testing.

**2. Real embedding population — `src/db/populateListingEmbeddings.ts`**
- Pulls real active listings from `rets_property`.
- Builds searchable text from city, property type, approx. square footage,
  and approx. price, e.g.:
  ```text
  city Beverly Hills property type 4 approximately 3750 square feet approximately 4000000 dollars
  ```
- Stores the resulting vector in `listing_embeddings` with
  `embedding_model = local-test-64`, reusing the Week 6 storage layer.

**3. Recommendation engine — `src/skills/recommendationEngine.ts`**
Loads active listings + stored vectors, scores each candidate, sorts, and
returns the top 5.

*Structured score (max 60):*
| Factor | Max points | Rule |
|---|---|---|
| Price similarity | 20 | <$50k diff → 20, <$150k → 12, <$300k → 5 |
| Property type match | 15 | exact numeric code match |
| City match | 15 | exact match |
| Square footage similarity | 10 | <300 sqft diff → 10, <700 sqft → 5 |

*Semantic score (max 40):*
```text
semantic score = cosine similarity × 40
```

*Total:*
```text
total score = structured score + semantic score   (out of 100)
```
The target listing is excluded from its own results.

**Example (structured 25/60, semantic 30.06/40):**
```text
Structured: 25/60
Semantic: 30.06/40
Total: 55.06/100
```

**4. Comparable sales validation — `src/db/compValidation.ts`**
For each recommended property, searches `california_sold` for comps where:
- Same city
- `PropertyType = Residential`
- Living area within ±20% of the recommendation
- Close date within the previous 6 months
- Valid close price and living area

Calculations:
```text
Average $/sqft = average(ClosePrice / LivingArea)
Estimated Comp Value = Average $/sqft × Recommendation Square Footage
deltaPct = (List Price − Comp Estimate) / Comp Estimate × 100
```

**Pricing assessment thresholds:**
```text
deltaPct <= -5%         → Below recent comp estimate
-5% < deltaPct < +5%     → Near recent comp estimate
deltaPct >= +5%          → Above recent comp estimate
```
Wording is intentionally conservative — the comp model doesn't account for
neighborhood, renovation quality, condition, views, lot characteristics, or
special amenities.

**5. Recommendation skill — `src/skills/recommendationSkill.ts`**
Combines the recommendation engine with comp validation:

```text
Target Listing
        ↓
Hybrid Recommendation Engine
        ↓
Top 5 Similar Listings
        ↓
Validate Each Listing Using california_sold
        ↓
Calculate Comp Estimate
        ↓
Compare List Price
        ↓
Format Final Response
```

Each result includes: listing ID, city, property type, price, sqft,
structured/semantic/total scores, estimated comp value, avg $/sqft, comp
count, list-price delta, and pricing assessment.

### Testing

**Recommendation engine test** — target listing:
```text
Listing ID: 1118422731
City: Beverly Hills
Price: $3,950,000
Property Type: 4
Square Feet: 3,677
```
```bash
npx ts-node src/skills/recommendationEngine.test.ts 1118422731
```
Returned 5 ranked real MLS properties (top result: Carmel Valley,
$1,595,000, 3,597 sqft, total score 55.06/100).

**Comp validation test** (Beverly Hills property):
```bash
npx ts-node src/db/compValidation.test.ts
```
```text
compPrice: 5,765,154
listPrice: 3,950,000
compCount: 32
avgPricePerSqft: 1567.9
deltaPct: -31.5
```

**Full pipeline test:**
```bash
npx ts-node src/skills/recommendationSkill.test.ts 1118422731
```
Returned all 5 recommendations with individual comp analysis, e.g.:
```text
1. Listing 1114632206 — Carmel Valley | Type 4
$1,595,000 | 3,597 sqft
Similarity: 55.06/100 (Structured 25/60, Semantic 30.06/40)
Recent comp estimate: $2,947,816 | Avg $/sqft: $819.52 | Comps used: 10
List vs comps: -45.9% → Below recent comp estimate

2. Listing 1117769987 — Eastvale | Type 4
$1,060,000 | 3,257 sqft
Similarity: 49.81/100 (Structured 20/60, Semantic 29.81/40)
Recent comp estimate: $1,039,574 | Avg $/sqft: $319.18 | Comps used: 71
List vs comps: +2% → Near recent comp estimate
```

### Problems & Solutions

| Problem | Solution |
|---|---|
| `listing_embeddings` had only 4 Week 6 test records — no real listings had embeddings | Built `populateListingEmbeddings.ts` to embed real active listings |
| OpenAI embeddings still unavailable (Week 6 access issue) | Built `localEmbedding.ts` deterministic 64-dim fallback |
| `L_Keyword2` assumed to hold property-type *names*, but actually holds numeric codes (1–6) | Changed `propertyType` from `string` → `number`; compare by numeric equality |
| A `california_sold` record had `CloseDate = 2072-06-29` (invalid future date), which a one-sided "greater than 6 months ago" filter would wrongly include | Changed the comp query to `CloseDate BETWEEN DATE_SUB(CURDATE(), INTERVAL 6 MONTH) AND CURDATE()` |
| Comp availability varies a lot by city (Eastvale: 71 comps, Glendora: 1, Diamond Bar: 2) | `compCount` is included in every recommendation for transparency; a future version could add a minimum-comp threshold or confidence score |

### WhatsApp Integration
- Added a listing-ID detector for requests like *"Show me homes similar to
  listing 1118422731"*.
- New routing order:
  ```text
  Incoming Message
          ↓
  Recommendation Request? ── yes → handleRecommendationQuestion()
          ↓ no
  Market Statistics Question? ── yes → handleMarketStatisticsQuestion()
          ↓ no
  Conversational Property Search (handlePropertyConversation)
  ```
- **Bug found:** the detector existed but wasn't called inside the main
  routing function, so recommendation requests fell through to the
  conversational search agent (incorrectly asking "What city would you
  like to search in?").
- **Fix:** call `extractRecommendationListingId()` before checking for
  market-statistics questions or falling through to property search.
- Re-tested `"Find homes in Irvine"` afterward to confirm the Week 4 flow
  still worked unchanged.

### Files Created
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

### Files Updated
```text
src/whatsappPropertySearch.ts
```

### Status
Hybrid recommendation engine (structured + semantic scoring) complete,
returning ranked top-5 recommendations with comp-based pricing assessments.
Integrated into WhatsApp/CLI routing without breaking Weeks 4–5.
Note: Still using the `local-test-64` embedding fallback pending OpenAI access.

---

## Week 8 — Retrieval-Augmented Generation (RAG)

### Objective
Add a document-aware RAG system so the assistant answers real-estate
terminology / MLS field / market-metric questions using retrieved local
documents as grounded context, instead of relying on unconstrained model
knowledge.

### Implementation

**Pipeline**
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

**Knowledge base** (`src/knowledge/`):
- `real-estate-glossary.md` — DOM, escrow, comparable sales, cap rate,
  list-to-close ratio, etc.
- `mls-fields.md` — field documentation for `rets_property` / `california_sold`.
- `market-metrics.md` — terminology from the Week 5 market agent (median
  close price, avg price/sqft, inventory, DOM, list-to-close ratio).

**Modules:**
- `src/rag/knowledgeDocuments.ts` — loads knowledge files into structured documents.
- `src/rag/chunkText.ts` — splits documents into ~600-character overlapping
  chunks (100-character overlap).
- `src/rag/ragIndex.ts` — converts chunks into searchable knowledge records.
- `src/rag/ragRetriever.ts` — compares a question against indexed chunks and
  returns the most relevant sources.
- `src/rag/ragAnswer.ts` — builds grounded context from retrieved chunks and
  instructs the assistant to answer *only* from retrieved information,
  avoiding invented MLS definitions.
- `src/skills/ragSkill.ts` — identifies knowledge questions and routes them
  through the RAG pipeline.

Because live OpenAI embeddings were still unavailable, Week 8 uses
deterministic **local lexical retrieval** as a development fallback. Real
semantic embeddings can later replace it without changing the rest of the
pipeline.

**Example**
```text
Q: What is L_Status used for?
→ Retrieved from: MLS Field Definitions

L_Status
Current listing status.
The property search system uses Active to identify currently active listings.
```

### Testing
```text
What does DOM mean?                      → Real Estate Glossary
What is L_Status used for?               → MLS Field Definitions
What is escrow?                          → Real Estate Glossary
What is a list-to-close price ratio?     → Real Estate Glossary / Market Statistics Metrics
```
Unsupported field test:
```text
What does XYZ_UNKNOWN_999 mean?
→ "I don't have enough information in the indexed knowledge sources to answer that."
```
Confirms the grounding layer correctly rejects unsupported questions.

### Problems & Solutions
| Problem | Solution |
|---|---|
| OpenAI embeddings still unavailable (same regional restriction as Week 6) | Used a local lexical retrieval fallback so RAG could still be built and tested |
| Initial hashed-vector approach caused hash collisions, ranking unrelated docs too highly | Switched to lexical token matching for more reliable retrieval |
| Generic words like "mean" caused unknown MLS fields to match unrelated documents | Added stop-word filtering so unsupported fields correctly return no context |

### Files Created
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

### Status
Core document-aware RAG pipeline complete: load → chunk → retrieve →
ground → answer, with correct rejection of unsupported questions.

**Possible future knowledge sources** (can be added to `src/knowledge/`
without architecture changes):
- Complete `rets_property` / `california_sold` field mappings
- IDX Exchange internal documentation
- California real estate law summaries
- California disclosure requirements
- Additional market reports and terminology

Note: Still using local lexical retrieval pending OpenAI embedding access.

---

## Week 9 — Multi-Agent Orchestration

### Objective
Combine all specialized agents (search, market, recommend, knowledge,
email) into a single orchestration layer that classifies user intent and
routes requests automatically — including requests that need more than one
agent.

### Implementation

**Pipeline**
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

**Intent classifier** — `src/orchestrator/intentClassifier.ts` — recognizes
five intents:
```text
search      → Week 4 conversational property search
market      → Week 5 market statistics
recommend   → Week 7 hybrid recommendation engine
knowledge   → Week 8 RAG system
email       → new email drafting agent
```

**Examples**
```text
Find me 3 bedroom homes in Irvine under $1.5M   → search
What is the median home price in Irvine?         → market
Show me homes similar to listing 1118422731      → recommend
What does DOM mean?                              → knowledge
```

**Orchestrator** — `src/orchestrator/orchestrator.ts` — classifies intent,
calls the appropriate agent(s), and returns the combined result. No agent
logic was rebuilt; all Week 4/5/7/8 functionality is reused as-is.

### Mixed-Intent Routing
The orchestrator can detect multiple intents in one request, e.g.:
```text
Find me affordable homes in Pasadena and tell me whether prices are rising
→ [ 'market', 'search' ]
```
Both agents run concurrently via `Promise.all()`, and their responses are combined.

To avoid the property parser misreading market-related text as part of a
city name, the property-search portion of the message is cleaned first:
```text
"Find me affordable homes in Pasadena and tell me whether prices are rising"
→ "Find me affordable homes in Pasadena"   (sent to the property agent)
```
The market agent still analyzes the original, uncleaned request.

### Single Entry Point
`src/whatsappPropertySearch.ts` previously routed manually between search /
market / recommend. Week 9 replaces that with one call:
```text
orchestrate(message, userId)
```
Resulting architecture:
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
The OpenClaw `SKILL.md` was also updated so all supported real estate
requests go through this single orchestrator entry point.

### Testing

| Intent | Request | Result |
|---|---|---|
| search | "Find me 3 bedroom homes in Irvine under $1.5M" | "What property type do you prefer: condo, townhouse, or single family?" |
| market | "What is the median home price in Irvine?" | "The median close price in Irvine over the last 12 months was $1,520,000. Based on 991 residential sales." |
| recommend | "Show me homes similar to listing 1118422731" | 5 similar listings with structured/semantic/total scores |
| knowledge | "What does DOM mean?" | Answered correctly from the Real Estate Glossary |

**Mixed-intent test:**
```text
Find me affordable homes in Pasadena and tell me whether prices are rising
→ Intents: [ 'market', 'search' ]
```
Combined response included both:
```text
MARKET ANALYSIS
Pasadena Market Summary (Last 12 months)
Sold properties: 498
Average close price: $1,539,977
Median close price: $1,277,500
Average price per sq ft: $823
Average days on market: 39.6
Average list-to-close ratio: 103%
```
```text
PROPERTY RESULTS
What is your maximum budget for a home in Pasadena?
```

Confirmed again through the final local entry point:
```bash
npx ts-node src/whatsappPropertySearch.ts week9-test "Find me affordable homes in Pasadena and tell me whether prices are rising"
```

### Problems & Solutions
| Problem | Solution |
|---|---|
| Broad keyword matching over-classified requests — e.g. "What is the median home price in Irvine?" and "What does DOM mean?" both matched `market` **and** `knowledge`; "Show me homes similar to listing..." matched `search` **and** `recommend` | Refined classifier rules to separate market, knowledge, search, and recommend intents more precisely |
| Full mixed-intent message passed to the property parser caused "Pasadena and tell me whether prices are rising" to be read as the city | Added a property-query cleanup step that strips the market-related portion before parsing |
| WhatsApp channel failed during final testing: `WhatsApp Web connection closed during setup (status 408)` / `WebSocket was closed before the connection was established` | Confirmed the orchestrator itself worked correctly locally — issue is external (proxy/network environment), same environment that caused the Week 6 OpenAI regional restriction |

### Temporary Solution
Validated Week 9 functionality locally via the same TypeScript entry point
OpenClaw uses:
```bash
npx ts-node src/whatsappPropertySearch.ts week9-test "Find me affordable homes in Pasadena and tell me whether prices are rising"
```
This correctly classified both intents, ran both agents, cleaned the
property query, and returned a combined response. Full WhatsApp transport
testing can resume once the WebSocket connection issue is resolved.

### Files Created
```text
src/orchestrator/
├── intentClassifier.ts
├── intentClassifier.test.ts
├── orchestrator.ts
└── orchestrator.test.ts

src/skills/
└── emailDraftAgent.ts
```

### Files Updated
```text
src/whatsappPropertySearch.ts
~/.openclaw/workspace/skills/property-search/SKILL.md
```

### Status
Multi-agent orchestration complete: intent classification, single-agent
and mixed-agent routing, and combined responses all verified locally.
Existing Week 4 session memory continues to work through the orchestrator.
Note: Live WhatsApp transport testing currently blocked by an external
WebSocket connection issue in the proxy/network environment, not by the
orchestration code itself.

---

## Cumulative System Architecture (as of Week 9)

```text
WhatsApp / OpenClaw
        ↓
whatsappPropertySearch.ts   (single entry point)
        ↓
orchestrator.ts
        ↓
intentClassifier.ts  →  search | market | recommend | knowledge | email
        ↓
┌───────────────┬────────────────┬──────────────────┬───────────────┬───────────┐
│ Property Search│ Market Stats   │ Recommendation    │ RAG Knowledge │ Email     │
│ (Week 4)       │ Agent (Week 5) │ Engine (Week 7)   │ Agent (Week 8)│ Draft     │
│ + session      │                │ + comp validation │               │ Agent     │
│   memory       │                │                   │               │           │
└───────────────┴────────────────┴──────────────────┴───────────────┴───────────┘
        ↓
Combined Response
```

**Underlying data & infra:**
- MySQL `idx_exchange` database — `rets_property` (active listings),
  `california_sold` (sold comps), `listing_embeddings` (vector store).
- Embeddings: OpenAI `text-embedding-3-small` (blocked in current dev
  region — Hong Kong) with a deterministic local 64-dim fallback
  (`local-test-64`) and local lexical retrieval for RAG, both designed to
  be swapped for real embeddings without architecture changes.


## Week 10 — End-to-End WhatsApp Integration

### Objective
Connect the Week 9 multi-agent orchestrator to WhatsApp through OpenClaw and
verify the complete real estate assistant end-to-end.

### Implementation

`src/whatsappPropertySearch.ts` now uses the orchestrator as the single entry
point:

```text
WhatsApp
   ↓
OpenClaw
   ↓
whatsappPropertySearch.ts
   ↓
orchestrator.ts
   ↓
intentClassifier.ts
   ↓
Specialized Agent(s)
   ↓
Response back to WhatsApp
```

All incoming messages are passed through:

```text
orchestrate(message, userId)
```

The orchestrator then routes requests to property search, market statistics,
recommendations, RAG knowledge, or multiple agents for mixed-intent requests.

The OpenClaw skill was updated so all supported real estate messages execute:

```bash
cd /Users/stacychan/idx-AgenticAI && npx ts-node src/whatsappPropertySearch.ts "<userId>" "<message>"
```

The intent classifier was also improved to recognize conversational property
search follow-ups such as:

```text
Under $1.5M
Single family with 3 bedrooms
With a pool
```

This allows the Week 4 multi-turn conversation flow to continue through the
Week 9 orchestrator.

### Testing

**Property search**
```bash
npx ts-node src/whatsappPropertySearch.ts week10-debug "Find single family homes in Irvine under \$1.5M with 3 bedrooms"
```

Correctly parsed:

```text
city: Irvine
maxPrice: 1500000
beds: 3
type: SingleFamilyResidence
```

and returned 5 matching active MLS listings.

**Mixed intent**
```bash
npx ts-node src/whatsappPropertySearch.ts week10-mixed 'Find homes in Pasadena and tell me if prices are rising'
```

Returned both:

```text
MARKET ANALYSIS
Pasadena Market Summary

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

The OpenClaw gateway was restarted and verified:

```bash
openclaw gateway restart
openclaw status
```

Live WhatsApp testing successfully confirmed:

```text
Property Search       ✓
Market Statistics     ✓
Recommendations       ✓
RAG Knowledge         ✓
Mixed Intent          ✓
Multi-Turn Search     ✓
WhatsApp Transport    ✓
```

### Problems & Solutions

| Problem | Solution |
|---|---|
| Short property-search follow-ups were classified as unknown | Expanded `intentClassifier.ts` to recognize property details and budget expressions as search intent |
| `$1.5M` became `500000` during a terminal test | zsh expanded `$1` inside double quotes; escaping `$` or using single quotes fixed the test |
| Week 9 WhatsApp testing was blocked by WebSocket/network issues | Restarted OpenClaw after returning to the U.S. and confirmed the WhatsApp connection worked |
| `code` command was unavailable for editing `SKILL.md` | Used macOS `open` / TextEdit instead |

### Files Updated

```text
src/orchestrator/intentClassifier.ts
src/whatsappPropertySearch.ts
~/.openclaw/workspace/skills/property-search/SKILL.md
```

### Status
Week 10 complete. The full multi-agent real estate assistant now works
end-to-end through WhatsApp, including property searches, market statistics,
recommendations, RAG questions, mixed-intent requests, and multi-turn
conversations.