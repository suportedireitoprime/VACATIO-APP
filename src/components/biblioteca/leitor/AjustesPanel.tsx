import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Palette, Type, Sun, BookOpen, Search, X } from 'lucide-react';
import {
  TEMAS,
  FONTES,
  PAGE_MODES,
  ESPACAMENTOS,
  type LeitorPrefs,
  type Tema,
  type TemaId,
  type FonteId,
  type PageMode,
  type AlinhamentoId,
  type EspacamentoId,
} from '@/hooks/useLeitorPrefs';
import BuscaNoLivro from './BuscaNoLivro';

type TabId = 'temas' | 'texto' | 'brilho' | 'pagina' | 'busca';

interface Pagina {
  index: number;
  ocrPage: number;
  chapterTitulo: string;
  md: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  prefs: LeitorPrefs;
  tema: Tema;
  update: <K extends keyof LeitorPrefs>(key: K, value: LeitorPrefs[K]) => void;
  paginas: Pagina[];
  onJumpPage: (index: number) => void;
  onHighlight: (term: string) => void;
}

const TABS: { id: TabId; label: string; icon: typeof Palette }[] = [
  { id: 'temas', label: 'Temas', icon: Palette },
  { id: 'texto', label: 'Texto', icon: Type },
  { id: 'brilho', label: 'Brilho', icon: Sun },
  { id: 'pagina', label: 'Página', icon: BookOpen },
  { id: 'busca', label: 'Buscar', icon: Search },
];

