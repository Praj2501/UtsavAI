import { ZodSchema } from 'zod';
import { AppError, Result, err, ok } from '../types/result.types';

/**
 * Shared validation and retry wrapper for LLM responses.
 * Parses response JSON against a Zod schema. If parsing fails, retries once
 * with diagnostic feedback before returning an AppError.
 */
export async function withValidationRetry<T>(
  schema: ZodSchema<T>,
  fetchRawResponse: (feedbackPrompt?: string) => Promise<string>
): Promise<Result<T, AppError>> {
  // First attempt
  let raw: string;
  try {
    raw = await fetchRawResponse();
  } catch (error: unknown) {
    const e = error as Error;
    return err({
      code: 'ai/network-error',
      message: e.message || 'Failed to fetch AI response',
    });
  }

  const firstAttempt = tryParseJsonAndValidate(raw, schema);
  if (firstAttempt.ok) {
    return ok(firstAttempt.value);
  }

  // Second attempt with feedback
  const feedbackMessage = `Your previous output did not match the required schema: ${firstAttempt.error.message}. Please output strictly valid JSON conforming to the schema.`;

  try {
    const retryRaw = await fetchRawResponse(feedbackMessage);
    const retryAttempt = tryParseJsonAndValidate(retryRaw, schema);
    if (retryAttempt.ok) {
      return ok(retryAttempt.value);
    }
    return err(retryAttempt.error);
  } catch (error: unknown) {
    const e = error as Error;
    return err({
      code: 'ai/retry-failed',
      message: e.message || 'Retry attempt failed',
    });
  }
}

function tryParseJsonAndValidate<T>(
  raw: string,
  schema: ZodSchema<T>
): Result<T, AppError> {
  let parsedJson: unknown;
  try {
    // Strip markdown code fences if present (e.g. ```json ... ```)
    const cleaned = raw.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
    parsedJson = JSON.parse(cleaned);
  } catch {
    return err({
      code: 'ai/malformed-json',
      message: 'Model response was not valid JSON',
      details: raw.slice(0, 200),
    });
  }

  const validation = schema.safeParse(parsedJson);
  if (!validation.success) {
    return err({
      code: 'ai/schema-validation-failed',
      message: validation.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', '),
      details: validation.error.format(),
    });
  }

  return ok(validation.data);
}
