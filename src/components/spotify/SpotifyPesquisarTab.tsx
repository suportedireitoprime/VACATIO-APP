import React, { useState, useEffect, useMemo } from 'react';
import { Search, X, Play, BookOpen, Headphones, Heart, ArrowRight } from 'lucide-react';
import { useSpotifyAudioStore, type SpotifyTrack } from '@/stores/useSpotifyAudioStore';
import { LEIS_CATALOG } from '@/data/leisCatalog';
import { getLeiCover } from '@/lib/leiTheme';
import { supabase } from '@/integrations/supabase/client';
import { formatArtigoLabel, isArtigoReal } from '@/services/narracaoArtigosSyncService';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

interface SpotifyPesquisarTabProps {
  onSelectLei: (lei: { id: string; nome: string; slug: string; categoria?: string }) => void;
}

export const SpotifyPesquisarTab: React.FC<SpotifyPesquisarTabProps> = ({ onSelectLei }) => {
  const { playTrack, toggleFavorito, isFavorito, audioMode } = useSpotifyAudioStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [searching, setSearching] = useState(false);
  const [artigoResults, setArtigoResults] = useState<any[]>([]);

  // 1. Filtro local imediato nas Leis (Álbuns)
  const matchedLeis = useMemo(() => {
    if (!searchTerm.trim()) return [];
    const term = searchTerm.toLowerCase();
    return LEIS_CATALOG.filter(
      (l) =>
        l.nome.toLowerCase().includes(term) ||
        l.sigla.toLowerCase().includes(term) ||
        l.descricao.toLowerCase().includes(term) ||
        (l.tags && l.tags.some((tag) => tag.toLowerCase().includes(term)))
    ).slice(0, 8);
  }, [searchTerm]);

  // 2. Busca assíncrona por artigos com debounce
  useEffect(() => {
    if (!searchTerm.trim() || searchTerm.trim().length < 2) {
      setArtigoResults([]);
      setSearching(false);
      return;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const cleanTerm = searchTerm.trim().replace(/^art(igo)?\.?\s*/i, '');

        // Busca por número exato ou texto no banco
        const { data, error } = await supabase
          .from('vade_mecum_artigos')
          .select('id, numero, texto, narracao_url, lei_id, vade_mecum_leis(id, nome, slug)')
          .or(`numero.ilike.%${cleanTerm}%,texto.ilike.%${cleanTerm}%`)
          .limit(15);

        if (!error && data) {
          const valid = data.filter((a) => isArtigoReal(a.numero));
          setArtigoResults(valid);
        }
      } catch (err) {
        console.warn('[SpotifyPesquisarTab] Erro na busca de artigos:', err);
      } finally {
        setSearching(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const handlePlayArtigo = (art: any) => {
    const lei = Array.isArray(art.vade_mecum_leis) ? art.vade_mecum_leis[0] : art.vade_mecum_leis;
    const leiNome = lei?.nome || 'Legislação';
    const leiSlug = lei?.slug || art.lei_id || 'cp';
    const coverUrl = getLeiCover(leiSlug);

    const track: SpotifyTrack = {
      id: `${leiSlug}::${art.numero}`,
      tipo: audioMode === 'aulas' ? 'aula' : 'lei',
      leiId: lei?.id || art.lei_id,
      leiSlug,
      leiNome,
      artigoNumero: art.numero,
      numeroFormatado: formatArtigoLabel(art.numero),
      titulo: `${formatArtigoLabel(art.numero)} • ${leiNome}`,
      subtitulo: `${leiNome} • Narração`,
      texto: art.texto || '',
      audioUrl: art.narracao_url || '',
      coverUrl,
      ordem: 0,
    };

    playTrack(track);
  };

  return (
    <div className="space-y-6">
      {/* Barra de Pesquisa Estilo Home VACATIO */}
      <div className="relative">
        <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" />
        <Input
          autoFocus
          placeholder="Buscar leis, artigos ou palavras (ex: CP, Art. 121, Furto)..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-12 pr-10 bg-zinc-900 border-white/10 text-white text-sm h-12 rounded-2xl placeholder:text-zinc-500 focus:border-emerald-500 shadow-xl"
        />
        {searchTerm && (
          <button
            type="button"
            onClick={() => setSearchTerm('')}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-zinc-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Sugestões Rápidas de Termos */}
      {!searchTerm && (
        <div className="space-y-3">
          <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">
            Pesquisas em Alta
          </span>
          <div className="flex flex-wrap gap-2">
            {[
              'Código Penal',
              'Art. 121',
              'Código de Processo Penal',
              'CLT',
              'Constituição Federal',
              'Homicídio',
              'Estatuto da OAB',
              'Crimes de Trânsito',
            ].map((sug) => (
              <button
                key={sug}
                type="button"
                onClick={() => setSearchTerm(sug)}
                className="px-3.5 py-2 rounded-2xl bg-zinc-900/80 hover:bg-zinc-800 border border-white/10 text-xs font-semibold text-zinc-300 transition-colors"
              >
                {sug}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Resultados: Álbuns / Leis */}
      {matchedLeis.length > 0 && (
        <div className="space-y-3">
          <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">
            Legislações ({matchedLeis.length})
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {matchedLeis.map((lei) => (
              <div
                key={lei.id}
                onClick={() =>
                  onSelectLei({
                    id: lei.id,
                    nome: lei.nome,
                    slug: lei.id,
                    categoria: lei.tipo,
                  })
                }
                className="p-3 rounded-2xl bg-zinc-900/60 hover:bg-zinc-800 border border-white/5 flex items-center justify-between gap-3 cursor-pointer transition-all hover:scale-[1.01]"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-12 h-12 rounded-xl overflow-hidden bg-zinc-950 shrink-0 border border-white/10">
                    <img
                      src={getLeiCover(lei.id)}
                      alt={lei.nome}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-bold text-white truncate">
                      {lei.nome}
                    </p>
                    <p className="text-[11px] text-zinc-400 truncate mt-0.5">
                      {lei.sigla} &bull; {lei.descricao}
                    </p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-zinc-500 shrink-0" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Resultados: Artigos */}
      {artigoResults.length > 0 && (
        <div className="space-y-3">
          <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">
            Artigos Narrados ({artigoResults.length})
          </span>
          <div className="space-y-2">
            {artigoResults.map((art) => {
              const numFmt = formatArtigoLabel(art.numero);
              const lei = Array.isArray(art.vade_mecum_leis)
                ? art.vade_mecum_leis[0]
                : art.vade_mecum_leis;
              const hasAudio = Boolean(art.narracao_url);

              return (
                <div
                  key={art.id}
                  onClick={() => handlePlayArtigo(art)}
                  className="p-3.5 rounded-2xl bg-zinc-900/60 hover:bg-zinc-800 border border-white/5 flex items-start justify-between gap-3 cursor-pointer transition-colors"
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-emerald-400">
                        {numFmt}
                      </span>
                      <span className="text-[11px] text-zinc-400 truncate">
                        &bull; {lei?.nome || 'Lei'}
                      </span>
                      {hasAudio && (
                        <Badge className="bg-emerald-500/15 text-emerald-300 border-emerald-500/30 text-[9px] py-0">
                          Áudio Pronto
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-zinc-300 line-clamp-2 leading-relaxed">
                      {art.texto}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePlayArtigo(art);
                    }}
                    className="p-2.5 rounded-full bg-emerald-500 hover:bg-emerald-400 text-black shrink-0 transition-transform active:scale-95 shadow-md"
                  >
                    <Play className="w-3.5 h-3.5 fill-black ml-0.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {searching && (
        <div className="py-8 text-center text-xs text-zinc-500 animate-pulse">
          Pesquisando artigos e narrações...
        </div>
      )}
    </div>
  );
};
