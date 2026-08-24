import { useState } from 'react';
import { motion } from 'framer-motion';
import { Eraser, Palette } from 'lucide-react';
import { HexColorPicker } from 'react-colorful';
import { HIGHLIGHT_COLORS } from '@/hooks/useHighlights';
import { haptic } from '@/lib/nativeHaptics';

interface HighlightColorBarProps {
  selectedColor: string;
  onSelectColor: (color: string) => void;
  onClearAll: () => void;
}

function hexToRgba(hex: string, alpha = 0.6): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

const HighlightColorBar = ({ selectedColor, onSelectColor, onClearAll }: HighlightColorBarProps) => {
  const [showPicker, setShowPicker] = useState(false);
  const [customHex, setCustomHex] = useState('#6366f1');

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="mx-5 mb-2 space-y-2"
    >
      <div className="flex items-center gap-2 bg-secondary/60 rounded-xl px-3 py-2">
        <span className="text-muted-foreground text-xs mr-1">Cor:</span>
        {HIGHLIGHT_COLORS.map((c) => (
          <button
            key={c.value}
            onClick={() => { haptic.light(); onSelectColor(c.value); }}
            className={`w-7 h-7 rounded-full border-2 transition-all ${
              selectedColor === c.value ? 'border-foreground scale-110' : 'border-transparent'
            }`}
            style={{ backgroundColor: c.value.replace('0.6', '0.9') }}
            title={c.name}
          />
        ))}
        <button
          onClick={() => setShowPicker(!showPicker)}
          className={`w-7 h-7 rounded-full border-2 transition-all flex items-center justify-center ${showPicker ? 'border-foreground' : 'border-transparent'} bg-muted`}
          title="Cor personalizada"
        >
          <Palette className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
        <div className="w-px h-5 bg-border mx-1" />
        <button
          onClick={onClearAll}
          className="p-1.5 rounded-full hover:bg-destructive/20 transition-colors"
          title="Apagar todos os grifos"
        >
          <Eraser className="w-4 h-4 text-muted-foreground hover:text-destructive" />
        </button>
      </div>

      {showPicker && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="bg-secondary/60 rounded-xl p-3 flex flex-col items-center gap-2"
        >
          <HexColorPicker color={customHex} onChange={setCustomHex} style={{ width: '100%', height: 120 }} />
          <button
            onClick={() => { onSelectColor(hexToRgba(customHex)); setShowPicker(false); }}
            className="px-4 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold"
          >
            Usar esta cor
          </button>
        </motion.div>
      )}
    </motion.div>
  );
};

export default HighlightColorBar;
