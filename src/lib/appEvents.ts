/**
 * Camada única de eventos do Vacatio.
 * ------------------------------------------------------------
 * Um evento no código = quatro destinos:
 *   GA4 (web) · Meta Pixel + CAPI · Google Ads (conversões) · Firebase (nativo)
 * Além do registro em `app_events` (Supabase) para o painel administrativo.
 *
 * Nomes de evento seguem os recomendados pelo GA4; o mapeamento para os nomes
 * padrão do Meta e para os labels do Google Ads é feito aqui dentro.
 */
import { trackEvent } from "./analytics";
import { fbTrack, fbTrackCustom, fbSetUserData, type FbStandardEvent } from "./fbPixel";
import { adsConversion, setAdsUserData, type AdsConversionKey } from "./googleAds";
import { nativeLogEvent } from "./nativeAnalytics";
import { supabase } from "@/integrations/supabase/client";

type Method = "email" | "google" | string;
type Channel = "app" | "horus" | "whatsapp";
type NarrKind = "boletim" | "blog" | "artigo" | "noticia";

export const CURRENCY = "BRL";

/** Valor de referência (receita anualizada) de cada plano, em BRL. */
export const PLAN_VALUE: Record<string, number> = {
  mensal: 29.9,
  anual: 249.9,
  anual_parcelado: 249.9,
  vitalicio: 499.9,
};

export function planValue(plano?: string | null): number {
  if (!plano) return 0;
  return PLAN_VALUE[plano] ?? 0;
}

async function logDb(event_name: string, metadata: Record<string, unknown> = {}) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("app_events" as any).insert({
      event_name,
      user_id: user?.id ?? null,
      email: user?.email ?? null,
      metadata,
    });
  } catch {
    /* silencioso: telemetria não deve quebrar UX */
  }
}

type Fanout = {
  /** nome GA4 (recomendado quando existir) */
  ga: string;
  /** evento padrão do Meta; `custom:<nome>` para trackCustom */
  meta?: FbStandardEvent | `custom:${string}`;
  /** chave da conversão do Google Ads */
  ads?: AdsConversionKey;
  params?: Record<string, any>;
  /** também grava em app_events */
  db?: boolean;
};

function fanout({ ga, meta, ads, params = {}, db }: Fanout) {
  const clean = Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== "")
  );
  trackEvent(ga, clean);
  void nativeLogEvent(ga, clean);
  if (meta) {
    if (meta.startsWith("custom:")) fbTrackCustom(meta.slice(7), clean);
    else fbTrack(meta as FbStandardEvent, clean);
  }
  if (ads) {
    adsConversion(ads, {
      value: typeof clean.value === "number" ? clean.value : undefined,
      currency: (clean.currency as string) ?? CURRENCY,
      transaction_id: clean.transaction_id as string | undefined,
    });
  }
  if (db) void logDb(ga, clean);
}

/** Identificação do usuário para Advanced Matching / Enhanced Conversions. */
export function identifyUser(u: { id?: string | null; email?: string | null; phone?: string | null }) {
  fbSetUserData({ email: u.email, phone: u.phone, externalId: u.id });
  setAdsUserData({ email: u.email, phone: u.phone });
}

