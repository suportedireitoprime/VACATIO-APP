import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Volume2, GraduationCap } from 'lucide-react';

interface AudioNavigationSwitcherProps {
  active: 'leis' | 'aulas';
  className?: string;
  infiniteRight?: boolean;
}

export const AudioNavigationSwitcher: React.FC<AudioNavigationSwitcherProps> = ({
  active,
  className = '',
  infiniteRight = false,
}) => {
  const navigate = useNavigate();

  return (
    <div
      className={`flex items-center p-1 bg-white/5 border border-white/10 shrink-0 backdrop-blur-md shadow-lg ${
        infiniteRight
          ? 'rounded-l-2xl rounded-r-none border-r-0 pr-4 sm:pr-6 pl-1.5'
          : 'rounded-2xl'
      } ${className}`}
    >
      <button
        type="button"
        onClick={() => navigate('/audio-leis')}
        className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
          active === 'leis'
            ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20'
            : 'text-zinc-400 hover:text-white hover:bg-white/5'
        }`}
      >
        <Volume2 className="w-3.5 h-3.5" />
        <span>Áudio Leis</span>
      </button>

      <button
        type="button"
        onClick={() => navigate('/audioaulas')}
        className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
          active === 'aulas'
            ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20'
            : 'text-zinc-400 hover:text-white hover:bg-white/5'
        }`}
      >
        <GraduationCap className="w-3.5 h-3.5" />
        <span>Áudio Aulas</span>
      </button>
    </div>
  );
};

export default AudioNavigationSwitcher;
