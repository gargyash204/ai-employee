import type { AiProvider } from '../ai-provider/ai-provider.interface';
import type { AiChatMessage } from '../ai-provider/ai-provider.types';
import { AiProviderError } from '../ai-provider/ai-provider.error';

/** Pass when semantic score is strictly greater than this (out of 10). */
export const SEMANTIC_PASS_THRESHOLD = 7;

export type AnswerComparisonResult = {
  /** Semantic match score from 0–10. */
  score: number;
  passed: boolean;
};

/**
 * Answer comparison strategy.
 * Swap implementation later without changing the evaluation flow.
 */
export interface AnswerComparator {
  compare(
    actualAnswer: string,
    expectedAnswer: string,
  ): Promise<AnswerComparisonResult>;
}

function normalizeAnswer(value: string): string {
  return value
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .trim()
    .toLowerCase()
    .replace(/[ \t]+/g, ' ')
    .replace(/\n+/g, '\n');
}

function toResult(score: number): AnswerComparisonResult {
  const clamped = Math.max(0, Math.min(10, score));
  return {
    score: clamped,
    passed: clamped > SEMANTIC_PASS_THRESHOLD,
  };
}

export function buildSemanticMatchMessages(input: {
  actualAnswer: string;
  expectedAnswer: string;
}): AiChatMessage[] {
  const system = [
    'You are an answer grader.',
    'Compare the actual answer to the expected answer by meaning, not exact wording.',
    'Synonyms, rephrasing, and equivalent facts should score high.',
    'Contradictions, missing key facts, or wrong values should score low.',
    'Respond with ONLY valid JSON in this shape: {"score":<integer 0-10>}',
    'Do not wrap the JSON in markdown fences.',
  ].join(' ');

  const user = [
    'Expected answer:',
    input.expectedAnswer,
    '',
    'Actual answer:',
    input.actualAnswer,
  ].join('\n');

  return [
    { role: 'system', content: system },
    { role: 'user', content: user },
  ];
}

export function parseSemanticScore(content: string): number {
  const normalized = content
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  try {
    const parsed = JSON.parse(normalized) as { score?: unknown };
    const raw = parsed.score;
    const score =
      typeof raw === 'number'
        ? raw
        : typeof raw === 'string'
          ? Number(raw)
          : NaN;

    if (!Number.isFinite(score)) {
      throw new Error('non-finite');
    }

    return Math.round(Math.max(0, Math.min(10, score)));
  } catch {
    throw new AiProviderError(
      'PROVIDER_FAILURE',
      'AI provider returned invalid semantic match score JSON',
    );
  }
}

export class ExactMatchComparator implements AnswerComparator {
  async compare(
    actualAnswer: string,
    expectedAnswer: string,
  ): Promise<AnswerComparisonResult> {
    const matched =
      normalizeAnswer(actualAnswer) === normalizeAnswer(expectedAnswer);
    return toResult(matched ? 10 : 0);
  }
}

/**
 * LLM-as-a-judge: scores meaning similarity 0–10; passes when score > 7.
 */
export class SemanticMatchComparator implements AnswerComparator {
  constructor(private readonly aiProvider: AiProvider) {}

  async compare(
    actualAnswer: string,
    expectedAnswer: string,
  ): Promise<AnswerComparisonResult> {
    if (!actualAnswer.trim() && !expectedAnswer.trim()) {
      return toResult(10);
    }
    if (!actualAnswer.trim() || !expectedAnswer.trim()) {
      return toResult(0);
    }
    if (normalizeAnswer(actualAnswer) === normalizeAnswer(expectedAnswer)) {
      return toResult(10);
    }

    const completion = await this.aiProvider.complete(
      buildSemanticMatchMessages({ actualAnswer, expectedAnswer }),
    );
    return toResult(parseSemanticScore(completion.content));
  }
}