export const appEvents = {
  // ---- autenticação ----
  login: (method: Method) =>
    fanout({ ga: "login", meta: "custom:Login", params: { method }, db: true }),

  signUp: (method: Method) =>
    fanout({
      ga: "sign_up",
      meta: "CompleteRegistration",
      ads: "sign_up",
      params: { method, content_name: "Cadastro Vacatio" },
      db: true,
    }),

  logout: () => fanout({ ga: "logout" }),

  // ---- busca ----
  search: (termo: string, resultados?: number) =>
    fanout({
      ga: "search",
      meta: "Search",
      params: { search_term: termo, search_string: termo, results: resultados },
    }),

  // ---- conteúdo ----
  viewArtigo: (p: { tabela?: string | null; numero?: string | null }) =>
    fanout({
      ga: "view_artigo",
      meta: "ViewContent",
      params: {
        content_type: "artigo",
        content_ids: [`${p.tabela ?? ""}-${p.numero ?? ""}`],
        tabela: p.tabela ?? "",
        numero: p.numero ?? "",
      },
    }),

  favoritarArtigo: (p: { tabela?: string | null; numero?: string | null; on: boolean }) =>
    fanout({
      ga: p.on ? "favoritar_artigo" : "desfavoritar_artigo",
      meta: p.on ? "AddToWishlist" : undefined,
      params: { content_type: "artigo", tabela: p.tabela ?? "", numero: p.numero ?? "" },
    }),

  abrirBlog: (p: { post_id: string; titulo?: string }) =>
    fanout({
      ga: "abrir_blog",
      meta: "ViewContent",
      params: { content_type: "blog", content_ids: [p.post_id], titulo: p.titulo ?? "" },
    }),

  abrirBoletim: (p: { boletim_id: string; tipo?: string }) =>
    fanout({
      ga: "abrir_boletim",
      meta: "ViewContent",
      params: { content_type: "boletim", content_ids: [p.boletim_id], tipo: p.tipo ?? "" },
    }),

  abrirNoticia: (p: { noticia_id: string }) =>
    fanout({
      ga: "abrir_noticia",
      meta: "ViewContent",
      params: { content_type: "noticia", content_ids: [p.noticia_id] },
    }),

  // ---- áudio / narração ----
  playNarracao: (p: { kind: NarrKind; id?: string }) =>
    fanout({ ga: "play_narracao", params: { kind: p.kind, id: p.id ?? "" } }),

  completeNarracao: (p: { kind: NarrKind; id?: string }) =>
    fanout({ ga: "complete_narracao", params: { kind: p.kind, id: p.id ?? "" } }),

  // ---- Horus / mentor ----
  horusMensagem: (p: { channel: Channel; tem_anexo?: boolean }) =>
    fanout({
      ga: "horus_mensagem",
      meta: "custom:HorusMensagem",
      params: { channel: p.channel, tem_anexo: p.tem_anexo ? 1 : 0 },
    }),

  // ---- push ----
  pushClick: (p: { campaign_id: string }) =>
    fanout({ ga: "push_click", params: { campaign_id: p.campaign_id } }),

  // ---- funil de receita ----
  /** Usuário abriu a tela de planos. */
  verPlanos: () =>
    fanout({
      ga: "view_item_list",
      meta: "ViewContent",
      params: { item_list_name: "planos", content_type: "product", content_category: "assinatura" },
    }),

  /** Usuário selecionou um plano específico. */
  verPlano: (p: { plano: string }) =>
    fanout({
      ga: "view_item",
      meta: "ViewContent",
      params: {
        content_type: "product",
        content_ids: [p.plano],
        value: planValue(p.plano),
        currency: CURRENCY,
        items: [{ item_id: p.plano, item_name: `Premium ${p.plano}`, price: planValue(p.plano) }],
      },
    }),

  /** Clicou em assinar / iniciou checkout. */
  assinaturaIniciada: (p: { plano: string; metodo?: string }) => {
    fanout({
      ga: "begin_checkout",
      meta: "InitiateCheckout",
      ads: "begin_checkout",
      params: {
        content_ids: [p.plano],
        content_type: "product",
        plano: p.plano,
        metodo: p.metodo,
        value: planValue(p.plano),
        currency: CURRENCY,
        num_items: 1,
        items: [{ item_id: p.plano, item_name: `Premium ${p.plano}`, price: planValue(p.plano) }],
      },
    });
    void logDb("trial_click", { plano: p.plano, metodo: p.metodo });
  },

  /** Começou o período de teste grátis. */
  trialIniciado: (p: { plano: string; dias?: number }) =>
    fanout({
      ga: "start_trial",
      meta: "StartTrial",
      ads: "start_trial",
      params: {
        plano: p.plano,
        predicted_ltv: planValue(p.plano),
        value: 0,
        currency: CURRENCY,
        dias: p.dias,
      },
      db: true,
    }),

  /** Assinatura confirmada — conversão principal. */
  assinaturaAtivada: (p: { plano?: string | null; source?: string | null; transaction_id?: string | null }) => {
    const value = planValue(p.plano);
    const transaction_id = p.transaction_id ?? `${p.plano ?? "premium"}-${Date.now()}`;
    fanout({
      ga: "purchase",
      meta: "Purchase",
      ads: "purchase",
      params: {
        transaction_id,
        value,
        currency: CURRENCY,
        content_ids: [p.plano ?? "premium"],
        content_type: "product",
        plano: p.plano ?? "",
        source: p.source ?? "",
        items: [{ item_id: p.plano ?? "premium", item_name: `Premium ${p.plano ?? ""}`, price: value, quantity: 1 }],
      },
      db: true,
    });
    // Assinatura recorrente também é um Subscribe para o Meta.
    fbTrack("Subscribe", { value, currency: CURRENCY, predicted_ltv: value, plano: p.plano ?? "" });
  },
};
