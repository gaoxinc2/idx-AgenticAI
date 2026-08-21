import fs from "fs";
import path from "path";

import type { KnowledgeDocument } from "./types";

function loadMarkdownFile(
  id: string,
  title: string,
  filename: string
): KnowledgeDocument {
  const filePath = path.join(
    process.cwd(),
    "src",
    "knowledge",
    filename
  );

  const content = fs.readFileSync(filePath, "utf8");

  return {
    id,
    title,
    source: filename,
    content,
  };
}

export function loadKnowledgeDocuments(): KnowledgeDocument[] {
  return [
    loadMarkdownFile(
      "real-estate-glossary",
      "Real Estate Glossary",
      "real-estate-glossary.md"
    ),

    loadMarkdownFile(
      "mls-fields",
      "MLS Field Definitions",
      "mls-fields.md"
    ),
    loadMarkdownFile(

    "market-metrics",

    "Market Statistics Metrics",

    "market-metrics.md"

    ),
  ];
}