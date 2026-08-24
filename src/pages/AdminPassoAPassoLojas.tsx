import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";

import { ExternalLink, Sparkles, Loader2, HelpCircle, Key, CheckCircle2, Store } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { APPLE_FASES, GOOGLE_FASES, APPLE_FAQ, GOOGLE_FAQ, type FaseLoja, type PassoLoja } from "@/data/lojasSteps";
import { toast } from "sonner";
import { PageHeader } from "@/components/vademecum/PageHeader";

type Progress = Record<string, { completed: boolean; notes?: string }>;

function StoreSection({ store, fases, faq }: { store: "apple" | "google"; fases: FaseLoja[]; faq: { q: string; a: string }[] }) {
  const { user } = useAuth();
  const [progress, setProgress] = useState<Progress>({});
  const [explanations, setExplanations] = useState<Record<string, string>>({});
  const [loadingExplain, setLoadingExplain] = useState<string | null>(null);
  const [savingSecret, setSavingSecret] = useState<string | null>(null);
  const [secretValues, setSecretValues] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!user) return;
    supabase
      .from("store_setup_progress")
      .select("step_key, completed, notes")
      .eq("user_id", user.id)
      .eq("store", store)
      .then(({ data }) => {
        const p: Progress = {};
        (data || []).forEach((r: any) => { p[r.step_key] = { completed: r.completed, notes: r.notes }; });
        setProgress(p);
      });
  }, [user, store]);

  const toggleStep = async (stepKey: string, completed: boolean) => {
    if (!user) return;
    setProgress((prev) => ({ ...prev, [stepKey]: { ...prev[stepKey], completed } }));
    const { error } = await supabase.from("store_setup_progress").upsert(
      { user_id: user.id, store, step_key: stepKey, completed, completed_at: completed ? new Date().toISOString() : null },
      { onConflict: "user_id,store,step_key" },
    );
    if (error) toast.error("Erro ao salvar: " + error.message);
  };

  const explicar = async (fase: FaseLoja, passo: PassoLoja) => {
    const key = `${fase.key}:${passo.key}`;
    setLoadingExplain(key);
    try {
      const { data, error } = await supabase.functions.invoke("explicar-passo", {
        body: {
          store,
          faseTitulo: fase.titulo,
          passoTitulo: passo.titulo,
          passoDescricao: passo.descricao,
          referencias: passo.referencias || [],
        },
      });
      if (error) throw error;
      setExplanations((prev) => ({ ...prev, [key]: data.text }));
    } catch (e: any) {
      toast.error("Falha na explicação: " + (e?.message || String(e)));
    } finally {
      setLoadingExplain(null);
    }
  };

  const copiarSecret = async (name: string) => {
    const value = secretValues[name]?.trim();
    if (!value) { toast.error("Cole um valor primeiro"); return; }
    setSavingSecret(name);
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`Valor copiado. Cole em /admin-secrets → aba ${store === "apple" ? "Apple" : "Android"} → ${name}`);
    } catch {
      toast.error("Não consegui copiar. Selecione e copie manualmente.");
    } finally {
      setSavingSecret(null);
    }
  };

  const totalPassos = fases.reduce((s, f) => s + f.passos.length, 0);
  const feitos = Object.values(progress).filter((p) => p.completed).length;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Progresso</CardTitle>
            <span className="text-sm text-muted-foreground">{feitos} / {totalPassos} passos</span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-primary transition-all" style={{ width: `${totalPassos ? (feitos / totalPassos) * 100 : 0}%` }} />
          </div>
        </CardContent>
      </Card>

      <Accordion type="multiple" defaultValue={[fases[0]?.key]}>
        {fases.map((fase) => (
          <AccordionItem key={fase.key} value={fase.key}>
            <AccordionTrigger className="text-left">
              <div>
                <div className="font-semibold">{fase.titulo}</div>
                {fase.resumo && <div className="text-xs text-muted-foreground font-normal mt-0.5">{fase.resumo}</div>}
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-4 pl-2">
                {fase.passos.map((passo) => {
                  const stepKey = `${fase.key}:${passo.key}`;
                  const done = progress[stepKey]?.completed;
                  const explanation = explanations[stepKey];
                  const loading = loadingExplain === stepKey;
                  return (
                    <div key={passo.key} className={`rounded-lg border p-4 ${done ? "bg-muted/40" : "bg-card"}`}>
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={done}
                          onCheckedChange={(v) => toggleStep(stepKey, !!v)}
                          className="mt-1"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 flex-wrap">
                            <h4 className={`font-medium ${done ? "line-through text-muted-foreground" : ""}`}>{passo.titulo}</h4>
                            <div className="flex gap-2 flex-wrap">
                              {passo.link && (
                                <Button asChild variant="outline" size="sm">
                                  <a href={passo.link.url} target="_blank" rel="noopener noreferrer">
                                    <ExternalLink className="w-3 h-3 mr-1" />
                                    {passo.link.label}
                                  </a>
                                </Button>
                              )}
                              {passo.linkInterno && (
                                <Button asChild variant="outline" size="sm">
                                  <Link to={passo.linkInterno.path}>
                                    {passo.linkInterno.label}
                                  </Link>
                                </Button>
                              )}
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => explicar(fase, passo)}
                                disabled={loading}
                              >
                                {loading ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Sparkles className="w-3 h-3 mr-1" />}
                                Explicar
                              </Button>
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">{passo.descricao}</p>

                          {passo.referencias && passo.referencias.length > 0 && (
                            <div className="text-xs text-muted-foreground mt-2">
                              Docs:{" "}
                              {passo.referencias.map((r, i) => (
                                <a key={i} href={r} target="_blank" rel="noopener noreferrer" className="underline mr-2">
                                  {new URL(r).hostname}
                                </a>
                              ))}
                            </div>
                          )}

                          {explanation && (
                            <div className="mt-3 rounded-md bg-muted/60 p-3 text-sm prose prose-sm max-w-none dark:prose-invert">
                              <ReactMarkdown>{explanation}</ReactMarkdown>
                            </div>
                          )}

                          {passo.secrets && passo.secrets.length > 0 && (
                            <div className="mt-3 space-y-2 border-l-2 border-primary/40 pl-3">
                              {passo.secrets.map((s) => (
                                <div key={s.name} className="space-y-1">
                                  <div className="flex items-center gap-2 text-xs">
                                    <Key className="w-3 h-3" />
                                    <code className="font-mono">{s.name}</code>
                                    <span className="text-muted-foreground">— {s.label}</span>
                                  </div>
                                  <div className="flex gap-2">
                                    <Textarea
                                      placeholder={s.hint || "Cole o valor"}
                                      value={secretValues[s.name] || ""}
                                      onChange={(e) => setSecretValues((prev) => ({ ...prev, [s.name]: e.target.value }))}
                                      rows={2}
                                      className="text-xs font-mono"
                                    />
                                    <Button
                                      size="sm"
                                      onClick={() => copiarSecret(s.name)}
                                      disabled={savingSecret === s.name || !secretValues[s.name]}
                                    >
                                      {savingSecret === s.name ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <HelpCircle className="w-4 h-4" /> Dúvidas frequentes — o que fazer se perder
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible>
            {faq.map((item, i) => (
              <AccordionItem key={i} value={`faq-${i}`}>
                <AccordionTrigger className="text-left text-sm">{item.q}</AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">{item.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>
    </div>
  );
}

export default function AdminPassoAPassoLojas() {
  const navigate = useNavigate();

  return (
    <div className="min-h-dvh bg-background">
      <PageHeader
        title="Passo a Passo Lojas"
        subtitle="Apple App Store e Google Play"
        onBack={() => navigate('/admin-funcoes')}
        leading={<Store className="w-5 h-5 text-primary" />}
      />

      <div className="max-w-4xl mx-auto p-4 md:p-8">
        <p className="text-muted-foreground mb-6">
          Guia detalhado para publicar o Vacatio na Apple App Store e no Google Play. Cada passo tem link direto e explicação sob demanda por IA.
        </p>

        <Tabs defaultValue="apple">
          <TabsList className="grid grid-cols-2 w-full max-w-md mb-6">
            <TabsTrigger value="apple">🍎 Apple</TabsTrigger>
            <TabsTrigger value="google">🤖 Google</TabsTrigger>
          </TabsList>
          <TabsContent value="apple">
            <StoreSection store="apple" fases={APPLE_FASES} faq={APPLE_FAQ} />
          </TabsContent>
          <TabsContent value="google">
            <StoreSection store="google" fases={GOOGLE_FASES} faq={GOOGLE_FAQ} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
