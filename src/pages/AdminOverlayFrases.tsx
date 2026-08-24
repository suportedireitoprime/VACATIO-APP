import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Loader2, Play, Trash2, Plus, Volume2 } from "lucide-react";
import { PageHeader } from "@/components/vademecum/PageHeader";
import { useNavigate } from "react-router-dom";

// Lista canônica de vozes (deve casar com a edge function narrar-frase)
const VOZES = [
  { id: "Sulafat", genero: "F", descricao: "Feminina, calorosa" },
  { id: "Kore", genero: "F", descricao: "Feminina, firme" },
  { id: "Aoede", genero: "F", descricao: "Feminina, leve" },
  { id: "Leda", genero: "F", descricao: "Feminina, jovem" },
  { id: "Zephyr", genero: "F", descricao: "Feminina, brilhante" },
  { id: "Autonoe", genero: "F", descricao: "Feminina, animada" },
  { id: "Callirrhoe", genero: "F", descricao: "Feminina, tranquila" },
  { id: "Despina", genero: "F", descricao: "Feminina, suave" },
  { id: "Erinome", genero: "F", descricao: "Feminina, clara" },
  { id: "Laomedeia", genero: "F", descricao: "Feminina, alegre" },
  { id: "Puck", genero: "M", descricao: "Masculina, animada" },
  { id: "Charon", genero: "M", descricao: "Masculina, grave" },
  { id: "Fenrir", genero: "M", descricao: "Masculina, energética" },
  { id: "Orus", genero: "M", descricao: "Masculina, firme" },
  { id: "Enceladus", genero: "M", descricao: "Masculina, calma" },
  { id: "Iapetus", genero: "M", descricao: "Masculina, séria" },
  { id: "Umbriel", genero: "M", descricao: "Masculina, tranquila" },
  { id: "Algieba", genero: "M", descricao: "Masculina, suave" },
  { id: "Algenib", genero: "M", descricao: "Masculina, entusiasta" },
  { id: "Rasalgethi", genero: "M", descricao: "Masculina, informativa" },
];

const CATEGORIAS = [
  { id: "filosofos", label: "Filósofos" },
  { id: "curiosidade", label: "Curiosidades" },
  { id: "termo", label: "Termos Jurídicos" },
] as const;

interface Frase {
  id: string;
  categoria: string;
  texto: string;
  legenda: string | null;
  voz_preferida: string | null;
  ativa: boolean;
  ordem: number;
}

const TEXTO_PREVIEW =
  "Artigo primeiro do Código Penal: não há crime sem lei anterior que o defina. Não há pena sem prévia cominação legal.";

