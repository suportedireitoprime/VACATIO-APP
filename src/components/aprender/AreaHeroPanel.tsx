import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { getMascotesArea } from '@/lib/aprenderMascotes';
import { getAreaCover } from '@/lib/areasDireitoCovers';


type Props = {
  slug: string | null | undefined;
  nome: string;
  totalTemas: number;
  totalAulas: number;
  concluidas: number;
  disponiveis: number;
  emPreparo: number;
  progressoPct: number;
};

const AreaHeroPanel = ({
  slug,
  nome,
  totalTemas,
  totalAulas,
  concluidas,
  disponiveis,
  emPreparo,
  progressoPct,
}: Props) => {
  const isAdministrativo = slug === 'direito-administrativo';
  const mascotes = getMascotesArea(slug);
  const cover = getAreaCover(nome);
  const [i, setI] = useState(0);

  useEffect(() => {
    if (!isAdministrativo || mascotes.length <= 1) return;
    const t = setInterval(() => setI((p) => (p + 1) % mascotes.length), 5000);
    return () => clearInterval(t);
  }, [mascotes.length, isAdministrativo]);

  const total = Math.max(1, totalAulas);
  const pctConcluidas = (concluidas / total) * 100;
  const pctDisponiveis = (disponiveis / total) * 100;
  const pctPreparo = (emPreparo / total) * 100;

  const size = 96;
  const stroke = 8;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = c - (Math.max(0, Math.min(100, progressoPct)) / 100) * c;

  // Cor de fundo do painel por área. Administrativo mantém o amarelo original;
  // demais áreas usam a tinta temática da capa (versão opaca).
  const tintOpaque = cover?.tint?.replace(/,\s*0?\.\d+\)$/, ', 1)') ?? null;
  const panelStyle = isAdministrativo
    ? undefined
    : { background: tintOpaque ?? '#1f2937' };


  return (
    <section
      className={`relative isolate overflow-hidden border-b border-black/10 ${isAdministrativo ? 'bg-hero-yellow' : ''}`}
      style={panelStyle}
      aria-label={`Painel de progresso — ${nome}`}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.25),transparent_60%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(0,0,0,0.18),transparent_65%)]" />

      {/* Ilustração temática — canto direito */}
      <div className="pointer-events-none absolute inset-y-0 right-0 w-[48%] sm:w-[46%] max-w-[320px]">
        {isAdministrativo ? (
          <AnimatePresence mode="wait">
            <motion.img
              key={mascotes[i]}
              src={mascotes[i]}
              alt=""
              aria-hidden="true"
              initial={{ opacity: 0, x: 20, scale: 0.98 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -10, scale: 0.98 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              className="absolute bottom-0 right-0 h-full w-full object-contain object-bottom-right drop-shadow-[0_6px_10px_rgba(0,0,0,0.15)]"
              loading="eager"
              fetchPriority="high"
            />
          </AnimatePresence>
        ) : cover?.cover ? (
          <img
            src={cover.cover}
            alt=""
            aria-hidden="true"
            className="absolute bottom-0 right-0 h-[112%] w-full object-contain object-bottom-right drop-shadow-[0_6px_10px_rgba(0,0,0,0.25)]"
            loading="eager"
            fetchPriority="high"
            decoding="sync"
          />
        ) : null}
      </div>


      <div className="relative p-4 pr-[42%] sm:p-6 sm:pr-[36%]">
        <p className={`text-[11px] font-bold uppercase tracking-wider ${isAdministrativo ? 'text-black/70' : 'text-white/75'}`}>Seu painel</p>
        <h1 className={`mt-1 font-display text-[22px] font-black leading-tight sm:text-3xl ${isAdministrativo ? 'text-black' : 'text-white'}`}>
          {nome}
        </h1>
        <p className={`mt-1 text-[13px] font-medium sm:text-sm ${isAdministrativo ? 'text-black/70' : 'text-white/80'}`}>
          {totalTemas} {totalTemas === 1 ? 'tema' : 'temas'} · {totalAulas} {totalAulas === 1 ? 'aula' : 'aulas'}
        </p>

        <div className="mt-4 flex items-center gap-4">
          {/* Anel de progresso */}
          <div className="relative shrink-0" style={{ width: size, height: size }}>
            <svg width={size} height={size} className="-rotate-90">
              <circle cx={size / 2} cy={size / 2} r={r} stroke={isAdministrativo ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.25)'} strokeWidth={stroke} fill="none" />
              <circle
                cx={size / 2}
                cy={size / 2}
                r={r}
                stroke={isAdministrativo ? '#111' : '#fff'}
                strokeWidth={stroke}
                strokeLinecap="round"
                fill="none"
                strokeDasharray={c}
                strokeDashoffset={dash}
                style={{ transition: 'stroke-dashoffset 600ms ease' }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`font-display text-lg font-black leading-none ${isAdministrativo ? 'text-black' : 'text-white'}`}>
                {Math.round(progressoPct)}%
              </span>
              <span className={`mt-0.5 text-[9px] font-bold uppercase tracking-wider ${isAdministrativo ? 'text-black/60' : 'text-white/70'}`}>
                Progresso
              </span>
            </div>
          </div>

          {/* Barras */}
          <div className="min-w-0 flex-1 space-y-2">
            <StatRow label="Concluídas" value={`${concluidas}/${totalAulas}`} pct={pctConcluidas} tone="green" onDark={!isAdministrativo} />
            <StatRow label="Disponíveis" value={String(disponiveis)} pct={pctDisponiveis} tone="dark" onDark={!isAdministrativo} />
            <StatRow label="Em preparo" value={String(emPreparo)} pct={pctPreparo} tone="soft" onDark={!isAdministrativo} />
          </div>
        </div>
      </div>
    </section>
  );
};

function StatRow({
  label, value, pct, tone, onDark,
}: { label: string; value: string; pct: number; tone: 'green' | 'dark' | 'soft'; onDark?: boolean }) {
  const fill = onDark
    ? tone === 'green' ? '#4ade80' : tone === 'dark' ? '#fff' : 'rgba(255,255,255,0.7)'
    : tone === 'green' ? '#16a34a' : tone === 'dark' ? '#111' : 'rgba(0,0,0,0.55)';
  const labelClass = onDark ? 'text-white/85' : 'text-black/80';
  const valueClass = onDark ? 'text-white' : 'text-black';
  const trackClass = onDark ? 'bg-white/20' : 'bg-black/15';
  return (
    <div>
      <div className={`flex items-center justify-between text-[12px] font-semibold ${labelClass}`}>
        <span className="truncate">{label}</span>
        <span className={`tabular-nums ${valueClass}`}>{value}</span>
      </div>
      <div className={`mt-1 h-1.5 w-full overflow-hidden rounded-full ${trackClass}`}>
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${Math.max(0, Math.min(100, pct))}%`, background: fill }}
        />
      </div>
    </div>
  );
}


export default AreaHeroPanel;
