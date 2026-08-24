import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { X, ArrowRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import brasaoAsset from '@/assets/brasao-republica.webp';
import horusAsset from '@/assets/horus/horus-owl.webp';

interface NovoAto {
  id: string;
  tipo_ato: string;
  numero_ato: string;
  ementa: string;
  data_dou: string;
  created_at: string;
}

const LS_KEY = 'radar_leis_last_seen';
const SEEN_IDS_KEY = 'radar_leis_seen_ids';
const MAX_SEEN_IDS = 500;

function readSeenIds(): string[] {
  try {
    const raw = localStorage.getItem(SEEN_IDS_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter((x) => typeof x === 'string') : [];
  } catch { return []; }
}

function writeSeenIds(ids: string[]) {
  try {
    const trimmed = ids.slice(-MAX_SEEN_IDS);
    localStorage.setItem(SEEN_IDS_KEY, JSON.stringify(trimmed));
  } catch { /* ignore */ }
}

function useTypewriter(text: string, enabled: boolean, speed = 28, startDelay = 650) {
  const [out, setOut] = useState('');
  useEffect(() => {
    if (!enabled) { setOut(''); return; }
    setOut('');
    let i = 0;
    let timer: ReturnType<typeof setTimeout>;
    const start = setTimeout(() => {
      const tick = () => {
        i++;
        setOut(text.slice(0, i));
        if (i < text.length) timer = setTimeout(tick, speed);
      };
      tick();
    }, startDelay);
    return () => { clearTimeout(start); clearTimeout(timer!); };
  }, [text, enabled, speed, startDelay]);
  return out;
}

export default function NovidadesRadarOverlay() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NovoAto[]>([]);
  const [landed, setLanded] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const firstName = (() => {
    const meta = (user?.user_metadata ?? {}) as Record<string, any>;
    const raw = meta.display_name || meta.full_name || meta.name || user?.email?.split('@')[0] || '';
    return String(raw).trim().split(/\s+/)[0] || '';
  })();

  useEffect(() => {
    if (location.pathname.startsWith('/radar-360')) return;

    const check = async () => {
      const lastSeen = (() => {
        try { return localStorage.getItem(LS_KEY) || new Date(Date.now() - 24 * 3600 * 1000).toISOString(); }
        catch { return new Date(Date.now() - 24 * 3600 * 1000).toISOString(); }
      })();
      const { data } = await supabase
        .from('resenha_diaria' as any)
        .select('id,tipo_ato,numero_ato,ementa,data_dou,created_at')
        .gt('created_at', lastSeen)
        .order('created_at', { ascending: false })
        .limit(8);
      const raw = (data as any[] | null) ?? [];
      const seen = new Set(readSeenIds());
      // Somente atos publicados HOJE no DOU (fuso America/Sao_Paulo)
      const todayISO = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Sao_Paulo',
        year: 'numeric', month: '2-digit', day: '2-digit',
      }).format(new Date());
      const list = raw.filter((it) => !seen.has(it.id) && String(it.data_dou).slice(0, 10) === todayISO);
      if (list.length > 0) {
        setItems(list as NovoAto[]);
        setOpen(true);
      }
    };
    check();

    const onVisible = () => {
      if (document.visibilityState === 'visible') check();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [location.pathname]);

  const markSeen = () => {
    try { localStorage.setItem(LS_KEY, new Date().toISOString()); } catch { /* ignore */ }
    const prev = readSeenIds();
    const merged = Array.from(new Set([...prev, ...items.map((i) => i.id)]));
    writeSeenIds(merged);
  };

  const dismiss = () => { markSeen(); setOpen(false); setLanded(false); };
  const goTo = () => { markSeen(); setOpen(false); setLanded(false); navigate('/radar-360'); };

  const grupos: Record<string, number> = {};
  for (const it of items) grupos[it.tipo_ato] = (grupos[it.tipo_ato] ?? 0) + 1;
  const chips = Object.entries(grupos).slice(0, 3).map(([t, n]) => `${n} ${t}${n > 1 ? 's' : ''}`);
  const first = items[0];

  const speech = useMemo(() => {
    if (!first) return '';
    const hi = firstName ? `Ei, ${firstName}!` : 'Ei!';
    const dataFmt = (() => {
      try {
        const d = new Date(`${String(first.data_dou).slice(0, 10)}T12:00:00`);
        return new Intl.DateTimeFormat('pt-BR', {
          timeZone: 'America/Sao_Paulo',
          day: '2-digit', month: 'long', year: 'numeric',
        }).format(d);
      } catch { return 'hoje'; }
    })();
    return items.length === 1
      ? `${hi} Saiu uma nova ${first.tipo_ato.toLowerCase()} no Diário Oficial de hoje, ${dataFmt}. Bora conferir?`
      : `${hi} Saíram ${items.length} publicações novas no Diário Oficial de hoje, ${dataFmt}. Dá uma olhada comigo?`;
  }, [items, first, firstName]);

  const typed = useTypewriter(speech, open && landed);

  if (!open || items.length === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        key="backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[80] bg-neutral-800/70 backdrop-blur-md flex items-center justify-center p-4"
        onClick={dismiss}
      >
        {/* Horus stomp shockwave */}
        <motion.div
          initial={{ opacity: 0, scale: 0.2 }}
          animate={{ opacity: [0, 0.6, 0], scale: [0.2, 2.4, 3] }}
          transition={{ duration: 0.9, delay: 0.35, ease: 'easeOut' }}
          className="pointer-events-none absolute w-56 h-56 rounded-full border-2 border-primary/60"
          style={{ top: '38%' }}
        />

        <div className="relative w-full max-w-md" onClick={(e) => e.stopPropagation()}>
          {/* Horus mascote — cai de cima com pisada */}
          <motion.div
            initial={{ y: -260, rotate: -8, scale: 0.9 }}
            animate={{
              y: [ -260, 0, -14, 0 ],
              rotate: [ -8, 2, -1, 0 ],
              scale: [ 0.9, 1.08, 0.98, 1 ],
            }}
            transition={{ duration: 0.7, times: [0, 0.55, 0.8, 1], ease: ['easeIn','easeOut','easeOut','easeOut'] }}
            onAnimationComplete={() => setLanded(true)}
            className="absolute -top-24 -left-4 z-20 w-32 h-32 sm:w-36 sm:h-36 drop-shadow-[0_18px_20px_rgba(0,0,0,0.55)]"
          >
            <img src={horusAsset} alt="Horus" className="w-full h-full object-contain" />
          </motion.div>

          {/* Balão de fala estilo gibi */}
          <AnimatePresence>
            {landed && (
              <motion.div
                initial={{ opacity: 0, scale: 0.6, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ type: 'spring', stiffness: 380, damping: 22 }}
                className="absolute -top-20 left-28 sm:left-32 z-20 max-w-[250px] bg-white text-neutral-900 rounded-2xl px-4 py-3 shadow-xl border-2 border-neutral-900"
                style={{ transformOrigin: 'bottom left' }}
              >
                <p className="text-[15px] font-semibold leading-snug">
                  {typed}
                  <span className="inline-block w-[2px] h-4 align-[-2px] ml-0.5 bg-neutral-900 animate-pulse" />
                </p>
                {/* Rabinho do balão */}
                <span
                  className="absolute -bottom-2 left-4 w-0 h-0"
                  style={{
                    borderLeft: '10px solid transparent',
                    borderRight: '10px solid transparent',
                    borderTop: '12px solid #171717',
                  }}
                />
                <span
                  className="absolute -bottom-[6px] left-[19px] w-0 h-0"
                  style={{
                    borderLeft: '7px solid transparent',
                    borderRight: '7px solid transparent',
                    borderTop: '9px solid #ffffff',
                  }}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Card */}
          <motion.div
            initial={{ y: 40, opacity: 0, scale: 0.96 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 30, opacity: 0, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 260, damping: 26, delay: 0.15 }}
            className="relative rounded-3xl overflow-hidden border border-primary/30 shadow-2xl shadow-black/60"
            style={{
              background:
                'linear-gradient(160deg, hsl(340 55% 12%) 0%, hsl(340 45% 18%) 55%, hsl(40 15% 92% / 0.06) 100%)',
            }}
          >
            <div className="relative h-32 overflow-hidden">
              <img
                src={brasaoAsset}
                alt=""
                className="absolute -right-8 -top-4 w-40 h-40 opacity-20 mix-blend-luminosity"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[hsl(340_55%_12%)] via-transparent to-transparent" />
              <div className="relative p-4 flex items-center justify-end">

                <button
                  onClick={dismiss}
                  aria-label="Fechar"
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/80"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="absolute bottom-2 left-4 right-4">
                <p className="font-display text-lg text-white leading-tight drop-shadow-lg line-clamp-2">
                  {items.length === 1
                    ? `Nova ${first.tipo_ato.toLowerCase()} publicada hoje`
                    : `${items.length} publicações novas no Diário Oficial`}
                </p>
                <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-primary drop-shadow">
                  {(() => {
                    try {
                      const d = new Date(`${String(first.data_dou).slice(0, 10)}T12:00:00`);
                      return new Intl.DateTimeFormat('pt-BR', {
                        timeZone: 'America/Sao_Paulo',
                        day: '2-digit', month: 'long', year: 'numeric',
                      }).format(d);
                    } catch { return ''; }
                  })()}
                </p>
              </div>
            </div>

            <div className="px-5 pt-3 pb-4 space-y-3 bg-background/95">
              <p className="text-sm font-body text-foreground/85 line-clamp-3 leading-relaxed">
                {first.ementa}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {chips.map((c) => (
                  <span key={c} className="text-[10px] font-semibold uppercase tracking-wide px-2.5 py-1 rounded-full bg-primary/15 text-primary border border-primary/20">
                    {c}
                  </span>
                ))}
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  onClick={dismiss}
                  className="flex-1 py-2.5 rounded-xl bg-secondary text-foreground font-semibold text-sm hover:bg-secondary/80 transition"
                >
                  Ignorar
                </button>
                <button
                  onClick={goTo}
                  className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2 shadow-lg shadow-primary/30 hover:brightness-110 transition"
                >
                  Ver agora
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
