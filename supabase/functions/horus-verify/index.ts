import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { evolution, toE164, HORUS_APP_URL } from "../_shared/evolution.ts";

// v2: transferência atômica de número entre contas
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: claims, error } = await supabase.auth.getClaims(authHeader.replace("Bearer ", ""));
    if (error || !claims?.claims) return json({ error: "Unauthorized" }, 401);
    const userId = claims.claims.sub as string;

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const body = await req.json().catch(() => ({}));
    const action = body.action as string;

    if (action === "start") {
      const phone = toE164(String(body.phone || ""));
      if (!phone) return json({ error: "Telefone inválido" }, 400);
      // DB usa phone_e164 sem "+" em TODAS as tabelas (whatsapp_users, verification_codes,
      // memoria, stats). Só o Evolution recebe com "+".
      const phoneDb = phone.replace(/^\+/, "");
      console.log("[horus-verify] start", { userId, phoneDb });

      // Rate-limit: bloqueia se este número já foi transferido 3x nas últimas 24h
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { count: transfersRecent } = await admin
        .from("horus_phone_transfers")
        .select("id", { count: "exact", head: true })
        .eq("phone_e164", phoneDb)
        .gte("created_at", since);
      if ((transfersRecent ?? 0) >= 3) {
        return json({ error: "Muitas transferências recentes deste número. Tente novamente em algumas horas." }, 429);
      }

      // Detecta se este número pertence a outra conta (só pra informar no retorno)
      const { data: existing } = await admin.from("horus_whatsapp_users")
        .select("user_id").eq("phone_e164", phoneDb).maybeSingle();
      const willTransfer = !!(existing && existing.user_id && existing.user_id !== userId);

      const code = String(Math.floor(100000 + Math.random() * 900000));
      const expires_at = new Date(Date.now() + 10 * 60 * 1000).toISOString();
      await admin.from("horus_verification_codes").insert({
        user_id: userId, phone_e164: phoneDb, code, expires_at,
      });
      // CTA Copy: WhatsApp renderiza um botão "Copiar código" que copia o valor de copyCode.
      try {
        const transferNote = willTransfer
          ? "\n\n⚠️ *Atenção:* este número está vinculado a outra conta. Ao confirmar, o vínculo anterior será encerrado automaticamente."
          : "";
        await evolution.sendCopyCode(phone, {
          title: "🦉 Horus — Verificação",
          description:
            `Seu código de verificação é:\n\n*${code}*\n\nToque em *Copiar código* abaixo (ou copie manualmente) e cole no app para vincular seu WhatsApp.${transferNote}\n\nO código expira em 10 minutos. Se não foi você, ignore.`,
          footer: "Vade Mecum • Horus",
          buttonLabel: "Copiar código",
          copyCode: code,
        });
        // Card CTA URL — botão "Baixar / Abrir app" que redireciona para a loja/site
        try {
          await evolution.sendCtaUrl(phone, {
            title: "📲 Abrir o Vade Mecum",
            description: "Toque abaixo para abrir o app e colar o código de verificação.",
            footer: "Vade Mecum • Horus",
            buttonLabel: "Baixar / Abrir app",
            url: HORUS_APP_URL,
          });
        } catch (e) {
          console.warn("verify CTA url fail", String(e));
        }
      } catch (e) {
        console.error("send code fail", e);
        return json({ error: "Não consegui enviar o código no WhatsApp. Verifique o número.", detail: String(e) }, 502);
      }
      // Marca "code_sent" só no registro do próprio usuário (não toca no registro de terceiros —
      // esse será removido apenas na confirmação bem-sucedida).
      await admin.from("horus_whatsapp_users").upsert({
        user_id: userId,
        onboarding_state: "code_sent",
        last_onboarding_msg_at: new Date().toISOString(),
        first_seen_at: new Date().toISOString(),
        // Só grava phone_e164 aqui se ele ainda não pertencer a ninguém (evita quebrar UNIQUE)
        ...(willTransfer ? {} : { phone_e164: phoneDb }),
      }, { onConflict: "user_id" });
      return json({ ok: true, phone, willTransfer });
    }

    if (action === "confirm") {
      const phone = toE164(String(body.phone || ""));
      const code = String(body.code || "").trim();
      if (!phone || code.length !== 6) return json({ error: "Dados inválidos" }, 400);
      const phoneDb = phone.replace(/^\+/, "");

      const { data: rows } = await admin.from("horus_verification_codes")
        .select("*")
        .eq("user_id", userId).eq("phone_e164", phoneDb).is("consumed_at", null)
        .gte("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false }).limit(1);
      const row = rows?.[0];
      if (!row) return json({ error: "Código expirado. Peça um novo." }, 400);
      if (row.attempts >= 5) return json({ error: "Muitas tentativas. Peça um novo código." }, 429);
      if (row.code !== code) {
        await admin.from("horus_verification_codes").update({ attempts: row.attempts + 1 }).eq("id", row.id);
        return json({ error: "Código incorreto" }, 400);
      }
      await admin.from("horus_verification_codes").update({ consumed_at: new Date().toISOString() }).eq("id", row.id);

      // Transferência atômica: desvincula da conta antiga (se houver), limpa memória
      // do WhatsApp, cria o vínculo com a nova conta, sincroniza profiles.telefone e
      // grava um aviso de takeover pro dono antigo (realtime).
      console.log("[horus-verify] confirm ok, chamando RPC transferir_numero", { userId, phoneDb });
      const { data: rpcData, error: rpcErr } = await admin.rpc("horus_transferir_numero", {
        _new_user_id: userId,
        _phone: phoneDb,
      });
      if (rpcErr) {
        console.error("[horus-verify] horus_transferir_numero fail", rpcErr);
        const msg = String(rpcErr.message || "");
        if (msg.includes("rate_limited")) {
          return json({ error: "Muitas transferências recentes deste número. Tente novamente em algumas horas." }, 429);
        }
        return json({ error: "Falha ao vincular número. Tente novamente.", detail: msg }, 500);
      }
      console.log("[horus-verify] RPC ok", rpcData);

      const transferred = Boolean((rpcData as any)?.transferred);
      const nome = String((rpcData as any)?.display_name || "").trim();
      const saudacao = nome ? `, *${nome.split(" ")[0]}*` : "";

      try {
        const extra = transferred
          ? "\n\nO vínculo com a conta anterior foi encerrado automaticamente e o histórico anterior deste WhatsApp foi apagado por segurança."
          : "";
        await evolution.sendText(
          phone,
          `✅ *Pronto${saudacao}!* Seu WhatsApp foi vinculado ao Horus.${extra}\n\nAgora você pode me perguntar sobre qualquer artigo, pedir resumos, criar lembretes e receber alertas de novas leis. É só me chamar aqui.`,
        );
      } catch {}

      return json({ ok: true, transferred });
    }

    if (action === "unlink") {
      await admin.from("horus_whatsapp_users").delete().eq("user_id", userId);
      return json({ ok: true });
    }

    if (action === "update_prefs") {
      const patch: any = {};
      if (typeof body.opt_in_leis === "boolean") patch.opt_in_leis = body.opt_in_leis;
      if (typeof body.opt_in_blog === "boolean") patch.opt_in_blog = body.opt_in_blog;
      if (typeof body.opt_in_lembretes === "boolean") patch.opt_in_lembretes = body.opt_in_lembretes;
      await admin.from("horus_whatsapp_users").update(patch).eq("user_id", userId);
      return json({ ok: true });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    console.error("horus-verify error", e);
    return json({ error: String(e?.message || e) }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}