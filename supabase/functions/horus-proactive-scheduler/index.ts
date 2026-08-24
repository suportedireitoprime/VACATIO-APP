import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { evolution } from "../_shared/evolution.ts";

// Roda a cada 2h via pg_cron. Dispara mensagens proativas do Horus.
// Regras: 8h-21h BRT, máximo 1 msg/48h por usuário, respeita horário preferido,
// só usuários com telefone vinculado.

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Kill switch
    const { data: cfg } = await admin.from("horus_config").select("valor").eq("chave", "proativos_pausados").maybeSingle();
    if (cfg?.valor === true) {
      return json({ ok: true, paused: true });
    }

    // Janela de horário (BRT 8h-21h)
    const nowBRT = new Date(Date.now() - 3 * 3600 * 1000);
    const horaBRT = nowBRT.getUTCHours();
    if (horaBRT < 8 || horaBRT >= 21) {
      return json({ ok: true, skipped: true, reason: "quiet_hours", hora: horaBRT });
    }

    const { data: cfgFreq } = await admin.from("horus_config").select("valor").eq("chave", "proativos_frequencia_horas").maybeSingle();
    const freqHoras = Number(cfgFreq?.valor ?? 48);

    // Candidatos: usuários vinculados com telefone
    const { data: users } = await admin
      .from("horus_user_stats")
      .select("*")
      .not("telefone", "is", null)
      .eq("notificacoes_permitidas", true)
      .limit(500);

    const enviados: any[] = [];
    for (const u of users || []) {
      // Frequency cap
      const { data: last } = await admin
        .from("horus_proactive_log")
        .select("enviada_em")
        .eq("telefone", u.telefone)
        .order("enviada_em", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (last?.enviada_em) {
        const horas = (Date.now() - new Date(last.enviada_em).getTime()) / 3600000;
        if (horas < freqHoras) continue;
      }

      const trigger = pickTrigger(u, horaBRT);
      if (!trigger) continue;

      try {
        await evolution.sendText(u.telefone, trigger.mensagem);
        await admin.from("horus_proactive_log").insert({
          telefone: u.telefone,
          user_id: u.user_id,
          motivo: trigger.motivo,
          mensagem_enviada: trigger.mensagem,
          metadata: trigger.meta || {},
        });
        enviados.push({ telefone: u.telefone, motivo: trigger.motivo });
      } catch (e) {
        console.error("proactive send fail", u.telefone, String(e));
      }
    }

    return json({ ok: true, enviados: enviados.length, detalhes: enviados });
  } catch (e) {
    console.error("horus-proactive-scheduler error", e);
    return json({ ok: false, error: String(e?.message || e) }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

type Trigger = { motivo: string; mensagem: string; meta?: Record<string, any> };

function pickTrigger(u: any, horaBRT: number): Trigger | null {
  const nome = u.nome_preferido || "";
  const primeiroNome = nome.split(" ")[0] || "";
  const oi = primeiroNome ? `Oi ${primeiroNome}` : "Ei";

  // 1) Streak em risco
  if (u.dias_streak_estudo >= 3 && u.ultima_atividade_em) {
    const horas = (Date.now() - new Date(u.ultima_atividade_em).getTime()) / 3600000;
    if (horas >= 20 && horas <= 26) {
      const mat = u.materia_mais_estudada_7d || "estudo";
      return {
        motivo: "streak_risco",
        mensagem: `${oi}! Sua sequência de ${u.dias_streak_estudo} dias em ${mat} tá quase quebrando hoje 👀 Bora manter? Se preferir não receber esses avisos, é só me responder "pausar".`,
        meta: { streak: u.dias_streak_estudo, materia: mat },
      };
    }
  }

  // 2) Retomar leitura
  if (u.ultimo_artigo_lido && u.ultima_atividade_em) {
    const horas = (Date.now() - new Date(u.ultima_atividade_em).getTime()) / 3600000;
    if (horas >= 20 && horas <= 48) {
      return {
        motivo: "retomar_leitura",
        mensagem: `${oi}, você parou no ${u.ultimo_artigo_lido} ontem. Quer continuar de onde parou?`,
        meta: { artigo: u.ultimo_artigo_lido },
      };
    }
  }

  // 3) Assinatura expirando
  if (u.plano_atual === "pro" && u.plano_expira_em) {
    const diasRestantes = (new Date(u.plano_expira_em).getTime() - Date.now()) / 86400000;
    if (diasRestantes > 0 && diasRestantes <= 3) {
      return {
        motivo: "assinatura_expirando",
        mensagem: `${oi}! Só um heads-up: sua assinatura Vade Mecum Pro expira em ${Math.ceil(diasRestantes)} dia(s). Renovando pelo app você não perde a sequência 🙂`,
        meta: { dias: Math.ceil(diasRestantes) },
      };
    }
  }

  return null;
}
