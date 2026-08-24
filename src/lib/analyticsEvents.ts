/**
 * Catálogo unificado de eventos de analytics — GA4 + Meta Ads
 * ----------------------------------------------------------------
 * - Nomes em snake_case para GA4.
 * - Cada evento GA4 mapeia automaticamente para o evento Meta equivalente.
 * - Parâmetros são normalizados para respeitar limites GA4/Firebase.
 */

import { trackEvent as gaTrackEvent, setAnalyticsUser, GA_MEASUREMENT_ID } from "./analytics";
import { fbTrack, fbTrackCustom, FbStandardEvent, fbSetUserData } from "./fbPixel";
import { nativeLogEvent, nativeLogScreen, nativeSetUserId, nativeSetUserProperty } from "./nativeAnalytics";
import { metaAppEvent } from "./metaAppEvents";
import { Capacitor } from "@capacitor/core";

const DEBUG = typeof window !== "undefined" && new URLSearchParams(window.location.search).has("ga_debug");

export interface TrackPayload {
  name: string;
  params?: Record<string, unknown>;
  metaEvent?: FbStandardEvent | string;
}

/** Mapa de rotas para nomes amigáveis de tela. */
export const ROUTE_NAMES: Record<string, string> = {
  "/": "Home",
  "/landing": "Landing",
  "/auth": "Autenticacao",
  "/onboarding": "Onboarding",
  "/privacidade": "Privacidade",
  "/termos": "Termos",
  "/excluir-conta": "Excluir Conta",
  "/suporte-publico": "Suporte Publico",
  "/reset-password": "Reset Senha",
  "/desktop-link/:token": "Link Desktop",
  "/legislacao/:tipo": "Legislacao Categoria",
  "/legislacao/:tipo/:leiSlug": "Lei",
  "/legislacao/:tipo/:leiSlug/:artigoNumero": "Artigo",
  "/noticias": "Noticias",
  "/novidades": "Novidades",
  "/anotacoes": "Anotacoes",
  "/anotacoes/audio": "Anotacoes Audio",
  "/configuracoes": "Configuracoes",
  "/ajustes/seguranca": "Seguranca",
  "/ajustes/lembretes": "Lembretes",
  "/meus-lembretes": "Meus Lembretes",
  "/lembretes/local": "Lembretes Local",
  "/lembretes/preferencias": "Preferencias Lembretes",
  "/radar/deputados": "Radar Deputados",
  "/radar/votacoes": "Radar Votacoes",
  "/radar/rankings": "Radar Rankings",
  "/radar/proposicoes": "Radar Proposicoes",
  "/radar/deputado/:id": "Radar Deputado",
  "/radar/pl/:id": "Radar PL",
  "/legislacao-estadual": "Legislacao Estadual",
  "/legislacao-estadual/:uf": "Estado",
  "/legislacao-estadual/:uf/lei/:slug": "Lei Estadual",
  "/explicacao-lei": "Explicacao Lei",
  "/narracao": "Narracao Lei",
  "/grafo-artigos": "Grafo Artigos",
  "/ferramentas": "Ferramentas",
  "/ferramentas/locais": "Locais Juridicos",
  "/ferramentas/dicionario": "Dicionario Juridico",
  "/ferramentas/peticao-inicial": "Peticao Inicial",
  "/ferramentas/peticao-inicial/:id": "Peticao Inicial Editor",
  "/admin/locais": "Admin Locais",
  "/tematica-juridica": "Tematica Juridica",
  "/radar-360": "Radar 360",
  "/normas/:slug": "Outras Normas",
  "/radares": "Radares",
  "/praticar": "Praticar",
  "/praticar/area/:areaSlug": "Praticar Area",
  "/praticar/:leiSlug": "Praticar Lei",
  "/praticar/:leiSlug/sessao": "Praticar Sessao",
  "/compartilhado": "Compartilhado",
  "/estudos": "Estudos",
  "/aprender": "Aprender",
  "/aprender/categoria/:categoriaId": "Aprender Categoria",
  "/aprender/area/:slug": "Aprender Area",
  "/aprender/teoria": "Aprender Teoria",
  "/aprender/trilhas": "Aprender Trilhas",
  "/aprender/questoes": "Aprender Questoes",
  "/aprender/flashcards": "Aprender Flashcards",
  "/aprender/desempenho": "Aprender Desempenho",
  "/aprender/aula/:aulaId": "Aprender Aula",
  "/jurisprudencia/:slugLei/:numeroArtigo": "Jurisprudencia Artigo",
  "/jurisprudencia/prontas/:tribunal": "Pesquisas Prontas Lista",
  "/jurisprudencia/prontas/:tribunal/:slug": "Pesquisas Prontas Tema",
  "/admin/pesquisas-prontas": "Admin Pesquisas Prontas",
  "/jurisprudencia/sumulas-vinculantes": "Sumulas Vinculantes",
  "/jurisprudencia/sumulas-stf": "Sumulas STF",
  "/jurisprudencia/sumulas-stj": "Sumulas STJ",
  "/jurisprudencia/informativos-stj": "Informativos STJ",
  "/jurisprudencia/informativos-stf": "Informativos STF",
  "/jurisprudencia/teses-stj": "Teses STJ",
  "/jurisprudencia/teses-stf": "Teses STF",
  "/jurisprudencia": "Jurisprudencia",
  "/biblioteca": "Biblioteca",
  "/biblioteca/:slug": "Biblioteca Livro",
  "/chat-juridico": "Chat Juridico",
  "/chat-juridico/:id": "Chat Juridico Conversa",
  "/meu-espaco": "Meu Espaco",
  "/horus": "Horus",
  "/admin": "Admin",
  "/admin/funcoes": "Admin Funcoes",
  "/admin/usuarios": "Admin Usuarios",
  "/admin/assinaturas": "Admin Assinaturas",
  "/admin/precos": "Admin Precos",
  "/admin/newsletter": "Admin Newsletter",
  "/admin/estatisticas": "Admin Estatisticas",
  "/admin/horus": "Admin Horus",
  "/admin/horus-config": "Admin Horus Config",
  "/admin/radar": "Admin Radar",
  "/admin/conteudo": "Admin Conteudo",
  "/admin/lojas": "Admin Lojas",
  "/admin/promocoes": "Admin Promocoes",
  "/admin/cupons": "Admin Cupons",
  "/admin/logs": "Admin Logs",
  "/admin/analytics": "Admin Analytics",
  "/planos": "Planos",
  "/checkout": "Checkout",
  "/pagamento/sucesso": "Pagamento Sucesso",
  "/pagamento/erro": "Pagamento Erro",
};

