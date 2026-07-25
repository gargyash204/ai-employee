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
    'Respond with ONLY valid JSON in this shape:',
    '{"summary":"brief natural language summary","structuredData":{}}',
    'Do not wrap the JSON in markdown fences.',
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

export function parseExtractionResponse(content: string): ExtractionResult {
  const normalized = content
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  try {
    const parsed = JSON.parse(normalized) as {
      summary?: unknown;
      structuredData?: unknown;
    };

    const summary =
      typeof parsed.summary === 'string' ? parsed.summary.trim() : '';
    const structuredData =
      parsed.structuredData &&
      typeof parsed.structuredData === 'object' &&
      !Array.isArray(parsed.structuredData)
        ? (parsed.structuredData as Record<string, unknown>)
        : {};

    return {
      summary: summary || 'No summary generated',
      structuredData,
    };
  } catch {
    throw new AiProviderError(
      'PROVIDER_FAILURE',
      'AI provider returned invalid extraction JSON',
    );
  }
}
