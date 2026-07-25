/**
 * @deprecated Prefer AnswerComparator from evaluation module.
 * Kept as a thin re-export so existing imports keep working.
 */
export {
  type AnswerComparator as AnswerComparer,
  type AnswerComparisonResult,
  ExactMatchComparator as NormalizedExactComparer,
  SemanticMatchComparator as SemanticMatchComparer,
  SEMANTIC_PASS_THRESHOLD,
} from '../evaluation/answer-comparator';
