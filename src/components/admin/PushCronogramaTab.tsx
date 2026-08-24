import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import {
  Loader2, RefreshCw, Clock, CheckCircle2, CircleDashed, Eye, Send, Smartphone, MessageCircle, Sparkles,
  AlertCircle, Check, Bell, MailOpen, XCircle,
} from "lucide-react";
import { toast } from "sonner";

// Canal de disparo
type Canal = "app" | "horus" | "ambos" | "sistema";

interface EventoBase {
  hora: number;
  minuto: number;
  automation_key: string;
  nome: string;
  descricao: string;
  emoji: string;
  canal: Canal;
  publico: string;
  regra: string;
  titulo_exemplo: string;
  corpo_exemplo: string;
  /** Papel no par principal/complemento — só descritivo, ajuda o admin. */
  papel?: "principal" | "complemento" | "unico";
  /** Canal complementar disparado depois do principal. */
  complemento?: Exclude<Canal, "sistema">;
  /** Caminho no app aberto pelo deep-link. */
  deep_link?: string;
}

// Plano A — 6 disparos/dia, sempre com principal + complemento no par.
// Todos os horários em BRT (America/Sao_Paulo).
const EVENTOS_FIXOS: EventoBase[] = [
  {
    hora: 7, minuto: 0, automation_key: "boletim_leis_matinal",
    nome: "As novidades do diário oficial", emoji: "📜", canal: "app",
    papel: "unico", deep_link: "/radar-360",
    descricao: "Resumo das leis publicadas nas últimas 24h.",
    publico: "Todos os usuários",
    regra: "Envia apenas se houver novas leis.",
    titulo_exemplo: "📜 3 leis novas pra você",
    corpo_exemplo: "• Lei nº X\n• Decreto nº Y\n• Medida Provisória Z",
  },
  {
    hora: 12, minuto: 30, automation_key: "noticias_dia",
    nome: "Uma notícia jurídica do dia", emoji: "📰", canal: "app",
    papel: "unico", deep_link: "/noticias",
    descricao: "A principal manchete jurídica do dia para manter o usuário atualizado.",
    publico: "Todos os usuários",
    regra: "Disparo único com a notícia mais quente.",
    titulo_exemplo: "📰 Notícia de hoje",
    corpo_exemplo: "STF decide sobre nova regra...",
  },
  {
    hora: 16, minuto: 0, automation_key: "personalizada_app_1",
    nome: "Mensagem personalizada 1", emoji: "✨", canal: "app",
    papel: "unico", deep_link: "/",
    descricao: "Push discreto focado no perfil de estudo do usuário.",
    publico: "Usuários engajados",
    regra: "Baseado no histórico de acessos.",
    titulo_exemplo: "Rafael, separei o Art. 5º",
    corpo_exemplo: "Quer continuar de onde parou?",
  },
  {
    hora: 19, minuto: 0, automation_key: "personalizada_app_2",
    nome: "Mensagem personalizada 2", emoji: "✨", canal: "app",
    papel: "unico", deep_link: "/",
    descricao: "Nudge para manter o ritmo de estudo à noite.",
    publico: "Usuários engajados",
    regra: "Baseado no histórico de acessos.",
    titulo_exemplo: "Continue seus estudos",
    corpo_exemplo: "Você estava lendo sobre Direito Penal.",
  },
  {
    hora: 21, minuto: 0, automation_key: "personalizada_app_3",
    nome: "Mensagem personalizada 3", emoji: "✨", canal: "app",
    papel: "unico", deep_link: "/",
    descricao: "Último lembrete do dia para fechar a meta.",
    publico: "Usuários engajados",
    regra: "Baseado no histórico de acessos.",
    titulo_exemplo: "Rafael, o Art. 5º te espera 👀",
    corpo_exemplo: "Ainda dá tempo de ler mais um pouco.",
  },
];

interface CampaignRow {
  id: string;
  title: string;
  body: string;
  status: string;
  automation_key: string | null;
  scheduled_at: string | null;
  next_run_at: string | null;
  created_at: string;
  sent_count: number;
  failed_count: number;
  opened_count: number;
  delivered_count: number;
}

interface LogRow {
  id: string;
  kind: string;
  tipo: string;
  status: string;
  created_at: string;
  payload: any;
}

