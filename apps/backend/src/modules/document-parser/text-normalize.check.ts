/**
 * Runnable self-check for extracted-text normalization.
 * Run: npx ts-node -r tsconfig-paths/register src/modules/document-parser/text-normalize.check.ts
 */
import { hasMeaningfulText, normalizeExtractedText } from './text-normalize';

function assert(condition: boolean, label: string): void {
  if (!condition) {
    throw new Error(`text-normalize.check failed: ${label}`);
  }
}

const messy = 'Hello   world\r\n\r\n\r\nNext\t\tline  ';
const normalized = normalizeExtractedText(messy);
assert(normalized === 'Hello world\n\nNext line', 'collapses whitespace/blank lines');
assert(!hasMeaningfulText('abc'), 'short alphanumeric is not meaningful');
assert(hasMeaningfulText('a'.repeat(40)), '40 alphanumerics are meaningful');
assert(
  normalizeExtractedText(messy) === normalizeExtractedText(messy),
  'deterministic',
);

console.log('text-normalize.check passed');
