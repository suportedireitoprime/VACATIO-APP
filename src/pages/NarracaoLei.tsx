import { useState, useEffect, useMemo } from 'react';
import { LEIS_SUPABASE_URL, LEIS_SUPABASE_ANON_KEY, LEIS_SUPABASE_PROJECT_ID } from "@/lib/legislacaoBackend";
import { useLocation, useNavigate } from 'react-router-dom';
import { Mic, Loader2, Play, Pause, CheckCircle2 } from 'lucide-react';
import { PageHeader } from '@/components/vademecum/PageHeader';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { getLeisCatalog, fetchArtigosLei } from '@/services/legislacaoService';
import type { ArtigoLei } from '@/data/mockData';
import { supabase } from '@/integrations/supabase/client';

const ALL_LAWS = (() => {
  const catalog = getLeisCatalog();
  const constituicao = catalog.filter(l => l.tipo === 'constituicao');
  const codigos = catalog.filter(l => l.tipo === 'codigo');
  const estatutos = catalog.filter(l => l.tipo === 'estatuto');
  const leisEspeciais = catalog.filter(l => l.tipo === 'lei-especial');
  const previdenciario = catalog.filter(l => l.tipo === 'previdenciario');
  return [...constituicao, ...codigos, ...estatutos, ...leisEspeciais, ...previdenciario];
})();

const GROUPS = [
  { label: 'Constituição', tipo: 'constituicao' },
  { label: 'Códigos', tipo: 'codigo' },
  { label: 'Estatutos', tipo: 'estatuto' },
  { label: 'Leis Especiais', tipo: 'lei-especial' },
  { label: 'Previdenciário', tipo: 'previdenciario' },
];

type NarracaoCache = Record<string, string>; // artigo_numero -> audio_url

