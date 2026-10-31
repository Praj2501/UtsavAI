import { fetchAndActivate, getValue } from 'firebase/remote-config';
import { remoteConfig } from './firebase';
import { DEFAULT_GEMINI_MODEL, REMOTE_CONFIG_KEYS } from '../constants/app.constants';

/**
 * Retrieves the current configured Gemini model identifier.
 * First queries Firebase Remote Config. If unavailable, falls back to DEFAULT_GEMINI_MODEL.
 *
 * NOTE: Ensure the model configured in the Firebase Console under
 * Remote Config -> "gemini_model_name" matches the available Developer API model.
 */
export async function getGeminiModelName(): Promise<string> {
  if (!remoteConfig) {
    return DEFAULT_GEMINI_MODEL;
  }
  try {
    await fetchAndActivate(remoteConfig);
    const configuredModel = getValue(remoteConfig, REMOTE_CONFIG_KEYS.GEMINI_MODEL_NAME).asString();
    return configuredModel || DEFAULT_GEMINI_MODEL;
  } catch {
    return DEFAULT_GEMINI_MODEL;
  }
}
