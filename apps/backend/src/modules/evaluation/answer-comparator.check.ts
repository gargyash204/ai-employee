/**
 * Runnable self-check for semantic score parsing.
 * Run: npx ts-node -r tsconfig-paths/register src/modules/evaluation/answer-comparator.check.ts
 */
import {
  parseSemanticScore,
  SEMANTIC_PASS_THRESHOLD,
} from './answer-comparator';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

assert(parseSemanticScore('{"score":8}') === 8, 'parses integer score');
assert(parseSemanticScore('{"score":"9"}') === 9, 'parses string score');
assert(parseSemanticScore('```json\n{"score":10}\n```') === 10, 'strips fences');
assert(parseSemanticScore('{"score":11}') === 10, 'clamps high');
assert(parseSemanticScore('{"score":-1}') === 0, 'clamps low');
assert(8 > SEMANTIC_PASS_THRESHOLD, '8 should pass');
assert(!(7 > SEMANTIC_PASS_THRESHOLD), '7 should fail');

let threw = false;
try {
  parseSemanticScore('not-json');
} catch {
  threw = true;
}
assert(threw, 'invalid JSON should throw');

console.log('answer-comparator.check: ok');
