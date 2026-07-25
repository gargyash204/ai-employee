/**
 * ponytail: smallest check for Langfuse URL + usage shaping.
 * Run: npx ts-node --transpile-only src/modules/langfuse/langfuse.selfcheck.ts
 */
import assert from 'node:assert/strict';

function getTraceUrl(uiUrl: string, traceId: string): string {
  return `${uiUrl.replace(/\/$/, '')}/trace/${traceId}`;
}

function toLangfuseUsage(usage: {
  inputTokens: number | null;
  outputTokens: number | null;
  totalTokens: number | null;
  cost: number | null;
}): Record<string, number> | null {
  const body: Record<string, number> = {};
  if (usage.inputTokens !== null) body.input = usage.inputTokens;
  if (usage.outputTokens !== null) body.output = usage.outputTokens;
  if (usage.totalTokens !== null) body.total = usage.totalTokens;
  if (usage.cost !== null) body.totalCost = usage.cost;
  return Object.keys(body).length > 0 ? body : null;
}

assert.equal(
  getTraceUrl('http://localhost:3100/', 'abc'),
  'http://localhost:3100/trace/abc',
);
assert.deepEqual(
  toLangfuseUsage({
    inputTokens: 10,
    outputTokens: 5,
    totalTokens: 15,
    cost: null,
  }),
  { input: 10, output: 5, total: 15 },
);
assert.equal(
  toLangfuseUsage({
    inputTokens: null,
    outputTokens: null,
    totalTokens: null,
    cost: null,
  }),
  null,
);

console.log('langfuse.selfcheck ok');
