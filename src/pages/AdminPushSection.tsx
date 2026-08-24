import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/vademecum/PageHeader";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Send, Smartphone, Globe, RefreshCw, Smile, Image as ImageIcon, Upload, Eye, MousePointerClick, TrendingUp, MessageCircle } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import { toast } from "sonner";
import { FunctionsHttpError } from "@supabase/supabase-js";
import PushAutomacoesTab from "@/components/admin/PushAutomacoesTab";
import PushDiagnosticoTab from "@/components/admin/PushDiagnosticoTab";
import PushCronogramaTab from "@/components/admin/PushCronogramaTab";

type Section = "enviar" | "programadas" | "dashboard" | "diagnostico" | "historico";

const SECTION_META: Record<Section, { title: string; subtitle?: string }> = {
  enviar: { title: "Enviar Push Manual", subtitle: "Compor e disparar uma notificação" },
  programadas: { title: "Notificações Programadas", subtitle: "Automações e campanhas agendadas" },
  dashboard: { title: "Dashboard de Push", subtitle: "Métricas detalhadas de envio e abertura" },
  diagnostico: { title: "Diagnóstico", subtitle: "Testar tokens e canais" },
  historico: { title: "Histórico Completo", subtitle: "Todas as campanhas já enviadas" },
};

type Platform = "android" | "ios" | "web";
type PremiumFilter = "all" | "premium" | "free";
type SendMode = "now" | "scheduled";
type Recurrence = "none" | "daily" | "weekly";
type Channel = "app" | "horus" | "both";

const TITULO_TEMPLATES: { label: string; value: string }[] = [
  { label: "Boletim jurídico do dia", value: "📰 Boletim jurídico do dia" },
  { label: "Novo artigo no blog", value: "✍️ Novo artigo no blog" },
  { label: "Radar de leis", value: "⚖️ Radar de leis" },
  { label: "Novidade no OAB na Risca", value: "🎯 Novidade no OAB na Risca" },
  { label: "Nova aula disponível", value: "🎓 Nova aula disponível" },
  { label: "Lembrete de estudo", value: "⏰ Hora de estudar!" },
  { label: "Atualização importante", value: "🔔 Atualização importante" },
];

const MENSAGEM_TEMPLATES: { label: string; value: string }[] = [
  { label: "Boletim pronto", value: "Seu boletim jurídico de hoje já está disponível. Ouça agora e fique por dentro das principais novidades." },
  { label: "Novo artigo no blog", value: "Acabou de sair um novo artigo no blog. Toque para ler agora." },
  { label: "Radar de leis", value: "Novas leis e projetos foram monitorados. Confira os impactos no Radar 360." },
  { label: "Lembrete de estudo", value: "Que tal 10 minutos de estudo agora? Continue de onde parou." },
  { label: "Novidade OAB", value: "Nova questão comentada disponível. Reforce seu preparo para a OAB." },
  { label: "Atualização do app", value: "Trouxemos melhorias importantes. Abra o app para conferir." },
];

interface Campaign {
  id: string;
  title: string;
  body: string;
  url: string | null;
  status: string;
  audience: any;
  scheduled_at: string | null;
  next_run_at: string | null;
  last_run_at: string | null;
  recurrence: any;
  tipo: string | null;
  sent_count: number;
  failed_count: number;
  delivered_count: number;
  opened_count: number;
  converted_count: number;
  created_at: string;
}

interface TokenStats {
  total: number;
  android: number;
  ios: number;
  web: number;
}

const PLATFORM_LABEL: Record<Platform, string> = { android: "Android", ios: "iOS", web: "Web" };

const DESTINOS: { group: string; items: { label: string; path: string }[] }[] = [
  {
    group: "Principais",
    items: [
      { label: "Início", path: "/" },
      { label: "Novidades", path: "/novidades" },
      { label: "Notícias", path: "/noticias" },
      { label: "Radar 360", path: "/radar-360" },
      { label: "Aprender", path: "/aprender" },
      { label: "Estudar", path: "/estudos" },
      { label: "Ferramentas", path: "/ferramentas" },
      { label: "Biblioteca", path: "/biblioteca" },
      
      { label: "Resumos", path: "/resumos" },
      { label: "Narração", path: "/narracao" },
      { label: "Grafo de Artigos", path: "/grafo-artigos" },
    ],
  },
  {
    group: "Radar",
    items: [
      { label: "Deputados", path: "/radar/deputados" },
      { label: "Proposições", path: "/radar/proposicoes" },
      { label: "Rankings", path: "/radar/rankings" },
      { label: "Votações", path: "/radar/votacoes" },
    ],
  },
  {
    group: "Conta",
    items: [
      { label: "Perfil", path: "/perfil" },
      { label: "Assinatura", path: "/assinatura" },
      { label: "Planos", path: "/assinatura" },
      { label: "Configurações", path: "/configuracoes" },
      { label: "Lembretes", path: "/ajustes/lembretes" },
      { label: "Segurança", path: "/ajustes/seguranca" },
      { label: "Newsletter", path: "/newsletter" },
    ],
  },
  {
    group: "Institucional",
    items: [
      { label: "Sobre", path: "/sobre" },
      { label: "Termos", path: "/termos" },
      { label: "Privacidade", path: "/privacidade" },
      { label: "Landing", path: "/landing" },
    ],
  },
];

