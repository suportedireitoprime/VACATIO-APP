import { supabase } from '@/integrations/supabase/client';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';

/**
 * Roteador genérico de deep links nativos.
 * Formatos suportados:
 *   - vacatio://lei/{slug}/art-{numero}
 *   - vacatio://noticia/{id}
 *   - vacatio://radar/pl/{id}
 *   - https://vacatio.com.br/lei/{slug}/art-{numero}  (App Links, mesmo layout)
 *
 * Uso: chamar `initDeepLinkRouter(navigate)` uma vez no root do app.
 * O router ignora URLs de OAuth (delegadas ao useAuth) — nunca duplica.
 */

let listener: { remove: () => void } | undefined;
let appUrlOpened = false;

type NavigateFn = (path: string) => void;

const SMART_LINK_ORIGIN = 'https://vacatio.com.br';
const DEFERRED_CONSUMED_KEY = 'vacatio.deferred_deep_link_consumed';

function parseDeepLink(url: string): string | null {
  // OAuth callback → deixar useAuth cuidar
  if (url.includes('auth-callback')) return null;

  try {
    const u = new URL(url);
    // Extrai path/params. Suporta tanto esquema custom (vacatio://lei/...)
    // quanto App Links (https://vacatio.com.br/lei/...).
    const isCustomScheme = u.protocol === 'br.com.vacatio.app:' || u.protocol === 'vacatio:';
    const isAppLink =
      (u.protocol === 'https:' || u.protocol === 'http:') &&
      (u.hostname === 'vacatio.com.br' || u.hostname === 'www.vacatio.com.br');

    if (!isCustomScheme && !isAppLink) return null;

    // Em vacatio://lei/xyz, o hostname vira "lei" e pathname "/xyz"
    // Em https://vacatio.com.br/lei/xyz, hostname é o domínio e pathname "/lei/xyz"
    const rawPath = isCustomScheme
      ? `/${u.hostname}${u.pathname}`.replace(/\/+/g, '/')
      : u.pathname;

    const rawSegments = rawPath.split('/').filter(Boolean);
    // Smart-link prefix "/ir/..." → trata como se fosse deep link direto
    const segments = rawSegments[0] === 'ir' ? rawSegments.slice(1) : rawSegments;
    if (segments.length === 0) return '/';

    const [type, ...rest] = segments;

    switch (type) {
      case 'lei': {
        // /lei/{slug} ou /lei/{slug}/art-{n}
        const slug = rest[0];
        const artPart = rest[1]; // ex: "art-5"
        if (!slug) return '/';
        const artigoMatch = artPart?.match(/^art-?(.+)$/i);
        if (artigoMatch) {
          return `/legislacao/${slug}?artigo=${encodeURIComponent(artigoMatch[1])}`;
        }
        return `/legislacao/${slug}`;
      }
      case 'noticia':
        return rest[0] ? `/noticias?id=${encodeURIComponent(rest[0])}` : '/noticias';
      case 'radar':
        if (rest[0] === 'pl' && rest[1]) return `/radar/pl/${rest[1]}`;
        if (rest[0] === 'deputado' && rest[1]) return `/radar/deputado/${rest[1]}`;
        return '/radar-360';
      case 'novidades':
        return '/novidades';
      case 'buscar':
      case 'search':
        return '/buscar';
      case 'evelyn':
      case 'assistente':
        return '/assistente';
      case 'radar-360':
        return '/radar-360';
      case 'aprender':
        return rest[0] ? `/aprender/${rest[0]}` : '/aprender';
      case 'audio':
        return '/anotacoes/audio';
      case 'lembretes':
        return rest[0] === 'local' ? '/lembretes/local' : '/meus-lembretes';
      case 'leitura':
      case 'continuar':
        return '/biblioteca?continuar=1';
      case 'livro':
      case 'biblioteca':
        return rest[0] ? `/biblioteca?livro=${encodeURIComponent(rest[0])}` : '/biblioteca';
      case 'frase':
        return rest[0] ? `/biblioteca?frase=${encodeURIComponent(rest[0])}` : '/biblioteca';
      case 'resumo':
        return rest[0] ? `/resumos-juridicos?id=${encodeURIComponent(rest[0])}` : '/resumos-juridicos';
      case 'dicionario':
        return rest[0] ? `/dicionario?termo=${encodeURIComponent(rest[0])}` : '/dicionario';
      case 'shortcut': {
        // vacatio://shortcut/<slug>
        // Fallback: delega ao mapa em nativeShortcuts.ts
        return rest[0] ? `/${rest[0]}` : '/';
      }
      default:
        return `/${segments.join('/')}`;
    }
  } catch (e) {
    console.warn('Deep link parse falhou', url, e);
    return null;
  }
}

