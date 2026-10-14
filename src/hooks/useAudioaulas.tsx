import { useState, useEffect, useMemo, useCallback } from 'react';
import { useGatedFeature } from '@/hooks/useGatedFeature';
import { useAudioaulasPlayer, audioIdOf, type AulaAudio } from '@/contexts/AudioaulasPlayerContext';
import { estaBaixado, assinarAudioOffline } from '@/lib/nativo/audioOffline';
import { normalizar } from '@/lib/audioaulasHelper';
import { type AudioaulasTab } from '@/components/audioaulas/AudioaulasBottomNav';

export function useAudioaulas(areaAtual: string | null) {
  const {
    aulas,
    loading,
    atualId,
    atual,
    atualIdx,
    tocando,
    tempo,
    dur,
    velocidade,
    aberto,
    fila,
    favoritos,
    alternarFavorito,
    setAberto,
    tocar,
    togglePlay,
    pular,
    seek,
    setVelocidade,
  } = useAudioaulasPlayer();

  const [baixadas, setBaixadas] = useState<Set<string>>(new Set());
  const [aba, setAba] = useState<AudioaulasTab>('aulas');
  const [busca, setBusca] = useState('');

  const gateDia = useGatedFeature('audioaula_dia', 'audioaula', { scope: null });
  const gateMes = useGatedFeature('audioaula_mes', 'audioaula', { scope: null });

  useEffect(() => {
    let vivo = true;
    const checar = async () => {
      const ids = await Promise.all(
        aulas.map(async (a) => ((await estaBaixado(audioIdOf(a))) ? audioIdOf(a) : null)),
      );
      if (vivo) setBaixadas(new Set(ids.filter(Boolean) as string[]));
    };
    void checar();
    const off = assinarAudioOffline(() => void checar());
    return () => {
      vivo = false;
      off();
    };
  }, [aulas]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toUpperCase();
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable) {
        return;
      }
      if (e.key === 'Escape' && aberto) {
        e.preventDefault();
        setAberto(false);
      } else if (e.key === ' ' && atual) {
        e.preventDefault();
        togglePlay();
      } else if (e.key === 'ArrowLeft' && atual) {
        e.preventDefault();
        seek(Math.max(0, tempo - 15));
      } else if (e.key === 'ArrowRight' && atual) {
        e.preventDefault();
        seek(Math.min(dur, tempo + 15));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [aberto, atual, setAberto, togglePlay, seek, tempo, dur]);

  const areas = useMemo(() => {
    const map = new Map<string, number>();
    for (const a of aulas) {
      const nome = a.area || 'Geral';
      map.set(nome, (map.get(nome) ?? 0) + 1);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0], 'pt-BR'));
  }, [aulas]);

  const daArea = useMemo(
    () => (areaAtual ? aulas.filter((a) => (a.area || 'Geral') === areaAtual) : []),
    [aulas, areaAtual],
  );

  const temasDaArea = useMemo(() => {
    const map = new Map<string, AulaAudio[]>();
    for (const a of daArea) {
      const tema = a.tema || 'Aulas';
      map.set(tema, [...(map.get(tema) ?? []), a]);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0], 'pt-BR'));
  }, [daArea]);

  const listaAba = useMemo(() => {
    if (aba === 'favoritas') return aulas.filter((a) => favoritos.has(audioIdOf(a)));
    if (aba === 'baixadas') return aulas.filter((a) => baixadas.has(audioIdOf(a)));
    if (aba === 'buscar') {
      const q = normalizar(busca);
      if (!q) return [];
      return aulas.filter((a) =>
        [a.titulo, a.descricao, a.tema, a.area].some((c) => normalizar(String(c ?? '')).includes(q)),
      );
    }
    return [];
  }, [aba, aulas, favoritos, baixadas, busca]);

  const handleTocarAula = useCallback(
    async (a: AulaAudio) => {
      if (gateMes.blocked) {
        gateMes.openGate();
        return;
      }
      if (gateDia.blocked) {
        gateDia.openGate();
        return;
      }
      void gateDia.run();
      void gateMes.run();

      const filaAtual = areaAtual ? daArea : aba === 'aulas' ? aulas : listaAba;
      await tocar(a, filaAtual);
      setAberto(true);
    },
    [gateDia, gateMes, areaAtual, daArea, aba, aulas, listaAba, tocar, setAberto],
  );

  return {
    // State
    aba, setAba,
    busca, setBusca,
    
    // Player
    aulas, loading, atualId, atual, atualIdx, tocando, tempo, dur,
    velocidade, aberto, fila, setAberto, togglePlay, pular, seek, setVelocidade,
    
    // Data lists
    areas, daArea, temasDaArea, listaAba,
    
    // Status
    favoritos, alternarFavorito, baixadas,
    
    // Actions
    handleTocarAula,
    
    // Gating UI
    gateNodes: (
      <>
        {gateDia.gateNode}
        {gateMes.gateNode}
      </>
    )
  };
}
