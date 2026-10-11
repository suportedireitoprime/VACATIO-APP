/**
 * imageLruMemoryCache.ts — Fase 24 de Otimização de Imagens
 * 
 * Cache em Memória RAM com Política de Descarte LRU (Least Recently Used)
 * 
 * Problema que resolve:
 * No mobile (WebKit/Safari no iOS e WebView no Android), manter centenas de imagens
 * em memória RAM decodificada causa o temido crash silencioso por esgotamento de VRAM (OOM).
 * 
 * Solução de Engenharia:
 * 1. Limita o número de instâncias de imagens retidas a 60 no mobile e 120 no desktop.
 * 2. Quando o limite é atingido, o item acessado há mais tempo (LRU) é automaticamente
 *    desalocado e suas referências limpas para coleta de lixo (GC).
 * 3. Permite acesso a 0ms de CPU nas capas revisitadas com frequência na mesma sessão.
 */
import { Capacitor } from '@capacitor/core';

interface CacheEntry {
  url: string;
  blobUrl?: string;
  accessedAt: number;
  width: number;
}

class ImageLruMemoryCache {
  private cache = new Map<string, CacheEntry>();
  private readonly maxEntries: number;

  constructor() {
    // Mobile opera com teto mais restrito para proteção de VRAM (Item 54 do relatório)
    const isMobile = typeof window !== 'undefined' && (Capacitor.isNativePlatform() || window.innerWidth < 768);
    // @ts-expect-error deviceMemory API experimental
    const deviceMem = typeof navigator !== 'undefined' ? (navigator as any).deviceMemory : undefined;
    // Em dispositivos modestos (ex: <= 4GB RAM no Android), limita a 40 slots para prevenir crash OOM
    if (deviceMem && deviceMem <= 4) {
      this.maxEntries = 40;
    } else {
      this.maxEntries = isMobile ? 60 : 120;
    }

    // Fase 58: Tratamento preventivo de Low Memory e minimização em background no Android/iOS
    if (typeof window !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
          this.trimMemory(15);
        }
      });
      window.addEventListener('lowmemory' as any, () => {
        this.trimMemory(5);
      });
    }
  }

  /**
   * Fase 39: Reduz agressivamente a memória em situações de baixa memória do sistema ou rota pesada
   */
  trimMemory(targetCount = 20): void {
    while (this.cache.size > targetCount) {
      const oldestKey = this.cache.keys().next().value;
      if (!oldestKey) break;
      this.delete(oldestKey);
    }
  }

  get(key: string): CacheEntry | undefined {
    const entry = this.cache.get(key);
    if (entry) {
      // Promove a chave para mais recentemente usada
      this.cache.delete(key);
      entry.accessedAt = Date.now();
      this.cache.set(key, entry);
    }
    return entry;
  }

  set(key: string, data: Omit<CacheEntry, 'accessedAt'>): void {
    if (!key) return;

    // Se a chave já existia, remove antes para reordenar na ponta do Map
    if (this.cache.has(key)) {
      const old = this.cache.get(key);
      if (old?.blobUrl && old.blobUrl !== data.blobUrl && old.blobUrl.startsWith('blob:')) {
        try { URL.revokeObjectURL(old.blobUrl); } catch {}
      }
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxEntries) {
      // Eviction LRU: descarta o primeiro elemento inserido (o mais antigo)
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        const oldestEntry = this.cache.get(oldestKey);
        if (oldestEntry?.blobUrl && oldestEntry.blobUrl.startsWith('blob:')) {
          try { URL.revokeObjectURL(oldestEntry.blobUrl); } catch {}
        }
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(key, {
      ...data,
      accessedAt: Date.now(),
    });
  }

  has(key: string): boolean {
    return this.cache.has(key);
  }

  delete(key: string): boolean {
    const entry = this.cache.get(key);
    if (entry?.blobUrl && entry.blobUrl.startsWith('blob:')) {
      try { URL.revokeObjectURL(entry.blobUrl); } catch {}
    }
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.forEach((entry) => {
      if (entry.blobUrl && entry.blobUrl.startsWith('blob:')) {
        try { URL.revokeObjectURL(entry.blobUrl); } catch {}
      }
    });
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

export const imageLruCache = new ImageLruMemoryCache();
