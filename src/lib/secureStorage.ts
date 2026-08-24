/**
 * Secure storage wrapper — Keystore (Android) / Keychain (iOS) on native,
 * localStorage fallback on web. API mirrors Web Storage (async).
 *
 * On native, transparently migrates any existing `sb-*` (Supabase) tokens
 * from localStorage into the secure store on first read — no explicit
 * migration step required at boot.
 */
import { Capacitor } from '@capacitor/core';
import { SecureStorage } from '@aparajita/capacitor-secure-storage';

const isNative = Capacitor.isNativePlatform();

async function nativeGet(key: string): Promise<string | null> {
  try {
    const v = await SecureStorage.get(key);
    return v == null ? null : String(v);
  } catch {
    return null;
  }
}

async function nativeSet(key: string, value: string): Promise<void> {
  // Signature: set(key, value, sync=false, access=null)
  await SecureStorage.set(key, value, false, false);
}

async function nativeRemove(key: string): Promise<void> {
  try {
    await SecureStorage.remove(key);
  } catch {
    /* noop */
  }
}

export const secureStorage = {
  async getItem(key: string): Promise<string | null> {
    if (!isNative) return localStorage.getItem(key);
    const secure = await nativeGet(key);
    if (secure != null) return secure;
    // Transparent migration from legacy localStorage
    const legacy = localStorage.getItem(key);
    if (legacy) {
      try {
        await nativeSet(key, legacy);
        localStorage.removeItem(key);
      } catch (e) {
        console.warn('[secureStorage] migration failed for', key, e);
      }
      return legacy;
    }
    return null;
  },
  async setItem(key: string, value: string): Promise<void> {
    if (!isNative) {
      localStorage.setItem(key, value);
      return;
    }
    try {
      await nativeSet(key, value);
    } catch (e) {
      console.warn('[secureStorage] set failed, falling back to localStorage', e);
      localStorage.setItem(key, value);
    }
  },
  async removeItem(key: string): Promise<void> {
    if (!isNative) {
      localStorage.removeItem(key);
      return;
    }
    await nativeRemove(key);
    // Also clear any legacy localStorage copy
    try {
      localStorage.removeItem(key);
    } catch {
      /* noop */
    }
  },
};
