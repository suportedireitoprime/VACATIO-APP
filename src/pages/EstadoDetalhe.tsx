import { useParams, useNavigate } from 'react-router-dom';
import { ExternalLink, BookOpen, FileText, ScrollText, Landmark, ChevronRight, ChevronDown, Search, Loader2 } from 'lucide-react';
import { PageHeader } from '@/components/vademecum/PageHeader';
import { motion, AnimatePresence } from 'framer-motion';
import { ESTADOS } from './LegislacaoEstadual';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';

const CATEGORIAS_ESTADO = [
  { id: 'leis', label: 'Leis Ordinárias', icon: FileText, color: 'from-sky-500/50 to-sky-700/20' },
  { id: 'leis-complementares', label: 'Leis Complementares', icon: BookOpen, color: 'from-violet-500/50 to-violet-700/20' },
  { id: 'decretos', label: 'Decretos', icon: ScrollText, color: 'from-emerald-500/50 to-emerald-700/20' },
];

interface Artigo {
  id: string;
  numero: string;
  rotulo: string | null;
  texto: string;
  caput: string;
  titulo: string | null;
  capitulo: string | null;
  ordem_numero: number;
}

const EstadoDetalhe = () => {
  const { uf } = useParams<{ uf: string }>();
  const navigate = useNavigate();
  const estado = ESTADOS.find((e) => e.uf.toLowerCase() === uf?.toLowerCase());

  const [artigos, setArtigos] = useState<Artigo[]>([]);
  const [loading, setLoading] = useState(true);
  const [showConstituicao, setShowConstituicao] = useState(false);
  const [expandedArtigo, setExpandedArtigo] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!estado) return;
    const fetchArtigos = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('constituicoes_estaduais' as any)
        .select('*')
        .eq('uf', estado.uf)
        .order('ordem_numero', { ascending: true });
      
      if (!error && data) {
        setArtigos(data as any as Artigo[]);
      }
      setLoading(false);
    };
    fetchArtigos();
  }, [estado]);

  if (!estado) {
    return (
      <div className="min-h-dvh bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Estado não encontrado.</p>
      </div>
    );
  }

  const filteredArtigos = searchQuery
    ? artigos.filter(a =>
        a.texto.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.numero.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (a.titulo || '').toLowerCase().includes(searchQuery.toLowerCase())
      )
    : artigos;

  // Group by titulo/capitulo
  let currentTitulo = '';
  let currentCapitulo = '';

  if (showConstituicao) {
    return (
      <div className="min-h-dvh bg-background">
        <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm">
          <div className="max-w-5xl mx-auto">
            <PageHeader
              title={`${estado.uf === 'DF' ? 'Lei Orgânica' : 'Constituição'} - ${estado.uf}`}
              subtitle={`${artigos.length} artigos`}
              onBack={() => setShowConstituicao(false)}
            />
          </div>
        </div>


        <div className="px-4 py-3 max-w-5xl mx-auto">
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar artigo..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-secondary border-border font-body"
            />
          </div>

          <ScrollArea className="h-[calc(100vh-10rem)]">
            <div className="space-y-2 pr-2 pb-20">
              {filteredArtigos.map((artigo) => {
                const showTitulo = artigo.titulo && artigo.titulo !== currentTitulo;
                const showCapitulo = artigo.capitulo && artigo.capitulo !== currentCapitulo;
                if (artigo.titulo) currentTitulo = artigo.titulo;
                if (artigo.capitulo) currentCapitulo = artigo.capitulo;

                return (
                  <div key={artigo.id}>
                    {showTitulo && (
                      <div className="pt-4 pb-2">
                        <p className="text-xs font-bold text-primary uppercase tracking-wider font-display">{artigo.titulo}</p>
                      </div>
                    )}
                    {showCapitulo && (
                      <div className="pb-1">
                        <p className="text-xs text-muted-foreground font-body italic">{artigo.capitulo}</p>
                      </div>
                    )}
                    <motion.div
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="border border-border rounded-lg overflow-hidden bg-card hover:border-primary/30 transition-colors"
                    >
                      <button
                        onClick={() => setExpandedArtigo(expandedArtigo === artigo.id ? null : artigo.id)}
                        className="w-full text-left p-3 flex items-start gap-2"
                      >
                        <span className="text-primary font-display text-xs font-bold whitespace-nowrap mt-0.5">
                          {artigo.rotulo || artigo.numero}
                        </span>
                        <span className="text-foreground/90 font-body text-xs leading-relaxed flex-1 line-clamp-2">
                          {artigo.caput}
                        </span>
                        {expandedArtigo === artigo.id
                          ? <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                          : <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                        }
                      </button>
                      <AnimatePresence>
                        {expandedArtigo === artigo.id && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div className="px-3 pb-3 ml-6">
                              {artigo.texto.split('\n').map((line, i) => (
                                <p key={i} className="text-foreground/80 font-body text-xs leading-relaxed mb-1">
                                  {line}
                                </p>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  </div>
                );
              })}
              {filteredArtigos.length === 0 && !loading && (
                <p className="text-center text-muted-foreground py-8 font-body text-sm">Nenhum artigo encontrado.</p>
              )}
            </div>
          </ScrollArea>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-background">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto">
          <PageHeader
            title={estado.nome}
            subtitle={`${estado.capital} • ${estado.regiao}`}
            onBack={() => navigate('/legislacao-estadual')}
          />
        </div>
      </div>


      <div className="px-4 py-4 max-w-5xl mx-auto space-y-4 pb-20">
        {/* Constituição card */}
        <motion.button
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          onClick={async () => {
            if (artigos.length > 0) {
              setShowConstituicao(true);
            } else {
              const { openExternal } = await import('@/lib/nativeBrowser');
              openExternal(estado.portalUrl);
            }
          }}
          className="w-full bg-gradient-to-br from-amber-500/50 to-amber-700/20 rounded-xl p-4 flex items-center gap-3 relative overflow-hidden shadow-lg shadow-black/20"
        >
          <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-xl">
            <div
              className="absolute top-0 -left-full w-1/2 h-full bg-gradient-to-r from-transparent via-white/[0.10] to-transparent skew-x-[-20deg]"
              style={{ animation: 'shinePratique 3s ease-in-out infinite' }}
            />
          </div>
          <Landmark className="absolute bottom-2 right-2 w-10 h-10 text-white opacity-15 pointer-events-none" />
          <div className="w-10 h-10 rounded-lg bg-white/15 backdrop-blur-sm flex items-center justify-center shrink-0">
            <Landmark className="w-5 h-5 text-white" />
          </div>
          <div className="text-left flex-1">
            <p className="font-body text-sm font-bold text-white leading-tight">
              {estado.uf === 'DF' ? 'Lei Orgânica' : 'Constituição Estadual'}
            </p>
            <p className="font-body text-xs text-white/70">
              {loading ? (
                <span className="flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Carregando...</span>
              ) : artigos.length > 0 ? (
                `${artigos.length} artigos disponíveis`
              ) : (
                'Abrir portal externo'
              )}
            </p>
          </div>
          {artigos.length > 0 ? (
            <ChevronRight className="w-5 h-5 text-white/60" />
          ) : (
            <ExternalLink className="w-4 h-4 text-white/60" />
          )}
        </motion.button>

        {/* Portal externo */}
        <button
          onClick={async () => {
            const { openExternal } = await import('@/lib/nativeBrowser');
            openExternal(estado.portalUrl);
          }}
          className="w-full flex items-center gap-3 p-4 rounded-xl border border-border bg-card hover:bg-secondary/50 transition-colors text-left"
        >
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <ExternalLink className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1">
            <p className="font-display text-sm font-bold text-foreground">Portal Oficial</p>
            <p className="text-xs text-muted-foreground font-body truncate">{estado.portalUrl}</p>
          </div>
          <ExternalLink className="w-4 h-4 text-muted-foreground" />
        </button>

        {/* Outras categorias */}
        <h2 className="font-display text-sm font-bold text-muted-foreground uppercase tracking-wider mt-6">
          Outras Categorias
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {CATEGORIAS_ESTADO.map((cat, i) => {
            const Icon = cat.icon;
            return (
              <motion.button
                key={cat.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
                onClick={async () => {
                  const { openExternal } = await import('@/lib/nativeBrowser');
                  openExternal(estado.portalUrl);
                }}
                className={`bg-gradient-to-br ${cat.color} rounded-xl p-4 flex flex-col items-start gap-2 relative overflow-hidden group shadow-lg shadow-black/20`}
              >
                <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-xl">
                  <div
                    className="absolute top-0 -left-full w-1/2 h-full bg-gradient-to-r from-transparent via-white/[0.10] to-transparent skew-x-[-20deg]"
                    style={{ animation: 'shinePratique 3s ease-in-out infinite', animationDelay: `${i * 0.5}s` }}
                  />
                </div>
                <Icon className="absolute bottom-2 right-2 w-8 h-8 text-white opacity-15 pointer-events-none" />
                <div className="w-9 h-9 rounded-lg bg-white/15 backdrop-blur-sm flex items-center justify-center">
                  <Icon className="w-4 h-4 text-white" />
                </div>
                <div className="mt-auto text-left">
                  <p className="font-body text-sm font-bold text-white leading-tight">{cat.label}</p>
                  <p className="font-body text-[10px] text-white/60 flex items-center gap-1 mt-0.5">
                    <ExternalLink className="w-3 h-3" /> Portal externo
                  </p>
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default EstadoDetalhe;