function padHora(h: number, m: number) {
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function CanalBadge({ canal }: { canal: Canal }) {
  const map: Record<Canal, { label: string; cls: string; icon: any }> = {
    app: { label: "App", cls: "bg-blue-500/15 text-blue-600 border-blue-500/30", icon: Smartphone },
    horus: { label: "Horus", cls: "bg-purple-500/15 text-purple-600 border-purple-500/30", icon: MessageCircle },
    ambos: { label: "App + Horus", cls: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30", icon: Sparkles },
    sistema: { label: "Sistema", cls: "bg-muted text-muted-foreground border-border", icon: Sparkles },
  };
  const m = map[canal];
  const Icon = m.icon;
  return (
    <Badge variant="outline" className={`text-[10px] border ${m.cls} gap-0.5`}>
      <Icon className="w-3 h-3" /> {m.label}
    </Badge>
  );
}

export default function PushCronogramaTab() {
  const [loading, setLoading] = useState(false);
  const [campanhas, setCampanhas] = useState<CampaignRow[]>([]);
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [detalhe, setDetalhe] = useState<EventoBase | null>(null);
  const [testando, setTestando] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const inicio = new Date(); inicio.setHours(0, 0, 0, 0);
      const fim = new Date(); fim.setHours(23, 59, 59, 999);
      const [campRes, logRes] = await Promise.all([
        supabase
          .from("push_campaigns")
          .select("id,title,body,status,automation_key,scheduled_at,next_run_at,created_at,sent_count,failed_count,opened_count,delivered_count")
          .or(
            `and(created_at.gte.${inicio.toISOString()},created_at.lte.${fim.toISOString()}),and(next_run_at.gte.${inicio.toISOString()},next_run_at.lte.${fim.toISOString()})`,
          )
          .order("created_at", { ascending: true }),
        supabase
          .from("horus_outbound_log")
          .select("id, kind, tipo, status, created_at, payload")
          .gte("created_at", inicio.toISOString())
          .order("created_at", { ascending: false })
          .limit(200),
      ]);
      setCampanhas((campRes.data ?? []) as CampaignRow[]);
      setLogs((logRes.data ?? []) as LogRow[]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const agora = new Date();
  const horaAtual = agora.getHours() + agora.getMinutes() / 60;

  const eventos = useMemo(() => {
    type EventoView = EventoBase & {
      label: string;
      status: "enviado" | "erro" | "agendado" | "previsto" | "nao_enviado";
      badge?: string;
    };
    const lista: EventoView[] = [];

    for (const ev of EVENTOS_FIXOS) {
      const camp = campanhas.find(
        (c) => c.automation_key === ev.automation_key && (c.status === "sent" || c.status === "sending" || c.status === "completed" || c.status === "failed"),
      );
      const skipLog = logs.find((l) => l.tipo === ev.automation_key && l.status === "skipped");
      let status: EventoView["status"] = "previsto";
      let badge: string | undefined;
      if (camp) {
        const totalFalhas = camp.failed_count ?? 0;
        const totalEnvios = camp.sent_count ?? 0;
        if (camp.status === "failed" || (totalEnvios === 0 && totalFalhas > 0)) {
          status = "erro";
          badge = `${totalFalhas} falha${totalFalhas === 1 ? "" : "s"}`;
        } else {
          status = "enviado";
          badge = totalFalhas > 0
            ? `${totalEnvios} envios · ${totalFalhas} falha${totalFalhas === 1 ? "" : "s"}`
            : `${totalEnvios} envios`;
        }
      }
      else if (skipLog) { status = "nao_enviado"; badge = skipLog.payload?.reason === "sem_leis_novas" ? "sem leis novas" : "sem conteúdo"; }
      lista.push({ ...ev, label: padHora(ev.hora, ev.minuto), status, badge });
    }

    // campanhas manuais agendadas/enviadas
    for (const c of campanhas) {
      if (c.automation_key && EVENTOS_FIXOS.some((e) => e.automation_key === c.automation_key)) continue;
      const d = c.status === "scheduled" ? new Date(c.next_run_at ?? c.scheduled_at ?? c.created_at) : new Date(c.created_at);
      const totalFalhas = c.failed_count ?? 0;
      const totalEnvios = c.sent_count ?? 0;
      const eErro = c.status === "failed" || (totalEnvios === 0 && totalFalhas > 0);
      lista.push({
        hora: d.getHours(), minuto: d.getMinutes(), automation_key: c.automation_key || "manual",
        nome: c.title, descricao: c.body, emoji: "📨", canal: "app",
        publico: "Segmentação da campanha",
        regra: c.status === "scheduled" ? "Campanha manual agendada" : "Campanha manual enviada",
        titulo_exemplo: c.title, corpo_exemplo: c.body,
        label: padHora(d.getHours(), d.getMinutes()),
        status: c.status === "scheduled" ? "agendado" : eErro ? "erro" : "enviado",
        badge: eErro
          ? `${totalFalhas} falha${totalFalhas === 1 ? "" : "s"}`
          : c.status !== "scheduled" ? `${totalEnvios} envios${totalFalhas ? ` · ${totalFalhas} falhas` : ""}` : undefined,
      });
    }

    lista.sort((a, b) => a.hora * 60 + a.minuto - (b.hora * 60 + b.minuto));
    return lista;
  }, [campanhas, logs]);

  const resumo = useMemo(() => {
    let enviadas = 0, falhas = 0, abertas = 0, entregues = 0, campanhasSent = 0, comErro = 0;
    for (const c of campanhas) {
      enviadas += c.sent_count ?? 0;
      falhas += c.failed_count ?? 0;
      abertas += c.opened_count ?? 0;
      entregues += c.delivered_count ?? 0;
      if ((c.sent_count ?? 0) > 0) campanhasSent++;
      if (c.status === "failed" || ((c.sent_count ?? 0) === 0 && (c.failed_count ?? 0) > 0)) comErro++;
    }
    const taxaAbertura = enviadas > 0 ? Math.round((abertas / enviadas) * 100) : 0;
    return { enviadas, falhas, abertas, entregues, campanhasSent, comErro, taxaAbertura };
  }, [campanhas]);

  const proximoIdx = eventos.findIndex(
    (e) => (e.status === "previsto" || e.status === "agendado") && e.hora + e.minuto / 60 >= horaAtual,
  );

  async function testarAdmin(ev: EventoBase) {
    setTestando(ev.automation_key);
    try {
      const { data, error } = await supabase.functions.invoke("push-testar-admin", {
        body: {
          automation_key: ev.automation_key,
          title: ev.titulo_exemplo,
          body: ev.corpo_exemplo,
        },
      });
      if (error) throw error;
      const push = (data as any)?.results?.push?.error ? "push falhou" : "push ok";
      const wpp = (data as any)?.results?.whatsapp?.error ? "wpp falhou" : "wpp ok";
      toast.success(`Enviado para admin — ${push} • ${wpp}`);
    } catch (e: any) {
      toast.error(e?.message ?? "Falha no teste");
    } finally {
      setTestando(null);
    }
  }

  return (
    <div className="space-y-5">
      {/* Cards de resumo do dia - Minimalista */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-card/20 border border-border/30">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
            <Send className="w-3 h-3" /> Enviadas
          </div>
          <div className="text-2xl font-bold text-foreground">{resumo.enviadas}</div>
          <div className="text-[10px] text-muted-foreground">{resumo.campanhasSent} campanha{resumo.campanhasSent === 1 ? "" : "s"}</div>
        </div>
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
            <MailOpen className="w-3 h-3" /> Abertas
          </div>
          <div className="text-2xl font-bold text-emerald-500">{resumo.abertas}</div>
          <div className="text-[10px] text-muted-foreground">{resumo.taxaAbertura}% de taxa</div>
        </div>
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
            <Check className="w-3 h-3" /> Entregues
          </div>
          <div className="text-2xl font-bold text-foreground">{resumo.entregues}</div>
          <div className="text-[10px] text-muted-foreground">confirmações FCM</div>
        </div>
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
            <XCircle className="w-3 h-3" /> Falhas
          </div>
          <div className={`text-2xl font-bold ${resumo.falhas > 0 ? "text-red-500" : "text-foreground"}`}>{resumo.falhas}</div>
          <div className="text-[10px] text-muted-foreground">{resumo.comErro} campanha{resumo.comErro === 1 ? "" : "s"}</div>
        </div>
      </div>

      <div className="flex items-center justify-between pt-1">
        <p className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5" /> Linha do tempo de hoje
        </p>
        <Button size="sm" variant="ghost" onClick={load} disabled={loading} className="h-7 px-2 text-xs">
          {loading ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <RefreshCw className="w-3 h-3 mr-1" />}
          Atualizar
        </Button>
      </div>

      <div className="relative pl-6">
        <div className="absolute left-[7px] top-2 bottom-4 w-px bg-border/40" />
        {eventos.map((ev, i) => {
          const isProximo = i === proximoIdx;
          const enviado = ev.status === "enviado";
          const erro = ev.status === "erro";
          const naoEnviado = ev.status === "nao_enviado";
          const agendado = ev.status === "agendado";
          
          return (
            <div key={i} className="relative pb-5">
              <div
                className={`absolute -left-[24px] top-1.5 w-3.5 h-3.5 rounded-full flex items-center justify-center bg-background border-[1.5px] ${
                  enviado ? "border-emerald-500 text-emerald-500"
                  : erro ? "border-red-500 text-red-500"
                  : isProximo ? "border-primary text-primary"
                  : agendado ? "border-foreground/30 text-foreground/50"
                  : naoEnviado ? "border-muted-foreground/30 text-muted-foreground/30"
                  : "border-muted-foreground/30 text-muted-foreground/30"
                }`}
              >
                {isProximo && <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />}
              </div>
              
              <div className={`ml-2 p-3 rounded-xl transition-all ${
                erro ? "bg-red-500/5 border border-red-500/10"
                : isProximo ? "bg-primary/5 border border-primary/10"
                : "hover:bg-muted/20"
              }`}>
                <div className="flex items-start gap-3">
                  <div className="text-xl opacity-90 pt-0.5 grayscale-[0.2]">{ev.emoji}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-[11px] font-mono font-medium text-muted-foreground">{ev.label}</span>
                      <span className="text-[13px] font-semibold text-foreground truncate">{ev.nome}</span>
                      <CanalBadge canal={ev.canal} />
                      {enviado && <span className="text-[10px] text-emerald-500 font-medium">✓ Enviado</span>}
                      {erro && <span className="text-[10px] text-red-500 font-medium">✗ Erro</span>}
                    </div>
                    {ev.descricao && (
                      <div className="text-[11px] text-muted-foreground/80 leading-relaxed mb-2">{ev.descricao}</div>
                    )}
                    
                    <div className="flex items-center gap-1.5">
                      <Button size="sm" variant="ghost" className="h-6 text-[10px] px-2 text-muted-foreground hover:text-foreground" onClick={() => setDetalhe(ev)}>
                        Ver detalhes
                      </Button>
                      <Button
                        size="sm" variant="secondary" className="h-6 text-[10px] px-2 bg-secondary/50"
                        disabled={testando === ev.automation_key}
                        onClick={() => testarAdmin(ev)}
                      >
                        {testando === ev.automation_key ? "Testando..." : "Testar admin"}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <Sheet open={!!detalhe} onOpenChange={(o) => !o && setDetalhe(null)}>
        <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto">
          {detalhe && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <span className="text-xl">{detalhe.emoji}</span> {detalhe.nome}
                </SheetTitle>
                <SheetDescription>
                  {padHora(detalhe.hora, detalhe.minuto)} · <CanalBadge canal={detalhe.canal} />
                </SheetDescription>
              </SheetHeader>
              <div className="space-y-4 mt-4 text-sm">
                <div>
                  <div className="text-xs font-semibold text-muted-foreground mb-1">Público-alvo</div>
                  <div>{detalhe.publico}</div>
                </div>
                <div>
                  <div className="text-xs font-semibold text-muted-foreground mb-1">Regra de disparo</div>
                  <div>{detalhe.regra}</div>
                </div>
                <div>
                  <div className="text-xs font-semibold text-muted-foreground mb-1">Prévia da mensagem</div>
                  <Card className="p-3 bg-muted/40">
                    <div className="font-semibold">{detalhe.titulo_exemplo}</div>
                    <div className="text-muted-foreground whitespace-pre-line mt-1">{detalhe.corpo_exemplo}</div>
                  </Card>
                </div>
                <Button
                  className="w-full" disabled={testando === detalhe.automation_key}
                  onClick={() => testarAdmin(detalhe)}
                >
                  {testando === detalhe.automation_key
                    ? <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    : <Send className="w-4 h-4 mr-2" />}
                  Testar agora — Push + WhatsApp admin
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
