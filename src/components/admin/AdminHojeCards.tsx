import { useCallback, useEffect, useState } from 'react';
import { Radio, UserPlus, Sparkles, Loader2, Mail, BarChart3, ChevronRight } from 'lucide-react';
import { SiGoogle, SiApple } from 'react-icons/si';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { UserDossieSheet } from './UserDossieSheet';
import { rotaParaFuncao } from '@/lib/rotaFuncoes';

type CardId = 'online' | 'cadastros' | 'trial';

interface Row {
  key: string;
  title: string;
  subtitle?: string | null;
  meta?: string | null;
  userId?: string | null;
  email?: string | null;
  provider?: string | null;
  acessos?: number | null;
}

const ProviderTag = ({ provider }: { provider?: string | null }) => {
  if (!provider) return null;
  const p = provider.toLowerCase();
  const cfg = p.includes('google')
    ? {
        label: 'Google',
        node: <SiGoogle className="w-3 h-3" />,
        bg: 'bg-[hsl(var(--provider-google))]',
        fg: 'text-[hsl(var(--provider-google-foreground))]',
        border: 'border-[hsl(var(--provider-google))]/30',
      }
    : p.includes('apple')
      ? {
          label: 'Apple',
          node: <SiApple className="w-3 h-3" />,
          bg: 'bg-[hsl(var(--provider-apple))]',
          fg: 'text-[hsl(var(--provider-apple-foreground))]',
          border: 'border-[hsl(var(--provider-apple))]/30',
        }
      : {
          label: 'E-mail',
          node: <Mail className="w-3 h-3" />,
          bg: 'bg-[hsl(var(--provider-email))]',
          fg: 'text-[hsl(var(--provider-email-foreground))]',
          border: 'border-[hsl(var(--provider-email))]/30',
        };
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-[2px] font-body text-[10px] shrink-0',
        cfg.bg,
        cfg.fg,
        cfg.border,
      )}
    >
      {cfg.node}
      {cfg.label}
    </span>
  );
};

const dayRange = (d: Date) => {
  const start = new Date(d);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start: start.toISOString(), end: end.toISOString() };
};

const isoDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

const hora = (v?: string | null) =>
  v ? new Date(v).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '';

const DIAS = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];

type Seen = { count: number; keys: string[] };

const seenStorageKey = (id: CardId, d: Date) => `admin_hoje_seen_${id}_${isoDate(d)}`;

const readSeen = (id: CardId, d: Date): Seen => {
  try {
    const raw = localStorage.getItem(seenStorageKey(id, d));
    if (!raw) return { count: 0, keys: [] };
    const parsed = JSON.parse(raw);
    return { count: parsed.count || 0, keys: Array.isArray(parsed.keys) ? parsed.keys : [] };
  } catch {
    return { count: 0, keys: [] };
  }
};

const writeSeen = (id: CardId, d: Date, seen: Seen) => {
  try {
    localStorage.setItem(seenStorageKey(id, d), JSON.stringify(seen));
  } catch {
    /* ignore */
  }
};

