import { AiChatMessage, AiCompletionResult } from './ai-provider.types';

export const AI_PROVIDER = Symbol('AI_PROVIDER');

/**
 * Transport-only AI client. Prompt construction belongs in business modules.
 */
export interface AiProvider {
  complete(messages: AiChatMessage[]): Promise<AiCompletionResult>;
}
