import { useRef, useEffect, useState, useMemo } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Loader2, Flame, Clock, Headphones as HeadphonesIcon, Heart, Sparkles } from 'lucide-react';
import DesktopPageLayout from '@/components/layout/DesktopPageLayout';
import { useIsDesktop } from '@/hooks/use-desktop';
import ShapeGrid from '@/components/ui/ShapeGrid';

import { useAudioaulas } from '@/hooks/useAudioaulas';
import { AudioaulasHero } from '@/components/audioaulas/home/AudioaulasHero';
import { AudioaulasCarrosselAreas } from '@/components/audioaulas/home/AudioaulasCarrosselAreas';
import { AudioaulasSecaoLegislacao } from '@/components/audioaulas/home/AudioaulasSecaoLegislacao';
import { AudioaulasListaAulas, LinhaAula } from '@/components/audioaulas/home/AudioaulasListaAulas';
import { AudioaulasBuscaInput } from '@/components/audioaulas/home/AudioaulasBuscaInput';
import { AudioaulasPlayerModal } from '@/components/audioaulas/home/AudioaulasPlayerModal';
import { AudioaulasCategoriasNav, type AudioaulasFiltroMenu } from '@/components/audioaulas/AudioaulasCategoriasNav';
import { AudioaulasAulasRecentes } from '@/components/audioaulas/home/AudioaulasAulasRecentes';
import { AudioAppBottomNav } from '@/components/audio/AudioAppBottomNav';
import { AudioaulasPlaylistsView } from '@/components/audioaulas/home/AudioaulasPlaylistsView';
import { audioIdOf } from '@/contexts/AudioaulasPlayerContext';
import { motion } from 'framer-motion';

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
        paddingBottom: isDesktop
          ? undefined
          : 'calc(11rem + var(--sai-bottom, env(safe-area-inset-bottom, 0px)))',
      }}
    >
      <div className="absolute inset-0 z-0 opacity-60">
        <ShapeGrid 
          speed={0.5} 
          squareSize={40}
          direction='diagonal'
          borderColor='rgba(255, 255, 255, 0.05)'
          hoverFillColor='rgba(255, 255, 255, 0.1)'
          shape='square'
          hoverTrailAmount={5}
        />
      </div>

      <div className="relative z-10">
        {state.gateNodes}

        <AudioaulasHero 
          areaAtual={areaAtual}
          loading={state.loading}
          totalAulas={areaAtual ? state.daArea.length : state.aulas.length}
          totalAreas={state.areas.length}
          totalFavoritas={state.favoritos.size}
          onFavoritos={() => state.setAba('favoritas')}
        />

        {/* Últimas Aulas Ouvidas: antes do menu de alternância quando na visão Todos */}
        {!areaAtual && state.aba === 'aulas' && filtroHome === 'todos' && (
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
            if (areaAtual) navigate('/audioaulas');
          }}
          areaAtual={areaAtual}
          onVoltarParaTodos={() => {
            setFiltroHome('todos');
            navigate('/audioaulas');
          }}
        />

        {state.loading ? (
          <div className="py-20 grid place-items-center text-muted-foreground">
            <Loader2 className="h-7 w-7 animate-spin text-primary" />
          </div>
        ) : areaAtual ? (
          /* ───────── LISTA DA ÁREA ───────── */
          <AudioaulasListaAulas
            areaAtual={areaAtual}
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
            <div className="mx-auto w-full max-w-[1400px] px-4 space-y-4 mt-2 lg:px-10 2xl:max-w-[1600px]">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h2 className="font-card text-lg sm:text-xl font-extrabold text-white flex items-center gap-2.5 tracking-normal">
                    <span className="w-1.5 h-6 rounded-full bg-blue-500 shrink-0" />
                    {filtroHome === 'em_alta' && <Flame className="w-5 h-5 text-amber-500" />}
                    {filtroHome === 'recentes' && <Clock className="w-5 h-5 text-blue-400" />}
                    {filtroHome === 'mais_ouvidas' && <HeadphonesIcon className="w-5 h-5 text-purple-400" />}
                    {filtroHome === 'favoritas' && <Heart className="w-5 h-5 text-rose-500 fill-rose-500" />}
                    <span>
                      {filtroHome === 'em_alta'
                        ? 'Aulas Em Alta'
                        : filtroHome === 'recentes'
                        ? 'Aulas Recentes'
                        : filtroHome === 'mais_ouvidas'
                        ? 'Mais Ouvidas'
                        : 'Aulas Favoritas'}
                    </span>
                  </h2>
                  <p className="text-xs sm:text-sm text-zinc-400 mt-0.5">
                    {filtroHome === 'em_alta'
                      ? 'Temas mais populares e relevantes para concursos e OAB.'
                      : filtroHome === 'recentes'
                      ? 'Histórico das últimas aulas acessadas na plataforma.'
                      : filtroHome === 'mais_ouvidas'
                      ? 'Aulas mais reproduzidas e fundamentais do acervo.'
                      : `${listaFiltradaHome.length} aulas salvas no seu acervo pessoal.`}
                  </p>
                </div>
              </div>

              {listaFiltradaHome.length === 0 ? (
                <div className="py-16 text-center text-sm text-muted-foreground bg-white/[0.02] border border-white/[0.05] rounded-2xl">
                  {filtroHome === 'favoritas'
                    ? 'Nenhuma aula favoritada ainda. Toque no coração de uma aula para salvá-la aqui.'
                    : 'Nenhuma aula disponível neste filtro.'}
                </div>
              ) : (
                <motion.div
                  className="rounded-2xl bg-white/[0.02] border border-white/[0.05] p-2 divide-y divide-white/[0.06] lg:grid lg:grid-cols-2 lg:divide-y-0 lg:gap-2 2xl:grid-cols-3"
                  initial="hidden"
                  animate="show"
                  variants={{
                    hidden: { opacity: 0 },
                    show: { opacity: 1, transition: { staggerChildren: 0.04 } }
                  }}
                >
                  {listaFiltradaHome.map((a, i) => (
                    <LinhaAula
                      key={a.id}
                      a={a}
                      indice={i + 1}
                      atualId={state.atualId}
                      tocando={state.tocando}
                      favoritos={state.favoritos}
                      alternarFavorito={state.alternarFavorito}
                      handleTocarAula={state.handleTocarAula}
                    />
                  ))}
                </motion.div>
              )}
            </div>
          )
        ) : state.aba === 'playlists' ? (
          /* ───────── PLAYLISTS DE ESTUDO ───────── */
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

        {/* Player Completo Expandido — Adaptado como Modal Centralizado em Desktop */}
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
          totalPlaylists={state.areas.length}
          totalBaixadas={state.baixadas.size}
          hidden={state.aberto}
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