export function AdminHojeCards() {
  const [counts, setCounts] = useState<Record<CardId, number>>({ online: 0, cadastros: 0, trial: 0 });
  const [seenCounts, setSeenCounts] = useState<Record<CardId, number>>(() => {
    const hoje = new Date();
    return {
      online: readSeen('online', hoje).count,
      cadastros: readSeen('cadastros', hoje).count,
      trial: readSeen('trial', hoje).count,
    };
  });
  const [novosKeys, setNovosKeys] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState<CardId | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [dossie, setDossie] = useState<Row | null>(null);
  const [dia, setDia] = useState<Date>(() => new Date());
  const [totaisOpen, setTotaisOpen] = useState(false);
  const [totais, setTotais] = useState<any>(null);
  const [totaisLoading, setTotaisLoading] = useState(false);
  const [provOpen, setProvOpen] = useState<string | null>(null);
  const [provRows, setProvRows] = useState<Row[]>([]);
  const [provLoading, setProvLoading] = useState(false);


  const abrirProvider = useCallback(
    async (p: string) => {
      setProvOpen(p);
      setProvLoading(true);
      setProvRows([]);
      try {
        const { data } = await supabase.rpc('admin_lista_provider' as any, {
          _tipo: open || 'cadastros',
          _provider: p,
        });
        setProvRows(
          ((data as any[]) || []).map((r) => ({
            key: r.user_id,
            userId: r.user_id,
            title: r.nome || 'Usuário',
            email: r.email,
            subtitle: r.email,
            provider: r.provider,
            meta: r.criado_em ? new Date(r.criado_em).toLocaleDateString('pt-BR') : '',
          })),
        );
      } finally {
        setProvLoading(false);
      }
    },
    [open],
  );

  const abrirTotais = useCallback(async () => {
    if (!open) return;
    setTotaisOpen(true);
    setTotaisLoading(true);
    setTotais(null);
    try {
      const { data } = await supabase.rpc('admin_totais' as any, { _tipo: open });
      setTotais(data as any);
    } finally {
      setTotaisLoading(false);
    }
  }, [open]);

  const load = useCallback(async () => {
    const hoje = new Date();
    const { data } = await supabase.rpc('admin_metricas_dia' as any, { _dia: isoDate(hoje) });
    const m = (data as any) || {};
    const novos: Record<CardId, number> = { online: m.online || 0, cadastros: m.cadastros || 0, trial: m.trial || 0 };
    setCounts(novos);
    // Primeira visita do dia: considera tudo como já visto (sem badge)
    (['online', 'cadastros', 'trial'] as CardId[]).forEach((id) => {
      if (!localStorage.getItem(seenStorageKey(id, hoje))) {
        writeSeen(id, hoje, { count: novos[id], keys: [] });
        setSeenCounts((c) => ({ ...c, [id]: novos[id] }));
      }
    });
  }, []);


  useEffect(() => {
    load();
    const t = setInterval(load, 30_000);
    return () => clearInterval(t);
  }, [load]);

  const fetchRows = useCallback(async (id: CardId, date: Date) => {
    setLoading(true);
    setRows([]);
    try {
      const { data } = await supabase.rpc('admin_lista_dia' as any, { _tipo: id, _dia: isoDate(date) });
      const list = ((data as any[]) || []).map((r) => ({
        key: r.key,
        userId: r.user_id,
        title: r.title || 'Usuário',
        email: r.email || null,
        subtitle: id === 'online' ? rotaParaFuncao(r.subtitle).label : r.subtitle,
        meta: hora(r.at),
        acessos: typeof r.acessos === 'number' ? r.acessos : null,
      }));
      setRows(list);
      if (sameDay(date, new Date())) {
        const seen = readSeen(id, date);
        const anteriores = new Set(seen.keys);
        const novos = seen.keys.length === 0 ? new Set<string>() : new Set(list.filter((r) => !anteriores.has(r.key)).map((r) => r.key));
        setNovosKeys(novos);
        writeSeen(id, date, { count: list.length, keys: list.map((r) => r.key) });
        setSeenCounts((c) => ({ ...c, [id]: list.length }));
      } else {
        setNovosKeys(new Set());
      }
      const ids = Array.from(new Set(list.map((r) => r.userId).filter(Boolean))) as string[];
      if (ids.length) {
        const { data: provs } = await supabase.rpc('admin_user_auth_providers' as any, { _ids: ids });
        const map = new Map<string, string>(((provs as any[]) || []).map((p) => [p.user_id, p.provider]));
        setRows((current) => current.map((r) => ({ ...r, provider: map.get(r.userId || r.key) || r.provider })));
      }
    } finally {
      setLoading(false);
    }
  }, []);


  const openCard = useCallback((id: CardId) => {
    const hoje = new Date();
    setOpen(id);
    setDia(hoje);
    fetchRows(id, hoje);
  }, [fetchRows]);

  // Deep link vindo do push do admin: /admin-funcoes?card=cadastros|trial|online
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const card = params.get('card');
    if (card === 'cadastros' || card === 'trial' || card === 'online') {
      openCard(card);
      params.delete('card');
      const qs = params.toString();
      window.history.replaceState({}, '', window.location.pathname + (qs ? `?${qs}` : ''));
    }
  }, [openCard]);




  const selecionarDia = (d: Date) => {
    setDia(d);
    if (open) fetchRows(open, d);
  };

  const dias = Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - i);
    return d;
  });


  const CARDS: { id: CardId; label: string; icon: any }[] = [
    { id: 'online', label: 'Online hoje', icon: Radio },
    { id: 'cadastros', label: 'Cadastrados hoje', icon: UserPlus },
    { id: 'trial', label: 'Iniciou teste', icon: Sparkles },
  ];

  const titles: Record<CardId, string> = {
    online: 'Online',
    cadastros: 'Cadastrados',
    trial: 'Iniciaram assinatura teste',
  };

  const hoje = new Date();
  const ontem = new Date();
  ontem.setDate(ontem.getDate() - 1);
  const rotuloDia = sameDay(dia, hoje)
    ? 'Hoje'
    : sameDay(dia, ontem)
      ? 'Ontem'
      : dia.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' });

  return (
    <>
      <div className="grid grid-cols-3 gap-2 mb-3">
        {CARDS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => openCard(id)}
            className="relative rounded-2xl border border-border/60 bg-secondary/30 px-2.5 py-3 text-left hover:bg-secondary/60 active:bg-secondary transition-colors"
          >
            {counts[id] - (seenCounts[id] || 0) > 0 && (
              <span className="absolute top-2 right-2 inline-flex items-center rounded-full bg-emerald-500/15 border border-emerald-500/40 px-1.5 py-[1px] font-body text-[10px] font-bold text-emerald-400 animate-pulse">
                +{counts[id] - (seenCounts[id] || 0)}
              </span>
            )}
            <Icon className="w-4 h-4 text-primary mb-1.5" />
            <div className="font-display text-xl font-bold text-foreground leading-none">{counts[id]}</div>
            <div className="font-body text-[10.5px] text-muted-foreground mt-1 leading-tight">{label}</div>
          </button>

        ))}
      </div>

      <Sheet open={!!open} onOpenChange={(v) => !v && setOpen(null)}>
        <SheetContent side="bottom" className="rounded-t-2xl h-[90vh] max-h-[90vh] overflow-y-auto p-0 bg-background border-border">
          <SheetHeader className="px-4 pt-5 pb-3 border-b border-border/50 text-left">
            <div className="flex items-start justify-between gap-3 pr-9">
              <div className="min-w-0">
                <SheetTitle className="font-display text-base font-bold text-foreground">
                  {open ? `${titles[open]} · ${rotuloDia}` : ''}
                </SheetTitle>
                <p className="font-body text-[11.5px] text-muted-foreground mt-0.5">
                  {loading ? 'Carregando…' : `${rows.length} registro${rows.length === 1 ? '' : 's'}`}
                </p>
              </div>
              <button
                type="button"
                onClick={abrirTotais}
                className="shrink-0 inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-3 py-1.5 font-body text-[12px] font-semibold text-primary hover:bg-primary/20 active:bg-primary/30 transition-colors"
              >
                <BarChart3 className="w-3.5 h-3.5" />
                Totais
              </button>
            </div>
          </SheetHeader>


          <div className="border-b border-border/50 bg-background/95 sticky top-0 z-10">
            <div className="flex gap-2 overflow-x-auto px-3 py-3 scrollbar-none">
              {dias.map((d) => {
                const ativo = sameDay(d, dia);
                const ehHoje = sameDay(d, hoje);
                const ehOntem = sameDay(d, ontem);
                return (
                  <button
                    key={d.toISOString()}
                    type="button"
                    onClick={() => selecionarDia(d)}
                    className={cn(
                      'shrink-0 min-w-[64px] rounded-2xl border px-3 py-2.5 text-center transition-colors',
                      ativo
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-secondary/30 border-border/60 text-muted-foreground hover:bg-secondary/60',
                    )}
                  >
                    <div className="font-body text-[10.5px] uppercase tracking-wide opacity-80">
                      {ehHoje ? 'Hoje' : ehOntem ? 'Ontem' : DIAS[d.getDay()]}
                    </div>
                    <div className={cn('font-display text-lg font-bold leading-none mt-1', ativo ? '' : 'text-foreground')}>
                      {String(d.getDate()).padStart(2, '0')}
                    </div>
                    <div className="font-body text-[10px] opacity-70 mt-0.5">
                      {d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="p-3">
            {loading ? (
              <div className="flex justify-center py-10 text-muted-foreground">
                <Loader2 className="w-5 h-5 animate-spin" />
              </div>
            ) : rows.length === 0 ? (
              <p className="font-body text-sm text-muted-foreground text-center py-10">
                Nenhum registro em {rotuloDia.toLowerCase()}.
              </p>
            ) : (
              <div className="rounded-2xl border border-border/60 bg-secondary/30 divide-y divide-border/50 overflow-hidden">
                {rows.map((r) => (
                  <button
                    key={r.key}
                    type="button"
                    onClick={() => r.userId && setDossie(r)}
                    className={cn(
                      'w-full text-left flex items-center gap-3 px-4 py-3 hover:bg-secondary/60 active:bg-secondary transition-colors',
                      novosKeys.has(r.key) && 'bg-emerald-500/10',
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="font-body text-sm font-semibold text-foreground truncate">{r.title}</div>
                        {typeof r.acessos === 'number' && r.acessos > 0 && (
                          <span
                            title={`${r.acessos} acesso${r.acessos === 1 ? '' : 's'} no dia`}
                            className="shrink-0 rounded-full bg-primary/15 border border-primary/40 px-1.5 py-[1px] font-body text-[9.5px] font-bold text-primary"
                          >
                            {r.acessos}x
                          </span>
                        )}
                        {novosKeys.has(r.key) && (
                          <span className="shrink-0 rounded-full bg-emerald-500/15 border border-emerald-500/40 px-1.5 py-[1px] font-body text-[9.5px] font-bold text-emerald-400">
                            NOVO
                          </span>
                        )}
                      </div>
                      {r.subtitle && (
                        <div className="font-body text-[11px] text-muted-foreground truncate">{r.subtitle}</div>
                      )}
                    </div>
                    <ProviderTag provider={r.provider} />
                    <div className="font-body text-[11px] text-muted-foreground shrink-0">{r.meta}</div>
                  </button>
                ))}

              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={totaisOpen} onOpenChange={setTotaisOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl h-[92vh] max-h-[92vh] overflow-y-auto p-0 bg-background border-border">
          <SheetHeader className="px-4 pt-5 pb-3 border-b border-border/50 text-left">
            <SheetTitle className="font-display text-base font-bold text-foreground">
              {open ? `Totais · ${titles[open]}` : 'Totais'}
            </SheetTitle>
            <p className="font-body text-[11.5px] text-muted-foreground mt-0.5">Métricas gerais acumuladas</p>
          </SheetHeader>

          <div className="p-3 space-y-3">
            {totaisLoading || !totais ? (
              <div className="flex justify-center py-12 text-muted-foreground">
                <Loader2 className="w-5 h-5 animate-spin" />
              </div>
            ) : totais.error ? (
              <p className="font-body text-sm text-muted-foreground text-center py-10">Acesso restrito a administradores.</p>
            ) : (
              <>
                <div className="rounded-2xl border border-primary/40 bg-primary/10 px-4 py-5 text-center">
                  <div className="font-display text-4xl font-bold text-primary leading-none">{totais.total ?? 0}</div>
                  <div className="font-body text-[12px] text-muted-foreground mt-1.5">Total acumulado</div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {[
                    { l: 'Hoje', v: totais.hoje },
                    { l: '7 dias', v: totais.d7 },
                    { l: '30 dias', v: totais.d30 },
                  ].map((x) => (
                    <div key={x.l} className="rounded-2xl border border-border/60 bg-secondary/30 px-3 py-3 text-center">
                      <div className="font-display text-xl font-bold text-foreground leading-none">{x.v ?? 0}</div>
                      <div className="font-body text-[11px] text-muted-foreground mt-1">{x.l}</div>
                    </div>
                  ))}
                </div>

                <div className="rounded-2xl border border-border/60 bg-secondary/30 p-4">
                  <div className="font-body text-[13px] font-semibold text-foreground mb-3">Origem da conta</div>
                  <div className="space-y-2.5">
                    {(['google', 'apple', 'email'] as const).map((p) => {
                      const v = Number(totais.providers?.[p] || 0);
                      const tot = Math.max(1, Number(totais.total || 1));
                      const pct = Math.round((v / tot) * 100);
                      return (
                        <button
                          key={p}
                          type="button"
                          onClick={() => abrirProvider(p)}
                          className="w-full text-left rounded-xl px-1 py-1 hover:bg-secondary/60 active:bg-secondary transition-colors"
                        >
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <ProviderTag provider={p} />
                            <span className="font-body text-[12.5px] text-foreground inline-flex items-center gap-1">
                              {v} <span className="text-muted-foreground">({pct}%)</span>
                              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                            </span>
                          </div>
                          <div className="h-1.5 rounded-full bg-border/60 overflow-hidden">
                            <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {[
                    { l: 'Premium', v: totais.premium },
                    { l: 'Com número', v: totais.com_telefone },
                    { l: 'Onboarding', v: totais.onboarding },
                  ].map((x) => (
                    <div key={x.l} className="rounded-2xl border border-border/60 bg-secondary/30 px-3 py-3 text-center">
                      <div className="font-display text-xl font-bold text-foreground leading-none">{x.v ?? 0}</div>
                      <div className="font-body text-[11px] text-muted-foreground mt-1">{x.l}</div>
                    </div>
                  ))}
                </div>

                {Array.isArray(totais.paises) && totais.paises.length > 0 && (
                  <div className="rounded-2xl border border-border/60 bg-secondary/30 divide-y divide-border/50 overflow-hidden">
                    <div className="px-4 py-3 font-body text-[13px] font-semibold text-foreground">Países</div>
                    {totais.paises.map((p: any) => (
                      <div key={p.pais} className="flex items-center justify-between px-4 py-2.5">
                        <span className="font-body text-[13px] text-foreground truncate">{p.pais}</span>
                        <span className="font-body text-[13px] text-muted-foreground">{p.total}</span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={!!provOpen} onOpenChange={(v) => !v && setProvOpen(null)}>
        <SheetContent side="bottom" className="rounded-t-2xl h-[90vh] max-h-[90vh] overflow-y-auto p-0 bg-background border-border">
          <SheetHeader className="px-4 pt-5 pb-3 border-b border-border/50 text-left">
            <SheetTitle className="font-display text-base font-bold text-foreground">
              Contas · {provOpen === 'google' ? 'Google' : provOpen === 'apple' ? 'Apple' : 'E-mail'}
            </SheetTitle>
            <p className="font-body text-[11.5px] text-muted-foreground mt-0.5">
              {provLoading ? 'Carregando…' : `${provRows.length} usuário${provRows.length === 1 ? '' : 's'}`}
            </p>
          </SheetHeader>
          <div className="p-3">
            {provLoading ? (
              <div className="flex justify-center py-10 text-muted-foreground">
                <Loader2 className="w-5 h-5 animate-spin" />
              </div>
            ) : provRows.length === 0 ? (
              <p className="font-body text-sm text-muted-foreground text-center py-10">Nenhum usuário.</p>
            ) : (
              <div className="rounded-2xl border border-border/60 bg-secondary/30 divide-y divide-border/50 overflow-hidden">
                {provRows.map((r) => (
                  <button
                    key={r.key}
                    type="button"
                    onClick={() => setDossie(r)}
                    className="w-full text-left flex items-center gap-3 px-4 py-3 hover:bg-secondary/60 active:bg-secondary transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-body text-sm font-semibold text-foreground truncate">{r.title}</div>
                      {r.subtitle && (
                        <div className="font-body text-[11px] text-muted-foreground truncate">{r.subtitle}</div>
                      )}
                    </div>
                    <ProviderTag provider={r.provider} />
                    <div className="font-body text-[11px] text-muted-foreground shrink-0">{r.meta}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>


      <UserDossieSheet
        userId={dossie?.userId || null}
        nome={dossie?.title}
        email={dossie?.email}
        provider={dossie?.provider}
        onClose={() => setDossie(null)}
      />
    </>
  );
}