/** Eventos GA4 → eventos Meta padrão. Se não mapeado, usa `fbTrackCustom`. */
const GA_TO_META: Record<string, FbStandardEvent | string> = {
  sign_up: "CompleteRegistration",
  login: "Lead",
  purchase: "Purchase",
  subscribe: "Subscribe",
  start_trial: "StartTrial",
  initiate_checkout: "InitiateCheckout",
  upgrade_click: "InitiateCheckout",
  checkout_start: "InitiateCheckout",
  page_view: "PageView",
  screen_view: "ViewContent",
  search: "Search",
  view_content: "ViewContent",
};

/** Buffer de eventos enviados antes do consentimento (web). */
const offlineQueue: TrackPayload[] = [];
const MAX_QUEUE = 50;

function isNativeApp(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return !!(window as any).Capacitor?.isNativePlatform?.() || (window as any).__IS_NATIVE_APP__ === true;
  }
}

function isConsentGranted(): boolean {
  if (typeof window === "undefined") return false;
  if (isNativeApp()) return true; // nativo gerencia consentimento no plugin
  try {
    return localStorage.getItem("ga_consent") === "granted";
  } catch {
    return false;
  }
}

function getPlatform(): string {
  if (isNativeApp()) {
    try {
      return Capacitor.getPlatform() === "ios" ? "ios" : "android";
    } catch {
      return "native";
    }
  }
  if (typeof window !== "undefined" && (window.matchMedia("(display-mode: standalone)").matches || (navigator as any).standalone)) {
    return "pwa";
  }
  return "web";
}

function cleanParams(params: Record<string, unknown> = {}): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const keys = Object.keys(params);
  for (let i = 0; i < Math.min(keys.length, 25); i++) {
    const key = keys[i];
    const cleanKey = key.replace(/[^a-zA-Z0-9_]/g, "").slice(0, 40);
    if (!cleanKey) continue;
    let value = params[key];
    if (typeof value === "string") {
      value = value.slice(0, 100);
    } else if (typeof value === "number" || typeof value === "boolean") {
      // ok
    } else if (value == null) {
      continue;
    } else {
      value = String(value).slice(0, 100);
    }
    out[cleanKey] = value;
  }
  return out;
}

