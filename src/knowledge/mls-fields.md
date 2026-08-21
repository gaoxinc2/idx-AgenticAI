# MLS Field Definitions

## rets_property

### L_ListingID

Unique identifier for an MLS listing.

### L_Status

Current listing status.

The property search system uses:

Active

to identify currently active listings.

### L_Price

Current listing price of the property.

### LM_Int1_1

Field used by the property search implementation for bedroom count.

### LM_Int2_1

Field used by the property search implementation for bathroom count.

### L_Address

Street address associated with the listing.

### L_City

City in which the property is located.

## california_sold

The california_sold table contains historical residential sales records used by the market statistics agent.

Important data includes:

- listing information
- city
- sale price
- list price
- close date
- square footage
- days on market

The Week 5 market statistics agent uses this table to calculate metrics including average price, median price, price per square foot, sales count, and market trends.