export default function AdminOverlayFrases() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<"frases" | "vozes">("frases");
  const [categoria, setCategoria] = useState<string>("filosofos");
  const [frases, setFrases] = useState<Frase[]>([]);
  const [loading, setLoading] = useState(false);
  const [novoTexto, setNovoTexto] = useState("");
  const [novaLegenda, setNovaLegenda] = useState("");
  const [novaVoz, setNovaVoz] = useState<string>("");

  // Voice tester
  const [vozLoading, setVozLoading] = useState<string | null>(null);
  const [vozAudios, setVozAudios] = useState<Record<string, string>>({});

  async function carregar() {
    setLoading(true);
    const { data, error } = await supabase
      .from("overlay_frases")
      .select("*")
      .eq("categoria", categoria)
      .order("ordem");
    setLoading(false);
    if (error) { toast.error("Erro ao carregar frases"); return; }
    setFrases((data as Frase[]) || []);
  }

  useEffect(() => { carregar(); }, [categoria]);

  async function adicionar() {
    if (!novoTexto.trim()) return;
    const maxOrdem = frases.reduce((m, f) => Math.max(m, f.ordem), 0);
    const { error } = await supabase.from("overlay_frases").insert({
      categoria,
      texto: novoTexto.trim(),
      legenda: novaLegenda.trim() || null,
      voz_preferida: novaVoz || null,
      ordem: maxOrdem + 1,
      ativa: true,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Frase adicionada");
    setNovoTexto(""); setNovaLegenda(""); setNovaVoz("");
    carregar();
  }

  async function toggleAtiva(f: Frase) {
    const { error } = await supabase
      .from("overlay_frases")
      .update({ ativa: !f.ativa })
      .eq("id", f.id);
    if (error) { toast.error(error.message); return; }
    carregar();
  }

  async function remover(f: Frase) {
    if (!confirm("Excluir esta frase?")) return;
    const { error } = await supabase.from("overlay_frases").delete().eq("id", f.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Removida");
    carregar();
  }

  async function tocarFrase(f: Frase) {
    const voz = f.voz_preferida || "Puck";
    try {
      toast.loading(`Gerando com ${voz}...`, { id: "play-" + f.id });
      const { data, error } = await supabase.functions.invoke("narrar-frase", {
        body: { texto: f.texto, voz },
      });
      toast.dismiss("play-" + f.id);
      if (error || !data?.audio_url) { toast.error("Falha ao gerar áudio"); return; }
      const audio = new Audio(data.audio_url);
      audio.play();
    } catch (e) {
      toast.error("Erro");
    }
  }

  async function testarVoz(vozId: string) {
    setVozLoading(vozId);
    try {
      const { data, error } = await supabase.functions.invoke("narrar-frase", {
        body: { texto: TEXTO_PREVIEW, voz: vozId, preview: true },
      });
      if (error || !data?.audio_url) { toast.error("Falha ao gerar"); return; }
      setVozAudios((prev) => ({ ...prev, [vozId]: data.audio_url }));
      const audio = new Audio(data.audio_url);
      audio.play();
    } finally {
      setVozLoading(null);
    }
  }

  return (
    <div className="min-h-dvh bg-background text-foreground pb-24">
      <PageHeader title="Frases do Overlay" onBack={() => navigate(-1)} />

      <div className="max-w-4xl mx-auto px-4 py-4">
        <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="frases">Frases</TabsTrigger>
            <TabsTrigger value="vozes">Testar Vozes</TabsTrigger>
          </TabsList>

          <TabsContent value="frases" className="space-y-4">
            <div className="flex gap-2 overflow-x-auto">
              {CATEGORIAS.map((c) => (
                <Button
                  key={c.id}
                  variant={categoria === c.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCategoria(c.id)}
                >
                  {c.label}
                </Button>
              ))}
            </div>

            <Card className="p-4 space-y-3">
              <div className="text-sm font-semibold flex items-center gap-2">
                <Plus className="h-4 w-4" /> Nova frase
              </div>
              <Textarea
                placeholder="Texto da frase"
                value={novoTexto}
                onChange={(e) => setNovoTexto(e.target.value)}
                rows={3}
              />
              <div className="grid grid-cols-2 gap-2">
                <Input
                  placeholder="Legenda / autor"
                  value={novaLegenda}
                  onChange={(e) => setNovaLegenda(e.target.value)}
                />
                <Select value={novaVoz} onValueChange={setNovaVoz}>
                  <SelectTrigger><SelectValue placeholder="Voz (opcional)" /></SelectTrigger>
                  <SelectContent>
                    {VOZES.map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.id} ({v.genero}) — {v.descricao}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={adicionar} disabled={!novoTexto.trim()} className="w-full">
                Adicionar
              </Button>
            </Card>

            <div className="space-y-2">
              {loading && <div className="text-center py-6"><Loader2 className="h-5 w-5 animate-spin inline" /></div>}
              {frases.map((f) => (
                <Card key={f.id} className="p-3 flex gap-3 items-start">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">{f.texto}</p>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      {f.legenda && <span>— {f.legenda}</span>}
                      {f.voz_preferida && <span className="px-1.5 py-0.5 bg-amber-500/20 text-amber-600 rounded">🎤 {f.voz_preferida}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Switch checked={f.ativa} onCheckedChange={() => toggleAtiva(f)} />
                    <Button size="icon" variant="ghost" onClick={() => tocarFrase(f)} title="Ouvir">
                      <Play className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => remover(f)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="vozes" className="space-y-3">
            <Card className="p-3 text-sm text-muted-foreground">
              Cada voz gerará o áudio de teste: <em>"{TEXTO_PREVIEW}"</em>
            </Card>
            <div className="grid gap-2">
              {VOZES.map((v) => (
                <Card key={v.id} className="p-3 flex items-center gap-3">
                  <div className="flex-1">
                    <div className="font-semibold flex items-center gap-2">
                      {v.id}
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${v.genero === "F" ? "bg-pink-500/20 text-pink-600" : "bg-blue-500/20 text-blue-600"}`}>
                        {v.genero === "F" ? "Feminina" : "Masculina"}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">{v.descricao}</div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => testarVoz(v.id)}
                    disabled={vozLoading === v.id}
                  >
                    {vozLoading === v.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : vozAudios[v.id] ? (
                      <><Volume2 className="h-4 w-4 mr-1" /> Regerar</>
                    ) : (
                      <><Play className="h-4 w-4 mr-1" /> Testar</>
                    )}
                  </Button>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
