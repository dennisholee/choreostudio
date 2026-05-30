import { createHash } from 'crypto';

export interface CachedFragment {
  hash: string;
  fragment: Record<string, unknown>;
}

/** In-memory fragment cache keyed by element id */
export class FragmentCache {
  private cache = new Map<string, CachedFragment>();
  private _hits = 0;

  contentHash(element: Record<string, unknown>): string {
    return createHash('sha256').update(JSON.stringify(element)).digest('hex').slice(0, 16);
  }

  get(id: string, currentHash: string): Record<string, unknown> | null {
    const entry = this.cache.get(id);
    if (entry && entry.hash === currentHash) {
      return entry.fragment;
    }

    return null;
  }

  set(id: string, hash: string, fragment: Record<string, unknown>): void {
    this.cache.set(id, { hash, fragment });
  }

  invalidate(id: string): void {
    this.cache.delete(id);
  }

  get size(): number {
    return this.cache.size;
  }

  get hitCount(): number {
    return this._hits;
  }

  getWithTracking(id: string, currentHash: string): Record<string, unknown> | null {
    const result = this.get(id, currentHash);
    if (result) {
      this._hits++;
    }

    return result;
  }

  resetHits(): void {
    this._hits = 0;
  }
}