export async function initDeepLinkRouter(navigate: NavigateFn) {
  if (!Capacitor.isNativePlatform()) return;
  if (listener) return; // já inicializado

  try {
    listener = await CapacitorApp.addListener('appUrlOpen', ({ url }) => {
      appUrlOpened = true;
      const target = parseDeepLink(url);
      if (target) {
        setTimeout(() => navigate(target), 50);
      }
    });
  } catch (e) {
    console.warn('DeepLink init falhou', e);
  }

  // Deferred deep link — só na primeira execução após instalação
  try {
    if (localStorage.getItem(DEFERRED_CONSUMED_KEY) === '1') return;
    // aguarda um pouco pra dar chance ao appUrlOpen "quente" chegar primeiro
    setTimeout(() => consumeDeferredDeepLink(navigate), 800);
  } catch { /* noop */ }
}

async function consumeDeferredDeepLink(navigate: NavigateFn) {
  if (appUrlOpened) {
    localStorage.setItem(DEFERRED_CONSUMED_KEY, '1');
    return;
  }
  const platform = Capacitor.getPlatform();
  try {
    if (platform === 'android') {
      // Play Install Referrer
      try {
        const pluginName = '@capacitor-community/play-install-referrer';
        const mod: any = await import(/* @vite-ignore */ pluginName).catch(() => null);
        const plugin = mod?.PlayInstallReferrer;
        if (plugin?.getReferrerDetails) {
          const res = await plugin.getReferrerDetails();
          const referrer: string = res?.referrerUrl || res?.installReferrer || '';
          const match = referrer.match(/vacatio_link=([^&]+)/);
          if (match) {
            const target = decodeURIComponent(match[1]);
            if (target.startsWith('/')) {
              localStorage.setItem(DEFERRED_CONSUMED_KEY, '1');
              setTimeout(() => navigate(target), 100);
              return;
            }
          }
        }
      } catch (e) {
        console.warn('PlayInstallReferrer indisponível', e);
      }
    } else if (platform === 'ios') {
      // fingerprint-based consume via edge function
      try {
        const { data } = await supabase.functions.invoke('smart-link-claim', {
          body: { action: 'consume' },
        });
        const target = (data as any)?.target_path;
        if (target && typeof target === 'string' && target.startsWith('/')) {
          localStorage.setItem(DEFERRED_CONSUMED_KEY, '1');
          setTimeout(() => navigate(target), 100);
          return;
        }
      } catch (e) {
        console.warn('smart-link consume falhou', e);
      }
    }
    // marca como consumido mesmo sem match, pra não repetir em toda abertura
    localStorage.setItem(DEFERRED_CONSUMED_KEY, '1');
  } catch { /* noop */ }
}

export function disposeDeepLinkRouter() {
  listener?.remove();
  listener = undefined;
}

/** Gera URL compartilhável (App Link) para um artigo. */
export function buildArtigoShareUrl(slug: string, numero?: string): string {
  const base = `${SMART_LINK_ORIGIN}/ir/lei/${slug}`;
  return numero ? `${base}/art-${encodeURIComponent(numero)}` : base;
}

/**
 * Gera um smart link universal `https://vacatio.com.br/ir/...` para qualquer
 * tipo de conteúdo compartilhável no app.
 *
 * Exemplos:
 *   buildSmartLink('lei', { slug: 'cf88', artigo: '5' })
 *   buildSmartLink('noticia', { id: '123' })
 *   buildSmartLink('livro', { id: '42' })
 *   buildSmartLink('radar/pl', { id: '99' })
 */
export function buildSmartLink(
  tipo:
    | 'lei'
    | 'noticia'
    | 'livro'
    | 'frase'
    | 'resumo'
    | 'dicionario'
    | 'radar/pl'
    | 'radar/deputado'
    | 'aprender',
  params: { slug?: string; id?: string; artigo?: string } = {},
): string {
  const base = SMART_LINK_ORIGIN + '/ir';
  switch (tipo) {
    case 'lei': {
      if (!params.slug) return `${base}/lei`;
      const path = `${base}/lei/${params.slug}`;
      return params.artigo ? `${path}/art-${encodeURIComponent(params.artigo)}` : path;
    }
    case 'noticia':
    case 'livro':
    case 'frase':
    case 'resumo':
    case 'dicionario':
    case 'aprender':
      return params.id ? `${base}/${tipo}/${encodeURIComponent(params.id)}` : `${base}/${tipo}`;
    case 'radar/pl':
    case 'radar/deputado':
      return params.id ? `${base}/${tipo}/${encodeURIComponent(params.id)}` : `${base}/radar-360`;
    default:
      return base;
  }
}

/**
 * Converte um caminho "smart" (com ou sem prefixo /ir/) em rota interna do app.
 * Usa a mesma lógica do parseDeepLink pra evitar divergência.
 */
export function parseSmartPath(path: string): string | null {
  const fake = `${SMART_LINK_ORIGIN}${path.startsWith('/') ? path : '/' + path}`;
  return parseDeepLink(fake);
}

