import { useLocation, useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { Layers, BookMarked, Search, Scale, Mic } from 'lucide-react';
import { haptic } from '@/lib/nativeHaptics';

export type BibliotecaAtalhoTab = 'leitura' | 'favoritos' | 'recentes' | 'offline' | 'trilhas';

/** Abre um dos painéis da BibliotecaAtalhosBar (Leitura, Favoritos, Recentes, Offline). */
export function abrirAtalhoBiblioteca(tab: BibliotecaAtalhoTab) {
  window.dispatchEvent(new CustomEvent('biblioteca-atalho', { detail: { tab } }));
}

/**
 * Menu de rodapé da Biblioteca idêntico ao menu de rodapé do início do aplicativo (Vade Mecum),
 * contendo as 5 funções solicitadas:
 * 1. Áreas do Direito
 * 2. Clássicos do Direito
 * 3. Pesquisar (FAB centralizado em relevo)
 * 4. OAB
 * 5. Oratória
 */
const BibliotecaBottomNav = ({ hidden = false }: { hidden?: boolean }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const path = location.pathname;

  const isAreas = path.includes('/bibliotecas/areas');
  const isClassicos = path.includes('/bibliotecas/classicos');
  const isOab = path.includes('/bibliotecas/oab');
  const isOratoria = path.includes('/bibliotecas/oratoria');

  const handleSearch = () => {
    haptic.light();
    window.dispatchEvent(new CustomEvent('biblioteca-abrir-pesquisa'));
  };

  const content = (
    <nav
      aria-label="Navegação da Biblioteca"
      role="navigation"
      data-bottom-nav
      className={`fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 bg-[#1C1C1E] backdrop-blur-md rounded-t-3xl shadow-[0_-8px_30px_rgba(0,0,0,0.6),0_-2px_10px_rgba(0,0,0,0.4)] pb-[var(--sai-bottom,0px)] md:bottom-6 md:left-1/2 md:right-auto md:-translate-x-1/2 md:w-[480px] md:max-w-[90vw] md:rounded-full md:border md:border-white/15 md:pb-0 md:shadow-[0_16px_40px_rgba(0,0,0,0.7),0_0_0_1px_rgba(255,255,255,0.08)] transition-all duration-300 ease-out ${
        hidden ? 'translate-y-[140%] opacity-0 pointer-events-none' : 'translate-y-0 opacity-100 pointer-events-auto'
      }`}
    >
      {/* Degradê escuro subindo do rodapé para dar profundidade */}
      <div
        aria-hidden="true"
        className="absolute bottom-full left-0 right-0 h-20 bg-gradient-to-t from-black/80 via-black/30 to-transparent pointer-events-none md:hidden"
      />

      <div className="relative z-10 grid grid-cols-5 items-end px-1 pt-3.5 pb-3.5 md:pt-2 md:pb-2 max-w-lg mx-auto">
        {/* 1. Áreas do Direito */}
        <button
          type="button"
          onClick={() => {
            haptic.selection();
            navigate('/bibliotecas/areas');
          }}
          data-track="bottom_nav_click"
          data-track-destino="areas"
          className={`flex flex-col items-center justify-end gap-1.5 py-1.5 transition-colors relative cursor-pointer ${
            isAreas ? 'text-white' : 'text-white/80 hover:text-white'
          }`}
          aria-label="Áreas do Direito"
        >
          <Layers
            className={`w-7 h-7 sm:w-8 sm:h-8 transition-transform ${
              isAreas ? 'scale-110 drop-shadow-md text-primary' : 'drop-shadow-sm'
            }`}
            strokeWidth={1.5}
          />
          <span className={`font-body text-[11px] sm:text-[12px] leading-tight text-center drop-shadow-sm ${isAreas ? 'font-semibold text-primary' : ''}`}>
            Áreas
          </span>
        </button>

        {/* 2. Clássicos do Direito */}
        <button
          type="button"
          onClick={() => {
            haptic.selection();
            navigate('/bibliotecas/classicos');
          }}
          data-track="bottom_nav_click"
          data-track-destino="classicos"
          className={`flex flex-col items-center justify-end gap-1.5 py-1.5 transition-colors relative cursor-pointer ${
            isClassicos ? 'text-white' : 'text-white/80 hover:text-white'
          }`}
          aria-label="Clássicos do Direito"
        >
          <BookMarked
            className={`w-7 h-7 sm:w-8 sm:h-8 transition-transform ${
              isClassicos ? 'scale-110 drop-shadow-md text-primary' : 'drop-shadow-sm'
            }`}
            strokeWidth={1.5}
          />
          <span className={`font-body text-[11px] sm:text-[12px] leading-tight text-center drop-shadow-sm ${isClassicos ? 'font-semibold text-primary' : ''}`}>
            Clássicos
          </span>
        </button>

        {/* 3. Pesquisar (FAB centralizado em relevo idêntico ao início do app) */}
        <button
          type="button"
          onPointerDown={(e) => {
            if (e.button === 0) handleSearch();
          }}
          onClick={handleSearch}
          data-track="bottom_nav_click"
          data-track-destino="pesquisar_biblioteca"
          className="relative z-[80] flex flex-col items-center justify-end gap-1.5 -mt-11 min-h-[6.25rem] min-w-[5.75rem] touch-manipulation select-none cursor-pointer"
          aria-label="Pesquisar na Biblioteca"
        >
          <span className="relative w-[4.5rem] h-[4.5rem] sm:w-20 sm:h-20 rounded-full flex items-center justify-center overflow-hidden bg-primary shadow-[0_8px_30px_rgba(0,0,0,0.6)] ring-1 ring-black/5 transition-transform fab-search-shine active:scale-95">
            <Search
              className="relative z-10 w-8 h-8 sm:w-9 sm:h-9 text-primary-foreground drop-shadow-sm"
              aria-hidden="true"
              strokeWidth={1.5}
            />
          </span>
          <span className="font-body text-[11px] sm:text-[12px] leading-tight text-center text-white drop-shadow-sm truncate px-0.5">
            Pesquisar
          </span>
        </button>

        {/* 4. OAB */}
        <button
          type="button"
          onClick={() => {
            haptic.selection();
            navigate('/bibliotecas/oab');
          }}
          data-track="bottom_nav_click"
          data-track-destino="oab"
          className={`flex flex-col items-center justify-end gap-1.5 py-1.5 transition-colors relative cursor-pointer ${
            isOab ? 'text-white' : 'text-white/80 hover:text-white'
          }`}
          aria-label="OAB"
        >
          <Scale
            className={`w-7 h-7 sm:w-8 sm:h-8 transition-transform ${
              isOab ? 'scale-110 drop-shadow-md text-primary' : 'drop-shadow-sm'
            }`}
            strokeWidth={1.5}
          />
          <span className={`font-body text-[11px] sm:text-[12px] leading-tight text-center drop-shadow-sm ${isOab ? 'font-semibold text-primary' : ''}`}>
            OAB
          </span>
        </button>

        {/* 5. Oratória */}
        <button
          type="button"
          onClick={() => {
            haptic.selection();
            navigate('/bibliotecas/oratoria');
          }}
          data-track="bottom_nav_click"
          data-track-destino="oratoria"
          className={`flex flex-col items-center justify-end gap-1.5 py-1.5 transition-colors relative cursor-pointer ${
            isOratoria ? 'text-white' : 'text-white/80 hover:text-white'
          }`}
          aria-label="Oratória"
        >
          <Mic
            className={`w-7 h-7 sm:w-8 sm:h-8 transition-transform ${
              isOratoria ? 'scale-110 drop-shadow-md text-primary' : 'drop-shadow-sm'
            }`}
            strokeWidth={1.5}
          />
          <span className={`font-body text-[11px] sm:text-[12px] leading-tight text-center drop-shadow-sm ${isOratoria ? 'font-semibold text-primary' : ''}`}>
            Oratória
          </span>
        </button>
      </div>
    </nav>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(content, document.body);
};

export default BibliotecaBottomNav;
