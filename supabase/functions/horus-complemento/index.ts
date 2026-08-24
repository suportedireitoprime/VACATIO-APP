// Envia um "complemento" via WhatsApp (Horus) para usuários com opt-in.
// Usado depois de um push principal (boletim de leis, blog, etc.) para o Horus
// reforçar a mensagem com um link que abre o aplicativo.
//
// Body:
// {
//   tipo: "boletim_leis" | "blog" | "noticias_dia" | "custom",
//   principal_kind: string,        // ex: "boletim_leis_matinal"
//   text: string,                  // texto base; usa {primeiro_nome} se quiser
//   deep_link_path: string,        // ex: "/radar-360"
//   opt_in_field?: "opt_in_leis" | "opt_in_blog" | "opt_in_lembretes",
//   only_admin?: boolean,          // se true, envia só para o admin (teste)
//   admin_phone?: string,          // fallback do número admin
// }
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { evolution } from "../_shared/evolution.ts";

const SITE_URL = Deno.env.get("PUBLIC_SITE_URL") || "https://simple-calc-no-db.lovable.app";

function firstName(raw?: string | null): string {
  const s = String(raw || "").trim();
  if (!s) return "";
  const first = s.split(/\s+/)[0];
  return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
}

function render(template: string, nome: string): string {
  const withName = template
    .replace(/\{primeiro_nome\}/gi, nome || "")
    .replace(/\{nome\}/gi, nome || "");
  // Se o template começa com ", " porque o nome estava vazio, limpa.
  return withName.replace(/^,\s*/, "").trim();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const body = await req.json().catch(() => ({} as any));
    const tipo = String(body?.tipo || "custom");
    const principalKind = String(body?.principal_kind || tipo);
    const text = String(body?.text || "").trim();
    const deepPath = String(body?.deep_link_path || "/").replace(/^([^/])/, "/$1");
    const optField = String(body?.opt_in_field || "opt_in_leis");
    const onlyAdmin = Boolean(body?.only_admin);
    const adminPhone = String(body?.admin_phone || "").replace(/\D/g, "");

    if (!text) return json({ error: "text is required" }, 400);

    const link = `${SITE_URL}${deepPath}`;

    let recipients: Array<{ phone: string; nome: string }> = [];

    if (onlyAdmin) {
      if (!adminPhone) return json({ error: "admin_phone required" }, 400);
      recipients = [{ phone: adminPhone, nome: "" }];
    } else {
      const sel = `phone_e164, nome_preferido, apelido, apelido_ativo, display_name, blocked, ${optField}`;
      const { data } = await admin
        .from("horus_whatsapp_users")
        .select(sel)
        .eq("blocked", false)
        .eq(optField, true)
        .limit(2000);
      recipients = (data ?? [])
        .map((u: any) => {
          const nome = u.apelido_ativo && u.apelido
            ? firstName(u.apelido)
            : firstName(u.nome_preferido || u.display_name);
          return { phone: String(u.phone_e164 || "").replace(/\D/g, ""), nome };
        })
        .filter((r) => /^\d{10,15}$/.test(r.phone));
    }

    let sent = 0, failed = 0;
    for (const r of recipients) {
      const finalText = `${render(text, r.nome)}\n\n👉 ${link}`;
      try {
        await evolution.sendText(r.phone, finalText);
        await admin.from("horus_outbound_log").insert({
          phone_e164: r.phone,
          kind: "complemento",
          tipo: `${principalKind}_complemento`,
          status: "sent",
          sent_at: new Date().toISOString(),
          payload: { text: finalText, link, tipo },
        });
        sent++;
      } catch (e) {
        await admin.from("horus_outbound_log").insert({
          phone_e164: r.phone,
          kind: "complemento",
          tipo: `${principalKind}_complemento`,
          status: "failed",
          error: String((e as Error)?.message || e),
          payload: { text: finalText, link, tipo },
        });
        failed++;
      }
    }

    return json({ ok: true, sent, failed, total: recipients.length, link });
  } catch (e) {
    return json({ error: String((e as Error)?.message || e) }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
