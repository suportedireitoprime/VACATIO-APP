import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Heart, Clock, HardDrive, BookMarked, ChevronRight, BookOpen, Sparkles, Settings2, Play, Bell } from 'lucide-react';
import LembreteLivroSheet from './LembreteLivroSheet';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { useBibliotecaCapa } from '@/hooks/useBibliotecaAsset';
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
import { FileUp, X, Lock } from 'lucide-react';
import { useGatedFeature } from '@/hooks/useGatedFeature';
import { uploadCustomPdfWithCover, listCustomPdfs, removeCustomPdf, subscribeCustomPdfs, type CustomPdfRecord } from '@/services/bibliotecaPersonalizadosDb';
import { extractFirstPageAsCover } from '@/lib/pdfCoverExtractor';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
type Tab = 'favoritos' | 'recentes' | 'leitura' | 'personalizado' | 'offline';

interface Props {
  onAbrirLivro: (livro: LivroNormalizado) => void;
  /** Quando definido, os painéis mostram apenas livros daquela área. */
  filtroArea?: string | null;
  onAbrirCustomPdf?: (titulo: string, url: string) => void;
}

const TABS: { id: Tab; label: string; icon: typeof Heart }[] = [
  { id: 'leitura', label: 'Leitura', icon: BookMarked },
  { id: 'favoritos', label: 'Favoritos', icon: Heart },
  { id: 'recentes', label: 'Recentes', icon: Clock },
  { id: 'personalizado', label: 'Meus PDFs', icon: HardDrive as any },
];

import { readLeituraProgress, formatDuration, type EmProgresso } from '@/lib/leituraProgress';
import { pullLeituraProgress } from '@/lib/leituraProgressSync';

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

