import React, { useRef, useEffect, useState, useMemo, lazy, Suspense } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import DesktopPageLayout from '@/components/layout/DesktopPageLayout';
import { useIsDesktop } from '@/hooks/use-desktop';
import { useAudioaulas } from '@/hooks/useAudioaulas';
import { AudioaulasHero } from '@/components/audioaulas/home/AudioaulasHero';
import { AudioaulasCarrosselAreas } from '@/components/audioaulas/home/AudioaulasCarrosselAreas';
import { AudioaulasSecaoLegislacao } from '@/components/audioaulas/home/AudioaulasSecaoLegislacao';
import { AudioaulasListaAulas } from '@/components/audioaulas/home/AudioaulasListaAulas';
import { AudioaulasBuscaInput } from '@/components/audioaulas/home/AudioaulasBuscaInput';
import { AudioaulasCategoriasNav, type AudioaulasFiltroMenu } from '@/components/audioaulas/AudioaulasCategoriasNav';
import { AudioaulasAulasRecentes } from '@/components/audioaulas/home/AudioaulasAulasRecentes';
import { AudioaulasListaFiltradaView } from '@/components/audioaulas/home/AudioaulasListaFiltradaView';
import { AudioAppBottomNav } from '@/components/audio/AudioAppBottomNav';
import { audioIdOf } from '@/contexts/AudioaulasPlayerContext';
import { motion } from 'framer-motion';

// Componentes pesados ou secundários carregados sob demanda
const ShapeGrid = React.lazy(() => import('@/components/ui/ShapeGrid'));
const AudioaulasPlaylistsView = React.lazy(() => import('@/components/audioaulas/home/AudioaulasPlaylistsView').then(m => ({ default: m.AudioaulasPlaylistsView || m.default })));
const AudioaulasAreaView = React.lazy(() => import('@/components/audioaulas/area/AudioaulasAreaView').then(m => ({ default: m.AudioaulasAreaView || m.default })));
const AudioaulasPlayerModal = React.lazy(() => import('@/components/audioaulas/home/AudioaulasPlayerModal').then(m => ({ default: m.AudioaulasPlayerModal || m.default })));

