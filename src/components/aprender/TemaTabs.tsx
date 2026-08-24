import { BookOpen, Layers, HelpCircle, TrendingUp } from 'lucide-react';

export type TemaTabId = 'teoria' | 'flashcards' | 'questoes' | 'progresso';

const TABS: { id: TemaTabId; label: string; Icon: typeof BookOpen }[] = [
  { id: 'teoria', label: 'Teoria', Icon: BookOpen },
  { id: 'flashcards', label: 'Flashcards', Icon: Layers },
  { id: 'questoes', label: 'Questões', Icon: HelpCircle },
  { id: 'progresso', label: 'Progresso', Icon: TrendingUp },
];

type Props = {
  value: TemaTabId;
  onChange: (id: TemaTabId) => void;
};

const TemaTabs = ({ value, onChange }: Props) => {
  return (
    <div
      role="tablist"
      aria-label="Modos de estudo"
      className="grid grid-cols-4 gap-1 px-3 py-2 sm:gap-1.5 sm:px-4"
    >
      {TABS.map(({ id, label, Icon }) => {
        const active = value === id;
        return (
          <button
            key={id}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(id)}
            className={`group relative flex h-9 min-w-0 items-center justify-center gap-1 rounded-full px-1.5 text-[12px] font-semibold transition-all sm:h-10 sm:gap-1.5 sm:px-3 sm:text-sm ${
              active
                ? 'bg-primary text-primary-foreground shadow-[0_1px_0_0_rgba(0,0,0,0.08)] ring-1 ring-primary/60'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            style={{ fontFamily: "'Barlow', system-ui, sans-serif" }}
          >
            <Icon
              className={`h-[14px] w-[14px] shrink-0 transition-colors sm:h-[15px] sm:w-[15px] ${
                active ? 'text-primary-foreground' : 'text-muted-foreground group-hover:text-foreground'
              }`}
              strokeWidth={active ? 2.2 : 1.9}
            />
            <span className="truncate">{label}</span>
          </button>
        );
      })}
    </div>

  );
};

export default TemaTabs;
