import type { AiChatMessage } from '../ai-provider/ai-provider.types';
import { AiProviderError } from '../ai-provider/ai-provider.error';

export function buildProductionAnswerMessages(input: {
  instructions: string;
  summary: string;
  structuredData: Record<string, unknown>;
}): AiChatMessage[] {
  const system = [
    'You produce production answers from extracted document data.',
    'Follow the runtime instructions carefully.',
    'Return a single JSON object (the API enforces JSON mode).',
    'Preferred shape: {"answers":{"key":"value"},"notes":"optional notes"}',
    'You may also return a flat object of answer fields — the runtime will normalize it.',
  ].join(' ');

  const user = [
    'Runtime instructions:',
    input.instructions.trim() || '(none provided)',
    '',
    'Extraction summary:',
    input.summary,
    '',
    'Structured data:',
    JSON.stringify(input.structuredData),
  ].join('\n');

  return [
    { role: 'system', content: system },
    { role: 'user', content: user },
  ];
}

/**
 * Normalize answer JSON into { answers, notes? }.
 * Accepts preferred shape or any flat object of answer fields.
 */
export function parseProductionAnswers(
  content: string,
  options?: { traceId?: string | null },
): Record<string, unknown> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(extractJsonPayload(content));
  } catch {
    throw new AiProviderError(
      'PROVIDER_FAILURE',
      'AI provider returned invalid answers JSON',
      { traceId: options?.traceId ?? null, response: content },
    );
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new AiProviderError(
      'PROVIDER_FAILURE',
      'AI provider returned invalid answers JSON',
      { traceId: options?.traceId ?? null, response: content },
    );
  }

  const obj = parsed as Record<string, unknown>;

  if (
    obj.answers &&
    typeof obj.answers === 'object' &&
    !Array.isArray(obj.answers)
  ) {
    const notes =
      typeof obj.notes === 'string' ? obj.notes.trim() : undefined;
    return {
      answers: obj.answers as Record<string, unknown>,
      ...(notes ? { notes } : {}),
    };
  }

  const notes =
    typeof obj.notes === 'string' ? obj.notes.trim() : undefined;
  const answers: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (key === 'notes') {
      continue;
    }
    answers[key] = value;
  }

  return {
    answers,
    ...(notes ? { notes } : {}),
  };
}

function extractJsonPayload(content: string): string {
  const stripped = content
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  const start = stripped.indexOf('{');
  const end = stripped.lastIndexOf('}');
  if (start >= 0 && end > start) {
    return stripped.slice(start, end + 1);
  }

  return stripped;
}
