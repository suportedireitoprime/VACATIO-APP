import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Search, X, Play, BookOpen, Headphones, ArrowRight, Sparkles, AlertCircle } from 'lucide-react';
import { useSpotifyAudioStore, type SpotifyTrack } from '@/stores/useSpotifyAudioStore';
import { LEIS_CATALOG } from '@/data/leisCatalog';
import { getLeiCover } from '@/lib/leiTheme';
import { supabase } from '@/integrations/supabase/client';
import { formatArtigoLabel, isArtigoReal } from '@/services/narracaoArtigosSyncService';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { haptic } from '@/lib/nativeHaptics';

interface SpotifyPesquisarTabProps {
  onSelectLei: (lei: { id: string; nome: string; slug: string; categoria?: string }) => void;
}

const PESQUISAS_EM_ALTA = [
  'Código Penal',
  'Art. 121',
  'Código de Processo Penal',
  'CLT',
  'Constituição Federal',
  'Art. 5',
  'Homicídio',
  'Estatuto da OAB',
  'Crimes Hediondos',
  'Código Civil',
];

const LEIS_DESTAQUE = [
  { id: 'cf', nome: 'Constituição Federal', sigla: 'CF/88', tipo: 'Constitucional' },
  { id: 'cp', nome: 'Código Penal', sigla: 'CP', tipo: 'Penal' },
  { id: 'cpp', nome: 'Código de Processo Penal', sigla: 'CPP', tipo: 'Processual' },
  { id: 'clt', nome: 'Consolidação das Leis do Trabalho', sigla: 'CLT', tipo: 'Trabalhista' },
  { id: 'cc', nome: 'Código Civil', sigla: 'CC', tipo: 'Civil' },
  { id: 'cpc', nome: 'Código de Processo Civil', sigla: 'CPC', tipo: 'Processual' },
];