const BibliotecaAtalhosBar = ({ onAbrirLivro, filtroArea = null, onAbrirCustomPdf }: Props) => {
  const [active, setActive] = useState<Tab | null>(null);
  const [tick, setTick] = useState(0);
  const navigate = useNavigate();
  const { user } = useAuth();
  const [lembreteLivro, setLembreteLivro] = useState<LivroSnapshot | null>(null);
  const [lembreteBookIds, setLembreteBookIds] = useState<Set<string>>(new Set());
  const [lembreteRefresh, setLembreteRefresh] = useState(0);

  useEffect(() => subscribeTracking(() => setTick((t) => t + 1)), []);

  // Permite que o rodapé da Biblioteca abra os mesmos painéis.
  useEffect(() => {
    const handler = (e: Event) => {
      const tab = (e as CustomEvent).detail?.tab as Tab | undefined;
      if (tab) setActive(tab);
    };
    window.addEventListener('biblioteca-atalho', handler);
    return () => window.removeEventListener('biblioteca-atalho', handler);
  }, []);

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

  const normArea = (v?: string | null) =>
    (v || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  const alvoArea = normArea(filtroArea);
  const matchArea = (a?: string | null) => !alvoArea || normArea(a) === alvoArea;

  const favoritos = useMemo(
    () => getFavoritos().filter((l) => matchArea(l.area)),
    [tick, active, alvoArea],
  );
  const recentes = useMemo(
    () => getRecentes().filter((l) => matchArea(l.area)),
    [tick, active, alvoArea],
  );
  useEffect(() => {
    if (active === 'leitura') void pullLeituraProgress(true);
  }, [active]);

  const emLeitura = useMemo(
    () => readLeituraProgress(tick).filter((e) => matchArea(e.snap.area)),
    [tick, active, alvoArea],
  );

  return (
    <>
      {/* Grade de atalhos removida — os acessos (Leitura, Favoritos, Recentes,
          Offline) agora vivem no rodapé da Biblioteca. Este componente segue
          montado apenas para hospedar os painéis abertos pelo rodapé. */}


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
              {active === 'personalizado' && <HardDrive className="w-5 h-5 text-purple-500" />}
              {active === 'favoritos' && 'Favoritos'}
              {active === 'recentes' && 'Lidos recentemente'}
              {active === 'leitura' && 'Minha leitura'}
              {active === 'offline' && 'Disponível offline'}
              {active === 'personalizado' && 'Meus PDFs Personalizados'}
            </SheetTitle>
            <SheetDescription className="text-sm">
              {active === 'favoritos' && 'Livros que você marcou com o coração.'}
              {active === 'recentes' && 'Sua trilha de leitura mais recente.'}
              {active === 'leitura' && 'Livros que você começou a ler — continue de onde parou.'}
              {active === 'offline' && 'Livros baixados no aparelho para leitura sem internet.'}
              {active === 'personalizado' && 'Leia seus próprios arquivos PDF no aplicativo.'}
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
            {active === 'personalizado' && (
              <PersonalizadoLista 
                onOpen={(titulo, url) => {
                  setActive(null);
                  onAbrirCustomPdf?.(titulo, url);
                }} 
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
        const hasReminder = !!ativos?.has(String(snap.id));
        return (
          <LeituraRow key={`${snap.colecaoId}-${snap.id}`} snap={snap} index={index} total={total} percent={percent} readTimeMs={readTimeMs} etaMs={etaMs} hasReminder={hasReminder} onOpen={onOpen} onOpenLembrete={onOpenLembrete} delay={i * 0.04} />
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
        <LivroRow key={`${l.colecaoId}-${l.id}`} l={l} delay={i * 0.04} onOpen={onOpen} />
      ))}
    </div>
  );
}


function LivroRow({ l, delay, onOpen }: any) {
  const capaUrl = useBibliotecaCapa(l.capa, 200);
  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: delay, duration: 0.35, type: "spring", stiffness: 300, damping: 24 }}
      whileHover={{ scale: 1.015 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onOpen(l)}
      className="flex items-center gap-3 rounded-xl border border-border/50 bg-card p-2.5 pr-3 text-left"
    >
      <div className="w-12 h-16 rounded-md overflow-hidden bg-muted shrink-0">
        {capaUrl ? (
          <img src={capaUrl} alt="" className="w-full h-full object-cover" loading="lazy" />
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
  );
}

const formatDuration = (ms: number) => {
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `${mins} min`;
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  return rem > 0 ? `${hrs}h ${rem}min` : `${hrs}h`;
};

function LeituraRow({ snap, index, total, percent, readTimeMs, etaMs, hasReminder, onOpen, onOpenLembrete, delay }: any) {
  const pageLabel = total ? `Pág. ${index} de ${total}` : `Pág. ${index}`;
  const capaUrl = useBibliotecaCapa(snap.capa, 320);

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: delay, duration: 0.35, type: "spring", stiffness: 300, damping: 24 }}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      className="relative flex items-stretch gap-3 rounded-2xl border border-border/40 bg-card/60 p-2.5 pr-4 shadow-sm"
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
          {capaUrl ? (
            <img src={capaUrl} alt="" className="w-full h-full object-cover" loading="lazy" />
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
  const capaUrl = useBibliotecaCapa(livro.capa, 240);
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border/50 bg-card p-3 pr-2.5">
      <button onClick={onOpen} className="flex items-center gap-3 flex-1 min-w-0 text-left">
        <div className="w-14 h-20 rounded-md overflow-hidden bg-muted shrink-0">
          {capaUrl ? (
            <img src={capaUrl} alt="" className="w-full h-full object-cover" loading="lazy" />
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

function PersonalizadoLista({ onOpen }: { onOpen: (titulo: string, url: string) => void }) {
  const [customPdfsList, setCustomPdfsList] = useState<CustomPdfRecord[]>([]);
  const gate = useGatedFeature('pdf_personalizado', 'default');
  
  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pdfTitle, setPdfTitle] = useState('');
  const [pdfAuthor, setPdfAuthor] = useState('');
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  useEffect(() => {
    setCustomPdfsList(listCustomPdfs());
    return subscribeCustomPdfs(() => {
      setCustomPdfsList(listCustomPdfs());
    });
  }, []);

  const resetModal = () => {
    setModalOpen(false);
    setSelectedFile(null);
    setPdfTitle('');
    setPdfAuthor('');
    setCoverPreview(null);
    setIsProcessing(false);
    setIsUploading(false);
  };

  const handleUploadClick = async () => {
    gate.run(async () => {
      try {
        const { FilePicker } = await import('@capawesome/capacitor-file-picker');
        const result = await FilePicker.pickFiles({
          types: ['application/pdf'],
          readData: true,
        });
        const fileData = result.files[0];
        if (fileData && fileData.data) {
          // Converter base64 para File
          const byteCharacters = atob(fileData.data);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          const blob = new Blob([byteArray], { type: 'application/pdf' });
          const file = new File([blob], fileData.name || 'documento.pdf', { type: 'application/pdf' });
          
          setSelectedFile(file);
          setPdfTitle(file.name.replace(/\.[^/.]+$/, "")); // remove extensão
          setModalOpen(true);
          
          // Extrair capa em background para preview
          setIsProcessing(true);
          try {
            const cover = await extractFirstPageAsCover(await file.arrayBuffer());
            setCoverPreview(cover);
          } catch (e) {
            console.warn('Preview da capa falhou', e);
          } finally {
            setIsProcessing(false);
          }
        }
      } catch (e) {
        console.log('Cancelado ou erro ao selecionar arquivo', e);
      }
    });
  };

  const handleConfirmUpload = async () => {
    if (!selectedFile || !pdfTitle.trim()) return;
    setIsUploading(true);
    try {
      const id = crypto.randomUUID();
      const record = await uploadCustomPdfWithCover(selectedFile, id, pdfTitle.trim(), pdfAuthor.trim());
      setCustomPdfsList(listCustomPdfs());
      resetModal();
      toast.success('PDF salvo na nuvem com sucesso!');
      if (record.pdfUrl) {
        onOpen(record.titulo, record.pdfUrl);
      }
    } catch (e: any) {
      toast.error(e.message || 'Erro ao enviar PDF');
      setIsUploading(false);
    }
  };

  const handleOpenCustomPdf = async (pdf: CustomPdfRecord) => {
    if (pdf.pdfUrl) {
      onOpen(pdf.titulo, pdf.pdfUrl);
    } else {
      toast.error('URL do PDF não encontrada.');
    }
  };

  const handleDeleteCustomPdf = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await removeCustomPdf(id);
    setCustomPdfsList(listCustomPdfs());
    toast.success('PDF removido com sucesso');
  };

  return (
    <div className="space-y-6 pt-1">
      <button
        onClick={handleUploadClick}
        className="w-full flex items-center justify-between p-4 rounded-2xl bg-card hover:bg-secondary/50 border border-border/50 shadow-sm transition-colors relative overflow-hidden group"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className="flex items-center gap-4 relative z-10">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-500">
            <FileUp className="w-5 h-5" />
          </div>
          <div className="text-left">
            <p className="text-[15px] font-bold text-foreground flex items-center gap-2">
              Adicionar PDF
              {!gate.isPremium && <Lock className="w-3 h-3 text-muted-foreground" />}
            </p>
            <p className="text-[12px] text-muted-foreground mt-0.5">Sincronizado na nuvem</p>
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-muted-foreground relative z-10" />
      </button>

      {customPdfsList.length > 0 && (
        <div className="mt-3 space-y-2">
          {customPdfsList.map(pdf => (
            <div key={pdf.id} className="flex items-center gap-3 p-3 rounded-xl bg-card/50 border border-border/40 hover:bg-card/80 transition-colors cursor-pointer" onClick={() => handleOpenCustomPdf(pdf)}>
              <div className="w-12 h-16 rounded-md overflow-hidden bg-muted shrink-0 border border-border/50">
                {pdf.capaUrl ? (
                  <img src={pdf.capaUrl} alt="" className="w-full h-full object-cover" loading="lazy" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <BookOpen className="w-4 h-4 text-muted-foreground" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{pdf.titulo}</p>
                {pdf.autor && <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{pdf.autor}</p>}
                <p className="text-[10px] text-muted-foreground/70 mt-1 uppercase tracking-wider font-semibold">
                  Salvo em {new Date(pdf.createdAt).toLocaleDateString()}
                </p>
              </div>
              <button
                onClick={(e) => handleDeleteCustomPdf(e, pdf.id)}
                className="p-3 text-muted-foreground hover:text-red-500 transition-colors shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
      {gate.gateNode}

      <Dialog open={modalOpen} onOpenChange={(o) => !o && resetModal()}>
        <DialogContent className="sm:max-w-md w-[90vw] rounded-2xl p-6 border-border/60 bg-background/95 backdrop-blur-xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Salvar na Nuvem</DialogTitle>
            <DialogDescription className="text-[13px] text-muted-foreground">
              Preencha os dados para salvar o PDF na sua conta. Ele estará disponível em qualquer dispositivo.
            </DialogDescription>
          </DialogHeader>

          <div className="flex gap-4 items-start py-4">
            <div className="w-20 h-28 shrink-0 rounded-lg overflow-hidden bg-muted border border-border/50 relative flex flex-col items-center justify-center shadow-inner">
              {coverPreview ? (
                <img src={coverPreview} alt="Capa" className="w-full h-full object-cover" />
              ) : (
                <>
                  {isProcessing ? <Loader2 className="w-6 h-6 text-muted-foreground animate-spin mb-2" /> : <BookOpen className="w-6 h-6 text-muted-foreground mb-2" />}
                  <span className="text-[9px] text-muted-foreground font-semibold uppercase tracking-wider text-center px-1">
                    {isProcessing ? 'Extraindo Capa...' : 'Sem Capa'}
                  </span>
                </>
              )}
            </div>

            <div className="flex-1 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="titulo" className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Título do PDF</Label>
                <Input
                  id="titulo"
                  value={pdfTitle}
                  onChange={(e) => setPdfTitle(e.target.value)}
                  placeholder="Ex: Resumo de Penal"
                  className="h-10 text-sm rounded-xl"
                  autoComplete="off"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="autor" className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Autor (Opcional)</Label>
                <Input
                  id="autor"
                  value={pdfAuthor}
                  onChange={(e) => setPdfAuthor(e.target.value)}
                  placeholder="Nome do autor ou professor"
                  className="h-10 text-sm rounded-xl"
                  autoComplete="off"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="mt-2 sm:justify-between flex-row gap-2">
            <Button variant="ghost" onClick={resetModal} disabled={isUploading} className="rounded-xl h-12 flex-1 sm:flex-none">
              Cancelar
            </Button>
            <Button onClick={handleConfirmUpload} disabled={isUploading || !pdfTitle.trim()} className="rounded-xl h-12 font-bold px-8 flex-1 sm:flex-none">
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Salvar PDF'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default BibliotecaAtalhosBar;
