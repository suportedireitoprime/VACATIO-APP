import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Heart, Clock, HardDrive, BookMarked, ChevronRight, BookOpen, Sparkles, Settings2, Play, Bell } from 'lucide-react';
import LembreteLivroSheet from './LembreteLivroSheet';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { directImg } from '@/lib/cdnImg';
import {
  getFavoritos,
  getRecentes,
  subscribeTracking,
  toggleFavorito,
  type LivroSnapshot,
} from '@/lib/bibliotecaTracking';
import { COLECOES, type LivroNormalizado } from '@/lib/bibliotecaColecoes';
import { isPdfCached, downloadPdf, removePdfFromCache } from '@/services/bibliotecaPdfCache';
import { Capacitor } from '@capacitor/core';
import { toast } from 'sonner';

type Tab = 'favoritos' | 'recentes' | 'leitura' | 'offline';

interface Props {
  onAbrirLivro: (livro: LivroNormalizado) => void;
}

const TABS: { id: Tab; label: string; icon: typeof Heart }[] = [
  { id: 'leitura', label: 'Leitura', icon: BookMarked },
  { id: 'favoritos', label: 'Favoritos', icon: Heart },
  { id: 'recentes', label: 'Recentes', icon: Clock },
  { id: 'offline', label: 'Offline', icon: HardDrive },
];

import { readLeituraProgress, formatDuration, type EmProgresso } from '@/lib/leituraProgress';

type EmLeitura = EmProgresso;



function snapToNormalizado(s: LivroSnapshot): LivroNormalizado {
  return {
    id: s.id,
    titulo: s.titulo,
    autor: s.autor ?? null,
    sobre: s.sobre ?? null,
    capa: s.capa ?? null,
    link: s.link ?? null,
    download: s.download ?? null,
    area: s.area ?? null,
    colecaoId: s.colecaoId,
    capaHorizontal: null,
    anoLancamento: null,
    editora: null,
    curiosidades: null,
    analiseDetalhada: null,
  };
}