export default function NarracaoLei() {
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedLei, setSelectedLei] = useState<typeof ALL_LAWS[0] | null>(null);
  const [artigos, setArtigos] = useState<ArtigoLei[]>([]);
  const [loadingArtigos, setLoadingArtigos] = useState(false);
  const [narracaoCache, setNarracaoCache] = useState<NarracaoCache>({});
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [playingUrl, setPlayingUrl] = useState<string | null>(null);
  const [audioRef, setAudioRef] = useState<HTMLAudioElement | null>(null);

  const groupedLaws = useMemo(() =>
    GROUPS.map(g => ({ ...g, laws: ALL_LAWS.filter(l => l.tipo === g.tipo) })),
  []);

  useEffect(() => {
    if (selectedLei) return;
    const state = location.state as { selectedLeiId?: string | null; selectedTabelaNome?: string | null } | null;
    if (!state?.selectedLeiId && !state?.selectedTabelaNome) return;
    const lei = ALL_LAWS.find(l => l.id === state.selectedLeiId || l.tabela_nome === state.selectedTabelaNome);
    if (lei) setSelectedLei(lei);
    window.history.replaceState({}, '');
  }, [location.state, selectedLei]);

  // Load artigos when lei is selected
  useEffect(() => {
    if (!selectedLei) return;
    setLoadingArtigos(true);
    setArtigos([]);
    setNarracaoCache({});

    (async () => {
      const [artigosData] = await Promise.all([
        fetchArtigosLei(selectedLei.id, selectedLei.tabela_nome),
      ]);
      setArtigos(artigosData);

      // Load existing narrations from cache table
      try {
        const res = await fetch(
          `${LEIS_SUPABASE_URL}/rest/v1/narracoes_artigos?tabela_nome=eq.${selectedLei.tabela_nome}&select=artigo_numero,audio_url`,
          {
            headers: {
              apikey: LEIS_SUPABASE_ANON_KEY,
              Authorization: `Bearer ${LEIS_SUPABASE_ANON_KEY}`,
            },
          }
        );
        if (res.ok) {
          const cached = await res.json();
          const map: NarracaoCache = {};
          cached.forEach((r: any) => { map[r.artigo_numero] = r.audio_url; });
          setNarracaoCache(map);
        }
      } catch (e) {
        console.error('Erro ao carregar narrações:', e);
      }

      setLoadingArtigos(false);
    })();
  }, [selectedLei]);

  const handleNarrar = async (artigo: ArtigoLei) => {
    if (!selectedLei || generatingId) return;
    setGeneratingId(artigo.id);

    try {
      const projectId = LEIS_SUPABASE_PROJECT_ID;
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/narrar-artigo`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${LEIS_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify((() => {
            const STRUCT_RE = /^(PARTE|LIVRO|T[IÍ]TULO|CAP[IÍ]TULO|SEÇ[AÃ]O|SUBSEÇ[AÃ]O)\b/i;
            const tituloIsEpig = artigo.titulo && !STRUCT_RE.test(artigo.titulo);
            const epig = tituloIsEpig ? artigo.titulo : null;
            const hier = artigo.capitulo || (!tituloIsEpig ? artigo.titulo : null) || null;
            return {
              tabela_nome: selectedLei.tabela_nome,
              artigo_numero: artigo.numero,
              artigo_texto: artigo.caput,
              lei_nome: selectedLei.nome,
              hierarquia: hier,
              epigrafe: epig,
            };
          })()),
        }
      );

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.error('Erro ao narrar:', err);
        return;
      }

      const { audio_url } = await res.json();
      setNarracaoCache(prev => ({ ...prev, [artigo.numero]: audio_url }));
    } catch (e) {
      console.error('Erro ao narrar:', e);
    } finally {
      setGeneratingId(null);
    }
  };

  const togglePlay = (url: string) => {
    if (playingUrl === url && audioRef) {
      audioRef.pause();
      setPlayingUrl(null);
      setAudioRef(null);
      return;
    }

    if (audioRef) {
      audioRef.pause();
    }

    const audio = new Audio(url);
    audio.play();
    audio.onended = () => {
      setPlayingUrl(null);
      setAudioRef(null);
    };
    setPlayingUrl(url);
    setAudioRef(audio);
  };

  const narradosCount = Object.keys(narracaoCache).length;

  return (
    <div className="min-h-dvh bg-background text-foreground flex flex-col">
      {/* Header */}
      <PageHeader
        title={selectedLei ? selectedLei.nome : 'Narração de Artigos'}
        subtitle={selectedLei ? `${narradosCount} narrado${narradosCount !== 1 ? 's' : ''} de ${artigos.length}` : 'Ouça as leis com voz IA'}
        onBack={() => (selectedLei ? setSelectedLei(null) : navigate(-1))}
        rightAction={selectedLei ? <Mic className="w-5 h-5 text-primary" /> : undefined}
      />


      <div className="flex-1 overflow-auto">
        {!selectedLei ? (
          /* Law selection */
          <div className="p-4 space-y-3">
            <h2 className="text-sm font-semibold text-foreground">Selecione uma lei para narrar</h2>
            {groupedLaws.map(group => (
              <div key={group.tipo} className="bg-card border border-border rounded-lg overflow-hidden">
                <div className="px-4 py-3 bg-muted/30">
                  <span className="text-sm font-semibold text-foreground">{group.label}</span>
                </div>
                <div className="divide-y divide-border/50">
                  {group.laws.map(lei => (
                    <button
                      key={lei.id}
                      onClick={() => setSelectedLei(lei)}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors"
                    >
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: lei.iconColor || 'hsl(var(--primary))' }} />
                      <div className="flex-1 text-left min-w-0">
                        <span className="text-sm text-foreground block truncate">{lei.nome}</span>
                      </div>
                      <span className="text-xs text-muted-foreground font-mono">{lei.sigla}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : loadingArtigos ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : (
          /* Artigos list */
          <div className="divide-y divide-border">
            {artigos.map(artigo => {
              const audioUrl = narracaoCache[artigo.numero];
              const isGenerating = generatingId === artigo.id;
              const isPlaying = playingUrl === audioUrl;

              return (
                <div key={artigo.id} className="px-4 py-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{artigo.numero}</p>
                    <p className="text-xs text-muted-foreground line-clamp-2">{artigo.caput}</p>
                    {artigo.titulo && (
                      <p className="text-[11px] text-primary/70 mt-0.5">{artigo.titulo}</p>
                    )}
                  </div>

                  {isGenerating ? (
                    <Loader2 className="w-5 h-5 animate-spin text-primary shrink-0" />
                  ) : audioUrl ? (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="w-8 h-8"
                        onClick={() => togglePlay(audioUrl)}
                      >
                        {isPlaying ? (
                          <Pause className="w-4 h-4 text-primary" />
                        ) : (
                          <Play className="w-4 h-4 text-primary" />
                        )}
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      size="icon"
                      className="w-8 h-8 shrink-0"
                      onClick={() => handleNarrar(artigo)}
                      disabled={!!generatingId}
                    >
                      <Mic className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