const Audioaulas = () => {
  const navigate = useNavigate();
  const { area } = useParams();
  const areaAtual = area ? decodeURIComponent(area) : null;
  const buscaRef = useRef<HTMLInputElement | null>(null);

  const isDesktop = useIsDesktop();
  const state = useAudioaulas(areaAtual);
  const { aulas, loading, historicoRecentes, favoritos, handleTocarAula } = state;
  const [searchParams, setSearchParams] = useSearchParams();

  // Filtro de alternância superior (Todos, Em alta, Recentes, Mais Ouvidas, Favoritas)
  const [filtroHome, setFiltroHome] = useState<AudioaulasFiltroMenu>('todos');

  // Adia o ShapeGrid animado para não competir com o primeiro paint da tela
  const [mountedGrid, setMountedGrid] = useState(false);
  useEffect(() => {
    const ric = (window as any).requestIdleCallback;
    if (typeof ric === 'function') {
      const id = ric(() => setMountedGrid(true), { timeout: 1000 });
      return () => (window as any).cancelIdleCallback?.(id);
    }
    const t = setTimeout(() => setMountedGrid(true), 400);
    return () => clearTimeout(t);
  }, []);

  // Listas computadas para as opções do menu de alternância
  const aulasEmAlta = useMemo(() => {
    const destaques: typeof aulas = [];
    const mapAreas = new Map<string, number>();
    for (const a of aulas) {
      const ar = a.area || 'Geral';
      const c = mapAreas.get(ar) || 0;
      if (c < 3) {
        destaques.push(a);
        mapAreas.set(ar, c + 1);
      }
      if (destaques.length >= 24) break;
    }
    return destaques.length > 0 ? destaques : aulas.slice(0, 20);
  }, [aulas]);

  const aulasMaisOuvidas = useMemo(() => {
    return aulas.filter((a) => a.sequencia === 1 || !a.sequencia).slice(0, 25);
  }, [aulas]);

  const aulasRecentesFiltro = useMemo(() => {
    if (historicoRecentes.length > 0) return historicoRecentes;
    return aulas.slice(0, 20);
  }, [historicoRecentes, aulas]);

  const aulasFavoritasFiltro = useMemo(() => {
    return aulas.filter((a) => favoritos.has(audioIdOf(a)));
  }, [aulas, favoritos]);

  const listaFiltradaHome = useMemo(() => {
    if (filtroHome === 'em_alta') return aulasEmAlta;
    if (filtroHome === 'recentes') return aulasRecentesFiltro;
    if (filtroHome === 'mais_ouvidas') return aulasMaisOuvidas;
    if (filtroHome === 'favoritas') return aulasFavoritasFiltro;
    return [];
  }, [filtroHome, aulasEmAlta, aulasRecentesFiltro, aulasMaisOuvidas, aulasFavoritasFiltro]);

  // Handle deep link from push notifications
  useEffect(() => {
    const playId = searchParams.get('play_id');
    if (playId && aulas.length > 0 && !loading) {
      const aulaToPlay = aulas.find((a) => String(a.id) === String(playId));
      if (aulaToPlay) {
        handleTocarAula(aulaToPlay);
        // Remove play_id from url to prevent looping on reload
        setSearchParams({}, { replace: true });
      }
    }
  }, [searchParams, aulas, loading, handleTocarAula, setSearchParams]);

  const content = (
    <div
      className={`w-full bg-zinc-950 text-foreground relative ${
        isDesktop
          ? 'rounded-2xl pb-16 min-h-[700px] border border-white/5 overflow-hidden'
          : 'min-h-screen'
      }`}
      style={{
        paddingBottom: isDesktop || areaAtual
          ? undefined
          : 'calc(11rem + var(--sai-bottom, env(safe-area-inset-bottom, 0px)))',
      }}
    >
      <div className="absolute inset-0 z-0 opacity-60">
        {mountedGrid && (
          <React.Suspense fallback={null}>
            <ShapeGrid 
              speed={0.5} 
              squareSize={40}
              direction='diagonal'
              borderColor='rgba(255, 255, 255, 0.05)'
              hoverFillColor='rgba(255, 255, 255, 0.1)'
              shape='square'
              hoverTrailAmount={5}
            />
          </React.Suspense>
        )}
      </div>

      <div className="relative z-10">
        {state.gateNodes}

        {areaAtual ? (
          /* ───────── TELA DA ÁREA (SEM A CAPA, SLIDE UP, CATEGORIAS/MATÉRIAS) ───────── */
          <React.Suspense fallback={<div className="py-20 grid place-items-center"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div>}>
            <AudioaulasAreaView
              area={areaAtual}
              aulas={state.daArea}
              temas={state.temasDaArea}
              atualId={state.atualId}
              tocando={state.tocando}
              favoritos={state.favoritos}
              alternarFavorito={state.alternarFavorito}
              handleTocarAula={state.handleTocarAula}
              onVoltar={() => navigate('/audioaulas')}
            />
          </React.Suspense>
        ) : (
          <>
            <AudioaulasHero 
              areaAtual={null}
              loading={state.loading}
              totalAulas={state.aulas.length}
              totalAreas={state.areas.length}
              totalFavoritas={state.favoritos.size}
              aulasFavoritas={aulasFavoritasFiltro}
              totalRecentes={state.historicoRecentes.length}
              aulasRecentes={state.historicoRecentes}
              onLimparRecentes={state.limparRecentes}
              onTocarAula={state.handleTocarAula}
              onAlternarFavoritoAula={state.alternarFavorito}
              aulas={state.aulas}
            />

            {/* Últimas Aulas Ouvidas: antes do menu de alternância quando na visão Todos */}
            {state.aba === 'aulas' && filtroHome === 'todos' && (
              <AudioaulasAulasRecentes
                recentes={state.historicoRecentes}
                atualId={state.atualId}
                tocando={state.tocando}
                onTocarAula={state.handleTocarAula}
                onLimpar={state.limparRecentes}
              />
            )}

            {/* Menu Superior: Alternância (Todos, Em alta, Recentes, Mais Ouvidas, Favoritas) */}
            <AudioaulasCategoriasNav
              filtroAtivo={filtroHome}
              onSelectFiltro={(filtro) => {
                setFiltroHome(filtro);
                state.setAba('aulas');
              }}
              areaAtual={null}
              onVoltarParaTodos={() => {
                setFiltroHome('todos');
                navigate('/audioaulas');
              }}
            />

            {state.loading ? (
              <div className="py-20 grid place-items-center text-muted-foreground">
                <Loader2 className="h-7 w-7 animate-spin text-primary" />
              </div>
            ) : state.aba === 'aulas' ? (
          /* ───────── VISÃO PRINCIPAL DE AUDIOAULAS ───────── */
          filtroHome === 'todos' ? (
            <>
              {/* 1. Carrossel de Áreas do Direito com botão 'Ver todos' na mesma linha */}
              <AudioaulasCarrosselAreas areas={state.areas} />

              {/* 2. Categoria Legislação: Códigos, Estatutos, Súmulas e Leis Especiais */}
              <AudioaulasSecaoLegislacao
                aulas={state.aulas}
                atualId={state.atualId}
                tocando={state.tocando}
                favoritos={state.favoritos}
                alternarFavorito={state.alternarFavorito}
                handleTocarAula={state.handleTocarAula}
              />
            </>
          ) : (
            /* ───────── LISTAS FILTRADAS (Em alta / Recentes / Mais Ouvidas / Favoritas) ───────── */
            <AudioaulasListaFiltradaView
              filtroHome={filtroHome}
              lista={listaFiltradaHome}
              atualId={state.atualId}
              tocando={state.tocando}
              favoritos={state.favoritos}
              alternarFavorito={state.alternarFavorito}
              handleTocarAula={state.handleTocarAula}
            />
          )
        ) : state.aba === 'playlists' ? (
          /* ───────── PLAYLISTS DE ESTUDO ───────── */
          <React.Suspense fallback={<div className="py-20 grid place-items-center"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div>}>
            <AudioaulasPlaylistsView
              aulas={state.aulas}
              areas={state.areas}
              onSelectArea={(ar) => navigate(`/audioaulas/${encodeURIComponent(ar)}`)}
              onPlayArea={(ar) => {
                const aulasDaArea = state.aulas.filter((a) => (a.area || 'Geral') === ar);
                if (aulasDaArea.length > 0) {
                  state.handleTocarAula(aulasDaArea[0]);
                }
              }}
            />
          </React.Suspense>
        ) : (
          /* ───────── ABAS: favoritas / baixadas / buscar ───────── */
          <>
            {state.aba === 'buscar' && (
              <AudioaulasBuscaInput 
                busca={state.busca}
                setBusca={state.setBusca}
                buscaRef={buscaRef}
              />
            )}

            <AudioaulasListaAulas
              areaAtual={null}
              aba={state.aba}
              temasDaArea={state.temasDaArea}
              listaAba={state.listaAba}
              busca={state.busca}
              atualId={state.atualId}
              tocando={state.tocando}
              favoritos={state.favoritos}
              alternarFavorito={state.alternarFavorito}
              handleTocarAula={state.handleTocarAula}
            />
          </>
        )}
      </>
    )}

        {/* Player Completo Expandido — Adaptado como Modal Centralizado em Desktop */}
        {state.aberto && (
          <React.Suspense fallback={null}>
            <AudioaulasPlayerModal
              aberto={state.aberto}
              setAberto={state.setAberto}
              atual={state.atual}
              atualIdx={state.atualIdx}
              fila={state.fila}
              tempo={state.tempo}
              dur={state.dur}
              tocando={state.tocando}
              velocidade={state.velocidade}
              favoritos={state.favoritos}
              alternarFavorito={state.alternarFavorito}
              togglePlay={state.togglePlay}
              seek={state.seek}
              pular={state.pular}
              setVelocidade={state.setVelocidade}
            />
          </React.Suspense>
        )}

        {/* Menu de Rodapé Idêntico ao Início do App */}
        <AudioAppBottomNav
          ativo={
            state.aba === 'favoritas'
              ? 'favoritos'
              : state.aba === 'playlists'
              ? 'playlists'
              : state.aba === 'buscar'
              ? 'pesquisar'
              : state.aba === 'baixadas'
              ? 'baixados'
              : 'explorar'
          }
          onSelect={(tab) => {
            if (areaAtual) navigate('/audioaulas');
            state.setAberto(false);
            if (tab === 'favoritos') {
              state.setAba('favoritas');
            } else if (tab === 'playlists') {
              state.setAba('playlists');
            } else if (tab === 'pesquisar') {
              state.setAba('buscar');
              window.setTimeout(() => buscaRef.current?.focus(), 150);
            } else if (tab === 'baixados') {
              state.setAba('baixadas');
            } else {
              state.setAba('aulas');
            }
          }}
          totalFavoritas={state.favoritos.size}
          totalPlaylists={0}
          totalBaixadas={state.baixadas.size}
          hidden={Boolean(areaAtual) || state.aberto}
          colorScheme="blue"
        />
      </div>
    </div>
  );

  return isDesktop ? (
    <DesktopPageLayout activeId="aprender" title={areaAtual ? `Audioaulas - ${areaAtual}` : "Audioaulas"}>
      {content}
    </DesktopPageLayout>
  ) : (
    content
  );
};

export default Audioaulas;