function resolveScreenName(path: string): string {
  // Tenta match exato
  if (ROUTE_NAMES[path]) return ROUTE_NAMES[path];
  // Match por padrão simples: substitui segmentos dinâmicos
  const parts = path.split("/").filter(Boolean);
  const candidates = Object.keys(ROUTE_NAMES).filter((r) => r !== "/");
  for (const route of candidates) {
    const routeParts = route.split("/").filter(Boolean);
    if (routeParts.length !== parts.length) continue;
    const match = routeParts.every((seg, idx) => seg.startsWith(":") || seg === parts[idx]);
    if (match) return ROUTE_NAMES[route];
  }
  return path || "Home";
}

/** Dispara evento em todas as plataformas. */
export function track(name: string, params: Record<string, unknown> = {}) {
  const payload: TrackPayload = { name, params: cleanParams(params) };
  const metaEvent = GA_TO_META[name] || name;
  payload.metaEvent = metaEvent;

  if (DEBUG && typeof window !== "undefined") {
     
    console.log("[analytics] track", payload);
  }

  if (isNativeApp()) {
    nativeLogEvent(name, payload.params);
    // Fase 4 — Meta App Events nativo (Conversions API, action_source: app)
    void metaAppEvent(typeof metaEvent === "string" ? metaEvent : name, payload.params);
    return;
  }

  if (!isConsentGranted()) {
    if (offlineQueue.length < MAX_QUEUE) offlineQueue.push(payload);
    return;
  }

  gaTrackEvent(name, payload.params);

  if (typeof metaEvent === "string" && ["PageView", "ViewContent", "Search", "Lead", "CompleteRegistration", "InitiateCheckout", "StartTrial", "Subscribe", "Purchase"].includes(metaEvent)) {
    fbTrack(metaEvent as FbStandardEvent, payload.params);
  } else {
    fbTrackCustom(metaEvent, payload.params);
  }
}

/** Alias para screen_view. */
export function trackScreen(path: string, params: Record<string, unknown> = {}) {
  const screenName = resolveScreenName(path);
  const allParams = { screen_name: screenName, screen_path: path, ...params };

  if (isNativeApp()) {
    nativeLogScreen(screenName);
    nativeLogEvent("screen_view", allParams);
    void metaAppEvent("ViewContent", { content_name: screenName, content_type: "screen" });
    return;
  }

  track("screen_view", allParams);
  // Meta não tem screen_view padrão; usamos ViewContent como proxy
  fbTrack("ViewContent", { content_name: screenName, content_type: "screen", ...cleanParams(params) });
}

/** Descarrega eventos que ficaram pendentes de consentimento. */
export function flushOfflineQueue() {
  while (offlineQueue.length) {
    const ev = offlineQueue.shift();
    if (ev) track(ev.name, ev.params || {});
  }
}

/** Define user_id em todas as plataformas. */
export function trackSetUser(userId: string | null, userData?: { email?: string | null; phone?: string | null; isPremium?: boolean }) {
  setAnalyticsUser(userId);
  nativeSetUserId(userId);
  if (userData?.isPremium != null) {
    nativeSetUserProperty("is_premium", String(userData.isPremium));
  }
  nativeSetUserProperty("platform", getPlatform());
  if (userData?.email || userData?.phone) {
    fbSetUserData({
      email: userData.email,
      phone: userData.phone,
      externalId: userId || undefined,
    });
  }
}

/** Listener global para atributos data-track. */
export function initTrackClickListener() {
  if (typeof document === "undefined") return;
  document.addEventListener("click", (e) => {
    const el = (e.target as HTMLElement)?.closest("[data-track]") as HTMLElement | null;
    if (!el) return;

    const name = el.dataset.track;
    if (!name) return;

    const params: Record<string, unknown> = {};
    Object.keys(el.dataset).forEach((key) => {
      if (key === "track") return;
      // converte data-livro-id => livro_id
      const cleanKey = key.replace(/([A-Z])/g, "_$1").toLowerCase();
      params[cleanKey] = el.dataset[key];
    });

    // adiciona contexto do elemento
    params.element_tag = el.tagName.toLowerCase();
    params.element_text = (el.textContent || "").trim().slice(0, 40) || undefined;

    track(name, params);
  });
}

export { resolveScreenName, getPlatform, isNativeApp, isConsentGranted, GA_MEASUREMENT_ID };
