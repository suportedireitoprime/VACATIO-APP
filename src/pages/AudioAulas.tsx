import { useRef, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import AudioaulasBottomNav from '@/components/audioaulas/AudioaulasBottomNav';
import DesktopPageLayout from '@/components/layout/DesktopPageLayout';
import { useIsDesktop } from '@/hooks/use-desktop';
import ShapeGrid from '@/components/ui/ShapeGrid';

import { useAudioaulas } from '@/hooks/useAudioaulas';
import { AudioaulasHero } from '@/components/audioaulas/home/AudioaulasHero';
import { AudioaulasGridAreas } from '@/components/audioaulas/home/AudioaulasGridAreas';
import { AudioaulasListaAulas } from '@/components/audioaulas/home/AudioaulasListaAulas';
import { AudioaulasBuscaInput } from '@/components/audioaulas/home/AudioaulasBuscaInput';
import { AudioaulasPlayerModal } from '@/components/audioaulas/home/AudioaulasPlayerModal';

const Audioaulas = () => {
  const navigate = useNavigate();
  const { area } = useParams();
  const areaAtual = area ? decodeURIComponent(area) : null;
  const buscaRef = useRef<HTMLInputElement | null>(null);

  const isDesktop = useIsDesktop();
  const state = useAudioaulas(areaAtual);
  const [searchParams, setSearchParams] = useSearchParams();

  // Handle deep link from push notifications
  useEffect(() => {
    const playId = searchParams.get('play_id');
    if (playId && state.aulas.length > 0 && !state.loading) {
      const aulaToPlay = state.aulas.find(a => String(a.id) === String(playId));
      if (aulaToPlay) {
        state.handleTocarAula(aulaToPlay);
        // Remove play_id from url to prevent looping on reload
        setSearchParams({}, { replace: true });
      }
    }
  }, [searchParams, state.aulas, state.loading]);

  const content = (
    <div className={`w-full bg-zinc-950 text-foreground relative ${isDesktop ? 'rounded-2xl pb-12 min-h-[700px] border border-white/5 overflow-hidden' : 'min-h-screen pb-40'}`}>
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
        /* ───────── HUB DE ÁREAS ───────── */
        <AudioaulasGridAreas areas={state.areas} />
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

      {/* Navegação Inferior das Áudio Aulas */}
      <AudioaulasBottomNav
        ativo={areaAtual ? null : state.aba}
        hidden={state.aberto}
        onSelect={(t) => {
          if (areaAtual) navigate('/audioaulas');
          state.setAba(t);
          state.setAberto(false);
          if (t === 'buscar') window.setTimeout(() => buscaRef.current?.focus(), 150);
        }}
      />
      </div>
    </div>
  );

  if (isDesktop) {
    return (
      <DesktopPageLayout activeId="aprender" title={areaAtual ? `Audioaulas - ${areaAtual}` : "Audioaulas"} wide hideTabs>
        {content}
      </DesktopPageLayout>
    );
  }

  return content;
};

export default Audioaulas;
