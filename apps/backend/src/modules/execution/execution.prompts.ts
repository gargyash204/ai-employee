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
    'Respond with ONLY valid JSON in this shape:',
    '{"answers":{"key":"value"},"notes":"optional notes"}',
    'Do not wrap the JSON in markdown fences.',
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

export function parseProductionAnswers(
  content: string,
): Record<string, unknown> {
  const normalized = content
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  try {
    const parsed = JSON.parse(normalized) as {
      answers?: unknown;
      notes?: unknown;
    };

    const answers =
      parsed.answers &&
      typeof parsed.answers === 'object' &&
      !Array.isArray(parsed.answers)
        ? (parsed.answers as Record<string, unknown>)
        : {};

    const notes =
      typeof parsed.notes === 'string' ? parsed.notes.trim() : undefined;

    return {
      answers,
      ...(notes ? { notes } : {}),
    };
  } catch {
    throw new AiProviderError(
      'PROVIDER_FAILURE',
      'AI provider returned invalid answers JSON',
    );
  }
}
