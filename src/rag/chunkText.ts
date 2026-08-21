export function chunkText(
  text: string,
  chunkSize = 600,
  overlap = 100
): string[] {
  if (!text.trim()) {
    return [];
  }

  if (overlap >= chunkSize) {
    throw new Error("overlap must be smaller than chunkSize");
  }

  const chunks: string[] = [];

  let start = 0;

  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);

    const chunk = text
      .slice(start, end)
      .trim();

    if (chunk.length > 0) {
      chunks.push(chunk);
    }

    if (end === text.length) {
      break;
    }

    start += chunkSize - overlap;
  }

  return chunks;
}