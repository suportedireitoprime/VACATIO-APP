import { useNavigate } from 'react-router-dom';
import { ArrowLeft, HardDrive } from 'lucide-react';
import { haptic } from '@/lib/nativeHaptics';
import BibliotecaActionShortcuts from './BibliotecaActionShortcuts';
import HeroMotifs from '@/components/vademecum/home/HeroMotifs';
import { motion, AnimatePresence } from 'framer-motion';
import { useTotalLivrosCount } from '@/hooks/useTotalLivrosCount';

import bibliotecaCoverImg from '@/assets/biblioteca-cover.jpg';

interface Props {
  onBuscar?: () => void;
  children?: React.ReactNode;
}

const BibliotecaHero = ({ children }: Props) => {
  const navigate = useNavigate();
  const { data: totalCount = 2000, isLoading } = useTotalLivrosCount();

  return (
    <div
      className="bg-hero-panel relative overflow-hidden rounded-b-[36px] shadow-2xl shadow-black/60 pt-[var(--sai-top)] flex flex-col z-20"
      style={{
        transform: 'translateZ(0)',
        backgroundColor: '#050505',
      }}
    >
      {/* Blindagem de overscroll superior contra vazamento do fundo */}
      <div
        className="pointer-events-none absolute -top-[1200px] left-0 right-0 h-[1200px] z-0"
        style={{ backgroundColor: '#050505' }}
        aria-hidden="true"
      />

      {/* Imagem de Fundo */}
      <AnimatePresence>
        <motion.img
          key="biblioteca-cover"
          src={bibliotecaCoverImg}
          alt="Biblioteca Jurídica"
          initial={{ opacity: 0, scale: 1.03 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.2 }}
          className="absolute inset-0 w-full h-full object-cover object-[32%_center] md:object-center z-0 pointer-events-none opacity-50"
        />
      </AnimatePresence>

      {/* Overlay vermelho com gradiente estilo menu e sombra */}
      <div 
        className="absolute inset-0 z-[1] pointer-events-none"
        style={{ filter: 'drop-shadow(25px 0 25px rgba(0,0,0,0.8)) drop-shadow(8px 0 10px rgba(0,0,0,0.95))' }}
      >
        <div 
          className="absolute inset-0 overflow-hidden"
          style={{ clipPath: 'polygon(0 0, 47% 0, 36% 100%, 0% 100%)' }}
        >
          <div className="absolute inset-0 bg-hero-panel" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,180,180,0.15),transparent_80%)]" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

          <HeroMotifs />

          {/* Grid Pattern Background */}
          <div className="absolute inset-0 opacity-10" style={{
            backgroundImage: 'radial-gradient(rgba(255, 255, 255, 0.4) 1px, transparent 1px)',
            backgroundSize: '24px 24px'
          }} />
        </div>
      </div>

      {/* Botões do topo absolutos */}
      <header className="absolute top-0 right-0 left-0 z-30 pt-[calc(0.75rem+var(--sai-top,env(safe-area-inset-top,0px)))] pointer-events-none">
        <div className="pointer-events-auto px-4 pb-2 pt-2 flex items-center justify-between">
          <button
            onClick={() => { haptic.selection(); navigate('/'); }}
            aria-label="Voltar"
            className="grid w-12 h-12 sm:w-[52px] sm:h-[52px] shrink-0 place-items-center rounded-full bg-black/40 border border-white/10 text-white backdrop-blur-md transition-colors hover:bg-black/60 active:opacity-70"
          >
            <ArrowLeft className="w-6 h-6 sm:w-7 sm:h-7" strokeWidth={2.4} />
          </button>
          <button
            onClick={() => { haptic.selection(); navigate('/biblioteca-offline'); }}
            aria-label="Armazenamento Offline"
            className="grid w-12 h-12 sm:w-[52px] sm:h-[52px] shrink-0 place-items-center rounded-full bg-black/40 border border-white/10 text-white backdrop-blur-md transition-colors hover:bg-black/60 active:opacity-70"
          >
            <HardDrive className="w-6 h-6 sm:w-7 sm:h-7" strokeWidth={2.4} />
          </button>
        </div>
      </header>

      {/* Conteúdo idêntico à altura da Home (Textos animando) */}
      <div className="relative z-10 pt-8 sm:pt-10 flex-1 flex flex-col justify-start min-h-[100px]">
        <div className="flex flex-col items-center text-center gap-1 z-[10] relative w-[52%] max-w-[220px] ml-2 sm:ml-4">
          <div className="h-[65px] mb-1 w-full" />
          
          <div className="h-[90px] w-full flex flex-col items-center">
            <AnimatePresence mode="wait">
              <motion.div
                key="biblioteca-hero"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.6 }}
                className="flex flex-col items-center w-full"
              >
                <h1 className="font-serif italic text-white text-[16px] sm:text-[18px] leading-[1.05] font-semibold tracking-tight drop-shadow-[0_2px_6px_rgba(0,0,0,0.55)] whitespace-nowrap">
                  Biblioteca Jurídica
                </h1>
                
                <div className="mt-2 flex items-center text-left gap-2 w-full justify-center">
                  <div className="w-[2px] h-auto self-stretch bg-white/40 rounded-full shrink-0 min-h-[24px]" />
                  <p className="font-serif italic text-white/90 text-[11px] sm:text-[12px] leading-snug drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                    Acervo permanente com <span className="text-amber-400 font-bold not-italic">+{isLoading ? '...' : totalCount} livros</span> ao seu dispor.
                  </p>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>

      <div className="relative z-10 px-3 sm:px-5 pt-3 pb-5">
        <BibliotecaActionShortcuts />
      </div>

      {children && (
        <div className="relative z-10 px-4 sm:px-6 w-full pb-5">
          {children}
        </div>
      )}
    </div>
  );
};

export default BibliotecaHero;
