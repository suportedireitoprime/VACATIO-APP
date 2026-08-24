import { useEffect, useRef, useState } from 'react';
import { List, Volume2, Pause, Play, Square, Loader2, Info } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { AulaNarrator, listarVozes, type NarradorEstado, type NarradorVoz } from '@/lib/aulaNarrator';

const STORAGE_KEY = 'aprender:narracao:v1';

type Prefs = { vozId?: string; rate: number };
const loadPrefs = (): Prefs => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { rate: 0.95, ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return { rate: 0.95 };
};
const savePrefs = (p: Prefs) => {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(p)); } catch { /* ignore */ }
};

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  textoBlocoAtual: string;
  onAbrirSumario: () => void;
  /** identidade do bloco atual — quando muda, a narração é cancelada. */
  blocoKey: string;
};

export function AulaSettingsSheet({
  open,
  onOpenChange,
  textoBlocoAtual,
  onAbrirSumario,
  blocoKey,
}: Props) {
  const narratorRef = useRef<AulaNarrator | null>(null);
  const [vozes, setVozes] = useState<NarradorVoz[]>([]);
  const [prefs, setPrefs] = useState<Prefs>(() => loadPrefs());
  const [estado, setEstado] = useState<NarradorEstado>('parado');
  const [carregandoVozes, setCarregandoVozes] = useState(true);

  // Instancia narrador
  useEffect(() => {
    const n = new AulaNarrator();
    narratorRef.current = n;
    n.observar({ onState: setEstado });
    return () => {
      n.parar();
    };
  }, []);

  // Carrega vozes (podem chegar assíncronas)
  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setCarregandoVozes(false);
      return;
    }
    const carregar = () => {
      const lista = listarVozes();
      if (lista.length > 0) {
        setVozes(lista);
        setCarregandoVozes(false);
        setPrefs((p) => {
          if (p.vozId && lista.some((v) => v.id === p.vozId)) return p;
          const nova = { ...p, vozId: lista[0].id };
          savePrefs(nova);
          return nova;
        });
      }
    };
    carregar();
    window.speechSynthesis.addEventListener('voiceschanged', carregar);
    const t = setTimeout(() => setCarregandoVozes(false), 1500);
    return () => {
      window.speechSynthesis.removeEventListener('voiceschanged', carregar);
      clearTimeout(t);
    };
  }, []);

  // Aplica prefs no narrador
  useEffect(() => {
    narratorRef.current?.configurar({ vozId: prefs.vozId, rate: prefs.rate });
  }, [prefs.vozId, prefs.rate]);

  // Para narração ao mudar de bloco
  useEffect(() => {
    narratorRef.current?.parar();
  }, [blocoKey]);

  const suportado = typeof window !== 'undefined' && 'speechSynthesis' in window;

  const play = async () => {
    if (!suportado || !textoBlocoAtual.trim()) return;
    await narratorRef.current?.falar(textoBlocoAtual);
  };
  const pause = () => narratorRef.current?.pausar();
  const resume = () => narratorRef.current?.retomar();
  const stop = () => narratorRef.current?.parar();

  const setRate = (r: number) => {
    setPrefs((p) => {
      const nova = { ...p, rate: r };
      savePrefs(nova);
      return nova;
    });
    // se estiver falando, reinicia com a nova velocidade
    if (estado === 'falando') {
      narratorRef.current?.parar();
      setTimeout(() => narratorRef.current?.falar(textoBlocoAtual), 150);
    }
  };

  const setVoz = (id: string) => {
    setPrefs((p) => {
      const nova = { ...p, vozId: id };
      savePrefs(nova);
      return nova;
    });
    if (estado === 'falando') {
      narratorRef.current?.parar();
      setTimeout(() => narratorRef.current?.falar(textoBlocoAtual), 150);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-auto max-h-[85vh] rounded-t-2xl p-0">
        <SheetHeader className="border-b border-border p-4">
          <SheetTitle className="text-left text-lg">Configurações da aula</SheetTitle>
        </SheetHeader>

        <div className="overflow-y-auto p-4 space-y-6">
          {/* Sumário */}
          <button
            onClick={() => {
              onOpenChange(false);
              // pequeno delay pra Sheet fechar antes de abrir o outro
              setTimeout(() => onAbrirSumario(), 200);
            }}
            className="flex w-full items-center gap-4 rounded-xl border border-border p-4 text-left hover:bg-accent min-h-14"
          >
            <span
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-black"
              style={{ background: '#EFE039' }}
            >
              <List className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-base font-semibold text-foreground">Sumário da aula</p>
              <p className="text-sm text-muted-foreground">Ver todos os blocos e ir para qualquer um.</p>
            </div>
          </button>

          {/* Narração */}
          <section className="rounded-xl border border-border p-4">
            <div className="flex items-center gap-3 mb-3">
              <span
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-black"
                style={{ background: '#EFE039' }}
              >
                <Volume2 className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-base font-semibold text-foreground">Narração</p>
                <p className="text-sm text-muted-foreground">Voz gratuita do dispositivo — leitura humanizada.</p>
              </div>
            </div>

            {!suportado ? (
              <p className="mt-2 flex items-start gap-2 rounded-lg bg-muted p-3 text-sm text-muted-foreground">
                <Info className="mt-0.5 h-4 w-4 shrink-0" />
                Seu navegador não permite narração automática. Tente pelo Chrome no Android ou desktop.
              </p>
            ) : (
              <>
                {/* Controles play/pause/stop */}
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {estado !== 'falando' ? (
                    <button
                      onClick={estado === 'pausado' ? resume : play}
                      className="col-span-2 flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 min-h-12 text-[15px] font-semibold text-primary-foreground hover:opacity-90 active:scale-95 transition-transform"
                    >
                      <Play className="h-5 w-5" />
                      {estado === 'pausado' ? 'Continuar' : 'Ouvir agora'}
                    </button>
                  ) : (
                    <button
                      onClick={pause}
                      className="col-span-2 flex items-center justify-center gap-2 rounded-xl border-2 border-primary/50 bg-primary/10 px-4 py-3 min-h-12 text-[15px] font-semibold text-foreground hover:bg-primary/20 active:scale-95 transition-transform"
                    >
                      <Pause className="h-5 w-5" />
                      Pausar
                    </button>
                  )}
                  <button
                    onClick={stop}
                    disabled={estado === 'parado'}
                    className="flex items-center justify-center gap-2 rounded-xl border border-border px-4 py-3 min-h-12 text-[15px] font-semibold text-foreground hover:bg-accent disabled:opacity-40 active:scale-95 transition-transform"
                  >
                    <Square className="h-4 w-4" />
                    Parar
                  </button>
                </div>

                {/* Velocidade */}
                <div className="mt-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                    Velocidade
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { v: 0.9, l: 'Lenta' },
                      { v: 1.0, l: 'Normal' },
                      { v: 1.15, l: 'Rápida' },
                    ].map((op) => (
                      <button
                        key={op.v}
                        onClick={() => setRate(op.v)}
                        className={`rounded-xl border px-3 py-2 min-h-11 text-sm font-semibold transition-colors ${
                          Math.abs(prefs.rate - op.v) < 0.03
                            ? 'border-primary bg-primary/10 text-foreground'
                            : 'border-border text-muted-foreground hover:bg-accent'
                        }`}
                      >
                        {op.l}
                        <span className="ml-1 text-xs opacity-60">{op.v}×</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Voz */}
                <div className="mt-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                    Voz
                  </p>
                  {carregandoVozes && vozes.length === 0 ? (
                    <div className="flex items-center gap-2 rounded-lg bg-muted p-3 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Carregando vozes disponíveis…
                    </div>
                  ) : vozes.length === 0 ? (
                    <p className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">
                      Nenhuma voz em português foi encontrada neste dispositivo.
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                      {vozes.map((v) => {
                        const sel = prefs.vozId === v.id;
                        return (
                          <button
                            key={v.id}
                            onClick={() => setVoz(v.id)}
                            className={`flex w-full items-center gap-3 rounded-lg border p-3 min-h-12 text-left transition-colors ${
                              sel
                                ? 'border-primary bg-primary/10'
                                : 'border-border hover:bg-accent'
                            }`}
                          >
                            <span
                              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                                v.fornecedor === 'google'
                                  ? 'bg-primary text-primary-foreground'
                                  : 'bg-muted text-muted-foreground'
                              }`}
                            >
                              {v.fornecedor === 'google' ? 'G' : 'S'}
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-semibold text-foreground">
                                {v.nome}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {v.fornecedor === 'google' ? 'Google' : 'Sistema'}
                                {v.genero !== 'desconhecido' && ` · ${v.genero}`}
                                {' · '}
                                {v.lang}
                              </p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            )}
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}