export default function AdminPushSection() {
  const navigate = useNavigate();
  const { section: rawSection } = useParams<{ section: string }>();
  const section = (SECTION_META[rawSection as Section] ? rawSection : "enviar") as Section;
  const meta = SECTION_META[section];
  const [stats, setStats] = useState<TokenStats>({ total: 0, android: 0, ios: 0, web: 0 });
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(false);
  const [tipoFiltro, setTipoFiltro] = useState<string>("todas");
  const [detailCampaign, setDetailCampaign] = useState<Campaign | null>(null);
  const [opensTodayOpen, setOpensTodayOpen] = useState(false);
  const [programadasView, setProgramadasView] = useState<"cronograma" | "funcoes">("cronograma");

  // form
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [url, setUrl] = useState("");
  const [emoji, setEmoji] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [platforms, setPlatforms] = useState<Platform[]>(["android", "ios", "web"]);
  const [premium, setPremium] = useState<PremiumFilter>("all");
  const [emails, setEmails] = useState("");
  const [sendMode, setSendMode] = useState<SendMode>("now");
  const [scheduledAt, setScheduledAt] = useState("");
  const [recurrence, setRecurrence] = useState<Recurrence>("none");
  const [weekday, setWeekday] = useState("1");
  const [sending, setSending] = useState(false);
  const [channel, setChannel] = useState<Channel>("app");
  const [personalize, setPersonalize] = useState(true);
  const [tituloTemplate, setTituloTemplate] = useState<string>("__custom");
  const [mensagemTemplate, setMensagemTemplate] = useState<string>("__custom");

  async function loadStats() {
    const { data } = await supabase.from("device_tokens").select("platform");
    const s: TokenStats = { total: 0, android: 0, ios: 0, web: 0 };
    (data ?? []).forEach((r: any) => {
      s.total++;
      if (r.platform === "android") s.android++;
      else if (r.platform === "ios") s.ios++;
      else if (r.platform === "web") s.web++;
    });
    setStats(s);
  }

  async function loadCampaigns() {
    const { data } = await supabase
      .from("push_campaigns")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    setCampaigns((data ?? []) as Campaign[]);
  }

  useEffect(() => {
    setLoading(true);
    Promise.all([loadStats(), loadCampaigns()]).finally(() => setLoading(false));
  }, []);

  const audience = useMemo(() => {
    const emailList = emails.split(/[\s,;]+/).map((e) => e.trim()).filter(Boolean);
    return {
      all: platforms.length === 3 && premium === "all" && emailList.length === 0,
      platforms,
      premium,
      emails: emailList.length ? emailList : undefined,
    };
  }, [platforms, premium, emails]);

  function togglePlatform(p: Platform) {
    setPlatforms((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));
  }

  function resetForm() {
    setTitle(""); setBody(""); setUrl(""); setEmails(""); setEmoji(""); setImageUrl("");
    setPlatforms(["android", "ios", "web"]); setPremium("all");
    setSendMode("now"); setScheduledAt(""); setRecurrence("none");
    setChannel("app"); setTituloTemplate("__custom"); setMensagemTemplate("__custom");
  }

  async function uploadImage(file: File) {
    setUploadingImage(true);
    try {
      const ext = file.name.split(".").pop() || "png";
      const path = `manual/${new Date().toISOString().slice(0,10)}/${crypto.randomUUID()}.${ext}`;
      const up = await supabase.storage.from("push-covers").upload(path, file, { contentType: file.type, upsert: false });
      if (up.error) throw up.error;
      const signed = await supabase.storage.from("push-covers").createSignedUrl(path, 60 * 60 * 24 * 365);
      if (!signed.data?.signedUrl) throw new Error("Não gerou URL");
      setImageUrl(signed.data.signedUrl);
      toast.success("Imagem enviada");
    } catch (e: any) {
      toast.error(e?.message ?? "Falha no upload");
    } finally {
      setUploadingImage(false);
    }
  }

  async function handleSubmit() {
    if (!title.trim() || !body.trim()) {
      toast.error("Título e mensagem são obrigatórios");
      return;
    }
    if (platforms.length === 0) {
      toast.error("Selecione ao menos uma plataforma");
      return;
    }
    if (sendMode === "scheduled" && !scheduledAt) {
      toast.error("Escolha data e hora do agendamento");
      return;
    }
    setSending(true);
    try {
      if (sendMode === "now") {
        const results: string[] = [];

        if (channel === "app" || channel === "both") {
          const { data: campaign, error: campaignError } = await supabase
            .from("push_campaigns")
            .insert({
              title,
              body,
              url: url || null,
              audience,
              recurrence: null,
              status: "sending",
              emoji: emoji || null,
              image_url: imageUrl || null,
            })
            .select("id")
            .single();
          if (campaignError) throw campaignError;

          const { data, error } = await supabase.functions.invoke("send-push", {
            body: {
              campaign_id: campaign.id,
              title, body,
              url: url || undefined,
              audience,
              emoji: emoji || undefined,
              image: imageUrl || undefined,
              personalize,
            },
          });
          if (error) {
            const detail = error instanceof FunctionsHttpError ? await error.context.text() : error.message;
            throw new Error(detail);
          }
          results.push(`App: ${data?.sent ?? 0}/${data?.total ?? 0}`);
        }

        if (channel === "horus" || channel === "both") {
          const linkAbs = url ? (url.startsWith("http") ? url : `https://huggable-calc-89.lovable.app${url}`) : "";
          const mensagemFinal = `*${title}*\n\n${body}${linkAbs ? `\n\n${linkAbs}` : ""}`;
          const { data: hc, error: hcErr } = await supabase
            .from("horus_campaigns")
            .insert({
              titulo: title,
              mensagem: mensagemFinal,
              media_url: imageUrl || null,
              publico_alvo: premium === "all" ? "todos" : premium,
              status: "pendente",
            })
            .select("id")
            .single();
          if (hcErr) throw hcErr;
          const { data: hData, error: hErr } = await supabase.functions.invoke("horus-campaign-run", {
            body: { campaign_id: hc.id },
          });
          if (hErr) {
            const detail = hErr instanceof FunctionsHttpError ? await hErr.context.text() : hErr.message;
            throw new Error(detail);
          }
          results.push(`Horus: ${hData?.total ?? 0} alvos`);
        }

        toast.success(`Enviado — ${results.join(" • ")}`);
      } else {
        if (channel === "horus") {
          toast.error("Agendamento pelo Horus ainda não é suportado — envie agora.");
          setSending(false);
          return;
        }
        const rec = recurrence === "none" ? null
          : recurrence === "daily"
            ? { type: "daily", time: scheduledAt.slice(11, 16) || "09:00" }
            : { type: "weekly", weekday: Number(weekday), time: scheduledAt.slice(11, 16) || "09:00" };
        const iso = new Date(scheduledAt).toISOString();
        const { error } = await supabase.from("push_campaigns").insert({
          title, body, url: url || null,
          audience, recurrence: rec,
          status: "scheduled", scheduled_at: iso, next_run_at: iso,
          emoji: emoji || null,
          image_url: imageUrl || null,
        });
        if (error) throw error;
        toast.success("Campanha agendada");
      }
      resetForm();
      loadCampaigns();
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao enviar");
    } finally {
      setSending(false);
    }
  }

  async function cancelCampaign(id: string) {
    await supabase.from("push_campaigns").update({ status: "cancelled" }).eq("id", id);
    loadCampaigns();
  }

  async function runNow(id: string) {
    await supabase.from("push_campaigns").update({ next_run_at: new Date().toISOString() }).eq("id", id);
    toast.success("Marcada para envio no próximo ciclo");
    loadCampaigns();
  }

  return (
    <div className="min-h-dvh bg-background">
      <PageHeader title={meta.title} subtitle={meta.subtitle} onBack={() => navigate('/admin-push')} />
      <div className="max-w-3xl mx-auto p-4 space-y-4">
        <div className="grid grid-cols-4 gap-2">
          <StatCard label="Devices" value={stats.total} />
          <StatCard icon={<Smartphone className="w-3 h-3" />} label="Android" value={stats.android} />
          <StatCard icon={<Smartphone className="w-3 h-3" />} label="iOS" value={stats.ios} />
          <StatCard icon={<Globe className="w-3 h-3" />} label="Web" value={stats.web} />
        </div>

        {section === "enviar" && (
          <div className="space-y-4">
            <Card className="p-4 space-y-4">
              <div>
                <Label className="text-sm font-semibold">Título</Label>
                <Select
                  value={tituloTemplate}
                  onValueChange={(v) => {
                    setTituloTemplate(v);
                    if (v === "__custom") setTitle("");
                    else {
                      const tpl = TITULO_TEMPLATES.find((t) => t.value === v);
                      if (tpl) setTitle(tpl.value);
                    }
                  }}
                >
                  <SelectTrigger className="mt-1 h-11 text-base">
                    <SelectValue placeholder="Escolher template ou personalizar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__custom">✏️ Personalizado</SelectItem>
                    {TITULO_TEMPLATES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  className="mt-2 h-11 text-base"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={tituloTemplate === "__custom" ? "Digite o título…" : "Edite o template se quiser"}
                  maxLength={80}
                />
              </div>
              <div className="grid grid-cols-[88px_1fr] gap-2">
                <div>
                  <Label className="flex items-center gap-1 text-xs"><Smile className="w-3 h-3" /> Emoji</Label>
                  <Input value={emoji} onChange={(e) => setEmoji(e.target.value)} maxLength={4} placeholder="⚖️" className="text-center text-xl h-11" />
                </div>
                <div>
                  <Label className="flex items-center gap-1 text-xs"><ImageIcon className="w-3 h-3" /> Capa (opcional)</Label>
                  <div className="flex gap-2">
                    <Input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="URL ou envie um arquivo" className="h-11 text-base" />
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => e.target.files?.[0] && uploadImage(e.target.files[0])}
                      />
                      <Button asChild size="lg" variant="secondary" disabled={uploadingImage} className="h-11">
                        <span>{uploadingImage ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}</span>
                      </Button>
                    </label>
                  </div>
                  {imageUrl && (
                    <img src={imageUrl} alt="preview" className="mt-2 h-16 rounded border object-cover" />
                  )}
                </div>
              </div>
              <div>
                <Label className="text-sm font-semibold">Mensagem</Label>
                <Select
                  value={mensagemTemplate}
                  onValueChange={(v) => {
                    setMensagemTemplate(v);
                    if (v === "__custom") setBody("");
                    else {
                      const tpl = MENSAGEM_TEMPLATES.find((t) => t.value === v);
                      if (tpl) setBody(tpl.value);
                    }
                  }}
                >
                  <SelectTrigger className="mt-1 h-11 text-base">
                    <SelectValue placeholder="Escolher template ou personalizar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__custom">✏️ Personalizado</SelectItem>
                    {MENSAGEM_TEMPLATES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Textarea
                  className="mt-2 text-base"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={4}
                  maxLength={240}
                  placeholder={mensagemTemplate === "__custom" ? "Digite a mensagem…" : "Edite o template se quiser"}
                />
              </div>
              <div>
                <Label className="text-sm font-semibold">Canal de envio</Label>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {([
                    { v: "app", label: "App", desc: "Push" },
                    { v: "horus", label: "Horus", desc: "WhatsApp" },
                    { v: "both", label: "Ambos", desc: "App + WhatsApp" },
                  ] as { v: Channel; label: string; desc: string }[]).map((opt) => (
                    <button
                      key={opt.v}
                      type="button"
                      onClick={() => setChannel(opt.v)}
                      className={`rounded-lg border p-3 text-center transition ${
                        channel === opt.v
                          ? "border-primary bg-primary/10 text-foreground"
                          : "border-border text-muted-foreground hover:border-foreground/40"
                      }`}
                    >
                      <div className="font-semibold text-sm">{opt.label}</div>
                      <div className="text-[10px] mt-0.5 opacity-80">{opt.desc}</div>
                    </button>
                  ))}
                </div>
                <label className="mt-3 flex items-start gap-2 rounded-lg border border-border p-3 cursor-pointer hover:bg-secondary/40 transition-colors">
                  <input
                    type="checkbox"
                    checked={personalize}
                    onChange={(e) => setPersonalize(e.target.checked)}
                    className="mt-0.5 accent-primary"
                  />
                  <div className="text-xs">
                    <div className="font-semibold text-foreground">Personalizar com o nome do usuário</div>
                    <div className="text-muted-foreground mt-0.5">
                      Prefixa o primeiro nome no título (ex.: “João, {title.toLowerCase().slice(0, 24) || 'novidade…'}”).
                      Também substitui <code className="text-[10px]">{'{primeiro_nome}'}</code> quando presente.
                    </div>
                  </div>
                </label>
              </div>
              <div>
                <Label>Destino ao tocar (opcional)</Label>
                <Select
                  value={url === "" ? "__none" : DESTINOS.some((g) => g.items.some((i) => i.path === url)) ? url : "__custom"}
                  onValueChange={(v) => {
                    if (v === "__none") setUrl("");
                    else if (v === "__custom") setUrl("https://");
                    else setUrl(v);
                  }}
                >
                  <SelectTrigger><SelectValue placeholder="Selecionar tela" /></SelectTrigger>
                  <SelectContent className="max-h-80">
                    <SelectItem value="__none">Nenhum (só notificação)</SelectItem>
                    {DESTINOS.map((g) => (
                      <SelectGroup key={g.group}>
                        <SelectLabel>{g.group}</SelectLabel>
                        {g.items.map((i) => (
                          <SelectItem key={i.path} value={i.path}>{i.label}</SelectItem>
                        ))}
                      </SelectGroup>
                    ))}
                    <SelectItem value="__custom">URL personalizada…</SelectItem>
                  </SelectContent>
                </Select>
                {url && !DESTINOS.some((g) => g.items.some((i) => i.path === url)) && (
                  <Input
                    className="mt-2"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="/rota ou https://..."
                  />
                )}
              </div>
            </Card>

            <Card className="p-4 space-y-3">
              <div className="font-semibold text-sm">Segmentação</div>
              <div>
                <Label className="text-xs text-muted-foreground">Plataformas</Label>
                <div className="flex gap-3 mt-2">
                  {(["android", "ios", "web"] as Platform[]).map((p) => (
                    <label key={p} className="flex items-center gap-2 text-sm">
                      <Checkbox checked={platforms.includes(p)} onCheckedChange={() => togglePlatform(p)} />
                      {PLATFORM_LABEL[p]}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Assinatura</Label>
                <RadioGroup value={premium} onValueChange={(v) => setPremium(v as PremiumFilter)} className="flex gap-4 mt-2">
                  {(["all", "premium", "free"] as PremiumFilter[]).map((v) => (
                    <label key={v} className="flex items-center gap-2 text-sm capitalize">
                      <RadioGroupItem value={v} />{v === "all" ? "Todos" : v}
                    </label>
                  ))}
                </RadioGroup>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Emails específicos (opcional)</Label>
                <Textarea value={emails} onChange={(e) => setEmails(e.target.value)} rows={2} placeholder="email1@x.com, email2@x.com" />
              </div>
            </Card>

            <Card className="p-4 space-y-3">
              <div className="font-semibold text-sm">Quando enviar</div>
              <RadioGroup value={sendMode} onValueChange={(v) => setSendMode(v as SendMode)} className="flex gap-4">
                <label className="flex items-center gap-2 text-sm"><RadioGroupItem value="now" />Agora</label>
                <label className="flex items-center gap-2 text-sm"><RadioGroupItem value="scheduled" />Agendar</label>
              </RadioGroup>
              {sendMode === "scheduled" && (
                <div className="space-y-3">
                  <div>
                    <Label>Data e hora</Label>
                    <Input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
                  </div>
                  <div>
                    <Label>Recorrência</Label>
                    <Select value={recurrence} onValueChange={(v) => setRecurrence(v as Recurrence)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Sem recorrência</SelectItem>
                        <SelectItem value="daily">Diariamente</SelectItem>
                        <SelectItem value="weekly">Semanalmente</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {recurrence === "weekly" && (
                    <div>
                      <Label>Dia da semana</Label>
                      <Select value={weekday} onValueChange={setWeekday}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"].map((d, i) => (
                            <SelectItem key={i} value={String(i)}>{d}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              )}
            </Card>

            <Button onClick={handleSubmit} disabled={sending} className="w-full" size="lg">
              {sending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
              {sendMode === "now" ? "Enviar agora" : "Agendar campanha"}
            </Button>
          </div>
        )}

        {section === "programadas" && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-1 p-1 bg-muted/40 rounded-lg">
              <button
                onClick={() => setProgramadasView("cronograma")}
                className={`text-xs font-medium py-2 rounded-md transition-colors ${
                  programadasView === "cronograma"
                    ? "bg-background shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Cronograma
              </button>
              <button
                onClick={() => setProgramadasView("funcoes")}
                className={`text-xs font-medium py-2 rounded-md transition-colors ${
                  programadasView === "funcoes"
                    ? "bg-background shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Funções
              </button>
            </div>

            {programadasView === "cronograma" && <PushCronogramaTab />}

            {programadasView === "funcoes" && (
              <>
                <div className="text-xs uppercase tracking-wider text-muted-foreground pt-2">Automações padrão</div>
                <PushAutomacoesTab />
                <div className="flex items-center justify-between pt-4">
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">Campanhas agendadas</div>
                  <Button size="sm" variant="ghost" onClick={loadCampaigns}><RefreshCw className="w-3 h-3 mr-1" />Atualizar</Button>
                </div>
                {campaigns.filter((c) => c.status === "scheduled" || c.status === "sending").length === 0 && (
                  <p className="text-center text-muted-foreground text-sm py-8">Nenhuma campanha agendada</p>
                )}
                {campaigns.filter((c) => c.status === "scheduled" || c.status === "sending").map((c) => (
                  <Card key={c.id} className="p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm">{c.title}</div>
                        <div className="text-xs text-muted-foreground line-clamp-2">{c.body}</div>
                        <div className="text-xs mt-1">
                          <Badge variant="outline">{c.status}</Badge>{" "}
                          {c.next_run_at && new Date(c.next_run_at).toLocaleString("pt-BR")}
                          {c.recurrence?.type && ` · ${c.recurrence.type}`}
                        </div>
                      </div>
                      <div className="flex flex-col gap-1">
                        <Button size="sm" variant="secondary" onClick={() => runNow(c.id)}>Rodar</Button>
                        <Button size="sm" variant="destructive" onClick={() => cancelCampaign(c.id)}>Cancelar</Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </>
            )}
          </div>
        )}

        {section === "dashboard" && (
          <DashboardSection
            campaigns={campaigns}
            loading={loading}
            tipoFiltro={tipoFiltro}
            setTipoFiltro={setTipoFiltro}
            onRefresh={loadCampaigns}
            onOpenDetail={setDetailCampaign}
            onOpenOpensToday={() => setOpensTodayOpen(true)}
          />
        )}

        {section === "historico" && (
          <div className="space-y-2">
            <div className="flex justify-end">
              <Button size="sm" variant="ghost" onClick={loadCampaigns}><RefreshCw className="w-3 h-3 mr-1" />Atualizar</Button>
            </div>
            {campaigns.filter((c) => c.status === "sent" || c.status === "cancelled" || c.status === "failed").map((c) => (
              <Card key={c.id} className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{c.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(c.created_at).toLocaleString("pt-BR")} · <Badge variant="outline" className="text-[10px]">{c.status}</Badge>
                    </div>
                    <div className="text-xs mt-1 text-muted-foreground">
                      Enviado {c.sent_count} · Aberto {c.opened_count} · Convertido {c.converted_count}
                    </div>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => setDetailCampaign(c)}><Eye className="w-3 h-3" /></Button>
                </div>
              </Card>
            ))}
            {campaigns.filter((c) => c.status === "sent" || c.status === "cancelled" || c.status === "failed").length === 0 && (
              <p className="text-center text-muted-foreground text-sm py-8">Nenhum envio ainda</p>
            )}
          </div>
        )}

        {section === "diagnostico" && <PushDiagnosticoTab />}
      </div>

      <CampaignDetailDialog campaign={detailCampaign} onClose={() => setDetailCampaign(null)} />
      <OpensTodayDialog open={opensTodayOpen} onClose={() => setOpensTodayOpen(false)} />
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string; value: number; icon?: React.ReactNode }) {
  return (
    <Card className="p-2 text-center">
      <div className="text-[10px] text-muted-foreground flex items-center justify-center gap-1">{icon}{label}</div>
      <div className="text-lg font-bold">{value}</div>
    </Card>
  );
}

function Metric({ label, value, sub, tone }: { label: string; value: number; sub?: string; tone?: "ok" | "warn" }) {
  const color = tone === "ok" ? "text-emerald-500" : tone === "warn" ? "text-amber-500" : "";
  return (
    <div className="rounded bg-muted/40 py-1">
      <div className="text-[10px] text-muted-foreground">{label}</div>
      <div className={`font-bold ${color}`}>{value}</div>
      {sub && <div className="text-[10px] text-muted-foreground">{sub}</div>}
    </div>
  );
}

function DashboardSection({ campaigns, loading, tipoFiltro, setTipoFiltro, onRefresh, onOpenDetail, onOpenOpensToday }: {
  campaigns: Campaign[];
  loading: boolean;
  tipoFiltro: string;
  setTipoFiltro: (v: string) => void;
  onRefresh: () => void;
  onOpenDetail: (c: Campaign) => void;
  onOpenOpensToday: () => void;
}) {
  const todayStart = useMemo(() => {
    const d = new Date(); d.setHours(0, 0, 0, 0); return d;
  }, []);
  const todayCampaigns = campaigns.filter((c) => new Date(c.created_at) >= todayStart);
  const totals = todayCampaigns.reduce((acc, c) => {
    acc.sent += c.sent_count || 0;
    acc.delivered += c.delivered_count || 0;
    acc.opened += c.opened_count || 0;
    acc.converted += c.converted_count || 0;
    return acc;
  }, { sent: 0, delivered: 0, opened: 0, converted: 0 });

  // Série dos últimos 7 dias
  const chartData = useMemo(() => {
    const days: { key: string; label: string; enviadas: number; abertas: number; convertidas: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      days.push({
        key,
        label: d.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit" }),
        enviadas: 0, abertas: 0, convertidas: 0,
      });
    }
    const byKey = new Map(days.map((d) => [d.key, d]));
    for (const c of campaigns) {
      const k = new Date(c.created_at).toISOString().slice(0, 10);
      const bucket = byKey.get(k);
      if (!bucket) continue;
      bucket.enviadas += c.sent_count || 0;
      bucket.abertas += c.opened_count || 0;
      bucket.convertidas += c.converted_count || 0;
    }
    return days;
  }, [campaigns]);

  // Breakdown por canal (App vs Horus)
  const canalStats = useMemo(() => {
    const stats = { app: { sent: 0, opened: 0 }, horus: { sent: 0, opened: 0 } };
    for (const c of todayCampaigns) {
      const isHorus = c.tipo?.includes("horus") || (c as any).platform === "horus";
      const bucket = isHorus ? stats.horus : stats.app;
      bucket.sent += c.sent_count || 0;
      bucket.opened += c.opened_count || 0;
    }
    return stats;
  }, [todayCampaigns]);

  const filtered = campaigns.filter((c) => {
    if (tipoFiltro === "todas") return true;
    if (tipoFiltro === "manual") return !c.tipo || c.tipo === "manual";
    return c.tipo === tipoFiltro;
  });

  const openRateToday = totals.sent ? Math.round((totals.opened / totals.sent) * 100) : 0;
  const convRateToday = totals.sent ? Math.round((totals.converted / totals.sent) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* Métricas de hoje — cards grandes */}
      <div className="grid grid-cols-2 gap-2">
        <Card className="p-4 bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Enviadas hoje</div>
          <div className="text-3xl font-bold text-primary mt-1">{totals.sent}</div>
          <div className="text-[11px] text-muted-foreground mt-1">{todayCampaigns.length} campanha(s)</div>
        </Card>
        <button
          type="button"
          onClick={onOpenOpensToday}
          className="text-left focus:outline-none focus:ring-2 focus:ring-emerald-500/40 rounded-xl"
          aria-label="Ver quem abriu"
        >
          <Card className="p-4 bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border-emerald-500/20 hover:from-emerald-500/20 transition h-full">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Abertas hoje</div>
            <div className="text-3xl font-bold text-emerald-600 mt-1">{totals.opened}</div>
            <div className="text-[11px] text-muted-foreground mt-1">{openRateToday}% · toque para ver</div>
          </Card>
        </button>
        <Card className="p-4 bg-gradient-to-br from-amber-500/10 to-amber-500/5 border-amber-500/20">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Convertidas</div>
          <div className="text-3xl font-bold text-amber-600 mt-1">{totals.converted}</div>
          <div className="text-[11px] text-muted-foreground mt-1">{convRateToday}% conversão</div>
        </Card>
        <Card className="p-4 bg-gradient-to-br from-sky-500/10 to-sky-500/5 border-sky-500/20">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Entregues</div>
          <div className="text-3xl font-bold text-sky-600 mt-1">{totals.delivered}</div>
          <div className="text-[11px] text-muted-foreground mt-1">Alcance efetivo</div>
        </Card>
      </div>

      {/* Gráfico grande — 7 dias */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-sm font-semibold flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-primary" /> Últimos 7 dias
            </div>
            <div className="text-[11px] text-muted-foreground">Enviadas · Abertas · Convertidas</div>
          </div>
        </div>
        <div className="h-64 -ml-4">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} width={30} />
              <Tooltip
                contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                labelStyle={{ fontWeight: 600 }}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" />
              <Line type="monotone" dataKey="enviadas" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="abertas" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="convertidas" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Canal: App vs Horus */}
      <Card className="p-4">
        <div className="text-sm font-semibold mb-3">Por canal · hoje</div>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border p-3 space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-medium">
              <Smartphone className="w-3.5 h-3.5 text-primary" /> App (Push)
            </div>
            <div className="text-2xl font-bold">{canalStats.app.sent}</div>
            <div className="text-[11px] text-muted-foreground">{canalStats.app.opened} abertas · {canalStats.app.sent ? Math.round(canalStats.app.opened / canalStats.app.sent * 100) : 0}%</div>
          </div>
          <div className="rounded-lg border p-3 space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-medium">
              <MessageCircle className="w-3.5 h-3.5 text-emerald-600" /> Horus (WhatsApp)
            </div>
            <div className="text-2xl font-bold">{canalStats.horus.sent}</div>
            <div className="text-[11px] text-muted-foreground">{canalStats.horus.opened} cliques · {canalStats.horus.sent ? Math.round(canalStats.horus.opened / canalStats.horus.sent * 100) : 0}%</div>
          </div>
        </div>
      </Card>

      {/* Lista */}
      <div className="flex items-center justify-between gap-2">
        <Select value={tipoFiltro} onValueChange={setTipoFiltro}>
          <SelectTrigger className="w-52 h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas as categorias</SelectItem>
            <SelectItem value="radar_leis">Radar de Leis</SelectItem>
            <SelectItem value="blog_edicao">Blog</SelectItem>
            <SelectItem value="manual">Manual / Outras</SelectItem>
          </SelectContent>
        </Select>
        <Button size="sm" variant="ghost" onClick={onRefresh}><RefreshCw className="w-3 h-3 mr-1" />Atualizar</Button>
      </div>
      {filtered.map((c) => {
        const openRate = c.sent_count ? Math.round((c.opened_count / c.sent_count) * 100) : 0;
        const convRate = c.sent_count ? Math.round((c.converted_count / c.sent_count) * 100) : 0;
        const tipoLabel = c.tipo === "radar_leis" ? "Radar de Leis" : c.tipo === "blog_edicao" ? "Blog" : c.tipo ? c.tipo : "Manual";
        const tipoClass = c.tipo === "radar_leis" ? "bg-primary/15 text-primary border-primary/30"
          : c.tipo === "blog_edicao" ? "bg-copper/15 text-copper border-copper/30"
          : "bg-muted text-muted-foreground border-border";
        return (
          <Card key={c.id} className="p-3 space-y-2 cursor-pointer hover:bg-muted/30 transition" onClick={() => onOpenDetail(c)}>
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate">{c.title}</div>
                <div className="text-xs text-muted-foreground flex items-center gap-1 flex-wrap">
                  <Badge className={`text-[10px] border ${tipoClass}`}>{tipoLabel}</Badge>
                  <span>{new Date(c.created_at).toLocaleString("pt-BR")}</span>
                  <Badge variant="outline" className="text-[10px]">{c.status}</Badge>
                </div>
              </div>
              <Eye className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="grid grid-cols-5 gap-1 text-center text-xs">
              <Metric label="Enviado" value={c.sent_count} />
              <Metric label="Falhou" value={c.failed_count} tone="warn" />
              <Metric label="Entregue" value={c.delivered_count} />
              <Metric label="Aberto" value={c.opened_count} sub={`${openRate}%`} tone="ok" />
              <Metric label="Convertido" value={c.converted_count} sub={`${convRate}%`} tone="ok" />
            </div>
          </Card>
        );
      })}
      {!loading && filtered.length === 0 && (
        <p className="text-center text-muted-foreground text-sm py-8">Nenhuma campanha</p>
      )}
    </div>
  );
}

function CampaignDetailDialog({ campaign, onClose }: { campaign: Campaign | null; onClose: () => void }) {
  const [events, setEvents] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<Record<string, { name: string; email: string }>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!campaign) return;
    setLoading(true);
    (async () => {
      const { data } = await supabase
        .from("push_events")
        .select("id, event_type, user_id, platform, error, created_at, metadata")
        .eq("campaign_id", campaign.id)
        .order("created_at", { ascending: false })
        .limit(500);
      const evts = data ?? [];
      setEvents(evts);
      const ids = Array.from(new Set(evts.map((e: any) => e.user_id).filter(Boolean)));
      if (ids.length > 0) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("id, full_name, email")
          .in("id", ids);
        const map: Record<string, { name: string; email: string }> = {};
        (profs ?? []).forEach((p: any) => { map[p.id] = { name: p.full_name || "—", email: p.email || "—" }; });
        setProfiles(map);
      } else {
        setProfiles({});
      }
      setLoading(false);
    })();
  }, [campaign]);

  const byType = events.reduce((acc: Record<string, any[]>, e: any) => {
    acc[e.event_type] = acc[e.event_type] || [];
    acc[e.event_type].push(e);
    return acc;
  }, {});
  const byPlatform = events.reduce((acc: Record<string, number>, e: any) => {
    if (e.event_type === "sent") acc[e.platform || "?"] = (acc[e.platform || "?"] || 0) + 1;
    return acc;
  }, {});
  const opens = byType["opened"] || [];

  return (
    <Dialog open={!!campaign} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base">{campaign?.title}</DialogTitle>
        </DialogHeader>
        {campaign && (
          <div className="space-y-4 text-sm">
            <div className="text-xs text-muted-foreground">{campaign.body}</div>
            <div className="grid grid-cols-4 gap-2 text-center text-xs">
              <Metric label="Enviado" value={campaign.sent_count} />
              <Metric label="Entregue" value={campaign.delivered_count} />
              <Metric label="Aberto" value={campaign.opened_count} tone="ok" />
              <Metric label="Falhou" value={campaign.failed_count} tone="warn" />
            </div>

            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Por plataforma</div>
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <Metric label="Android" value={byPlatform["android"] || 0} />
                <Metric label="iOS" value={byPlatform["ios"] || 0} />
                <Metric label="Web" value={byPlatform["web"] || 0} />
              </div>
            </div>

            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1">
                <MousePointerClick className="w-3 h-3" />
                Usuários que abriram ({opens.length})
              </div>
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {!loading && opens.length === 0 && (
                <p className="text-xs text-muted-foreground">Nenhuma abertura registrada.</p>
              )}
              <div className="space-y-1">
                {opens.map((e: any) => {
                  const p = e.user_id ? profiles[e.user_id] : null;
                  return (
                    <div key={e.id} className="flex items-center justify-between text-xs border-b border-border/40 py-1">
                      <div className="min-w-0 flex-1">
                        <div className="font-medium truncate">{p?.name || "Anônimo"}</div>
                        <div className="text-muted-foreground truncate">{p?.email || e.user_id || "—"}</div>
                      </div>
                      <div className="text-[10px] text-muted-foreground text-right">
                        <div>{e.platform || "—"}</div>
                        <div>{new Date(e.created_at).toLocaleString("pt-BR")}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {(byType["failed"] || byType["error"])?.length > 0 && (
              <div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Falhas</div>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {(byType["failed"] || byType["error"]).slice(0, 50).map((e: any) => (
                    <div key={e.id} className="text-[11px] border-b border-border/30 py-1">
                      <div className="text-amber-500">{e.error || "erro"}</div>
                      <div className="text-muted-foreground">{e.platform || "—"} · {new Date(e.created_at).toLocaleString("pt-BR")}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ------------------------------ Opens Today Dialog ------------------------------

type OpenRow = {
  event_id: string;
  campaign_id: string;
  campaign_title: string | null;
  user_id: string | null;
  display_name: string | null;
  email: string | null;
  platform: string | null;
  install_id: string | null;
  opened_at: string;
};

type JourneyStep = { step: number; route: string; title: string | null; at: string };

function initialsFrom(name: string | null, email: string | null) {
  const src = (name && name !== "—" ? name : email || "?").trim();
  const parts = src.split(/\s+/).filter(Boolean);
  const letters = parts.length >= 2
    ? parts[0][0] + parts[parts.length - 1][0]
    : src.slice(0, 2);
  return letters.toUpperCase();
}

function colorFromId(id: string | null) {
  if (!id) return "hsl(210 15% 40%)";
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0;
  return `hsl(${Math.abs(hash) % 360} 55% 45%)`;
}

function normalizePlatform(p: string | null | undefined): "android" | "ios" | "web" | null {
  if (!p) return null;
  const v = String(p).toLowerCase();
  if (v.includes("android")) return "android";
  if (v.includes("ios") || v.includes("iphone") || v.includes("ipad") || v === "apple") return "ios";
  if (v.includes("web") || v.includes("browser") || v.includes("chrome") || v.includes("firefox") || v.includes("safari") || v.includes("edge")) return "web";
  return null;
}

function PlatformBadge({ platform }: { platform: string | null | undefined }) {
  const p = normalizePlatform(platform);
  if (p === "android") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-500 border border-emerald-500/30">
        <Smartphone className="w-3 h-3" /> Android
      </span>
    );
  }
  if (p === "ios") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-sky-500/15 text-sky-400 border border-sky-500/30">
        <Smartphone className="w-3 h-3" /> iOS
      </span>
    );
  }
  if (p === "web") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-violet-500/15 text-violet-400 border border-violet-500/30">
        <Globe className="w-3 h-3" /> Web
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-muted text-muted-foreground border border-border">
      Desconhecido
    </span>
  );
}

function OpensTodayDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [rows, setRows] = useState<OpenRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [journey, setJourney] = useState<Record<string, { loading: boolean; steps: JourneyStep[] }>>({});

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    (async () => {
      const { data, error } = await supabase.rpc("admin_list_opens_today");
      if (error) toast.error("Falha ao carregar aberturas: " + error.message);
      let list = ((data ?? []) as OpenRow[]).slice();

      // Fallback: for rows without platform, look up the most-recent device_token per user
      const missingUserIds = Array.from(new Set(
        list.filter((r) => !normalizePlatform(r.platform) && r.user_id).map((r) => r.user_id as string)
      ));
      if (missingUserIds.length > 0) {
        const { data: toks } = await supabase
          .from("device_tokens")
          .select("user_id, platform, created_at")
          .in("user_id", missingUserIds)
          .order("created_at", { ascending: false });
        const byUser = new Map<string, string>();
        for (const t of (toks ?? []) as any[]) {
          if (!byUser.has(t.user_id)) byUser.set(t.user_id, t.platform);
        }
        list = list.map((r) => {
          if (!normalizePlatform(r.platform) && r.user_id && byUser.has(r.user_id)) {
            return { ...r, platform: byUser.get(r.user_id) ?? r.platform };
          }
          return r;
        });
      }

      setRows(list);
      setLoading(false);
    })();
  }, [open]);

  async function toggle(row: OpenRow) {
    if (expanded === row.event_id) { setExpanded(null); return; }
    setExpanded(row.event_id);
    if (journey[row.event_id]) return;
    setJourney((j) => ({ ...j, [row.event_id]: { loading: true, steps: [] } }));
    const { data, error } = await supabase.rpc("admin_get_open_journey", {
      _campaign_id: row.campaign_id,
      _user_id: row.user_id,
      _install_id: row.install_id,
    });
    if (error) toast.error("Falha ao carregar jornada");
    setJourney((j) => ({ ...j, [row.event_id]: { loading: false, steps: (data ?? []) as JourneyStep[] } }));
  }

  const grouped = useMemo(() => {
    const map = new Map<string, { title: string; items: OpenRow[] }>();
    for (const r of rows) {
      const key = r.campaign_id ?? "sem-campanha";
      if (!map.has(key)) map.set(key, { title: r.campaign_title || "(sem título)", items: [] });
      map.get(key)!.items.push(r);
    }
    return Array.from(map.entries());
  }, [rows]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base flex items-center gap-2">
            <MousePointerClick className="w-4 h-4 text-emerald-600" /> Aberturas de hoje
          </DialogTitle>
        </DialogHeader>

        {loading && (
          <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin" /></div>
        )}

        {!loading && rows.length === 0 && (
          <p className="text-center text-muted-foreground text-sm py-8">Nenhuma abertura registrada hoje.</p>
        )}

        <div className="space-y-4">
          {grouped.map(([cid, group]) => (
            <div key={cid}>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-2 flex items-center gap-2">
                <span className="truncate">{group.title}</span>
                <Badge variant="outline" className="text-[10px]">{group.items.length}</Badge>
              </div>
              <div className="space-y-1">
                {group.items.map((row) => {
                  const isOpen = expanded === row.event_id;
                  const j = journey[row.event_id];
                  const initials = initialsFrom(row.display_name, row.email);
                  const bg = colorFromId(row.user_id || row.install_id);
                  const nameLabel = row.display_name && row.display_name !== "—"
                    ? row.display_name
                    : row.email || (row.install_id ? `install ${row.install_id.slice(0, 6)}…` : "Anônimo");
                  return (
                    <div key={row.event_id} className="rounded-lg border border-border/60 bg-card">
                      <button
                        type="button"
                        onClick={() => toggle(row)}
                        className="w-full flex items-center gap-3 p-2.5 text-left hover:bg-muted/40 rounded-lg"
                      >
                        <div
                          className="w-9 h-9 shrink-0 rounded-full flex items-center justify-center text-white text-xs font-semibold"
                          style={{ background: bg }}
                        >
                          {initials}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium truncate">{nameLabel}</div>
                          <div className="text-[11px] text-muted-foreground truncate">
                            {row.email && row.display_name && row.display_name !== "—" ? row.email : row.user_id ? row.user_id.slice(0, 8) + "…" : "sessão anônima"}
                          </div>
                          <div className="mt-1">
                            <PlatformBadge platform={row.platform} />
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-[11px] font-mono">
                            {new Date(row.opened_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                          </div>
                        </div>
                      </button>

                      {isOpen && (
                        <div className="border-t border-border/50 px-3 py-2 bg-muted/20 rounded-b-lg">
                          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
                            Jornada após o clique
                          </div>
                          {j?.loading && <Loader2 className="w-4 h-4 animate-spin" />}
                          {j && !j.loading && j.steps.length === 0 && (
                            <p className="text-xs text-muted-foreground">
                              Nenhuma rota registrada. (a jornada só é gravada em aberturas feitas depois desta atualização)
                            </p>
                          )}
                          {j && !j.loading && j.steps.length > 0 && (
                            <ol className="relative border-l border-emerald-500/40 ml-2 space-y-2 pl-4 py-1">
                              {j.steps.map((s, i) => {
                                const prev = i > 0 ? new Date(j.steps[i - 1].at).getTime() : new Date(row.opened_at).getTime();
                                const delta = Math.max(0, Math.round((new Date(s.at).getTime() - prev) / 1000));
                                return (
                                  <li key={i} className="relative">
                                    <span className="absolute -left-[19px] top-1 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-background" />
                                    <div className="text-xs font-mono truncate">{s.route}</div>
                                    {s.title && <div className="text-[11px] text-muted-foreground truncate">{s.title}</div>}
                                    <div className="text-[10px] text-muted-foreground">+{delta}s</div>
                                  </li>
                                );
                              })}
                            </ol>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
