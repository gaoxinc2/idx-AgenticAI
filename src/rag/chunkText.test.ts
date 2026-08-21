import { chunkText } from "./chunkText";

const text = `
Days on Market, commonly called DOM, represents the number of days
a property has been actively listed for sale.

Comparable sales, commonly called comps, are recently sold properties
used to estimate the market value of another property.

Escrow is a neutral third-party process used to hold money and documents
until the conditions of a real estate transaction have been satisfied.
`;

const chunks = chunkText(text, 150, 30);

console.log(`Created ${chunks.length} chunks`);

chunks.forEach((chunk, index) => {
  console.log(`\nChunk ${index + 1}:`);
  console.log(chunk);
});