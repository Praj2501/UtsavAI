/**
 * In-memory session cache for AI responses keyed by hashed prompt & parameters.
 * Eliminates redundant network calls for identical queries in the same browser session.
 */

export class AiResponseCache {
  private cache = new Map<string, { data: unknown; timestamp: number }>();

  public get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    return entry.data as T;
  }

  public set<T>(key: string, data: T): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  public has(key: string): boolean {
    return this.cache.has(key);
  }

  public clear(): void {
    this.cache.clear();
  }

  public static hashKey(prefix: string, payload: unknown): string {
    const serialized = JSON.stringify(payload);
    let hash = 0;
    for (let i = 0; i < serialized.length; i++) {
      hash = (hash << 5) - hash + serialized.charCodeAt(i);
      hash |= 0;
    }
    return `${prefix}:${hash}`;
  }
}

export const globalAiCache = new AiResponseCache();
