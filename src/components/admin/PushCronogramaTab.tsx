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
    nome: "Boletim de Leis matinal", emoji: "📜", canal: "app",
    papel: "principal", complemento: "horus", deep_link: "/radar-360",
    descricao: "Push do app é o principal. Horus manda o complemento com o link que abre o app.",
    publico: "Todos com opt-in de push (+ opt-in Horus para o complemento)",
    regra: "Só envia se houver ao menos 1 lei nova na resenha de 24h. Senão marca como 'não enviado'.",
    titulo_exemplo: "📜 3 leis novas pra você ler",
    corpo_exemplo: "• Lei nº X\n• Decreto nº Y\n• Medida Provisória Z",
  },
  {
    hora: 8, minuto: 30, automation_key: "blog_post_manha",
    nome: "Blog — post da manhã", emoji: "📰", canal: "app",
    papel: "principal", complemento: "horus", deep_link: "/blog/:id",
    descricao: "Push do app é o principal. Horus complementa no WhatsApp com o link do post.",
    publico: "Todos com push habilitado",
    regra: "Envia o primeiro post pendente do dia. Se nenhum, pula sem enviar.",
    titulo_exemplo: "📰 Novo post no Blog Vacatio",
    corpo_exemplo: "Resumo do post do dia.",
  },
  {
    hora: 12, minuto: 30, automation_key: "noticias_dia",
    nome: "Notícias jurídicas do dia", emoji: "📰", canal: "horus",
    papel: "principal", complemento: "app", deep_link: "/noticias",
    descricao: "Horus é o principal (curadoria com 3 manchetes). Push do app reforça em seguida.",
    publico: "Horus: opt-in de leis. Push: todos com push habilitado.",
    regra: "1 disparo único por dia. Se o dia não tem notícias, pula.",
    titulo_exemplo: "📰 Notícias jurídicas de hoje",
    corpo_exemplo: "1. STF decide sobre...\n2. Nova lei sobre...\n3. Reforma tributária...",
  },
  {
    hora: 16, minuto: 0, automation_key: "personalizada_horus",
    nome: "Lembrete de estudo (Horus)", emoji: "🦉", canal: "horus",
    papel: "principal", complemento: "app", deep_link: "/aprender",
    descricao: "Horus é o principal — mensagem personalizada com o nome. App complementa com um push discreto.",
    publico: "Cada usuário no seu horário-pico individual (16h é referência do slot).",
    regra: "Baseado no que a pessoa mais estuda. Cap 1x/dia por usuário.",
    titulo_exemplo: "Rafael, separei o Art. 5º pra você",
    corpo_exemplo: "Quer que eu te mande a videoaula complementar?",
  },
  {
    hora: 19, minuto: 30, automation_key: "boletim_noticias_diario",
    nome: "Boletim de Notícias (curadoria)", emoji: "🎙️", canal: "app",
    papel: "principal", complemento: "horus", deep_link: "/boletins-noticias",
    descricao: "Push do app com o boletim editado do dia. Horus reforça no WhatsApp.",
    publico: "Todos com opt-in",
    regra: "Roda diariamente às 19:30 BRT.",
    titulo_exemplo: "🎙️ Boletim de Notícias pronto",
    corpo_exemplo: "Confira as manchetes de hoje.",
  },
  {
    hora: 21, minuto: 0, automation_key: "personalizada_app",
    nome: "Nudge personalizado (App)", emoji: "✨", canal: "app",
    papel: "unico", deep_link: "/",
    descricao: "Push discreto no horário-pico do usuário. Sem complemento, para fechar o dia sem excesso.",
    publico: "Cada usuário no seu horário-pico individual.",
    regra: "Analisa artigos/leis mais acessados nos últimos 30 dias. Cap 1x/dia.",
    titulo_exemplo: "Rafael, o Art. 5º te espera 👀",
    corpo_exemplo: "Continue de onde você parou no Código Penal.",
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
    <div className="space-y-3">
      {/* Cards de resumo do dia */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Card className="p-3">
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground uppercase tracking-wide">
            <Send className="w-3 h-3" /> Enviadas
          </div>
          <div className="text-2xl font-bold mt-1">{resumo.enviadas}</div>
          <div className="text-[10px] text-muted-foreground">{resumo.campanhasSent} campanha{resumo.campanhasSent === 1 ? "" : "s"}</div>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground uppercase tracking-wide">
            <MailOpen className="w-3 h-3" /> Abertas
          </div>
          <div className="text-2xl font-bold mt-1 text-emerald-600">{resumo.abertas}</div>
          <div className="text-[10px] text-muted-foreground">{resumo.taxaAbertura}% de taxa</div>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground uppercase tracking-wide">
            <Check className="w-3 h-3" /> Entregues
          </div>
          <div className="text-2xl font-bold mt-1">{resumo.entregues}</div>
          <div className="text-[10px] text-muted-foreground">confirmadas pelo dispositivo</div>
        </Card>
        <Card className={`p-3 ${resumo.falhas > 0 ? "border-red-500/40" : ""}`}>
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground uppercase tracking-wide">
            <XCircle className="w-3 h-3" /> Falhas
          </div>
          <div className={`text-2xl font-bold mt-1 ${resumo.falhas > 0 ? "text-red-500" : ""}`}>{resumo.falhas}</div>
          <div className="text-[10px] text-muted-foreground">{resumo.comErro} campanha{resumo.comErro === 1 ? "" : "s"} c/ erro</div>
        </Card>
      </div>

      {resumo.enviadas > 0 && resumo.entregues === 0 && (
        <Card className="p-3 border-amber-500/40 bg-amber-500/5">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <div className="text-[11px] leading-relaxed">
              <strong>Push saindo, mas sem confirmação de entrega.</strong> Se você não recebeu no seu aparelho, verifique: (1) permissão de notificações do app nas Configurações do Android, (2) canal "Padrão" ativo, (3) modo "Não perturbe" desligado, e (4) app fora da otimização de bateria. O FCM aceitou {resumo.enviadas} envio(s) hoje.
            </div>
          </div>
        </Card>
      )}

      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <Clock className="w-3 h-3 text-primary" /> Linha do tempo das notificações do dia.
        </p>
        <Button size="sm" variant="ghost" onClick={load} disabled={loading}>
          {loading ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <RefreshCw className="w-3 h-3 mr-1" />}
          Atualizar
        </Button>
      </div>

      <div className="relative pl-8">
        <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-border" />
        {eventos.map((ev, i) => {
          const isProximo = i === proximoIdx;
          const enviado = ev.status === "enviado";
          const erro = ev.status === "erro";
          const naoEnviado = ev.status === "nao_enviado";
          const agendado = ev.status === "agendado";
          return (
            <div key={i} className="relative pb-4">
              <div
                className={`absolute -left-[26px] top-2 w-6 h-6 rounded-full border-2 flex items-center justify-center shadow-sm ${
                  enviado ? "bg-emerald-500 border-emerald-500 text-white"
                  : erro ? "bg-red-500 border-red-500 text-white"
                  : isProximo ? "bg-primary border-primary text-primary-foreground animate-pulse"
                  : agendado ? "bg-background border-primary/60 text-primary"
                  : naoEnviado ? "bg-muted border-muted-foreground/40 text-muted-foreground"
                  : "bg-background border-muted-foreground/40 text-muted-foreground"
                }`}
              >
                {enviado ? <Check className="w-3.5 h-3.5" strokeWidth={3} />
                  : erro ? <XCircle className="w-3.5 h-3.5" strokeWidth={2.5} />
                  : isProximo ? <Bell className="w-3 h-3" />
                  : agendado ? <Clock className="w-3 h-3" />
                  : naoEnviado ? <CircleDashed className="w-3 h-3" />
                  : <CircleDashed className="w-3 h-3" />}
              </div>
              <Card className={`p-3 ${
                erro ? "border-red-500/40"
                : isProximo ? "border-primary/50"
                : ""
              }`}>
                <div className="flex items-start gap-2">
                  <div className="text-xl leading-none">{ev.emoji}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono font-semibold text-primary">{ev.label}</span>
                      <span className="text-sm font-medium truncate">{ev.nome}</span>
                      <CanalBadge canal={ev.canal} />
                      {ev.complemento && (
                        <span className="text-[10px] text-muted-foreground inline-flex items-center gap-1">
                          <span>+</span>
                          <CanalBadge canal={ev.complemento} />
                          <span className="italic">complemento</span>
                        </span>
                      )}
                      {ev.papel === "principal" && (
                        <Badge variant="outline" className="text-[10px] border-primary/40 text-primary">principal</Badge>
                      )}
                      {enviado && (
                        <Badge className="text-[10px] bg-emerald-500/15 text-emerald-600 border-emerald-500/30 border">
                          <CheckCircle2 className="w-3 h-3 mr-0.5" />enviado
                        </Badge>
                      )}
                      {erro && (
                        <Badge className="text-[10px] bg-red-500/15 text-red-600 border-red-500/30 border">
                          <XCircle className="w-3 h-3 mr-0.5" />erro
                        </Badge>
                      )}
                      {agendado && (
                        <Badge variant="outline" className="text-[10px]">agendado</Badge>
                      )}
                      {ev.status === "previsto" && (
                        <Badge variant="outline" className="text-[10px]">
                          <CircleDashed className="w-3 h-3 mr-0.5" />previsto
                        </Badge>
                      )}
                      {naoEnviado && (
                        <Badge variant="outline" className="text-[10px] text-muted-foreground">não enviado</Badge>
                      )}
                    </div>
                    {ev.descricao && (
                      <div className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">{ev.descricao}</div>
                    )}
                    {ev.badge && (
                      <div className="text-[10px] text-muted-foreground mt-1">{ev.badge}</div>
                    )}
                    <div className="flex gap-2 mt-2">
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setDetalhe(ev)}>
                        <Eye className="w-3 h-3 mr-1" /> Ver
                      </Button>
                      <Button
                        size="sm" variant="secondary" className="h-7 text-xs"
                        disabled={testando === ev.automation_key}
                        onClick={() => testarAdmin(ev)}
                      >
                        {testando === ev.automation_key
                          ? <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                          : <Send className="w-3 h-3 mr-1" />}
                        Testar admin
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
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