const BibliotecaAtalhosBar = ({ onAbrirLivro }: Props) => {
  const [active, setActive] = useState<Tab | null>(null);
  const [tick, setTick] = useState(0);
  const navigate = useNavigate();
  const { user } = useAuth();
  const [lembreteLivro, setLembreteLivro] = useState<LivroSnapshot | null>(null);
  const [lembreteBookIds, setLembreteBookIds] = useState<Set<string>>(new Set());
  const [lembreteRefresh, setLembreteRefresh] = useState(0);

  useEffect(() => subscribeTracking(() => setTick((t) => t + 1)), []);

  useEffect(() => {
    if (!user) { setLembreteBookIds(new Set()); return; }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('reading_reminders')
        .select('livro_id')
        .eq('user_id', user.id)
        .eq('enabled', true);
      if (cancelled) return;
      const s = new Set<string>();
      (data ?? []).forEach((r: any) => { if (r.livro_id) s.add(String(r.livro_id)); });
      setLembreteBookIds(s);
    })();
    return () => { cancelled = true; };
  }, [user?.id, lembreteRefresh]);

  const favoritos = useMemo(() => getFavoritos(), [tick, active]);
  const recentes = useMemo(() => getRecentes(), [tick, active]);
  const emLeitura = useMemo(() => readLeituraProgress(tick), [tick, active]);

  return (
    <>
      <div className="px-4 mb-4">
        <div className="grid grid-cols-4 gap-2">
          {TABS.map((t) => {
            const Icon = t.icon;
            const count =
              t.id === 'favoritos' ? favoritos.length
              : t.id === 'recentes' ? recentes.length
              : t.id === 'leitura' ? emLeitura.length
              : null;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setActive(t.id)}
                className="group relative flex flex-col items-center justify-center gap-1.5 rounded-2xl border border-border/60 bg-card hover:bg-secondary/60 active:scale-[0.97] transition-all py-4"
              >
                <Icon className="w-5 h-5 text-primary" />
                <span className="text-[13px] font-semibold text-foreground">{t.label}</span>
                {count !== null && count > 0 && (
                  <span className="absolute top-2 right-2 min-w-[20px] h-[20px] px-1 rounded-full bg-primary text-primary-foreground text-[11px] font-bold flex items-center justify-center">
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <Sheet open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <SheetContent
          side="bottom"
          className="h-[90vh] p-0 rounded-t-3xl border-border/60 bg-background flex flex-col"
        >
          <SheetHeader className="px-5 pt-5 pb-3 text-left">
            <SheetTitle className="flex items-center gap-2 text-xl">
              {active === 'favoritos' && <Heart className="w-5 h-5 text-rose-500" />}
              {active === 'recentes' && <Clock className="w-5 h-5 text-primary" />}
              {active === 'leitura' && <BookMarked className="w-5 h-5 text-primary" />}
              {active === 'offline' && <HardDrive className="w-5 h-5 text-primary" />}
              {active === 'favoritos' && 'Favoritos'}
              {active === 'recentes' && 'Lidos recentemente'}
              {active === 'leitura' && 'Minha leitura'}
              {active === 'offline' && 'Disponível offline'}
            </SheetTitle>
            <SheetDescription className="text-sm">
              {active === 'favoritos' && 'Livros que você marcou com o coração.'}
              {active === 'recentes' && 'Sua trilha de leitura mais recente.'}
              {active === 'leitura' && 'Livros que você começou a ler — continue de onde parou.'}
              {active === 'offline' && 'Livros baixados no aparelho para leitura sem internet.'}
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-4 pb-8">
            {active === 'favoritos' && (
              <LivroLista
                itens={favoritos}
                emptyIcon={<Heart className="w-8 h-8 text-muted-foreground/50" />}
                emptyTitle="Nenhum favorito ainda"
                emptyHint="Toque no coração ao abrir um livro para salvar aqui."
                onOpen={(l) => {
                  setActive(null);
                  onAbrirLivro(snapToNormalizado(l));
                }}
              />
            )}
            {active === 'recentes' && (
              <LivroLista
                itens={recentes}
                emptyIcon={<Clock className="w-8 h-8 text-muted-foreground/50" />}
                emptyTitle="Sem histórico ainda"
                emptyHint="Os livros que você abrir vão aparecer aqui."
                onOpen={(l) => {
                  setActive(null);
                  onAbrirLivro(snapToNormalizado(l));
                }}
              />
            )}
            {active === 'leitura' && (
              <LeituraLista
                itens={emLeitura}
                ativos={lembreteBookIds}
                onOpen={(l) => {
                  setActive(null);
                  onAbrirLivro(snapToNormalizado(l));
                }}
                onOpenLembrete={(l) => setLembreteLivro(l)}
              />
            )}
            {active === 'offline' && (
              <OfflineLista
                candidatos={[...favoritos, ...recentes]}
                onOpen={(l) => {
                  setActive(null);
                  onAbrirLivro(snapToNormalizado(l));
                }}
                onGerenciar={() => {
                  setActive(null);
                  navigate('/biblioteca-offline');
                }}
              />
            )}
          </div>
        </SheetContent>
      </Sheet>

      <LembreteLivroSheet
        open={!!lembreteLivro}
        onOpenChange={(o) => { if (!o) setLembreteLivro(null); }}
        livro={lembreteLivro}
        totalPaginas={lembreteLivro ? emLeitura.find(e => e.snap.id === lembreteLivro.id)?.total ?? null : null}
        paginaAtual={lembreteLivro ? emLeitura.find(e => e.snap.id === lembreteLivro.id)?.index ?? null : null}
        onChanged={() => setLembreteRefresh(n => n + 1)}
      />
    </>
  );
};


function LeituraLista({
  itens,
  ativos,
  onOpen,
  onOpenLembrete,
}: {
  itens: EmLeitura[];
  ativos?: Set<string>;
  onOpen: (l: LivroSnapshot) => void;
  onOpenLembrete?: (l: LivroSnapshot) => void;
}) {
  if (!itens.length) {
    return (
      <div className="py-12 flex flex-col items-center text-center gap-2">
        <BookMarked className="w-8 h-8 text-muted-foreground/50" />
        <p className="text-sm font-medium text-foreground">Nenhuma leitura em andamento</p>
        <p className="text-xs text-muted-foreground max-w-[240px]">
          Abra um livro para começar — ele aparecerá aqui para você continuar.
        </p>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-3 pt-1">
      {itens.map(({ snap, index, total, percent, readTimeMs, etaMs }, i) => {
        const pageLabel = total ? `Pág. ${index + 1} de ${total}` : `Pág. ${index + 1}`;
        const hasReminder = !!ativos?.has(String(snap.id));
        return (
          <motion.div
            key={`${snap.colecaoId}-${snap.id}`}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03 }}
            className="relative flex items-stretch gap-3 rounded-2xl border border-border/60 bg-card p-3 text-left active:scale-[0.99] transition-transform"
          >
            {onOpenLembrete && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onOpenLembrete(snap); }}
                aria-label="Configurar lembrete"
                className={`absolute top-2 right-2 z-10 w-8 h-8 rounded-full flex items-center justify-center border transition-colors ${
                  hasReminder
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background/80 text-muted-foreground border-border/60 hover:text-primary'
                }`}
              >
                <Bell className={`w-4 h-4 ${hasReminder ? 'fill-current' : ''}`} />
              </button>
            )}
            <button
              type="button"
              onClick={() => onOpen(snap)}
              className="absolute inset-0 rounded-2xl z-0"
              aria-label={`Abrir ${snap.titulo}`}
            />
            <div className="relative pointer-events-none flex items-stretch gap-3 flex-1 min-w-0">
            <div className="w-[84px] sm:w-[96px] h-[120px] sm:h-[136px] rounded-lg overflow-hidden bg-muted shrink-0">
              {snap.capa ? (
                <img src={directImg(snap.capa, 320)} alt="" className="w-full h-full object-cover" loading="lazy" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-muted-foreground" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-wider font-bold text-primary/90">Continuar</p>
                <p className="text-[15px] sm:text-base font-semibold text-foreground line-clamp-2 leading-snug mt-0.5">
                  {snap.titulo}
                </p>
                {snap.autor && (
                  <p className="text-[11.5px] text-muted-foreground mt-0.5 truncate">{snap.autor}</p>
                )}
              </div>

              <div className="mt-2 space-y-1.5">
                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>{pageLabel}</span>
                  {percent > 0 && <span className="text-primary font-semibold">{percent}%</span>}
                </div>
                <div className="h-1.5 rounded-full bg-secondary/60 overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{ width: `${Math.max(2, percent)}%` }}
                  />
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {formatDuration(readTimeMs)} lidos
                  </span>
                  {etaMs != null && (
                    <span className="inline-flex items-center gap-1">
                      ⏱ ~{formatDuration(etaMs)} restantes
                    </span>
                  )}
                </div>
              </div>
            </div>
            <span className="self-center w-9 h-9 rounded-full bg-primary/15 text-primary flex items-center justify-center shrink-0 relative pointer-events-none">
              <Play className="w-4 h-4 fill-current" />
            </span>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}



function LivroLista({
  itens,
  emptyIcon,
  emptyTitle,
  emptyHint,
  onOpen,
}: {
  itens: LivroSnapshot[];
  emptyIcon: React.ReactNode;
  emptyTitle: string;
  emptyHint: string;
  onOpen: (l: LivroSnapshot) => void;
}) {
  if (!itens.length) {
    return (
      <div className="py-12 flex flex-col items-center text-center gap-2">
        {emptyIcon}
        <p className="text-sm font-medium text-foreground">{emptyTitle}</p>
        <p className="text-xs text-muted-foreground max-w-[240px]">{emptyHint}</p>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-2 pt-1">
      {itens.map((l, i) => (
        <motion.button
          key={`${l.colecaoId}-${l.id}`}
          type="button"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.03 }}
          onClick={() => onOpen(l)}
          className="flex items-center gap-3 rounded-xl border border-border/50 bg-card p-2.5 pr-3 text-left active:scale-[0.99] transition-transform"
        >
          <div className="w-12 h-16 rounded-md overflow-hidden bg-muted shrink-0">
            {l.capa ? (
              <img src={directImg(l.capa, 200)} alt="" className="w-full h-full object-cover" loading="lazy" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <BookOpen className="w-4 h-4 text-muted-foreground" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground line-clamp-2 leading-tight">
              {l.titulo}
            </p>
            {l.autor && <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{l.autor}</p>}
            {l.area && (
              <span className="inline-block mt-1 text-[9px] uppercase tracking-wider text-primary/90 font-bold">
                {l.area}
              </span>
            )}
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
        </motion.button>
      ))}
    </div>
  );
}

function OfflineLista({
  candidatos,
  onOpen,
  onGerenciar,
}: {
  candidatos: LivroSnapshot[];
  onOpen: (l: LivroSnapshot) => void;
  onGerenciar: () => void;
}) {
  // dedup por colecaoId:id
  const unicos = useMemo(() => {
    const map = new Map<string, LivroSnapshot>();
    for (const l of candidatos) {
      const k = `${l.colecaoId}:${l.id}`;
      if (!map.has(k)) map.set(k, l);
    }
    return Array.from(map.values());
  }, [candidatos]);

  const [status, setStatus] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const isNative = Capacitor.isNativePlatform();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const map: Record<string, boolean> = {};
      for (const l of unicos) {
        if (!l.download) { map[`${l.colecaoId}:${l.id}`] = false; continue; }
        try {
          map[`${l.colecaoId}:${l.id}`] = isNative ? await isPdfCached(l.download) : false;
        } catch {
          map[`${l.colecaoId}:${l.id}`] = false;
        }
      }
      if (!cancelled) setStatus(map);
    })();
    return () => { cancelled = true; };
  }, [unicos, isNative]);

  const baixar = async (l: LivroSnapshot) => {
    if (!l.download) return;
    const k = `${l.colecaoId}:${l.id}`;
    setBusy(k);
    try {
      await downloadPdf(l.download);
      setStatus((s) => ({ ...s, [k]: true }));
      toast.success('Livro disponível offline');
    } catch (e: any) {
      toast.error(e?.message || 'Falha ao baixar');
    } finally {
      setBusy(null);
    }
  };

  const remover = async (l: LivroSnapshot) => {
    if (!l.download) return;
    const k = `${l.colecaoId}:${l.id}`;
    setBusy(k);
    try {
      await removePdfFromCache(l.download);
      setStatus((s) => ({ ...s, [k]: false }));
      toast.success('Removido do offline');
    } finally {
      setBusy(null);
    }
  };

  const baixados = unicos.filter((l) => status[`${l.colecaoId}:${l.id}`]);
  const disponiveis = unicos.filter((l) => l.download && !status[`${l.colecaoId}:${l.id}`]);

  return (
    <div className="space-y-6 pt-1">
      <button
        type="button"
        onClick={onGerenciar}
        className="w-full flex items-center gap-3 rounded-2xl border border-border/60 bg-secondary/40 hover:bg-secondary p-4 text-left"
      >
        <div className="w-11 h-11 rounded-xl bg-background flex items-center justify-center">
          <Settings2 className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-base font-semibold text-foreground">Gerenciar armazenamento</div>
          <div className="text-[13px] text-muted-foreground">Capas, leitura nativa e áudios baixados</div>
        </div>
        <ChevronRight className="w-5 h-5 text-muted-foreground" />
      </button>

      {!isNative && (
        <div className="rounded-xl border border-border/50 bg-card p-3 text-[13px] text-muted-foreground">
          O download nativo de PDFs está disponível apenas no aplicativo. Instale o app para leitura completa offline.
        </div>
      )}

      <section>
        <h3 className="text-[11px] uppercase tracking-[0.22em] font-bold text-primary/90 mb-3">
          Já disponíveis offline
        </h3>
        {baixados.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">
            Nenhum livro baixado ainda. Escolha um abaixo para baixar.
          </p>
        ) : (
          <div className="flex flex-col gap-2.5">
            {baixados.map((l) => (
              <OfflineRow
                key={`${l.colecaoId}-${l.id}`}
                livro={l}
                cached
                busy={busy === `${l.colecaoId}:${l.id}`}
                onOpen={() => onOpen(l)}
                onAction={() => remover(l)}
              />
            ))}
          </div>
        )}
      </section>

      <section>
        <h3 className="text-[11px] uppercase tracking-[0.22em] font-bold text-primary/90 mb-3">
          Baixar para ler offline
        </h3>
        {disponiveis.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">
            Favorite ou abra livros para vê-los aqui.
          </p>
        ) : (
          <div className="flex flex-col gap-2.5">
            {disponiveis.map((l) => (
              <OfflineRow
                key={`${l.colecaoId}-${l.id}`}
                livro={l}
                cached={false}
                busy={busy === `${l.colecaoId}:${l.id}`}
                onOpen={() => onOpen(l)}
                onAction={() => baixar(l)}
                disabled={!isNative}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function OfflineRow({
  livro,
  cached,
  busy,
  disabled,
  onOpen,
  onAction,
}: {
  livro: LivroSnapshot;
  cached: boolean;
  busy: boolean;
  disabled?: boolean;
  onOpen: () => void;
  onAction: () => void;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border/50 bg-card p-3 pr-2.5">
      <button onClick={onOpen} className="flex items-center gap-3 flex-1 min-w-0 text-left">
        <div className="w-14 h-20 rounded-md overflow-hidden bg-muted shrink-0">
          {livro.capa ? (
            <img src={directImg(livro.capa, 240)} alt="" className="w-full h-full object-cover" loading="lazy" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-muted-foreground" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-base font-semibold text-foreground line-clamp-2 leading-tight">
            {livro.titulo}
          </p>
          {livro.autor && (
            <p className="text-[13px] text-muted-foreground mt-1 truncate">{livro.autor}</p>
          )}
        </div>
      </button>
      <button
        type="button"
        onClick={onAction}
        disabled={disabled || busy}
        className={`shrink-0 h-10 px-4 rounded-lg text-[13px] font-semibold transition-colors ${
          cached
            ? 'bg-secondary text-foreground hover:bg-secondary/70'
            : 'bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50'
        }`}
      >
        {busy ? '...' : cached ? 'Remover' : 'Baixar'}
      </button>
    </div>
  );
}

export default BibliotecaAtalhosBar;
