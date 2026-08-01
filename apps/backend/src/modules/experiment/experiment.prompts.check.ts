/**
 * Runnable self-check for broad extraction JSON normalization.
 * Run: npx ts-node -r tsconfig-paths/register src/modules/experiment/experiment.prompts.check.ts
 */
import { parseExtractionResponse } from './experiment.prompts';

function assert(condition: boolean, label: string): void {
  if (!condition) {
    throw new Error(`experiment.prompts.check failed: ${label}`);
  }
}

const canonical = parseExtractionResponse(
  '{"summary":"Hello","structuredData":{"name":"Yash"}}',
);
assert(canonical.summary === 'Hello', 'canonical summary');
assert(canonical.structuredData.name === 'Yash', 'canonical structuredData');

const flat = parseExtractionResponse(
  '{"name":"Yash","skills":["Go","TypeScript"]}',
);
assert(flat.summary === 'Extracted document data', 'flat default summary');
assert(flat.structuredData.name === 'Yash', 'flat keeps fields');
assert(Array.isArray(flat.structuredData.skills), 'flat keeps arrays');

const siblings = parseExtractionResponse(
  '{"summary":"Resume","skills":["Go"],"experience":[{"company":"Acme"}]}',
);
assert(siblings.summary === 'Resume', 'sibling summary');
assert(
  Array.isArray(siblings.structuredData.skills) &&
    Array.isArray(siblings.structuredData.experience),
  'siblings become structuredData when structuredData key missing/wrong',
);

const arrayPayload = parseExtractionResponse('[{"a":1},{"b":2}]');
assert(
  Array.isArray(arrayPayload.structuredData.items),
  'top-level array wraps as items',
);

const brokenExperience = `{"summary":"x","structuredData":{"skills":["Go"],"experience":[{"company":"SaaS Labs","achievements":["one"]},"aiKnowledge":["MCP"]}}`;
try {
  parseExtractionResponse(brokenExperience);
  throw new Error('expected invalid JSON to throw');
} catch (error) {
  assert(
    error instanceof Error &&
      error.message.includes('invalid extraction JSON'),
    'still rejects truly invalid JSON',
  );
}

console.log('experiment.prompts.check passed');
