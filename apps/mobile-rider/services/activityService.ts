import * as SecureStore from 'expo-secure-store';

// Local activity feed service. This never fabricates entries — it only
// persists real notifications that were actually delivered to the device
// (settlement decisions, deactivation, new missions, etc.), captured by the
// notification-received listener in app/(tabs)/_layout.tsx, so the Activity
// screen always reflects genuine events instead of placeholder content.

export interface ActivityEntry {
  id: string;
  title: string;
  body: string;
  receivedAt: string; // ISO timestamp
  read: boolean;
  data?: Record<string, unknown>;
}

const STORAGE_KEY = 'ethio_rider_activity_feed';
const MAX_ENTRIES = 100;

class ActivityService {
  private cache: ActivityEntry[] | null = null;
  private listeners: Set<(entries: ActivityEntry[]) => void> = new Set();
  private loadPromise: Promise<ActivityEntry[]> | null = null;

  private async load(): Promise<ActivityEntry[]> {
    if (this.cache) return this.cache;
    if (this.loadPromise) return this.loadPromise;

    this.loadPromise = (async () => {
      let next: ActivityEntry[];
      try {
        const stored = await SecureStore.getItemAsync(STORAGE_KEY);
        next = stored ? JSON.parse(stored) : [];
      } catch (err) {
        console.error('Failed to load activity feed:', err);
        next = [];
      }
      this.cache = next;
      return next;
    })();

    return this.loadPromise;
  }

  private async persist() {
    if (!this.cache) return;
    try {
      await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(this.cache));
    } catch (err) {
      console.error('Failed to save activity feed:', err);
    }
  }

  private notify() {
    if (!this.cache) return;
    this.listeners.forEach((cb) => cb(this.cache!));
  }

  /** Record a real, actually-received notification into the feed. */
  async addEntry(entry: { title: string; body: string; data?: Record<string, unknown> }): Promise<void> {
    const current = await this.load();
    const next: ActivityEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      title: entry.title || 'Notification',
      body: entry.body || '',
      receivedAt: new Date().toISOString(),
      read: false,
      data: entry.data || {},
    };
    this.cache = [next, ...current].slice(0, MAX_ENTRIES);
    await this.persist();
    this.notify();
  }

  async markAllRead(): Promise<void> {
    const current = await this.load();
    if (current.every((e) => e.read)) return;
    this.cache = current.map((e) => ({ ...e, read: true }));
    await this.persist();
    this.notify();
  }

  subscribe(callback: (entries: ActivityEntry[]) => void): () => void {
    this.listeners.add(callback);

    if (this.cache) {
      callback(this.cache);
    } else {
      this.load().then((entries) => {
        if (this.listeners.has(callback)) {
          callback(entries);
        }
      });
    }

    return () => {
      this.listeners.delete(callback);
    };
  }
}

export const activityService = new ActivityService();
