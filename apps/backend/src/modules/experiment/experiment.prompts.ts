import type { AiChatMessage } from '../ai-provider/ai-provider.types';
import { AiProviderError } from '../ai-provider/ai-provider.error';

export type ExtractionResult = {
  summary: string;
  structuredData: Record<string, unknown>;
};

export function buildExtractionMessages(input: {
  instructions: string;
  document: string;
}): AiChatMessage[] {
  const system = [
    'You are a document extraction assistant.',
    'Follow the runtime instructions carefully.',
    'Return a single JSON object (the API enforces JSON mode).',
    'Preferred shape: {"summary":"brief overview","structuredData":{ ...fields }}',
    'You may also return any useful JSON object of extracted fields — the runtime will normalize it.',
    'Put nested lists/objects inside the JSON as needed. Prefer complete, valid structure over brevity.',
  ].join(' ');

  const user = [
    'Runtime instructions:',
    input.instructions.trim() || '(none provided)',
    '',
    'Document:',
    input.document,
  ].join('\n');

  return [
    { role: 'system', content: system },
    { role: 'user', content: user },
  ];
}

export function buildQuestionMessages(input: {
  structuredData: Record<string, unknown>;
  question: string;
}): AiChatMessage[] {
  const system = [
    'You answer questions using only the provided extracted data.',
    'Respond with ONLY the answer text.',
    'Do not explain your reasoning.',
    'If the data does not contain the answer, reply with "Unknown".',
  ].join(' ');

  const user = [
    'Extracted data:',
    JSON.stringify(input.structuredData),
    '',
    'Question:',
    input.question,
  ].join('\n');

  return [
    { role: 'system', content: system },
    { role: 'user', content: user },
  ];
}

/**
 * Normalize any JSON payload into { summary, structuredData }.
 * Accepts the preferred shape, a flat object of fields, or a top-level array.
 */
export function parseExtractionResponse(
  content: string,
  options?: { traceId?: string | null },
): ExtractionResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(extractJsonPayload(content));
  } catch {
    throw new AiProviderError(
      'PROVIDER_FAILURE',
      'AI provider returned invalid extraction JSON',
      { traceId: options?.traceId ?? null, response: content },
    );
  }

  if (Array.isArray(parsed)) {
    return {
      summary: 'Extracted document data',
      structuredData: { items: parsed },
    };
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new AiProviderError(
      'PROVIDER_FAILURE',
      'AI provider returned invalid extraction JSON',
      { traceId: options?.traceId ?? null, response: content },
    );
  }

  const obj = parsed as Record<string, unknown>;
  const hasCanonicalKeys =
    Object.prototype.hasOwnProperty.call(obj, 'summary') ||
    Object.prototype.hasOwnProperty.call(obj, 'structuredData');

  if (!hasCanonicalKeys) {
    return {
      summary: pickSummary(obj) ?? 'Extracted document data',
      structuredData: obj,
    };
  }

  const summary =
    typeof obj.summary === 'string' && obj.summary.trim()
      ? obj.summary.trim()
      : (pickSummary(obj) ?? 'No summary generated');

  const structuredData = normalizeStructuredData(obj);

  return { summary, structuredData };
}

function normalizeStructuredData(
  obj: Record<string, unknown>,
): Record<string, unknown> {
  const raw = obj.structuredData;

  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    return raw as Record<string, unknown>;
  }

  if (Array.isArray(raw)) {
    return { items: raw };
  }

  // summary/structuredData keys present but structuredData unusable —
  // keep sibling fields so we don't drop model output.
  const rest: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (key === 'summary' || key === 'structuredData') {
      continue;
    }
    rest[key] = value;
  }
  return rest;
}

function pickSummary(obj: Record<string, unknown>): string | null {
  for (const key of ['summary', 'description', 'title', 'overview']) {
    const value = obj[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  return null;
}

/** Strip fences / prose; take the outermost JSON value that appears first. */
function extractJsonPayload(content: string): string {
  const stripped = content
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  const objectStart = stripped.indexOf('{');
  const arrayStart = stripped.indexOf('[');

  const startsWithArray =
    arrayStart >= 0 && (objectStart < 0 || arrayStart < objectStart);

  if (startsWithArray) {
    const arrayEnd = stripped.lastIndexOf(']');
    if (arrayEnd > arrayStart) {
      return stripped.slice(arrayStart, arrayEnd + 1);
    }
  }

  if (objectStart >= 0) {
    const objectEnd = stripped.lastIndexOf('}');
    if (objectEnd > objectStart) {
      return stripped.slice(objectStart, objectEnd + 1);
    }
  }

  return stripped;
}
