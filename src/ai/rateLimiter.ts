import { AI_RATE_LIMITS } from '../constants/app.constants';
import { AppError, Result, err, ok } from '../types/result.types';

export class AiRateLimiter {
  private lastRequestTime = 0;
  private sessionRequestCount = 0;

  constructor(
    private readonly debounceMs: number = AI_RATE_LIMITS.DEBOUNCE_MS,
    private readonly maxRequestsPerSession: number = AI_RATE_LIMITS.MAX_PROMPTS_PER_SESSION
  ) {}

  public checkLimit(now: number = Date.now()): Result<void, AppError> {
    if (this.sessionRequestCount >= this.maxRequestsPerSession) {
      return err({
        code: 'ai/quota-exceeded',
        message: 'Session AI request cap reached. You can continue planning manually or refresh the session.',
      });
    }

    const elapsed = now - this.lastRequestTime;
    if (elapsed < this.debounceMs) {
      return err({
        code: 'ai/rate-limited',
        message: `Please wait ${Math.ceil((this.debounceMs - elapsed) / 1000)} seconds before sending another AI request.`,
      });
    }

    return ok(undefined);
  }

  public recordRequest(now: number = Date.now()): void {
    this.lastRequestTime = now;
    this.sessionRequestCount += 1;
  }

  public getSessionCount(): number {
    return this.sessionRequestCount;
  }

  public reset(): void {
    this.lastRequestTime = 0;
    this.sessionRequestCount = 0;
  }
}

export const globalAiRateLimiter = new AiRateLimiter();
