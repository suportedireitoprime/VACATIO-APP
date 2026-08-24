import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, RefreshCw, Zap, Play } from "lucide-react";
import { toast } from "sonner";

interface Automacao {
  id: string;
  key: string;
  nome: string;
  descricao: string | null;
  enabled: boolean;
  audience: any;
  default_url: string | null;
  emoji: string | null;
  usa_ia: boolean;
  usa_capa: boolean;
  cooldown_minutos: number;
  quiet_hours_inicio: number;
  quiet_hours_fim: number;
  last_run_at: string | null;
}

interface CampAgg { total: number; sent: number; opened: number; converted: number }

export default function PushAutomacoesTab() {
  const [rows, setRows] = useState<Automacao[]>([]);
  const [aggs, setAggs] = useState<Record<string, CampAgg>>({});
  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState<Automacao | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [savingId, setSavingId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const { data } = await supabase
        .from("push_automations" as any)
        .select("*")
        .order("nome");
      const list = ((data ?? []) as unknown) as Automacao[];
      setRows(list);

      // Agregados por automation_key
      const { data: camps } = await supabase
        .from("push_campaigns")
        .select("automation_key,sent_count,opened_count,converted_count")
        .not("automation_key", "is", null);
      const map: Record<string, CampAgg> = {};
      (camps ?? []).forEach((c: any) => {
        const k = c.automation_key as string;
        if (!map[k]) map[k] = { total: 0, sent: 0, opened: 0, converted: 0 };
        map[k].total += 1;
        map[k].sent += c.sent_count ?? 0;
        map[k].opened += c.opened_count ?? 0;
        map[k].converted += c.converted_count ?? 0;
      });
      setAggs(map);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function toggle(a: Automacao, enabled: boolean) {
    setSavingId(a.id);
    const { error } = await supabase
      .from("push_automations" as any)
      .update({ enabled })
      .eq("id", a.id);
    setSavingId(null);
    if (error) return toast.error(error.message);
    setRows(prev => prev.map(x => x.id === a.id ? { ...x, enabled } : x));
    toast.success(enabled ? "Automação ativada" : "Automação desativada");
  }

  async function saveDetail(patch: Partial<Automacao>) {
    if (!detail) return;
    const { error } = await supabase
      .from("push_automations" as any)
      .update(patch)
      .eq("id", detail.id);
    if (error) return toast.error(error.message);
    setDetail({ ...detail, ...patch });
    setRows(prev => prev.map(x => x.id === detail.id ? { ...x, ...patch } : x));
    toast.success("Salvo");
  }

  async function openDetail(a: Automacao) {
    setDetail(a);
    const { data } = await supabase
      .from("push_campaigns")
      .select("id,title,body,image_url,emoji,sent_count,opened_count,converted_count,created_at,status")
      .eq("automation_key", a.key)
      .order("created_at", { ascending: false })
      .limit(20);
    setHistory((data ?? []) as any[]);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <Zap className="w-3 h-3 text-primary" /> Gatilhos automáticos do app. Cada um envia push quando o evento correspondente ocorre.
        </p>
        <Button size="sm" variant="ghost" onClick={load}><RefreshCw className="w-3 h-3 mr-1" />Atualizar</Button>
      </div>

      {loading && <Loader2 className="w-4 h-4 animate-spin mx-auto" />}

      {rows.map(a => {
        const agg = aggs[a.key] ?? { total: 0, sent: 0, opened: 0, converted: 0 };
        const openRate = agg.sent ? Math.round((agg.opened / agg.sent) * 100) : 0;
        return (
          <Card key={a.id} className="p-3">
            <div className="flex items-start gap-3">
              <div className="text-2xl leading-none pt-0.5">{a.emoji ?? "🔔"}</div>
              <div className="flex-1 min-w-0 cursor-pointer" onClick={() => openDetail(a)}>
                <div className="font-medium text-sm flex items-center gap-2 flex-wrap">
                  {a.nome}
                  {a.enabled
                    ? <Badge className="text-[10px] bg-emerald-500/15 text-emerald-500 border-emerald-500/30 border">ligada</Badge>
                    : <Badge variant="outline" className="text-[10px]">desligada</Badge>}
                </div>
                {a.descricao && <div className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{a.descricao}</div>}
                <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground flex-wrap">
                  <span>Cooldown: {a.cooldown_minutos}min</span>
                  <span>· Silêncio {a.quiet_hours_inicio}h–{a.quiet_hours_fim}h</span>
                  <span>· Envios: {agg.total}</span>
                  <span>· Abertura: {openRate}%</span>
                  {a.last_run_at && <span>· Último: {new Date(a.last_run_at).toLocaleString("pt-BR")}</span>}
                </div>
              </div>
              <Switch
                checked={a.enabled}
                disabled={savingId === a.id}
                onCheckedChange={(v) => toggle(a, v)}
              />
            </div>
          </Card>
        );
      })}

      {!loading && rows.length === 0 && (
        <p className="text-center text-muted-foreground text-sm py-8">Nenhuma automação cadastrada</p>
      )}

      <Dialog open={!!detail} onOpenChange={(v) => !v && setDetail(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          {detail && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <span className="text-xl">{detail.emoji ?? "🔔"}</span> {detail.nome}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Emoji</Label>
                    <Input
                      value={detail.emoji ?? ""}
                      onChange={(e) => setDetail({ ...detail, emoji: e.target.value })}
                      onBlur={(e) => saveDetail({ emoji: e.target.value })}
                      maxLength={4}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Cooldown (min)</Label>
                    <Input
                      type="number"
                      value={detail.cooldown_minutos}
                      onChange={(e) => setDetail({ ...detail, cooldown_minutos: Number(e.target.value) })}
                      onBlur={(e) => saveDetail({ cooldown_minutos: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Silêncio início (h)</Label>
                    <Input
                      type="number" min={0} max={23}
                      value={detail.quiet_hours_inicio}
                      onChange={(e) => setDetail({ ...detail, quiet_hours_inicio: Number(e.target.value) })}
                      onBlur={(e) => saveDetail({ quiet_hours_inicio: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Silêncio fim (h)</Label>
                    <Input
                      type="number" min={0} max={23}
                      value={detail.quiet_hours_fim}
                      onChange={(e) => setDetail({ ...detail, quiet_hours_fim: Number(e.target.value) })}
                      onBlur={(e) => saveDetail({ quiet_hours_fim: Number(e.target.value) })}
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Destino padrão</Label>
                  <Input
                    value={detail.default_url ?? ""}
                    onChange={(e) => setDetail({ ...detail, default_url: e.target.value })}
                    onBlur={(e) => saveDetail({ default_url: e.target.value })}
                    placeholder="/radar-360"
                  />
                </div>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 text-sm">
                    <Switch checked={detail.usa_ia} onCheckedChange={(v) => saveDetail({ usa_ia: v })} />
                    Usa IA (headline)
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <Switch checked={detail.usa_capa} onCheckedChange={(v) => saveDetail({ usa_capa: v })} />
                    Usa capa
                  </label>
                </div>

                <div className="border-t pt-3">
                  <div className="text-xs font-semibold mb-2 flex items-center gap-1">
                    <Play className="w-3 h-3" /> Últimos disparos ({history.length})
                  </div>
                  {history.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-4">Nenhum envio ainda</p>
                  )}
                  <div className="space-y-2">
                    {history.map((c: any) => {
                      const rate = c.sent_count ? Math.round((c.opened_count / c.sent_count) * 100) : 0;
                      return (
                        <Card key={c.id} className="p-2 flex gap-2">
                          {c.image_url && (
                            <img src={c.image_url} alt="" className="w-12 h-12 object-cover rounded" />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-medium truncate">
                              {c.emoji ? `${c.emoji} ` : ""}{c.title}
                            </div>
                            <div className="text-[10px] text-muted-foreground line-clamp-1">{c.body}</div>
                            <div className="text-[10px] text-muted-foreground mt-0.5">
                              {new Date(c.created_at).toLocaleString("pt-BR")} · {c.sent_count} envios · {rate}% aberto · {c.converted_count} cliques
                            </div>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}