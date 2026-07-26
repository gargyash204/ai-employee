/**
 * ponytail: smallest check for Langfuse URL + usage shaping.
 * Run: npx ts-node --transpile-only src/modules/langfuse/langfuse.selfcheck.ts
 */
import assert from 'node:assert/strict';

function getTraceUrl(
  uiUrl: string,
  projectId: string,
  traceId: string,
): string {
  return `${uiUrl.replace(/\/$/, '')}/project/${projectId}/traces/${traceId}`;
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
  getTraceUrl('http://localhost:3100/', 'zamp-project', 'abc'),
  'http://localhost:3100/project/zamp-project/traces/abc',
);
assert.equal(
  getTraceUrl(
    'https://us.cloud.langfuse.com',
    'cms0fth8k0cv5ad0g0paxtw4r',
    '60eb1e08-ce8a-4e0f-be2d-6a71c3371467',
  ),
  'https://us.cloud.langfuse.com/project/cms0fth8k0cv5ad0g0paxtw4r/traces/60eb1e08-ce8a-4e0f-be2d-6a71c3371467',
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
