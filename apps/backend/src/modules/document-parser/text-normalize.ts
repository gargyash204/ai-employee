/** Normalize OCR/embedded extract for stable, deterministic LLM input. */
export function normalizeExtractedText(input: string): string {
  return input
    .normalize('NFKC')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[^\S\n]+/g, ' ')
    .replace(/ ?\n ?/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Enough alphanumeric content to skip OCR. */
export function hasMeaningfulText(text: string, minChars = 40): boolean {
  const alphanumeric = text.replace(/[^a-zA-Z0-9]/g, '');
  return alphanumeric.length >= minChars;
}