export const SpotifyPesquisarTab: React.FC<SpotifyPesquisarTabProps> = ({ onSelectLei }) => {
  const { playTrack, audioMode } = useSpotifyAudioStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [searching, setSearching] = useState(false);
  const [artigoResults, setArtigoResults] = useState<any[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

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
    ).slice(0, 10);
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
          .limit(20);

        if (!error && data) {
          const valid = data.filter((a) => isArtigoReal(a.numero));
          setArtigoResults(valid);
        }
      } catch (err) {
        console.warn('[SpotifyPesquisarTab] Erro na busca de artigos:', err);
      } finally {
        setSearching(false);
      }
    }, 320);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const handlePlayArtigo = (art: any) => {
    haptic.selection();
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

  const handleSelectSugestao = (termo: string) => {
    haptic.selection();
    setSearchTerm(termo);
  };

  const handleClear = () => {
    haptic.selection();
    setSearchTerm('');
    inputRef.current?.focus();
  };

  const hasNoResults =
    searchTerm.trim().length >= 2 &&
    !searching &&
    matchedLeis.length === 0 &&
    artigoResults.length === 0;

  return (
    <div className="space-y-6">
      {/* Barra de Pesquisa Estilo Spotify VACATIO */}
      <div className="relative">
        <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-purple-400 pointer-events-none" />
        <Input
          ref={inputRef}
          autoFocus
          placeholder="Buscar leis, artigos, números ou temas (ex: CP, Art. 121, CLT)..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-12 pr-10 bg-zinc-900/90 border-white/10 text-white text-sm h-12 rounded-2xl placeholder:text-zinc-500 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 shadow-xl transition-all"
        />
        {searchTerm && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1.5 text-zinc-400 hover:text-white rounded-full hover:bg-white/10 transition-colors"
            title="Limpar busca"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Sugestões e Destaques quando o campo está vazio */}
      {!searchTerm && (
        <div className="space-y-6 animate-fade-in">
          {/* Termos em alta */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                Pesquisas em Alta
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {PESQUISAS_EM_ALTA.map((sug) => (
                <button
                  key={sug}
                  type="button"
                  onClick={() => handleSelectSugestao(sug)}
                  className="px-3.5 py-2 rounded-2xl bg-zinc-900/80 hover:bg-zinc-800 border border-white/10 text-xs font-medium text-zinc-300 hover:text-white transition-all active:scale-95"
                >
                  {sug}
                </button>
              ))}
            </div>
          </div>

          {/* Acesso rápido às principais legislações */}
          <div className="space-y-3">
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">
              Legislações Mais Acessadas
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {LEIS_DESTAQUE.map((lei) => (
                <div
                  key={lei.id}
                  onClick={() => {
                    haptic.selection();
                    onSelectLei({
                      id: lei.id,
                      nome: lei.nome,
                      slug: lei.id,
                      categoria: lei.tipo,
                    });
                  }}
                  className="p-3 rounded-2xl bg-zinc-900/60 hover:bg-zinc-800/80 border border-white/5 flex items-center justify-between gap-3 cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.99] group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-12 h-12 rounded-xl overflow-hidden bg-zinc-950 shrink-0 border border-white/10">
                      <img
                        src={getLeiCover(lei.id)}
                        alt={lei.nome}
                        className="w-full h-full object-cover object-right group-hover:scale-105 transition-transform"
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm font-bold text-white truncate">
                        {lei.nome}
                      </p>
                      <p className="text-[11px] text-zinc-400 truncate mt-0.5">
                        {lei.sigla} &bull; {lei.tipo}
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-zinc-500 group-hover:text-purple-400 transition-colors shrink-0" />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Indicador de carregamento */}
      {searching && (
        <div className="py-8 text-center text-xs text-purple-400 flex items-center justify-center gap-2 animate-pulse">
          <Headphones className="w-4 h-4 animate-bounce" />
          Pesquisando artigos e narrações...
        </div>
      )}

      {/* Resultados: Álbuns / Leis */}
      {matchedLeis.length > 0 && (
        <div className="space-y-3">
          <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">
            Legislações Encontradas ({matchedLeis.length})
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {matchedLeis.map((lei) => (
              <div
                key={lei.id}
                onClick={() => {
                  haptic.selection();
                  onSelectLei({
                    id: lei.id,
                    nome: lei.nome,
                    slug: lei.id,
                    categoria: lei.tipo,
                  });
                }}
                className="p-3 rounded-2xl bg-zinc-900/60 hover:bg-zinc-800 border border-white/5 flex items-center justify-between gap-3 cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.99] group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-12 h-12 rounded-xl overflow-hidden bg-zinc-950 shrink-0 border border-white/10">
                    <img
                      src={getLeiCover(lei.id)}
                      alt={lei.nome}
                      className="w-full h-full object-cover object-right group-hover:scale-105 transition-transform"
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
                <ArrowRight className="w-4 h-4 text-zinc-500 group-hover:text-purple-400 transition-colors shrink-0" />
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
                  className="p-3.5 rounded-2xl bg-zinc-900/60 hover:bg-zinc-800 border border-white/5 flex items-start justify-between gap-3 cursor-pointer transition-colors group"
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-purple-400">
                        {numFmt}
                      </span>
                      <span className="text-[11px] text-zinc-400 truncate">
                        &bull; {lei?.nome || 'Legislação'}
                      </span>
                      {hasAudio && (
                        <Badge className="bg-purple-500/15 text-purple-300 border-purple-500/30 text-[9px] py-0">
                          Áudio Disponível
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
                    className="p-2.5 rounded-full bg-purple-500 hover:bg-purple-400 text-white shrink-0 transition-transform active:scale-95 shadow-md shadow-purple-500/20"
                    title="Ouvir agora"
                  >
                    <Play className="w-3.5 h-3.5 fill-white ml-0.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Estado vazio quando não encontra nada */}
      {hasNoResults && (
        <div className="py-12 text-center space-y-3 animate-fade-in">
          <div className="w-12 h-12 rounded-full bg-zinc-900 border border-white/10 flex items-center justify-center mx-auto text-zinc-500">
            <AlertCircle className="w-6 h-6 text-zinc-500" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">
              Nenhum resultado para "{searchTerm}"
            </p>
            <p className="text-xs text-zinc-400 mt-1 max-w-xs mx-auto">
              Tente buscar pela sigla (ex: CF, CP, CLT), número do artigo (ex: Art. 121) ou palavra-chave jurídica.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
