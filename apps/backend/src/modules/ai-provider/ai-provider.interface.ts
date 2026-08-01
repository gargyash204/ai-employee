import {
  AiChatMessage,
  AiCompleteOptions,
  AiCompletionResult,
} from './ai-provider.types';

export const AI_PROVIDER = Symbol('AI_PROVIDER');

/**
 * Transport-only AI client. Prompt construction belongs in business modules.
 */
export interface AiProvider {
  complete(
    messages: AiChatMessage[],
    options?: AiCompleteOptions,
  ): Promise<AiCompletionResult>;
}
