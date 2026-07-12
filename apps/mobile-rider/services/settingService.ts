import * as SecureStore from 'expo-secure-store';

export interface RiderSettings {
  notifications: boolean;
  sound: boolean;
  haptics: boolean;
  darkMap: boolean;
  darkMode: boolean;
  autoAccept: boolean;
}

const DEFAULT_SETTINGS: RiderSettings = {
  notifications: true,
  sound: true,
  haptics: true,
  darkMap: false,
  darkMode: false,
  autoAccept: false,
};

const STORAGE_KEY = 'ethio_rider_settings';

class SettingService {
  private cache: RiderSettings | null = null;
  private listeners: Set<(settings: RiderSettings) => void> = new Set();

  async getSettings(): Promise<RiderSettings> {
    if (this.cache) return this.cache;

    let next: RiderSettings;
    try {
      const stored = await SecureStore.getItemAsync(STORAGE_KEY);
      next = stored ? { ...DEFAULT_SETTINGS, ...JSON.parse(stored) } : { ...DEFAULT_SETTINGS };
    } catch (err) {
      console.error('Failed to load settings:', err);
      next = { ...DEFAULT_SETTINGS };
    }
    this.cache = next;
    return next;
  }

  async updateSettings(updates: Partial<RiderSettings>): Promise<RiderSettings> {
    const current = await this.getSettings();
    const next = { ...current, ...updates };
    this.cache = next;
    
    try {
      await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(next));
    } catch (err) {
      console.error('Failed to save settings:', err);
    }
    
    this.notify();
    return next;
  }

  subscribe(callback: (settings: RiderSettings) => void): () => void {
    this.listeners.add(callback);
    
    if (this.cache) {
      callback(this.cache);
    } else {
      // If cache is empty, fetch from storage then callback
      this.getSettings().then(settings => {
        if (this.listeners.has(callback)) {
          callback(settings);
        }
      });
    }
    
    return () => {
      this.listeners.delete(callback);
    };
  }

  private notify() {
    if (!this.cache) return;
    this.listeners.forEach(cb => cb(this.cache!));
  }
}

export const settingService = new SettingService();
