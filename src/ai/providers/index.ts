import { AiProvider } from './AiProvider.interface';
import { MockAiProvider } from './MockAiProvider';
import { FirebaseAiProvider } from './FirebaseAiProvider';
import { isDemoMode } from '../../services/firebase';

let cachedProvider: AiProvider | null = null;

export function getAiProvider(): AiProvider {
  if (cachedProvider) {
    return cachedProvider;
  }

  if (isDemoMode) {
    cachedProvider = new MockAiProvider();
  } else {
    cachedProvider = new FirebaseAiProvider();
  }

  return cachedProvider;
}

export { MockAiProvider, FirebaseAiProvider };
export type { AiProvider };
