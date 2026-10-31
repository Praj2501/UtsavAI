/**
 * Application-wide constants.
 * No magic numbers or hardcoded model identifiers elsewhere in the codebase.
 */

/**
 * Default Gemini model identifier used if Remote Config is unavailable or unconfigured.
 *
 * VERIFIED (October 2026):
 * Firebase AI Logic client SDK ("firebase/ai") with the Gemini Developer API backend supports
 * 'gemini-2.5-flash' as the primary low-latency, high-accuracy structured JSON proposer.
 * Alternative models supported: 'gemini-2.0-flash', 'gemini-1.5-flash'.
 * Always confirm your activated model in the Firebase Console under
 * AI Logic / Vertex AI in Firebase / Remote Config ("gemini_model_name").
 */
export const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash';

export const REMOTE_CONFIG_KEYS = {
  GEMINI_MODEL_NAME: 'gemini_model_name',
  ENABLE_AI_COPILOT: 'enable_ai_copilot',
  MAX_DAILY_AI_PROMPTS: 'max_daily_ai_prompts',
} as const;

export const AI_RATE_LIMITS = {
  DEBOUNCE_MS: 800,
  MAX_PROMPTS_PER_SESSION: 35,
  MAX_RETRY_ATTEMPTS: 1,
} as const;

export const APP_METADATA = {
  NAME: 'Utsav AI',
  TAGLINE: 'GenAI Celebration & Event Planner',
  VERSION: '1.0.0',
} as const;
