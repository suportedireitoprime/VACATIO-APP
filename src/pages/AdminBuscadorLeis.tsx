import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { PageHeader } from '@/components/vademecum/PageHeader';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Loader2, Search, Sparkles, ExternalLink, Plus, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { LEIS_CATALOG } from '@/data/leisCatalog';
import { toSlug } from '@/lib/legislacaoSlugs';

interface Sugestao {
  nome: string;
  nome_curto: string;
  planalto_url: string;
  categoria: string;
  resumo: string;
}

const CATEGORIA_LABEL: Record<string, string> = {
  constituicao: 'Constituição',
  codigo: 'Código',
  estatuto: 'Estatuto',
  lei: 'Lei Federal',
  decreto: 'Decreto',
  sumula: 'Súmula',
};

export default function AdminBuscadorLeis() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [area, setArea] = useState('');
  const [loading, setLoading] = useState(false);
  const [sugestoes, setSugestoes] = useState<Sugestao[]>([]);
  const [fontes, setFontes] = useState<string[]>([]);
  const [adicionando, setAdicionando] = useState<Record<string, boolean>>({});
  const [adicionadas, setAdicionadas] = useState<Record<string, 'ok' | 'erro'>>({});

  const leisAtuais = useMemo(
    () => LEIS_CATALOG.map((l) => l.nome).filter(Boolean),
    [],
  );

  async function buscar() {
    setLoading(true);
    setSugestoes([]);
    setFontes([]);
    setAdicionadas({});
    try {
      const { data, error } = await supabase.functions.invoke('reextrair-lei-planalto', {
        body: {
          mode: 'sugerir',
          query: query.trim(),
          area: area.trim(),
          leisAtuais,
          limite: 10,
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setSugestoes(((data as any)?.sugestoes || []) as Sugestao[]);
      setFontes(((data as any)?.fontes || []) as string[]);
      if (!((data as any)?.sugestoes?.length)) {
        toast.info('Nenhuma sugestão nova encontrada. Tente refinar o foco.');
      }
    } catch (e: any) {
      console.error(e);
      toast.error(`Erro: ${e.message || e}`);
    } finally {
      setLoading(false);
    }
  }

  async function adicionar(s: Sugestao) {
    const slug = toSlug(s.nome_curto || s.nome).slice(0, 80);
    setAdicionando((p) => ({ ...p, [slug]: true }));
    try {
      const { data, error } = await supabase.functions.invoke('reextrair-lei-planalto', {
        body: {
          slug,
          nome: s.nome,
          nome_curto: s.nome_curto,
          planalto_url: s.planalto_url,
          categoria: s.categoria,
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setAdicionadas((p) => ({ ...p, [slug]: 'ok' }));
      toast.success(`"${s.nome_curto}" adicionada à Biblioteca de Leis.`);
    } catch (e: any) {
      console.error(e);
      setAdicionadas((p) => ({ ...p, [slug]: 'erro' }));
      toast.error(`Falha ao adicionar: ${e.message || e}`);
    } finally {
      setAdicionando((p) => ({ ...p, [slug]: false }));
    }
  }

  return (
    <div className="min-h-dvh bg-background pb-24">
      <PageHeader title="Buscador de Leis" onBack={() => navigate('/admin-funcoes')} />

      <div className="max-w-3xl mx-auto px-4 pt-4 space-y-4">
        {/* Intro */}
        <Card className="p-4 bg-primary/5 border-primary/30">
          <div className="flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <div className="text-sm text-foreground/85 leading-relaxed">
              A IA (Gemini + Google Search) procura leis federais brasileiras que ainda
              <strong> não estão no app</strong> e sugere para você adicionar. Ao clicar em
              <strong> Adicionar</strong>, a lei é enviada à <strong>Biblioteca de Leis</strong> e
              o Planalto é raspado automaticamente.
            </div>
          </div>
        </Card>

        {/* Form */}
        <Card className="p-4 space-y-3">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Foco da busca
            </label>
            <Input
              placeholder="Ex: leis penais especiais, LGPD complementares..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !loading && buscar()}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Área (opcional)
            </label>
            <Input
              placeholder="Penal, Civil, Administrativo, Tributário..."
              value={area}
              onChange={(e) => setArea(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !loading && buscar()}
            />
          </div>
          <Button onClick={buscar} disabled={loading} className="w-full">
            {loading ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Pesquisando na web...</>
            ) : (
              <><Search className="w-4 h-4 mr-2" /> Buscar leis faltantes</>
            )}
          </Button>
        </Card>

        {/* Sugestões */}
        {sugestoes.length > 0 && (
          <div className="space-y-2">
            <div className="text-sm font-semibold text-foreground/70">
              {sugestoes.length} sugestão{sugestoes.length > 1 ? 'ões' : ''}
            </div>
            {sugestoes.map((s) => {
              const slug = toSlug(s.nome_curto || s.nome).slice(0, 80);
              const isAdding = !!adicionando[slug];
              const status = adicionadas[slug];
              return (
                <Card key={slug} className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <Badge variant="outline" className="text-[10px]">
                          {CATEGORIA_LABEL[s.categoria] || s.categoria}
                        </Badge>
                      </div>
                      <h3 className="font-display text-base leading-snug">{s.nome}</h3>
                      {s.resumo && (
                        <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                          {s.resumo}
                        </p>
                      )}
                      <a
                        href={s.planalto_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-primary mt-2 hover:underline"
                      >
                        <ExternalLink className="w-3 h-3" />
                        {s.planalto_url.replace('https://www.', '')}
                      </a>
                    </div>
                  </div>
                  <div className="flex gap-2 pt-1">
                    {status === 'ok' ? (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => navigate('/admin-biblioteca-leis')}
                        className="flex-1"
                      >
                        <Check className="w-4 h-4 mr-1.5 text-emerald-500" />
                        Adicionada — abrir Biblioteca
                      </Button>
                    ) : status === 'erro' ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => adicionar(s)}
                        disabled={isAdding}
                        className="flex-1"
                      >
                        <X className="w-4 h-4 mr-1.5 text-destructive" />
                        Tentar novamente
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => adicionar(s)}
                        disabled={isAdding}
                        className="flex-1"
                      >
                        {isAdding ? (
                          <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Adicionando...</>
                        ) : (
                          <><Plus className="w-4 h-4 mr-1.5" /> Adicionar à Biblioteca</>
                        )}
                      </Button>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {/* Fontes */}
        {fontes.length > 0 && (
          <Card className="p-3">
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold mb-2">
              Fontes consultadas
            </div>
            <div className="flex flex-wrap gap-1.5">
              {fontes.slice(0, 12).map((f, i) => (
                <a
                  key={i}
                  href={f}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] px-2 py-1 rounded-md bg-secondary/60 hover:bg-secondary text-foreground/70 truncate max-w-[220px]"
                >
                  {new URL(f).hostname.replace('www.', '')}
                </a>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
