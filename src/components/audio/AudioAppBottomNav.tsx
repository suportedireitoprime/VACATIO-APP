import React from 'react';
import { createPortal } from 'react-dom';
import { Heart, ListMusic, Search, ArrowDownToLine, Compass } from 'lucide-react';
import { haptic } from '@/lib/nativeHaptics';

export type AudioNavTab = 'favoritos' | 'playlists' | 'pesquisar' | 'baixados' | 'explorar';

interface AudioAppBottomNavProps {
  ativo: AudioNavTab;
  onSelect: (tab: AudioNavTab) => void;
  totalFavoritas?: number;
  totalPlaylists?: number;
  totalBaixadas?: number;
  hidden?: boolean;
}

/**
 * Menu de rodapé para as plataformas de Áudio (Áudio Aulas e Áudio Leis).
 * Idêntico ao menu de rodapé do início do aplicativo (Vade Mecum / BottomNav),
 * contendo as 5 funções solicitadas:
 * 1. Favoritos
 * 2. Playlist
 * 3. Pesquisar (Botão central vermelho FAB elevado em relevo)
 * 4. Baixados
 * 5. Explorar
 */
export const AudioAppBottomNav: React.FC<AudioAppBottomNavProps> = ({
  ativo,
  onSelect,
  totalFavoritas = 0,
  totalPlaylists = 0,
  totalBaixadas = 0,
  hidden = false,
}) => {
  const content = (
    <nav
      aria-label="Navegação de Áudio"
      role="navigation"
      data-bottom-nav
      className={`fixed bottom-0 left-0 right-0 z-[100] border-t border-white/10 bg-[#1C1C1E] backdrop-blur-md rounded-t-3xl shadow-[0_-8px_30px_rgba(0,0,0,0.6),0_-2px_10px_rgba(0,0,0,0.4)] pb-[max(0.5rem,var(--sai-bottom,env(safe-area-inset-bottom,0px)))] transition-all duration-300 ease-out select-none ${
        hidden ? 'translate-y-[140%] opacity-0 pointer-events-none' : 'translate-y-0 opacity-100 pointer-events-auto'
      }`}
    >
      {/* Degradê escuro subindo do rodapé para dar profundidade visual */}
      <div
        aria-hidden="true"
        className="absolute bottom-full left-0 right-0 h-20 bg-gradient-to-t from-black/80 via-black/30 to-transparent pointer-events-none"
      />

      <div className="relative z-10 grid grid-cols-5 items-end px-1 pt-3.5 pb-3.5 max-w-lg mx-auto">
        {/* 1. Favoritos */}
        <button
          type="button"
          onClick={() => {
            haptic.selection();
            onSelect('favoritos');
          }}
          data-track="bottom_nav_click"
          data-track-destino="favoritos"
          className={`flex flex-col items-center justify-end gap-1.5 py-1.5 transition-colors relative cursor-pointer ${
            ativo === 'favoritos' ? 'text-white' : 'text-white/80 hover:text-white'
          }`}
          aria-label="Favoritos"
        >
          <div className="relative inline-flex items-center justify-center">
            <Heart
              className={`w-7 h-7 sm:w-8 sm:h-8 transition-transform ${
                ativo === 'favoritos' ? 'scale-110 drop-shadow-md text-primary' : 'drop-shadow-sm'
              }`}
              strokeWidth={1.5}
              fill={ativo === 'favoritos' ? 'currentColor' : 'none'}
            />
            {totalFavoritas > 0 && (
              <span className="absolute -top-1.5 -right-2 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-black bg-primary text-white flex items-center justify-center border-2 border-[#1C1C1E] shadow-sm leading-none tabular-nums pointer-events-none">
                {totalFavoritas}
              </span>
            )}
          </div>
          <span
            className={`font-body text-[11px] sm:text-[12px] leading-tight text-center drop-shadow-sm ${
              ativo === 'favoritos' ? 'font-semibold text-primary' : ''
            }`}
          >
            Favoritos
          </span>
        </button>

        {/* 2. Playlist */}
        <button
          type="button"
          onClick={() => {
            haptic.selection();
            onSelect('playlists');
          }}
          data-track="bottom_nav_click"
          data-track-destino="playlists"
          className={`flex flex-col items-center justify-end gap-1.5 py-1.5 transition-colors relative cursor-pointer ${
            ativo === 'playlists' ? 'text-white' : 'text-white/80 hover:text-white'
          }`}
          aria-label="Playlist"
        >
          <div className="relative inline-flex items-center justify-center">
            <ListMusic
              className={`w-7 h-7 sm:w-8 sm:h-8 transition-transform ${
                ativo === 'playlists' ? 'scale-110 drop-shadow-md text-primary' : 'drop-shadow-sm'
              }`}
              strokeWidth={1.5}
            />
            {totalPlaylists > 0 && (
              <span className="absolute -top-1.5 -right-2.5 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-black bg-primary text-white flex items-center justify-center border-2 border-[#1C1C1E] shadow-sm leading-none tabular-nums pointer-events-none">
                {totalPlaylists}
              </span>
            )}
          </div>
          <span
            className={`font-body text-[11px] sm:text-[12px] leading-tight text-center drop-shadow-sm ${
              ativo === 'playlists' ? 'font-semibold text-primary' : ''
            }`}
          >
            Playlist
          </span>
        </button>

        {/* 3. Pesquisar (FAB centralizado em relevo idêntico ao início do app) */}
        <button
          type="button"
          onPointerDown={(e) => {
            if (e.button === 0) {
              haptic.light();
              onSelect('pesquisar');
            }
          }}
          onClick={() => {
            haptic.light();
            onSelect('pesquisar');
          }}
          data-track="bottom_nav_click"
          data-track-destino="pesquisar"
          className="relative z-[80] flex flex-col items-center justify-end gap-1.5 -mt-11 min-h-[6.25rem] min-w-[5.75rem] touch-manipulation select-none cursor-pointer"
          aria-label="Pesquisar"
        >
          <span
            className={`relative w-[4.5rem] h-[4.5rem] sm:w-20 sm:h-20 rounded-full flex items-center justify-center overflow-hidden bg-primary shadow-[0_8px_30px_rgba(0,0,0,0.6)] ring-1 ring-black/5 transition-transform fab-search-shine active:scale-95 ${
              ativo === 'pesquisar' ? 'scale-105 ring-2 ring-white/50' : ''
            }`}
          >
            <Search
              className="relative z-10 w-8 h-8 sm:w-9 sm:h-9 text-primary-foreground drop-shadow-sm"
              aria-hidden="true"
              strokeWidth={1.5}
            />
          </span>
          <span
            className={`font-body text-[11px] sm:text-[12px] leading-tight text-center drop-shadow-sm truncate px-0.5 ${
              ativo === 'pesquisar' ? 'font-bold text-white' : 'text-white'
            }`}
          >
            Pesquisar
          </span>
        </button>

        {/* 4. Baixados */}
        <button
          type="button"
          onClick={() => {
            haptic.selection();
            onSelect('baixados');
          }}
          data-track="bottom_nav_click"
          data-track-destino="baixados"
          className={`flex flex-col items-center justify-end gap-1.5 py-1.5 transition-colors relative cursor-pointer ${
            ativo === 'baixados' ? 'text-white' : 'text-white/80 hover:text-white'
          }`}
          aria-label="Baixados"
        >
          <div className="relative inline-flex items-center justify-center">
            <ArrowDownToLine
              className={`w-7 h-7 sm:w-8 sm:h-8 transition-transform ${
                ativo === 'baixados' ? 'scale-110 drop-shadow-md text-primary' : 'drop-shadow-sm'
              }`}
              strokeWidth={1.5}
            />
            {totalBaixadas > 0 && (
              <span className="absolute -top-1.5 -right-2.5 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-black bg-primary text-white flex items-center justify-center border-2 border-[#1C1C1E] shadow-sm leading-none tabular-nums pointer-events-none">
                {totalBaixadas}
              </span>
            )}
          </div>
          <span
            className={`font-body text-[11px] sm:text-[12px] leading-tight text-center drop-shadow-sm ${
              ativo === 'baixados' ? 'font-semibold text-primary' : ''
            }`}
          >
            Baixados
          </span>
        </button>

        {/* 5. Explorar */}
        <button
          type="button"
          onClick={() => {
            haptic.selection();
            onSelect('explorar');
          }}
          data-track="bottom_nav_click"
          data-track-destino="explorar"
          className={`flex flex-col items-center justify-end gap-1.5 py-1.5 transition-colors relative cursor-pointer ${
            ativo === 'explorar' ? 'text-white' : 'text-white/80 hover:text-white'
          }`}
          aria-label="Explorar"
        >
          <Compass
            className={`w-7 h-7 sm:w-8 sm:h-8 transition-transform ${
              ativo === 'explorar' ? 'scale-110 drop-shadow-md text-primary' : 'drop-shadow-sm'
            }`}
            strokeWidth={1.5}
          />
          <span
            className={`font-body text-[11px] sm:text-[12px] leading-tight text-center drop-shadow-sm ${
              ativo === 'explorar' ? 'font-semibold text-primary' : ''
            }`}
          >
            Explorar
          </span>
        </button>
      </div>
    </nav>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(content, document.body);
};

export default AudioAppBottomNav;
