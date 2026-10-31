import { ZodSchema } from 'zod';
import { AppError, Result } from '../../types/result.types';
import { TrimmedPlanSnapshot } from '../trimmedSnapshot';
import { CopilotTurnOutput } from '../schemas/copilot.schema';

export interface AiRequestOptions {
  signal?: AbortSignal;
  bypassCache?: boolean;
  bypassRateLimit?: boolean;
}

export interface AiProvider {
  readonly isMock: boolean;

  /**
   * Generates structured output validated against a Zod schema with automatic retry.
   */
  generateStructured<T>(
    prompt: string,
    schema: ZodSchema<T>,
    options?: AiRequestOptions
  ): Promise<Result<T, AppError>>;

  /**
   * Generates creative or plain text.
   */
  generateText(
    prompt: string,
    options?: AiRequestOptions
  ): Promise<Result<string, AppError>>;

  /**
   * Executes a conversational Copilot turn with tool-calling capabilities.
   */
  runCopilotTurn(
    userMessage: string,
    planSnapshot: TrimmedPlanSnapshot,
    options?: AiRequestOptions
  ): Promise<Result<CopilotTurnOutput, AppError>>;
}
