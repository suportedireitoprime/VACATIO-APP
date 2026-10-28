import { useState, useEffect, useMemo, useCallback } from 'react';
import { useGatedFeature } from '@/hooks/useGatedFeature';
import { useSubscription } from '@/hooks/useSubscription';
import { useAudioaulasPlayer, audioIdOf, type AulaAudio } from '@/contexts/AudioaulasPlayerContext';
import { listarAudiosOffline, assinarAudioOffline } from '@/lib/nativo/audioOffline';
import { normalizar, AUDIOAULAS_CATALOGO_AREAS } from '@/lib/audioaulasHelper';
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
    historicoRecentes,
    alternarFavorito,
    limparRecentes,
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

  const gateDia = useGatedFeature('audioaula_dia', 'audioaula' as any, { scope: null });
  const gateMes = useGatedFeature('audioaula_mes', 'audioaula' as any, { scope: null });

  useEffect(() => {
    let vivo = true;
    const checar = async () => {
      try {
        const itens = await listarAudiosOffline();
        if (vivo) {
          setBaixadas(new Set(itens.map((item) => item.id)));
        }
      } catch {
        /* noop */
      }
    };
    void checar();
    const off = assinarAudioOffline(() => void checar());
    return () => {
      vivo = false;
      off();
    };
  }, []);

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

    // Inicializa com todas as 22 áreas do catálogo para que todas apareçam com suas capas
    for (const item of AUDIOAULAS_CATALOGO_AREAS) {
      map.set(item.nome, 0);
    }

    // Contabiliza as aulas existentes
    for (const a of aulas) {
      const areaAula = a.area || 'Geral';
      const correspondente = AUDIOAULAS_CATALOGO_AREAS.find((item) => {
        const nCat = normalizar(item.nome);
        const nAula = normalizar(areaAula);
        if (nCat === nAula) return true;
        if (nCat.includes('filosofia') && nAula.includes('filosofia')) return true;
        if (nCat.includes('processual civil') && nAula.includes('processo civil')) return true;
        if (nCat.includes('processual penal') && nAula.includes('processo penal')) return true;
        if (nCat.includes('processual do trabalho') && nAula.includes('processo do trabalho')) return true;
        return false;
      })?.nome || areaAula;

      map.set(correspondente, (map.get(correspondente) ?? 0) + 1);
    }

    // Áreas com aulas primeiro (maior para menor), seguidas das áreas em breve na ordem alfabética
    return Array.from(map.entries()).sort((a, b) => {
      if (b[1] !== a[1]) return b[1] - a[1];
      return a[0].localeCompare(b[0], 'pt-BR');
    });
  }, [aulas]);

  const daArea = useMemo(() => {
    if (!areaAtual) return [];
    const normAlvo = normalizar(areaAtual);
    return aulas.filter((a) => {
      const normAula = normalizar(a.area || 'Geral');
      if (normAula === normAlvo) return true;
      if (normAlvo.includes('filosofia') && normAula.includes('filosofia')) return true;
      if (normAlvo.includes('penal especial') && normAula.includes('penal especial')) return true;
      if (normAlvo.includes('processual penal') && (normAula.includes('processo penal') || normAula.includes('processual penal'))) return true;
      if (normAlvo.includes('processual civil') && (normAula.includes('processo civil') || normAula.includes('processual civil'))) return true;
      if (normAlvo.includes('processual do trabalho') && (normAula.includes('processo do trabalho') || normAula.includes('processual do trabalho'))) return true;
      return false;
    });
  }, [aulas, areaAtual]);

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

  const { isPremium } = useSubscription();

  const handleTocarAula = useCallback(
    async (a: AulaAudio) => {
      if (!isPremium) {
        gateMes.openGate();
        return;
      }

      const filaAtual = areaAtual ? daArea : aba === 'aulas' ? aulas : listaAba;
      await tocar(a, filaAtual);
      setAberto(true);
    },
    [isPremium, gateMes, areaAtual, daArea, aba, aulas, listaAba, tocar, setAberto],
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
    historicoRecentes, limparRecentes,
    
    // Actions
    handleTocarAula,
    tocar: handleTocarAula,
    play: handleTocarAula,
    
    // Gating UI
    gateNodes: (
      <>
        {gateDia.gateNode}
        {gateMes.gateNode}
      </>
    )
  };
}
