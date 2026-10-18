import { useRef, useEffect, useState, useMemo } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Loader2, Flame, Clock, Headphones as HeadphonesIcon, Heart, Sparkles, Play, Pause } from 'lucide-react';
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
import { AudioaulasAulasFavoritas } from '@/components/audioaulas/home/AudioaulasAulasFavoritas';
import { AudioAppBottomNav } from '@/components/audio/AudioAppBottomNav';
import { AudioaulasPlaylistsView } from '@/components/audioaulas/home/AudioaulasPlaylistsView';
import { AudioaulasAreaView } from '@/components/audioaulas/area/AudioaulasAreaView';
import { audioIdOf } from '@/contexts/AudioaulasPlayerContext';
import { capaDaArea } from '@/lib/audioaulasHelper';
import { CapaOtimizada } from '@/components/audioaulas/home/CapaOtimizada';
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
        paddingBottom: isDesktop || areaAtual
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

        {areaAtual ? (
          /* ───────── TELA DA ÁREA (SEM A CAPA, SLIDE UP, CATEGORIAS/MATÉRIAS) ───────── */
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
        ) : (
          <>
            <AudioaulasHero 
              areaAtual={null}
              loading={state.loading}
              totalAulas={state.aulas.length}
              totalAreas={state.areas.length}
              totalFavoritas={state.favoritos.size}
              onFavoritos={() => state.setAba('favoritas')}
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

            {/* Aulas Favoritas em Carrossel 1:1 quando na visão Todos se houver favoritas */}
            {state.aba === 'aulas' && filtroHome === 'todos' && aulasFavoritasFiltro.length > 0 && (
              <AudioaulasAulasFavoritas
                favoritas={aulasFavoritasFiltro}
                atualId={state.atualId}
                tocando={state.tocando}
                onTocarAula={state.handleTocarAula}
                alternarFavorito={state.alternarFavorito}
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
              ) : filtroHome === 'favoritas' || filtroHome === 'recentes' ? (
                /* Cards em formato estrito 1:1 (aspect-square) para Favoritos e Recentes */
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
                  {listaFiltradaHome.map((aula) => {
                    const isThisPlaying = state.atualId === aula.id && state.tocando;
                    const isSelected = state.atualId === aula.id;
                    const isFav = state.favoritos.has(audioIdOf(aula));
                    const capa = capaDaArea(aula.area || '');

                    return (
                      <motion.div
                        key={aula.id}
                        whileHover={{ scale: 1.03, y: -3 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => state.handleTocarAula(aula)}
                        className={`group relative aspect-square rounded-2xl overflow-hidden border transition-all cursor-pointer shadow-lg select-none ${
                          isSelected
                            ? 'border-blue-500 shadow-blue-900/40 ring-2 ring-blue-500/40'
                            : 'border-white/10 hover:border-white/25 hover:shadow-xl'
                        }`}
                      >
                        <CapaOtimizada
                          src={capa}
                          alt={aula.titulo}
                          className="absolute inset-0 w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/55 to-black/15 pointer-events-none" />

                        {/* Botão Play Flutuante */}
                        <div
                          className={`absolute top-2.5 right-2.5 z-10 transition-all duration-200 ${
                            isThisPlaying
                              ? 'opacity-100 scale-100'
                              : 'opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100'
                          }`}
                        >
                          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-xl">
                            {isThisPlaying ? (
                              <Pause className="w-4 h-4 fill-current" />
                            ) : (
                              <Play className="w-4 h-4 fill-current ml-0.5" />
                            )}
                          </div>
                        </div>

                        {/* Badge reproduzindo ou botão favoritar */}
                        {isThisPlaying ? (
                          <span className="absolute top-2.5 left-2.5 z-10 px-2 py-0.5 rounded-md bg-blue-600 text-white text-[9px] font-black uppercase tracking-wider shadow-md animate-pulse">
                            Ouvindo
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              state.alternarFavorito(aula);
                            }}
                            className="absolute top-2.5 left-2.5 z-10 p-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/15 text-white hover:text-rose-400 transition-transform active:scale-90"
                            title="Favoritar"
                          >
                            <Heart className={`w-3.5 h-3.5 ${isFav ? 'fill-rose-500 text-rose-500' : 'text-white/80'}`} />
                          </button>
                        )}

                        {/* Informações da Aula no rodapé com sombra */}
                        <div className="absolute inset-x-0 bottom-0 p-3 z-10 flex flex-col justify-end min-w-0">
                          <p
                            className={`text-[12px] sm:text-[13px] font-bold leading-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)] transition-colors truncate ${
                              isSelected ? 'text-sky-300' : 'text-white group-hover:text-sky-200'
                            }`}
                          >
                            {aula.titulo}
                          </p>
                          <p
                            title={aula.tema || aula.area}
                            className="text-[10px] sm:text-[11px] text-zinc-300 font-medium leading-tight truncate drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)] mt-0.5"
                          >
                            {aula.tema || aula.area}
                          </p>
                        </div>
                      </motion.div>
                    );
                  })}
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
