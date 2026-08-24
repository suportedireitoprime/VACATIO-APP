import { useState } from 'react';
import {
  ChevronRight,
  Landmark,
  Scale,
  ScrollText,
  Gavel,
  Columns3,
  Stamp,
  Clock,
  type LucideIcon,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import JurisprudenciaSheet from './JurisprudenciaSheet';

interface Categoria {
  id: string;
  tag: string;
  label: string;
  sublabel: string;
  icon: LucideIcon;
  bg: string;
  fg: string;
}

/** Cinza padrão para as capas escuras — ícone amarelo vívido */
const GRAY_BG = '#2a2a2a';
const GRAY_FG = '#FFD400';
/** Amarelo padrão do app (mesmo tom da CF88 anterior) */
const YELLOW_BG = '#FFCC00';
const YELLOW_FG = '#1a1200';

const CATEGORIAS_FOCO: Categoria[] = [
  { id: 'constituicao', tag: 'LEI MAIOR', label: 'CONSTITUIÇÃO', sublabel: 'Constituição Federal de 1988',
    icon: Landmark, bg: GRAY_BG, fg: GRAY_FG },
  { id: 'codigo', tag: 'CÓDIGOS', label: 'CÓDIGOS', sublabel: 'Civil, Penal, Processo e mais',
    icon: Scale, bg: GRAY_BG, fg: GRAY_FG },
  { id: 'estatuto', tag: 'ESTATUTOS', label: 'ESTATUTOS', sublabel: 'ECA, Idoso, OAB e outros',
    icon: ScrollText, bg: GRAY_BG, fg: GRAY_FG },
  { id: 'jurisprudencia', tag: 'JURISPRUDÊNCIA', label: 'JURISPRUDÊNCIA', sublabel: 'Súmulas do STF, STJ e Vinculantes',
    icon: Gavel, bg: YELLOW_BG, fg: YELLOW_FG },
];

const CATEGORIAS_DEMAIS: Categoria[] = [
  { id: 'lei-ordinaria', tag: 'ORDINÁRIAS', label: 'LEIS ORDINÁRIAS', sublabel: 'Legislação federal complementar',
    icon: Columns3, bg: GRAY_BG, fg: GRAY_FG },
  { id: 'decreto', tag: 'DECRETOS', label: 'DECRETOS', sublabel: 'Regulamentos do Executivo',
    icon: Stamp, bg: GRAY_BG, fg: GRAY_FG },
  { id: 'lei-especial', tag: 'ESPECIAIS', label: 'LEIS ESPECIAIS', sublabel: 'Penais, civis e administrativas',
    icon: Scale, bg: GRAY_BG, fg: GRAY_FG },
  { id: 'previdenciario', tag: 'PREVIDÊNCIA', label: 'PREVIDENCIÁRIO', sublabel: 'Benefícios e custeio',
    icon: Clock, bg: GRAY_BG, fg: GRAY_FG },
];

interface CategoriasGridProps {
  onSelect?: (id: string) => void;
}

const CategoriasGrid = ({ onSelect }: CategoriasGridProps) => {
  const navigate = useNavigate();
  const [jurisprudenciaOpen, setJurisprudenciaOpen] = useState(false);

  const handleCardClick = (id: string) => {
    if (id === 'jurisprudencia') {
      navigate('/jurisprudencia');
      return;
    }
    navigate(`/legislacao/${id}`);
  };


  const renderList = (items: Categoria[]) => (
    <div className="flex flex-col gap-4 lg:gap-2.5">
      {items.map((cat, i) => (
        <motion.button
          key={cat.id}
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.05, type: 'spring', stiffness: 280, damping: 22 }}
          onClick={() => handleCardClick(cat.id)}
          className="group relative flex items-center gap-3 sm:gap-4 pr-3 sm:pr-4 rounded-2xl bg-card/40 border border-border/60 hover:border-primary/40 active:scale-[0.98] transition-all text-left overflow-hidden"
        >
          {/* Icon tile — mais denso em desktop (lg+) sem quebrar toque no mobile */}
          <div
            className="relative w-[78px] h-[82px] sm:w-[92px] sm:h-[92px] lg:w-[68px] lg:h-[68px] shrink-0 overflow-hidden rounded-l-2xl flex items-center justify-center"
            style={{ backgroundColor: cat.bg }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-white/15 via-transparent to-black/25 pointer-events-none" />
            <div className="absolute -top-6 -right-6 w-16 h-16 rounded-full bg-white/10 blur-xl pointer-events-none" />
            <cat.icon
              className="relative w-10 h-10 sm:w-11 sm:h-11 lg:w-8 lg:h-8 drop-shadow-[0_2px_6px_rgba(255,212,0,0.35)]"
              strokeWidth={2}
              style={{ color: cat.fg }}
            />
            <span className="absolute left-1.5 bottom-1.5 px-1.5 py-0.5 rounded-sm bg-black/50 backdrop-blur-sm text-white text-[8px] sm:text-[9px] lg:text-[8px] font-body font-bold tracking-wider">
              {cat.tag}
            </span>
          </div>
          {/* Text */}
          <div className="flex-1 min-w-0 py-3.5 sm:py-4 lg:py-2.5">
            <p className="font-display text-[13px] sm:text-[15px] lg:text-[13px] font-bold text-foreground leading-tight tracking-wide">{cat.label}</p>
            <p className="font-body text-[11px] sm:text-[13px] lg:text-[12px] text-muted-foreground leading-snug mt-1 sm:mt-1.5 lg:mt-0.5 line-clamp-2">{cat.sublabel}</p>
          </div>
          {/* Arrow */}
          <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-8 lg:h-8 rounded-full bg-muted/60 border border-border/60 flex items-center justify-center shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
            <ChevronRight className="w-4 h-4 sm:w-[18px] sm:h-[18px] lg:w-4 lg:h-4" />
          </div>

        </motion.button>
      ))}
    </div>
  );

  return (
    <>
      <div className="space-y-8">
        <div>
          <div className="mb-4 px-1">
            <h2 className="font-display text-[17px] sm:text-lg text-foreground font-bold leading-tight tracking-wide">LEGISLAÇÃO</h2>
            <p className="text-muted-foreground text-[11px] sm:text-xs font-body mt-0.5">Foco — as mais consultadas</p>
          </div>
          {renderList(CATEGORIAS_FOCO)}
        </div>

        <div>
          <div className="mb-4 px-1">
            <h2 className="font-display text-[17px] sm:text-lg text-foreground font-bold leading-tight tracking-wide">DEMAIS LEIS</h2>
            <p className="text-muted-foreground text-[11px] sm:text-xs font-body mt-0.5">Ordinárias, decretos e especiais</p>
          </div>
          {renderList(CATEGORIAS_DEMAIS)}
        </div>
      </div>

      <JurisprudenciaSheet
        open={jurisprudenciaOpen}
        onClose={() => setJurisprudenciaOpen(false)}
      />
    </>
  );
};

export default CategoriasGrid;
