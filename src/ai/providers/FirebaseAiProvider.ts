import { ZodSchema } from 'zod';
import { AiProvider, AiRequestOptions } from './AiProvider.interface';
import { AppError, Result, err, ok } from '../../types/result.types';
import { TrimmedPlanSnapshot } from '../trimmedSnapshot';
import { CopilotTurnOutput, CopilotTurnOutputSchema } from '../schemas/copilot.schema';
import { withValidationRetry } from '../withValidationRetry';
import { globalAiCache, AiResponseCache } from '../cache';
import { globalAiRateLimiter } from '../rateLimiter';
import { getGeminiModelName } from '../../services/remoteConfig.service';
import { app } from '../../services/firebase';

export class FirebaseAiProvider implements AiProvider {
  public readonly isMock = false;

  /** Builds a Gemini Developer API model (free tier, no Vertex/billing). */
  private async createModel(temperature: number, json: boolean) {
    const { getAI, getGenerativeModel, GoogleAIBackend } = await import('firebase/ai');
    const ai = getAI(app, { backend: new GoogleAIBackend() });
    const modelName = await getGeminiModelName();

    return getGenerativeModel(ai, {
      model: modelName,
      generationConfig: {
        temperature,
        ...(json ? { responseMimeType: 'application/json' } : {}),
      },
    });
  }

  private checkRate(options?: AiRequestOptions): Result<true, AppError> {
    if (options?.bypassRateLimit) return ok(true);
    const rateCheck = globalAiRateLimiter.checkLimit();
    if (!rateCheck.ok) return rateCheck;
    globalAiRateLimiter.recordRequest();
    return ok(true);
  }

  public async generateStructured<T>(
    prompt: string,
    schema: ZodSchema<T>,
    options?: AiRequestOptions
  ): Promise<Result<T, AppError>> {
    const rate = this.checkRate(options);
    if (!rate.ok) return rate;

    const cacheKey = AiResponseCache.hashKey('firebase:structured', prompt);
    if (!options?.bypassCache && globalAiCache.has(cacheKey)) {
      return ok(globalAiCache.get<T>(cacheKey)!);
    }

    const result = await withValidationRetry(schema, async feedback => {
      if (options?.signal?.aborted) {
        throw new Error('Request aborted by user');
      }
      const model = await this.createModel(0.4, true);
      const finalPrompt = feedback ? `${prompt}\n\nRETRY FEEDBACK: ${feedback}` : prompt;
      const res = await model.generateContent(finalPrompt);
      return res.response.text();
    });

    if (result.ok) {
      globalAiCache.set(cacheKey, result.value);
    }
    return result;
  }

  public async generateText(
    prompt: string,
    options?: AiRequestOptions
  ): Promise<Result<string, AppError>> {
    const rate = this.checkRate(options);
    if (!rate.ok) return rate;

    const cacheKey = AiResponseCache.hashKey('firebase:text', prompt);
    if (!options?.bypassCache && globalAiCache.has(cacheKey)) {
      return ok(globalAiCache.get<string>(cacheKey)!);
    }

    try {
      if (options?.signal?.aborted) {
        return err({ code: 'ai/aborted', message: 'Request aborted by user' });
      }
      const model = await this.createModel(0.8, false);
      const res = await model.generateContent(prompt);
      const text = res.response.text();
      globalAiCache.set(cacheKey, text);
      return ok(text);
    } catch (error: unknown) {
      const e = error as Error;
      return err({ code: 'ai/generation-failed', message: e.message || 'Text generation failed' });
    }
  }

  public async runCopilotTurn(
    userMessage: string,
    planSnapshot: TrimmedPlanSnapshot,
    options?: AiRequestOptions
  ): Promise<Result<CopilotTurnOutput, AppError>> {
    const { copilotPromptV1 } = await import('../prompts/copilot.v1');
    const prompt = copilotPromptV1.build({ userMessage, planSnapshot });
    return this.generateStructured(prompt, CopilotTurnOutputSchema, options);
  }
}