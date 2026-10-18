import React from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Volume2,
  VolumeX,
  Music,
  Check,
  Sparkles,
  Sliders,
  CheckCircle2,
} from 'lucide-react';
import { BGM_TRACKS } from '@/lib/audioaulasBgm';
import { useAudioaulasPlayer } from '@/contexts/AudioaulasPlayerContext';
import { haptic } from '@/lib/nativeHaptics';

interface AudioaulasBgmModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AudioaulasBgmModal: React.FC<AudioaulasBgmModalProps> = ({ isOpen, onClose }) => {
  const {
    bgmAtivo,
    setBgmAtivo,
    bgmTrackId,
    setBgmTrackId,
    bgmVolume,
    setBgmVolume,
    salvarBgmComoPadrao,
  } = useAudioaulasPlayer();

  if (!isOpen) return null;

  const handleToggleAtivo = (novoAtivo: boolean) => {
    haptic.selection();
    setBgmAtivo(novoAtivo);
  };

  const handleSelectTrack = (trackId: string) => {
    haptic.selection();
    if (!bgmAtivo) {
      setBgmAtivo(true);
    }
    setBgmTrackId(trackId);
  };

  const handleSalvarPadrao = () => {
    haptic.notificationSuccess();
    salvarBgmComoPadrao();
    onClose();
  };

  const modalNode = (
    <AnimatePresence>
      <div className="fixed inset-0 z-[130] flex items-end sm:items-center justify-center p-0 sm:p-4 select-none">
        {/* Backdrop escurecido com blur */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/85 backdrop-blur-md"
        />

        {/* Sheet / Modal Principal */}
        <motion.div
          initial={{ y: '100%', opacity: 0.8 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0.8 }}
          transition={{ type: 'spring', damping: 28, stiffness: 280 }}
          className="relative w-full max-w-lg bg-zinc-950 border border-white/10 rounded-t-[2.2rem] sm:rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col z-10 text-white"
        >
          {/* Header estilizado */}
          <div className="p-5 sm:p-6 pb-4 border-b border-white/10 bg-gradient-to-r from-blue-950/60 via-zinc-900 to-black relative">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-600/20 border border-blue-500/40 text-blue-400 flex items-center justify-center shadow-lg">
                  <Music className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-black text-white tracking-tight flex items-center gap-2">
                    Música de Fundo (Lo-Fi)
                  </h3>
                  <p className="text-xs text-zinc-400 font-medium">
                    Ambiência para foco e retenção durante o estudo
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                aria-label="Fechar configurações"
                className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 transition flex items-center justify-center text-white border border-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Conteúdo rolável */}
          <div className="p-5 sm:p-6 space-y-5 overflow-y-auto scrollbar-none flex-1">
            {/* Switch Master: Ativar/Desativar */}
            <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                    bgmAtivo
                      ? 'bg-blue-600/30 text-blue-400 border border-blue-500/40'
                      : 'bg-zinc-800 text-zinc-400'
                  }`}
                >
                  {bgmAtivo ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Música de Fundo Ativa</h4>
                  <p className="text-xs text-zinc-400">
                    {bgmAtivo ? 'Tocando suavemente sob a aula' : 'Música de fundo pausada'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleToggleAtivo(!bgmAtivo)}
                className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
                  bgmAtivo ? 'bg-blue-600' : 'bg-zinc-800 border border-white/15'
                }`}
                role="switch"
                aria-checked={bgmAtivo}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform shadow-md ${
                    bgmAtivo ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Controle de Volume com indicador de % */}
            <div className={`p-4 rounded-2xl bg-white/[0.04] border border-white/10 space-y-3 transition-opacity ${!bgmAtivo ? 'opacity-40 pointer-events-none' : ''}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-blue-400" />
                  <span className="text-xs font-bold text-white uppercase tracking-wider">
                    Volume da Música
                  </span>
                </div>
                <span className="text-xs font-bold text-blue-400 tabular-nums px-2 py-0.5 rounded-md bg-blue-500/10 border border-blue-500/20">
                  {Math.round(bgmVolume * 100)}%
                </span>
              </div>

              <input
                type="range"
                min="0.04"
                max="0.50"
                step="0.01"
                value={bgmVolume}
                onChange={(e) => setBgmVolume(parseFloat(e.target.value))}
                className="w-full h-2 rounded-lg bg-white/10 accent-blue-500 cursor-pointer"
              />

              <div className="flex justify-between text-[10px] text-zinc-500 font-medium">
                <span>Bem Baixo (4%)</span>
                <span className="text-blue-400 font-bold">Ideal (15%-20%)</span>
                <span>Médio (50%)</span>
              </div>
            </div>

            {/* Lista das 4 Trilhas Lo-Fi */}
            <div className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                  Trilhas Disponíveis
                </span>
                <span className="text-[11px] text-zinc-500">4 faixas exclusivas</span>
              </div>

              <div className="grid grid-cols-1 gap-2.5">
                {BGM_TRACKS.map((track) => {
                  const isSelected = bgmAtivo && bgmTrackId === track.id;

                  return (
                    <button
                      key={track.id}
                      type="button"
                      onClick={() => handleSelectTrack(track.id)}
                      className={`group w-full p-3.5 rounded-2xl border text-left transition-all flex items-center justify-between gap-3 active:scale-[0.99] ${
                        isSelected
                          ? 'bg-blue-600/15 border-blue-500/50 shadow-lg shadow-blue-900/20'
                          : 'bg-white/[0.03] border-white/10 hover:border-white/20 hover:bg-white/[0.06]'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-2xl shrink-0 p-2 rounded-xl bg-white/5 border border-white/10">
                          {track.icone}
                        </span>
                        <div className="min-w-0">
                          <h4 className={`text-sm font-bold truncate leading-snug ${isSelected ? 'text-white' : 'text-zinc-200 group-hover:text-white'}`}>
                            {track.titulo}
                          </h4>
                          <p className="text-xs text-zinc-400 truncate mt-0.5">
                            {track.descricaoCurta}
                          </p>
                        </div>
                      </div>

                      <div className="shrink-0 flex items-center">
                        {isSelected ? (
                          <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-white shadow-md">
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          </div>
                        ) : (
                          <div className="w-6 h-6 rounded-full border border-white/20 group-hover:border-white/40" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Rodapé: Botão Salvar como Padrão Para Sempre */}
          <div className="p-4 sm:p-5 border-t border-white/10 bg-black/60 backdrop-blur-md flex flex-col sm:flex-row gap-2.5">
            <button
              type="button"
              onClick={handleSalvarPadrao}
              className="flex-1 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-bold text-xs sm:text-sm transition flex items-center justify-center gap-2 shadow-lg shadow-blue-900/40"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Salvar como Padrão para Sempre</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="py-3 px-4 rounded-xl bg-white/10 hover:bg-white/15 active:scale-95 text-zinc-300 font-bold text-xs sm:text-sm transition flex items-center justify-center"
            >
              Concluído
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(modalNode, document.body);
};

export default AudioaulasBgmModal;
