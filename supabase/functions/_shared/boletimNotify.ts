// Helpers para notificar admins via WhatsApp (Horus) e disparar push automation
// quando um boletim (jurídico ou de notícias) fica pronto.
import { evolution } from "./evolution.ts";

const ADMIN_EMAILS = ["wn7corporation@gmail.com", "suporte.vacatio@gmail.com"];

export interface NotifyBoletimArgs {
  supa: any; // SupabaseClient (service role)
  boletimId: string;
  tipo: "juridico" | "noticias";
  titulo: string;
  totalCenas: number;
  duracaoS: number;
  automationKey: string;
  pushEmoji?: string;
  labelUnidade: string; // "normas comentadas" | "manchetes"
}

const APP_URL = Deno.env.get("HORUS_APP_URL") ||
  "https://huggable-calc-89.lovable.app";

export async function notificarAdminsWhats(args: NotifyBoletimArgs) {
  const { supa, boletimId, tipo, titulo, totalCenas, duracaoS, labelUnidade } = args;
  try {
    // Resolver user_ids dos admins pelos e-mails via auth.admin.listUsers
    const { data: uList } = await supa.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const adminIds = (uList?.users ?? [])
      .filter((u: any) => u.email && ADMIN_EMAILS.includes(u.email.toLowerCase()))
      .map((u: any) => u.id);
    if (adminIds.length === 0) return;

    const { data: whats } = await supa
      .from("horus_whatsapp_users")
      .select("phone_e164, user_id, linked_user_id")
      .or(
        adminIds
          .map((id: string) => `user_id.eq.${id},linked_user_id.eq.${id}`)
          .join(","),
      );

    const phones = Array.from(
      new Set((whats ?? []).map((r: any) => r.phone_e164).filter(Boolean)),
    );
    if (phones.length === 0) return;

    const path = tipo === "noticias" ? "boletins-noticias" : "boletins";
    const link = `${APP_URL}/${path}/${boletimId}`;
    const emoji = tipo === "noticias" ? "📰" : "🎬";
    const texto = `${emoji} *${titulo}* pronto\n${totalCenas} ${labelUnidade} • ${Math.round(duracaoS)}s\n${link}`;

    await Promise.all(phones.map(async (phone) => {
      try {
        const result = await evolution.sendText(phone, texto);
        await supa.from("horus_outbound_log").insert({
          phone_e164: String(phone).replace(/\D/g, ""),
          kind: "admin_boletim",
          tipo: `boletim_${tipo}`,
          status: "sent",
          sent_at: new Date().toISOString(),
          payload: { boletim_id: boletimId, texto, result },
        });
      } catch (e) {
        await supa.from("horus_outbound_log").insert({
          phone_e164: String(phone).replace(/\D/g, ""),
          kind: "admin_boletim",
          tipo: `boletim_${tipo}`,
          status: "failed",
          error: String((e as Error)?.message || e),
          payload: { boletim_id: boletimId, texto },
        });
      }
    }));
  } catch (e) {
    console.warn("[notificarAdminsWhats] erro:", (e as Error)?.message || e);
  }
}

export async function dispararPushBoletim(args: NotifyBoletimArgs) {
  const { supa, boletimId, tipo, totalCenas, duracaoS, automationKey, pushEmoji, labelUnidade } = args;
  try {
    const { data: automation } = await supa
      .from("push_automations")
      .select("key, enabled, audience, default_url, emoji")
      .eq("key", automationKey)
      .maybeSingle();

    if (!automation || automation.enabled === false) {
      console.log(`[push] automation ${automationKey} inexistente ou desabilitada — skip`);
      return;
    }

    const path = tipo === "noticias" ? "boletins-noticias" : "boletins";
    const title = tipo === "noticias" ? "Boletim de Notícias" : "Boletim Jurídico do dia";
    const body = `${totalCenas} ${labelUnidade} • ${Math.round(duracaoS)}s — toque para ouvir`;
    const url = `${automation.default_url || `/${path}`}/${boletimId}`;

    const { data: resp, error } = await supa.functions.invoke("send-push", {
      body: {
        title,
        body,
        url,
        emoji: pushEmoji || automation.emoji || (tipo === "noticias" ? "📰" : "🎬"),
        audience: automation.audience || { all: true },
        personalize: true,
        data: {
          automation_key: automationKey,
          boletim_id: boletimId,
          boletim_tipo: tipo,
        },
      },
    });
    if (error) {
      console.warn(`[push] send-push falhou (${automationKey}):`, error.message);
      return;
    }
    console.log(`[push] send-push ok (${automationKey}):`, JSON.stringify(resp));

    await supa
      .from("push_automations")
      .update({ last_run_at: new Date().toISOString() })
      .eq("key", automationKey);
  } catch (e) {
    console.warn(`[push] erro em ${automationKey}:`, (e as Error)?.message || e);
  }
}

export async function notificarBoletimPronto(args: NotifyBoletimArgs) {
  // best-effort — não bloqueia o response caso algum falhe
  await Promise.allSettled([
    dispararPushBoletim(args),
    notificarAdminsWhats(args),
  ]);
}
