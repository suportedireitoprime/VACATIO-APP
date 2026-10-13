import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Headphones,
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  FolderOpen,
  ExternalLink,
  Search,
  Sparkles,
  Volume2,
  VolumeX,
  FileText,
  Clock,
  CheckCircle2,
  Share2,
  ChevronRight,
  BookOpen,
  Layers,
} from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/vademecum/PageHeader';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { fetchAllRows } from '@/lib/fetchAllRows';
import { LEIS_CATALOG } from '@/data/leisCatalog';
import {
  getAllAudioAulasConfigs,
  formatDriveStreamUrl,
  isArtigoReal,
  formatArtigoLabel,
  type ArtigoAudioItem,
  type AudioAulaLeiConfig,
} from '@/services/audioAulasService';

interface LeiOption {
  id: string;
  slug: string;
  nome: string;
  nome_curto?: string | null;
  categoria?: string | null;
}

export default function AudioAulas() {
  const navigate = useNavigate();

  // Estados de Leis
  const [leis, setLeis] = useState<LeiOption[]>([]);
  const [loadingLeis, setLoadingLeis] = useState(true);
  const [selectedLeiId, setSelectedLeiId] = useState<string>('');
  const [searchFilter, setSearchFilter] = useState('');

  // Artigos da lei
  const [artigos, setArtigos] = useState<ArtigoAudioItem[]>([]);
  const [loadingArtigos, setLoadingArtigos] = useState(false);

  // Configurações da lei (Drive e Links)
  const [currentConfig, setCurrentConfig] = useState<AudioAulaLeiConfig | null>(null);

  // Estado do Player de Áudio Flutuante
  const [activeAudioItem, setActiveAudioItem] = useState<{
    artigoNumero: string;
    artigoTexto: string;
    url: string;
  } | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // 1. Carregar lista de Leis
  useEffect(() => {
    async function initLeis() {
      setLoadingLeis(true);
      try {
        const { data } = await supabase
          .from('vade_mecum_leis')
          .select('id, slug, nome, nome_curto, categoria')
          .order('nome', { ascending: true });

        if (data && data.length > 0) {
          setLeis(data as LeiOption[]);
          // Prioriza Código Penal como inicial
          const cp = data.find((l) => l.slug?.includes('penal') || l.nome?.toLowerCase().includes('código penal'));
          setSelectedLeiId(cp?.id || data[0].id);
        } else {
          // Fallback catálogo local
          const fallback: LeiOption[] = LEIS_CATALOG.map((l) => ({
            id: l.id,
            slug: l.tabela_nome || l.id,
            nome: l.nome,
            nome_curto: (l as any).sigla || l.nome,
            categoria: l.tipo,
          }));
          setLeis(fallback);
          if (fallback.length > 0) setSelectedLeiId(fallback[0].id);
        }
      } catch (err) {
        console.warn('[AudioAulas] Erro ao carregar leis:', err);
      } finally {
        setLoadingLeis(false);
      }
    }

    initLeis();
  }, []);

  // Lei Ativa
  const activeLei = useMemo(() => {
    return leis.find((l) => l.id === selectedLeiId || l.slug === selectedLeiId) || null;
  }, [leis, selectedLeiId]);

  // 2. Carregar Artigos e Links da Lei Selecionada
  useEffect(() => {
    if (!activeLei) return;

    let isMounted = true;

    async function loadArtigosAndConfig() {
      setLoadingArtigos(true);
      try {
        // Carrega configurações de links salvas
        const configs = await getAllAudioAulasConfigs();
        const conf = configs[activeLei!.id] || configs[activeLei!.slug] || null;
        if (isMounted) setCurrentConfig(conf);

        // Busca artigos da lei
        let loaded: ArtigoAudioItem[] = [];
        try {
          loaded = await fetchAllRows<ArtigoAudioItem>(() =>
            supabase
              .from('vade_mecum_artigos')
              .select('id, numero, texto, ordem')
              .eq('lei_id', activeLei!.id)
              .order('ordem', { ascending: true }) as any
          );
        } catch (e) {
          console.warn('[AudioAulas] Falha ao carregar artigos por id:', e);
        }

        if ((!loaded || loaded.length === 0) && activeLei!.slug) {
          try {
            loaded = await fetchAllRows<ArtigoAudioItem>(() =>
              supabase
                .from('vade_mecum_artigos')
                .select('id, numero, texto, ordem')
                .eq('lei_id', activeLei!.slug)
                .order('ordem', { ascending: true }) as any
            );
          } catch (e) {
            console.warn('[AudioAulas] Falha ao carregar artigos por slug:', e);
          }
        }

        const validArtigos = (loaded || []).filter(
          (a) => a.texto && a.texto.trim().length > 0 && isArtigoReal(a.numero)
        );
        if (isMounted) setArtigos(validArtigos);
      } catch (err) {
        console.warn('[AudioAulas] Erro:', err);
      } finally {
        if (isMounted) setLoadingArtigos(false);
      }
    }

    loadArtigosAndConfig();

    return () => {
      isMounted = false;
    };
  }, [activeLei]);

  // Filtro de Artigos
  const filteredArtigos = useMemo(() => {
    if (!searchFilter.trim()) return artigos;
    const term = searchFilter.toLowerCase().replace(/art(igo)?\.?\s*/i, '');
    return artigos.filter((a) => {
      const num = formatArtigoLabel(a.numero).toLowerCase().replace(/art(igo)?\.?\s*/i, '');
      return num.includes(term) || a.texto.toLowerCase().includes(term);
    });
  }, [artigos, searchFilter]);

  // Contagem de áudios disponíveis
  const totalAudiosDisponiveis = useMemo(() => {
    if (!currentConfig?.audioLinks) return 0;
    return Object.values(currentConfig.audioLinks).filter((v) => Boolean(v && v.trim())).length;
  }, [currentConfig]);

  // Ação de Play/Pause de um artigo
  const handleTogglePlay = (artigo: ArtigoAudioItem) => {
    const numLimpo = formatArtigoLabel(artigo.numero);
    const rawUrl = currentConfig?.audioLinks?.[numLimpo] || currentConfig?.audioLinks?.[artigo.numero] || '';

    if (!rawUrl) {
      if (currentConfig?.driveFolderUrl) {
        window.open(currentConfig.driveFolderUrl, '_blank');
        toast.info(`Abrindo pasta no Google Drive com os áudios da lei...`);
      } else {
        toast.info(`Áudio do ${numLimpo} em fase de gravação.`);
      }
      return;
    }

    // Se já estiver tocando esse mesmo artigo, apenas alterna play/pause
    if (activeAudioItem?.artigoNumero === numLimpo) {
      if (isPlaying) {
        audioRef.current?.pause();
        setIsPlaying(false);
      } else {
        audioRef.current?.play();
        setIsPlaying(true);
      }
      return;
    }

    // Novo áudio selecionado
    const streamUrl = formatDriveStreamUrl(rawUrl) || rawUrl;
    setActiveAudioItem({
      artigoNumero: numLimpo,
      artigoTexto: artigo.texto,
      url: streamUrl,
    });
    setIsPlaying(true);
    setCurrentTime(0);

    if (audioRef.current) {
      audioRef.current.src = streamUrl;
      audioRef.current.playbackRate = playbackRate;
      audioRef.current.play().catch((err) => {
        console.warn('[AudioAulas] Play direto bloqueado pelo browser:', err);
        // Fallback: abre no Google Drive se o stream falhar
        window.open(rawUrl, '_blank');
        toast.info('Abrindo áudio no Google Drive...');
      });
    }
  };

  // Ciclo de Velocidade: 1x -> 1.25x -> 1.5x -> 2x -> 1x
  const handleTogglePlaybackRate = () => {
    const rates = [1, 1.25, 1.5, 2];
    const nextIdx = (rates.indexOf(playbackRate) + 1) % rates.length;
    const nextRate = rates[nextIdx];
    setPlaybackRate(nextRate);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextRate;
    }
  };

  // Formatação de Segundos para mm:ss
  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return '00:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 pb-32">
      {/* Elemento de áudio invisível para controle */}
      <audio
        ref={audioRef}
        onTimeUpdate={() => {
          if (audioRef.current) setCurrentTime(audioRef.current.currentTime);
        }}
        onLoadedMetadata={() => {
          if (audioRef.current) setDuration(audioRef.current.duration);
        }}
        onEnded={() => setIsPlaying(false)}
        onError={() => {
          console.warn('[AudioAulas] Erro ao reproduzir URL do áudio');
        }}
      />

      {/* Header com estilo nativo VACATIO */}
      <PageHeader
        title="Áudio Aulas"
        subtitle="Aprenda e revise artigos jurídicos ouvindo em qualquer lugar"
        onBack={() => navigate('/')}
        variant="dark"
      />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-4 space-y-6">
        {/* Banner Hero Especial */}
        <div className="relative overflow-hidden rounded-3xl border border-sky-500/20 bg-gradient-to-br from-sky-950/40 via-slate-900/60 to-black p-5 sm:p-7 shadow-2xl">
          <div className="absolute -top-12 -right-12 w-48 h-48 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1.5 max-w-xl">
              <h2 className="text-lg sm:text-xl font-bold font-sans text-white tracking-normal leading-snug">
                Áudio-Aulas com Didática Jurídica
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 font-sans leading-relaxed">
                Cada artigo explicado ponto a ponto com conceitos, finalidade prática e exemplos da vida real. Otimize seu tempo enquanto treina, dirige ou descansa.
              </p>
            </div>

            {currentConfig?.driveFolderUrl && (
              <a
                href={currentConfig.driveFolderUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-sky-500/20 hover:bg-sky-500/30 border border-sky-500/40 text-sky-200 text-xs font-bold transition-all hover:scale-105 shrink-0 shadow-lg"
              >
                <FolderOpen className="w-4 h-4 text-sky-400" />
                Pasta no Google Drive
                <ExternalLink className="w-3 h-3 text-sky-300" />
              </a>
            )}
          </div>
        </div>

        {/* Barra de Seleção de Legislação e Busca */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <h2 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-sky-400" />
              Selecione a Legislação:
            </h2>

            <div className="relative w-full sm:w-72">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Buscar artigo ou termo..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="pl-8 bg-black/40 border-white/10 text-white text-xs h-9 rounded-xl placeholder:text-slate-500"
              />
            </div>
          </div>

          {/* Carrossel de Pílulas de Leis */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            {loadingLeis ? (
              <div className="text-xs text-slate-400 py-2">Carregando leis...</div>
            ) : (
              leis.map((lei) => {
                const isSelected = activeLei?.id === lei.id;
                return (
                  <button
                    key={lei.id}
                    type="button"
                    onClick={() => setSelectedLeiId(lei.id)}
                    className={`shrink-0 px-3.5 py-2 rounded-2xl text-xs font-semibold transition-all border ${
                      isSelected
                        ? 'bg-sky-500 text-white border-sky-400 shadow-lg shadow-sky-500/20'
                        : 'bg-slate-900/60 border-white/10 text-slate-300 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    {lei.nome_curto || lei.nome}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Resumo da Lei Selecionada */}
        {activeLei && (
          <div className="flex items-center justify-between text-xs text-slate-400 bg-black/30 p-3 rounded-2xl border border-white/5">
            <span className="font-medium text-slate-200">
              {activeLei.nome}
            </span>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="border-sky-500/30 text-sky-300 text-[11px]">
                {artigos.length} artigos
              </Badge>
              {totalAudiosDisponiveis > 0 ? (
                <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-[11px]">
                  {totalAudiosDisponiveis} áudios prontos
                </Badge>
              ) : (
                <Badge variant="outline" className="border-white/10 text-slate-400 text-[11px]">
                  Em produção
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Lista de Artigos / Aulas */}
        <div className="space-y-2.5">
          {loadingArtigos ? (
            <div className="py-16 text-center text-slate-400 text-xs">Carregando artigos da lei...</div>
          ) : filteredArtigos.length === 0 ? (
            <div className="py-16 text-center space-y-2 bg-slate-900/30 rounded-3xl border border-white/5 p-6">
              <Headphones className="w-10 h-10 text-slate-600 mx-auto" />
              <p className="text-sm font-semibold text-slate-300">Nenhum artigo encontrado</p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Tente ajustar o termo de pesquisa ou selecione outra lei no menu acima.
              </p>
            </div>
          ) : (
            filteredArtigos.map((art) => {
              const numLimpo = formatArtigoLabel(art.numero);
              const audioLink = currentConfig?.audioLinks?.[numLimpo] || currentConfig?.audioLinks?.[art.numero];
              const hasAudio = Boolean(audioLink);
              const isCurrentlyPlaying = activeAudioItem?.artigoNumero === numLimpo && isPlaying;

              return (
                <div
                  key={art.id}
                  className={`p-4 rounded-2xl border transition-all ${
                    isCurrentlyPlaying
                      ? 'bg-sky-500/10 border-sky-500/40 shadow-lg shadow-sky-500/5'
                      : 'bg-slate-900/50 border-white/5 hover:border-white/10 hover:bg-slate-900/80'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-sky-400">
                          {numLimpo}
                        </span>
                        {hasAudio ? (
                          <Badge className="bg-emerald-500/15 text-emerald-300 border-emerald-500/30 text-[10px] py-0 gap-1 font-semibold">
                            <Headphones className="w-3 h-3" /> Áudio Pronto
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="border-white/10 text-slate-500 text-[10px] py-0">
                            Gravação em fila
                          </Badge>
                        )}
                      </div>

                      <p className="text-xs text-slate-300 leading-relaxed line-clamp-3">
                        {art.texto}
                      </p>
                    </div>

                    {/* Botão de Tocar / Ouvir */}
                    <div className="shrink-0 flex items-center gap-1.5 pt-1">
                      <Button
                        size="sm"
                        onClick={() => handleTogglePlay(art)}
                        className={`rounded-xl text-xs font-semibold h-9 px-3.5 transition-all ${
                          isCurrentlyPlaying
                            ? 'bg-amber-500 hover:bg-amber-600 text-black shadow-md shadow-amber-500/20'
                            : hasAudio
                            ? 'bg-sky-500 hover:bg-sky-600 text-white shadow-md shadow-sky-500/20'
                            : 'bg-white/5 hover:bg-white/10 text-slate-400 border border-white/5'
                        }`}
                      >
                        {isCurrentlyPlaying ? (
                          <>
                            <Pause className="w-3.5 h-3.5 mr-1" /> Pausar
                          </>
                        ) : (
                          <>
                            <Play className="w-3.5 h-3.5 mr-1 fill-current" />
                            {hasAudio ? 'Ouvir' : 'Solicitar'}
                          </>
                        )}
                      </Button>

                      {hasAudio && (
                        <a
                          href={audioLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                          title="Abrir no Google Drive"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* PLAYER DE ÁUDIO FLUTUANTE INFERIOR */}
      {activeAudioItem && (
        <div className="fixed bottom-20 left-0 right-0 z-50 px-3 sm:px-6">
          <div className="max-w-2xl mx-auto rounded-3xl bg-slate-900/95 border border-sky-500/30 backdrop-blur-2xl p-3 sm:p-4 shadow-2xl text-white space-y-2">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-10 h-10 rounded-2xl bg-sky-500/20 border border-sky-500/40 text-sky-400 flex items-center justify-center shrink-0">
                  <Headphones className="w-5 h-5 animate-pulse" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-xs sm:text-sm text-sky-200 truncate">
                    {activeAudioItem.artigoNumero} &bull; {activeLei?.nome_curto || activeLei?.nome}
                  </p>
                  <p className="text-[11px] text-slate-400 truncate">
                    VACATIO Vade Mecum &bull; Áudio-Aula Oficial
                  </p>
                </div>
              </div>

              {/* Controles Principais */}
              <div className="flex items-center gap-1.5 shrink-0">
                {/* Velocidade */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleTogglePlaybackRate}
                  className="text-[11px] font-bold text-sky-400 hover:text-sky-300 h-8 px-2 rounded-xl bg-white/5 hover:bg-white/10"
                >
                  {playbackRate}x
                </Button>

                {/* Play / Pause */}
                <Button
                  size="sm"
                  onClick={() => {
                    if (isPlaying) {
                      audioRef.current?.pause();
                      setIsPlaying(false);
                    } else {
                      audioRef.current?.play();
                      setIsPlaying(true);
                    }
                  }}
                  className="w-9 h-9 rounded-full bg-sky-500 hover:bg-sky-600 text-white p-0 flex items-center justify-center shadow-lg shadow-sky-500/20"
                >
                  {isPlaying ? (
                    <Pause className="w-4 h-4 fill-current" />
                  ) : (
                    <Play className="w-4 h-4 fill-current ml-0.5" />
                  )}
                </Button>

                {/* Fechar Player */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    audioRef.current?.pause();
                    setActiveAudioItem(null);
                    setIsPlaying(false);
                  }}
                  className="text-slate-400 hover:text-white h-8 w-8 p-0 rounded-full"
                >
                  ✕
                </Button>
              </div>
            </div>

            {/* Barra de Progresso */}
            <div className="flex items-center gap-2 text-[10px] text-slate-400 pt-1">
              <span>{formatTime(currentTime)}</span>
              <input
                type="range"
                min={0}
                max={duration || 100}
                value={currentTime}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setCurrentTime(val);
                  if (audioRef.current) audioRef.current.currentTime = val;
                }}
                className="flex-1 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-sky-500"
              />
              <span>{formatTime(duration)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