export default function AjustesPanel({
  open,
  onClose,
  prefs,
  tema,
  update,
  paginas,
  onJumpPage,
  onHighlight,
}: Props) {
  const [tab, setTab] = useState<TabId>('temas');

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const panelBg = tema.isDark ? 'rgba(20,16,12,0.96)' : 'rgba(255,252,244,0.98)';
  const chipBg = tema.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)';
  const chipActive = 'hsl(var(--primary) / 0.18)';

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop leve (só mobile) */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[1330] md:hidden"
            style={{ background: tema.isDark ? 'rgba(0,0,0,0.45)' : 'rgba(0,0,0,0.25)' }}
            onClick={onClose}
          />

          <motion.div
            initial={{ opacity: 0, x: 40, scale: 0.96 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 40, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 340, damping: 30 }}
            className="fixed z-[1331] flex flex-col overflow-hidden"
            style={{
              right: 'max(16px, env(safe-area-inset-right, 0px))',
              top: 'calc(var(--sai-top, env(safe-area-inset-top, 0px)) + 5.25rem)',
              bottom: 'calc(var(--sai-bottom, env(safe-area-inset-bottom, 0px)) + 6.5rem)',
              width: 'min(360px, calc(100vw - 32px))',
              maxHeight: 'min(640px, calc(100vh - 12rem))',
              background: panelBg,
              color: tema.text,
              borderRadius: 24,
              boxShadow: tema.isDark
                ? '0 30px 80px -20px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.06)'
                : '0 30px 80px -20px rgba(0,0,0,0.25), 0 0 0 1px rgba(0,0,0,0.06)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
            }}
            role="dialog"
            aria-label="Ajustes de leitura"
          >
            {/* Header do painel */}
            <div className="flex items-center gap-2 px-4 pt-3 pb-2 shrink-0">
              <p className="text-[13px] font-semibold flex-1 opacity-80">Ajustes</p>
              <button
                type="button"
                onClick={onClose}
                aria-label="Fechar ajustes"
                className="w-8 h-8 rounded-full flex items-center justify-center transition"
                style={{ background: chipBg }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Tabs */}
            <div className="px-3 pb-3 shrink-0">
              <div
                className="flex items-center gap-1 p-1 rounded-xl"
                style={{ background: chipBg }}
                role="tablist"
              >
                {TABS.map((t) => {
                  const Icon = t.icon;
                  const active = tab === t.id;
                  return (
                    <button
                      key={t.id}
                      role="tab"
                      aria-selected={active}
                      onClick={() => setTab(t.id)}
                      className="flex-1 h-9 rounded-lg flex items-center justify-center transition"
                      style={{
                        background: active ? (tema.isDark ? 'rgba(255,255,255,0.1)' : 'white') : 'transparent',
                        color: active ? tema.text : tema.muted,
                        boxShadow: active
                          ? tema.isDark
                            ? '0 1px 0 rgba(255,255,255,0.05)'
                            : '0 1px 3px rgba(0,0,0,0.08)'
                          : 'none',
                      }}
                      title={t.label}
                    >
                      <Icon className="w-4 h-4" />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Corpo */}
            <div className="flex-1 min-h-0 overflow-y-auto px-4 pb-5">
              {tab === 'temas' && <PainelTemas prefs={prefs} update={update} tema={tema} />}
              {tab === 'texto' && <PainelTexto prefs={prefs} update={update} tema={tema} />}
              {tab === 'brilho' && <PainelBrilho prefs={prefs} update={update} tema={tema} />}
              {tab === 'pagina' && <PainelPagina prefs={prefs} update={update} tema={tema} />}
              {tab === 'busca' && (
                <BuscaNoLivro
                  paginas={paginas}
                  tema={tema}
                  onJump={(idx) => {
                    onJumpPage(idx);
                  }}
                  onHighlight={onHighlight}
                />
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/* ---------------- Sub-painéis ---------------- */

function PainelTemas({
  prefs,
  update,
  tema,
}: {
  prefs: LeitorPrefs;
  update: Props['update'];
  tema: Tema;
}) {
  const ids = Object.keys(TEMAS) as TemaId[];
  return (
    <div>
      <SectionTitle tema={tema}>Selecione um tema</SectionTitle>
      <div className="grid grid-cols-3 gap-2.5">
        {ids.map((id) => {
          const t = TEMAS[id];
          const active = prefs.temaId === id;
          return (
            <button
              key={id}
              onClick={() => update('temaId', id)}
              className="flex flex-col items-center gap-2 py-3 rounded-2xl transition"
              style={{
                background: t.bg,
                color: t.text,
                boxShadow: active
                  ? '0 0 0 2px hsl(var(--primary)), 0 6px 16px -6px rgba(0,0,0,0.25)'
                  : '0 1px 2px rgba(0,0,0,0.06), inset 0 0 0 1px rgba(0,0,0,0.05)',
              }}
            >
              <span style={{ fontFamily: 'Georgia, serif', fontSize: 22, fontWeight: 700 }}>Aa</span>
              <span className="text-[10.5px] font-medium opacity-80">{t.nome}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function PainelTexto({
  prefs,
  update,
  tema,
}: {
  prefs: LeitorPrefs;
  update: Props['update'];
  tema: Tema;
}) {
  const fonteIds = Object.keys(FONTES) as FonteId[];
  return (
    <div className="space-y-5">
      <div>
        <SectionTitle tema={tema}>Tamanho</SectionTitle>
        <div className="flex items-center gap-3">
          <span className="text-[13px] opacity-60">A</span>
          <input
            type="range"
            min={14}
            max={26}
            step={1}
            value={prefs.fontSize}
            onChange={(e) => update('fontSize', Number(e.target.value))}
            className="flex-1 accent-[hsl(var(--primary))]"
          />
          <span className="text-[19px] opacity-80" style={{ fontFamily: 'Georgia, serif' }}>A</span>
        </div>
      </div>

      <div>
        <SectionTitle tema={tema}>Fonte</SectionTitle>
        <div className="grid grid-cols-2 gap-2">
          {fonteIds.map((id) => {
            const f = FONTES[id];
            const active = prefs.fonteId === id;
            return (
              <button
                key={id}
                onClick={() => update('fonteId', id)}
                className="h-14 rounded-xl px-3 flex flex-col items-start justify-center transition"
                style={{
                  background: active ? 'hsl(var(--primary) / 0.15)' : tema.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
                  boxShadow: active ? '0 0 0 1.5px hsl(var(--primary))' : 'none',
                }}
              >
                <span style={{ fontFamily: f.family, fontSize: 15, fontWeight: 600 }}>Aa</span>
                <span className="text-[11px] opacity-70 mt-0.5">{f.nome}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <SectionTitle tema={tema}>Alinhamento</SectionTitle>
        <SegmentedGroup
          tema={tema}
          value={prefs.alinhamento}
          onChange={(v) => update('alinhamento', v as AlinhamentoId)}
          options={[
            { value: 'justify', label: 'Justificado' },
            { value: 'left', label: 'Esquerda' },
          ]}
        />
      </div>

      <div>
        <SectionTitle tema={tema}>Espaçamento entre linhas</SectionTitle>
        <SegmentedGroup
          tema={tema}
          value={prefs.espacamento}
          onChange={(v) => update('espacamento', v as EspacamentoId)}
          options={(Object.keys(ESPACAMENTOS) as EspacamentoId[]).map((id) => ({
            value: id,
            label: id.charAt(0).toUpperCase() + id.slice(1),
          }))}
        />
      </div>
    </div>
  );
}

function PainelBrilho({
  prefs,
  update,
  tema,
}: {
  prefs: LeitorPrefs;
  update: Props['update'];
  tema: Tema;
}) {
  return (
    <div className="space-y-5">
      <div>
        <SectionTitle tema={tema}>Brilho da página</SectionTitle>
        <div className="flex items-center gap-3">
          <Sun className="w-4 h-4 opacity-40" />
          <input
            type="range"
            min={0.6}
            max={1.15}
            step={0.01}
            value={prefs.brilho}
            onChange={(e) => update('brilho', Number(e.target.value))}
            className="flex-1 accent-[hsl(var(--primary))]"
          />
          <Sun className="w-5 h-5 opacity-90" />
        </div>
        <p className="text-[11px] opacity-50 mt-2">
          Ajuste fino sem alterar o brilho do sistema.
        </p>
      </div>

      <div>
        <SectionTitle tema={tema}>Tonalidade quente</SectionTitle>
        <div className="flex items-center gap-3">
          <span
            className="w-4 h-4 rounded-full"
            style={{ background: 'linear-gradient(135deg, #fff 0%, #fff 100%)', border: `1px solid ${tema.border}` }}
          />
          <input
            type="range"
            min={0}
            max={0.6}
            step={0.01}
            value={prefs.tonalidade}
            onChange={(e) => update('tonalidade', Number(e.target.value))}
            className="flex-1 accent-[hsl(var(--primary))]"
          />
          <span
            className="w-4 h-4 rounded-full"
            style={{ background: 'radial-gradient(circle, #ff9a3c 0%, #d97706 100%)' }}
          />
        </div>
        <p className="text-[11px] opacity-50 mt-2">
          Aplica uma camada âmbar sobre o texto, ideal para leitura noturna.
        </p>
      </div>
    </div>
  );
}

function PainelPagina({
  prefs,
  update,
  tema,
}: {
  prefs: LeitorPrefs;
  update: Props['update'];
  tema: Tema;
}) {
  const ids = Object.keys(PAGE_MODES) as PageMode[];
  return (
    <div>
      <SectionTitle tema={tema}>Como virar a página</SectionTitle>
      <div className="grid grid-cols-2 gap-2">
        {ids.map((id) => {
          const active = prefs.pageMode === id;
          return (
            <button
              key={id}
              onClick={() => update('pageMode', id)}
              className="relative h-20 rounded-2xl flex items-center justify-center transition overflow-hidden"
              style={{
                background: active ? 'hsl(var(--primary) / 0.15)' : tema.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
                boxShadow: active ? '0 0 0 1.5px hsl(var(--primary))' : 'none',
              }}
            >
              <PageModePreview mode={id} tema={tema} />
              <span
                className="absolute bottom-1.5 left-0 right-0 text-center text-[11px] font-medium"
                style={{ color: tema.text }}
              >
                {PAGE_MODES[id]}
              </span>
            </button>
          );
        })}
      </div>
      <p className="text-[11px] opacity-50 mt-3">
        O modo <strong>Folhear</strong> traz uma animação 3D estilo livro; <strong>Rolar</strong> desliga a paginação animada.
      </p>
    </div>
  );
}

function PageModePreview({ mode, tema }: { mode: PageMode; tema: Tema }) {
  const paper = tema.isDark ? '#3a3128' : '#fff';
  const line = tema.isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.35)';
  const shadow = 'rgba(0,0,0,0.25)';

  if (mode === 'slide') {
    return (
      <svg width="56" height="34" viewBox="0 0 56 34" className="mb-4">
        <rect x="4" y="4" width="24" height="26" rx="2" fill={paper} stroke={line} />
        <rect x="28" y="4" width="24" height="26" rx="2" fill={paper} stroke={line} />
        <path d="M26 17 h6 M30 14 l3 3 -3 3" stroke={line} strokeWidth="1.5" fill="none" />
      </svg>
    );
  }
  if (mode === 'curl') {
    return (
      <svg width="56" height="34" viewBox="0 0 56 34" className="mb-4">
        <rect x="4" y="4" width="48" height="26" rx="2" fill={paper} stroke={line} />
        <path d="M52 4 L36 20 L52 30 Z" fill={paper} stroke={line} strokeLinejoin="round" />
        <path d="M52 4 L36 20" stroke={shadow} strokeWidth="1" fill="none" />
      </svg>
    );
  }
  if (mode === 'fade') {
    return (
      <svg width="56" height="34" viewBox="0 0 56 34" className="mb-4">
        <rect x="8" y="4" width="40" height="26" rx="2" fill={paper} stroke={line} opacity="0.4" />
        <rect x="14" y="4" width="40" height="26" rx="2" fill={paper} stroke={line} />
      </svg>
    );
  }
  return (
    <svg width="56" height="34" viewBox="0 0 56 34" className="mb-4">
      <rect x="18" y="2" width="20" height="30" rx="2" fill={paper} stroke={line} />
      <path d="M28 6 v20 M24 22 l4 4 4 -4" stroke={line} strokeWidth="1.5" fill="none" />
    </svg>
  );
}

function SectionTitle({ tema, children }: { tema: Tema; children: React.ReactNode }) {
  return (
    <p
      className="text-[10.5px] uppercase tracking-[0.14em] font-semibold mb-2.5"
      style={{ color: tema.muted }}
    >
      {children}
    </p>
  );
}

function SegmentedGroup({
  tema,
  value,
  onChange,
  options,
}: {
  tema: Tema;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div
      className="flex items-center gap-1 p-1 rounded-xl"
      style={{ background: tema.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }}
    >
      {options.map((o) => {
        const active = value === o.value;
        return (
          <button
            key={o.value}
            onClick={() => onChange(o.value)}
            className="flex-1 h-9 rounded-lg text-[12.5px] font-medium transition"
            style={{
              background: active ? (tema.isDark ? 'rgba(255,255,255,0.1)' : 'white') : 'transparent',
              color: active ? tema.text : tema.muted,
              boxShadow: active
                ? tema.isDark
                  ? '0 1px 0 rgba(255,255,255,0.05)'
                  : '0 1px 3px rgba(0,0,0,0.08)'
                : 'none',
            }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
