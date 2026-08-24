import { useEffect, useState } from 'react';
import {
  Loader2, Clock, Activity, Flame, Star, Calendar, Crown, Phone, Mail,
  GraduationCap, LayoutGrid, MessageCircle, MapPin, Trash2, X, Ban, ShieldAlert,
} from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { rotaParaFuncao, FEATURE_LABELS, formatarDuracao } from '@/lib/rotaFuncoes';
import { PushStatusUsuario } from '@/components/admin/PushStatusUsuario';

interface Props {
  userId: string | null;
  nome?: string | null;
  email?: string | null;
  provider?: string | null;
  onClose: () => void;
}

interface FuncaoStat {
  label: string;
  grupo: string;
  hits: number;
  segundos: number;
  ultimaVez: string;
}

interface Dossie {
  perfil: any;
  funcoes: FuncaoStat[];
  totalSegundos: number;
  segundosHoje: number;
  hitsHoje: number;
  sessoesHoje: number;
  sessoesTotal: number;
  primeiraHoje?: string | null;
  ultimaHoje?: string | null;
  features: { label: string; count: number }[];
  eventos: { label: string; count: number }[];
  contadores: { favoritos: number; grifos: number; anotacoes: number };
  assinatura: any;
  horus: any;
  horusStats: any;
  geo: {
    pais: string | null; uf: string | null; cidade: string | null;
    timezone: string | null; locale: string | null;
  };
  plataformas: [string, number][];
  ultimaSessao?: string | null;
  primeiraSessao?: string | null;
}

const GAP_MAX = 10 * 60 * 1000; // 10min entre pings = mesma sessão de tela

const hora = (v?: string | null) =>
  v ? new Date(v).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '—';
const dia = (v?: string | null) => (v ? new Date(v).toLocaleDateString('pt-BR') : '—');

export function UserDossieSheet({ userId, nome, email, provider, onClose }: Props) {
  const [loading, setLoading] = useState(false);
  const [d, setD] = useState<Dossie | null>(null);
  const [confirmar, setConfirmar] = useState<null | 'menu' | 'ban' | 'delete'>(null);
  const [executando, setExecutando] = useState(false);

  const executarAcao = async (acao: 'ban' | 'delete') => {
    if (!userId) return;
    setExecutando(true);
    try {
      const { data, error } = await supabase.rpc('admin_gerenciar_usuario' as any, {
        _user_id: userId,
        _acao: acao,
      });
      if (error || (data as any)?.error) throw new Error((data as any)?.error || error?.message);
      toast.success(acao === 'ban' ? 'Usuário banido — não poderá usar este e-mail' : 'Conta excluída definitivamente');
      setConfirmar(null);
      onClose();
    } catch (e: any) {
      toast.error('Não foi possível concluir', { description: e?.message });
    } finally {
      setExecutando(false);
    }
  };

  useEffect(() => {
    if (!userId) {
      setD(null);
      return;
    }
    let cancel = false;
    (async () => {
      setLoading(true);
      setD(null);
      const desde30 = new Date(Date.now() - 30 * 86400_000).toISOString();
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      const desdeHoje = hoje.toISOString();

      const [perfilR, logR, sessR, featR, evR, favR, grifR, anotR, assR, horusR, horusStatsR] = await Promise.all([
        supabase.from('profiles' as any).select('*').eq('id', userId).maybeSingle(),
        supabase.from('user_activity_log' as any)
          .select('current_route, last_seen_at')
          .eq('user_id', userId).gte('last_seen_at', desde30)
          .order('last_seen_at', { ascending: true }).limit(2000),
        supabase.from('user_sessions' as any)
          .select('started_at, platform, initial_route, pais, uf, cidade, timezone, locale')
          .eq('user_id', userId).gte('started_at', desde30)
          .order('started_at', { ascending: false }).limit(500),
        supabase.from('feature_usage' as any)
          .select('feature_key, used_at').eq('user_id', userId).gte('used_at', desde30).limit(2000),
        supabase.from('app_events' as any)
          .select('event_name').eq('user_id', userId).gte('created_at', desde30).limit(2000),
        supabase.from('artigos_favoritos' as any).select('id', { count: 'exact', head: true }).eq('user_id', userId),
        supabase.from('artigos_grifos' as any).select('id', { count: 'exact', head: true }).eq('user_id', userId),
        supabase.from('artigos_anotacoes' as any).select('id', { count: 'exact', head: true }).eq('user_id', userId),
        supabase.from('play_subscriptions' as any)
          .select('product_id, base_plan_id, status, expires_at, auto_renewing')
          .eq('user_id', userId).order('created_at', { ascending: false }).limit(1).maybeSingle(),
        supabase.from('horus_whatsapp_users' as any)
          .select('phone_e164, verified_at, msg_count, last_seen_at, first_seen_at, blocked, onboarding_state, nome_preferido, linked_at')
          .or(`user_id.eq.${userId},linked_user_id.eq.${userId}`)
          .order('verified_at', { ascending: false, nullsFirst: false })
          .limit(1).maybeSingle(),
        supabase.from('horus_user_stats' as any)
          .select('telefone, ultima_atividade_em, dias_streak_estudo')
          .eq('user_id', userId).maybeSingle(),
      ]);
      if (cancel) return;

      const logs = ((logR.data as any[]) || []);
      const byFunc = new Map<string, FuncaoStat>();
      let totalSegundos = 0;
      let segundosHoje = 0;
      let hitsHoje = 0;
      let primeiraHoje: string | null = null;
      let ultimaHoje: string | null = null;

      logs.forEach((row, i) => {
        const { label, grupo } = rotaParaFuncao(row.current_route);
        const t = new Date(row.last_seen_at).getTime();
        const next = logs[i + 1] ? new Date(logs[i + 1].last_seen_at).getTime() : t;
        const delta = Math.min(Math.max(next - t, 0), GAP_MAX) / 1000;
        const cur = byFunc.get(label) || { label, grupo, hits: 0, segundos: 0, ultimaVez: row.last_seen_at };
        cur.hits += 1;
        cur.segundos += delta;
        cur.ultimaVez = row.last_seen_at;
        byFunc.set(label, cur);
        totalSegundos += delta;
        if (row.last_seen_at >= desdeHoje) {
          hitsHoje += 1;
          segundosHoje += delta;
          if (!primeiraHoje) primeiraHoje = row.last_seen_at;
          ultimaHoje = row.last_seen_at;
        }
      });

      const sessoes = ((sessR.data as any[]) || []);
      const countBy = (arr: any[], key: string) => {
        const m = new Map<string, number>();
        arr.forEach((r) => m.set(r[key], (m.get(r[key]) || 0) + 1));
        return Array.from(m.entries()).sort((a, b) => b[1] - a[1]);
      };

      setD({
        perfil: perfilR.data,
        funcoes: Array.from(byFunc.values()).sort((a, b) => b.hits - a.hits),
        totalSegundos,
        segundosHoje,
        hitsHoje,
        sessoesHoje: sessoes.filter((s) => s.started_at >= desdeHoje).length,
        sessoesTotal: sessoes.length,
        primeiraHoje,
        ultimaHoje,
        features: countBy((featR.data as any[]) || [], 'feature_key')
          .map(([k, count]) => ({ label: FEATURE_LABELS[k] || k, count })),
        eventos: countBy((evR.data as any[]) || [], 'event_name')
          .map(([k, count]) => ({ label: k, count })).slice(0, 12),
        contadores: { favoritos: favR.count || 0, grifos: grifR.count || 0, anotacoes: anotR.count || 0 },
        assinatura: assR.data,
        horus: (horusR as any)?.data || null,
        horusStats: (horusStatsR as any)?.data || null,
        geo: {
          pais: sessoes.find((x) => x.pais)?.pais ?? (perfilR.data as any)?.pais ?? null,
          uf: sessoes.find((x) => x.uf)?.uf ?? (perfilR.data as any)?.uf ?? null,
          cidade: sessoes.find((x) => x.cidade)?.cidade ?? (perfilR.data as any)?.cidade ?? null,
          timezone: sessoes.find((x) => x.timezone)?.timezone ?? (perfilR.data as any)?.timezone ?? null,
          locale: sessoes.find((x) => x.locale)?.locale ?? (perfilR.data as any)?.locale ?? null,
        },
        plataformas: countBy(sessoes.filter((x) => x.platform), 'platform'),
        ultimaSessao: sessoes[0]?.started_at ?? null,
        primeiraSessao: sessoes[sessoes.length - 1]?.started_at ?? null,
      });
      setLoading(false);
    })();
    return () => {
      cancel = true;
    };
  }, [userId]);

  const maisAcessada = d?.funcoes[0];
  const maisEngajada = d ? [...d.funcoes].sort((a, b) => b.segundos - a.segundos)[0] : undefined;
  const perfilTipos: string[] = d?.perfil?.perfil_tipos || [];
  const maxHits = Math.max(1, ...(d?.funcoes || []).map((f) => f.hits));
  const telefone =
    d?.horus?.phone_e164 ||
    d?.perfil?.whatsapp_number ||
    d?.perfil?.telefone ||
    d?.horusStats?.telefone ||
    null;

  const horusVerificado = d?.horus?.verified_at || d?.horus?.linked_at || null;
  const horusVerificadoTipo = d?.horus?.verified_at ? 'Verificado' : d?.horus?.linked_at ? 'Verificado (vínculo)' : null;

  const Stat = ({ icon: Icon, label, value }: any) => (
    <div className="rounded-2xl border border-border/60 bg-secondary/30 px-3.5 py-3.5">
      <Icon className="w-5 h-5 text-primary mb-1.5" />
      <div className="font-display text-xl font-bold text-foreground leading-none">{value}</div>
      <div className="font-body text-[13px] text-muted-foreground mt-1.5 leading-snug">{label}</div>
    </div>
  );

  const Campo = ({ label, value }: { label: string; value: any }) => (
    <div>
      <div className="font-body text-[13px] text-muted-foreground">{label}</div>
      <div className="font-body text-[17px] font-semibold text-foreground leading-tight">{value}</div>
    </div>
  );

  return (
    <Sheet open={!!userId} onOpenChange={(v) => !v && onClose()}>
      <SheetContent
        side="bottom"
        className="rounded-t-2xl h-[90vh] max-h-[90vh] overflow-y-auto p-0 bg-background border-border"
      >
        <SheetHeader className="px-4 pt-6 pb-4 border-b border-border/50 text-left sticky top-0 bg-background z-10">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <SheetTitle className="font-display text-xl font-bold text-foreground truncate">
                {nome || email || 'Usuário'}
              </SheetTitle>
              <p className="font-body text-[14px] text-muted-foreground mt-1 truncate">
                {email || '—'} {provider ? `· ${provider}` : ''}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setConfirmar('menu')}
                aria-label="Excluir ou banir usuário"
                className="w-10 h-10 rounded-full border border-destructive/40 bg-destructive/10 text-destructive flex items-center justify-center hover:bg-destructive/20 active:bg-destructive/30 transition-colors"
              >
                <Trash2 className="w-4.5 h-4.5" />
              </button>
              <button
                type="button"
                onClick={onClose}
                aria-label="Fechar"
                className="w-10 h-10 rounded-full border border-border/60 bg-secondary/40 text-foreground flex items-center justify-center hover:bg-secondary active:bg-secondary/80 transition-colors"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>
          </div>
        </SheetHeader>


        {loading || !d ? (
          <div className="flex justify-center py-16 text-muted-foreground">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : (
          <div className="p-4 space-y-4 pb-12">
            <div className="grid grid-cols-3 gap-2.5">
              <Stat icon={Clock} label="Tempo de tela hoje" value={formatarDuracao(d.segundosHoje)} />
              <Stat icon={Activity} label="Entradas hoje" value={d.sessoesHoje || d.hitsHoje} />
              <Stat icon={Calendar} label="Tempo em 30 dias" value={formatarDuracao(d.totalSegundos)} />
            </div>

            <div className="rounded-2xl border border-border/60 bg-secondary/30 p-4 space-y-3">
              <div className="flex items-center gap-2 font-body text-[14px] font-medium text-muted-foreground">
                <Flame className="w-[18px] h-[18px] text-primary" /> Destaques
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="font-body text-[13px] text-muted-foreground">Função mais acessada</div>
                  <div className="font-body text-[17px] font-semibold text-foreground leading-tight">
                    {maisAcessada?.label || '—'}
                  </div>
                  <div className="font-body text-[13px] text-muted-foreground">
                    {maisAcessada ? `${maisAcessada.hits} acessos` : ''}
                  </div>
                </div>
                <div>
                  <div className="font-body text-[13px] text-muted-foreground">Maior engajamento</div>
                  <div className="font-body text-[17px] font-semibold text-foreground leading-tight">
                    {maisEngajada?.label || '—'}
                  </div>
                  <div className="font-body text-[13px] text-muted-foreground">
                    {maisEngajada ? formatarDuracao(maisEngajada.segundos) : ''}
                  </div>
                </div>
                <Campo label="Primeiro acesso hoje" value={hora(d.primeiraHoje)} />
                <Campo label="Último acesso hoje" value={hora(d.ultimaHoje)} />
              </div>
            </div>

            <div className="rounded-2xl border border-border/60 bg-secondary/30 p-4 space-y-3">
              <div className="flex items-center gap-2 font-body text-[14px] font-medium text-muted-foreground">
                <GraduationCap className="w-[18px] h-[18px] text-primary" /> Perfil
              </div>
              <div className="flex flex-wrap gap-2">
                {perfilTipos.length ? (
                  perfilTipos.map((t) => (
                    <span key={t} className="rounded-full border border-border/60 bg-background/60 px-3 py-1 font-body text-[13px] text-foreground">
                      {t}
                    </span>
                  ))
                ) : (
                  <span className="font-body text-[14px] text-muted-foreground">Não informado</span>
                )}
                {d.perfil?.faixa_etaria && (
                  <span className="rounded-full border border-border/60 bg-background/60 px-3 py-1 font-body text-[13px] text-foreground">
                    {d.perfil.faixa_etaria}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="flex items-center gap-2 font-body text-[15px] text-foreground">
                  <Crown className="w-4 h-4 text-muted-foreground shrink-0" /> {d.perfil?.is_premium ? 'Premium' : 'Gratuito'}
                </div>
                <div className="flex items-center gap-2 font-body text-[15px] text-foreground">
                  <Calendar className="w-4 h-4 text-muted-foreground shrink-0" /> Desde {dia(d.perfil?.created_at)}
                </div>
                <div className="flex items-center gap-2 font-body text-[15px] text-foreground truncate">
                  <Phone className="w-4 h-4 text-muted-foreground shrink-0" /> {telefone || 'Sem número (pulou no cadastro)'}
                </div>
                <div className="flex items-center gap-2 font-body text-[15px] text-foreground truncate">
                  <Mail className="w-4 h-4 text-muted-foreground shrink-0" /> <span className="truncate">{email || '—'}</span>
                </div>
              </div>
              {d.assinatura && (
                <div className="font-body text-[14px] text-muted-foreground pt-1">
                  Assinatura: {d.assinatura.base_plan_id || d.assinatura.product_id} ·{' '}
                  {String(d.assinatura.status || '').replace('SUBSCRIPTION_STATE_', '')}
                  {d.assinatura.expires_at ? ` · expira ${dia(d.assinatura.expires_at)}` : ''}
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-border/60 bg-secondary/30 p-4 space-y-3">
              <div className="flex items-center gap-2 font-body text-[14px] font-medium text-muted-foreground">
                <MapPin className="w-[18px] h-[18px] text-primary" /> Localização e dispositivo
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Campo label="País" value={d.geo.pais || 'Não capturado'} />
                <Campo label="Estado / região" value={d.geo.uf || '—'} />
                <Campo label="Cidade" value={d.geo.cidade || '—'} />
                <Campo label="Fuso horário" value={d.geo.timezone || '—'} />
                <Campo label="Idioma do aparelho" value={d.geo.locale || '—'} />
                <Campo
                  label="Plataformas"
                  value={
                    d.plataformas.length
                      ? d.plataformas.map(([p, n]) => `${p} (${n})`).join(', ')
                      : '—'
                  }
                />
                <Campo label="Primeira sessão" value={dia(d.primeiraSessao)} />
                <Campo label="Última sessão" value={`${dia(d.ultimaSessao)} ${hora(d.ultimaSessao)}`} />
                <Campo label="Sessões (30 dias)" value={d.sessoesTotal} />
                <Campo
                  label="Onboarding"
                  value={d.perfil?.onboarding_completed_at ? `Concluído ${dia(d.perfil.onboarding_completed_at)}` : 'Não concluído'}
                />
              </div>
              {!d.geo.pais && (
                <p className="font-body text-[13px] text-muted-foreground">
                  Sem localização registrada: o usuário ainda não abriu o app depois da coleta de país/estado.
                </p>
              )}
            </div>

            <div className="rounded-2xl border border-border/60 bg-secondary/30 p-4 space-y-3">
              <div className="flex items-center gap-2 font-body text-[14px] font-medium text-muted-foreground">
                <MessageCircle className="w-[18px] h-[18px] text-primary" /> Horus (WhatsApp)
              </div>
              {d.horus ? (
                <>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-border/60 bg-background/60 px-3 py-1 font-body text-[14px] text-foreground">
                      {d.horus.phone_e164 || telefone || '—'}
                    </span>
                    <span className={`rounded-full px-3 py-1 font-body text-[13px] font-medium ${horusVerificado ? 'bg-primary/15 text-primary' : 'bg-destructive/15 text-destructive'}`}>
                      {horusVerificado ? `${horusVerificadoTipo} · ${dia(horusVerificado)}` : 'Não verificado'}
                    </span>
                    {d.horus.blocked && (
                      <span className="rounded-full bg-destructive/15 px-3 py-1 font-body text-[13px] text-destructive">Bloqueado</span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <Campo label="Mensagens trocadas" value={d.horus.msg_count ?? 0} />
                    <Campo
                      label="Última interação"
                      value={d.horus.last_seen_at ? `${dia(d.horus.last_seen_at)} ${hora(d.horus.last_seen_at)}` : '—'}
                    />
                    <Campo label="Primeiro contato" value={dia(d.horus.first_seen_at)} />
                    <Campo label="Vinculado em" value={dia(d.horus.linked_at)} />
                  </div>
                  <div className="font-body text-[14px] text-muted-foreground">
                    {(d.horus.msg_count ?? 0) > 0 ? 'Interage com o Horus' : 'Ainda não conversou com o Horus'}
                  </div>
                </>
              ) : (
                <p className="font-body text-[15px] text-muted-foreground">
                  {telefone ? `Número ${telefone} sem vínculo verificado no Horus.` : 'Não vinculou número ao Horus.'}
                </p>
              )}
            </div>

            {userId && <PushStatusUsuario userId={userId} />}

            <div className="rounded-2xl border border-border/60 bg-secondary/30 p-4 space-y-3.5">
              <div className="flex items-center gap-2 font-body text-[14px] font-medium text-muted-foreground">
                <LayoutGrid className="w-[18px] h-[18px] text-primary" /> Funções percorridas (30 dias)
              </div>
              {d.funcoes.length === 0 ? (
                <p className="font-body text-[15px] text-muted-foreground">Sem registros.</p>
              ) : (
                d.funcoes.map((f) => (
                  <div key={f.label} className="space-y-1.5">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-body text-[16px] font-semibold text-foreground truncate">{f.label}</div>
                        <div className="font-body text-[13px] text-muted-foreground">{f.grupo}</div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-body text-[15px] text-foreground">{f.hits}x</div>
                        <div className="font-body text-[13px] text-muted-foreground">{formatarDuracao(f.segundos)}</div>
                      </div>
                    </div>
                    <div className="h-1.5 rounded-full bg-background/70 overflow-hidden">
                      <div className="h-full bg-primary/70" style={{ width: `${(f.hits / maxHits) * 100}%` }} />
                    </div>
                  </div>
                ))
              )}
            </div>

            {d.features.length > 0 && (
              <div className="rounded-2xl border border-border/60 bg-secondary/30 p-4 space-y-2.5">
                <div className="flex items-center gap-2 font-body text-[14px] font-medium text-muted-foreground">
                  <Activity className="w-[18px] h-[18px] text-primary" /> Recursos usados
                </div>
                {d.features.map((f) => (
                  <div key={f.label} className="flex items-center justify-between gap-3 min-h-[28px]">
                    <span className="font-body text-[15px] text-foreground truncate">{f.label}</span>
                    <span className="font-body text-[15px] font-semibold text-muted-foreground">{f.count}x</span>
                  </div>
                ))}
              </div>
            )}

            {d.eventos.length > 0 && (
              <div className="rounded-2xl border border-border/60 bg-secondary/30 p-4 space-y-2.5">
                <div className="font-body text-[14px] font-medium text-muted-foreground">Eventos registrados</div>
                {d.eventos.map((e) => (
                  <div key={e.label} className="flex items-center justify-between gap-3 min-h-[28px]">
                    <span className="font-body text-[15px] text-foreground truncate">{e.label}</span>
                    <span className="font-body text-[15px] font-semibold text-muted-foreground">{e.count}x</span>
                  </div>
                ))}
              </div>
            )}

            <div className="grid grid-cols-3 gap-2.5">
              <Stat icon={Star} label="Favoritos" value={d.contadores.favoritos} />
              <Stat icon={Star} label="Grifos" value={d.contadores.grifos} />
              <Stat icon={Star} label="Anotações" value={d.contadores.anotacoes} />
            </div>
          </div>
        )}
      </SheetContent>

      <Sheet open={!!confirmar} onOpenChange={(v) => !v && !executando && setConfirmar(null)}>
        <SheetContent side="bottom" className="rounded-t-2xl p-0 bg-background border-border">
          <div className="p-5 space-y-4">
            {confirmar === 'menu' ? (
              <>
                <div>
                  <div className="font-display text-lg font-bold text-foreground">Ações do usuário</div>
                  <p className="font-body text-[13px] text-muted-foreground mt-1 truncate">{email || nome}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setConfirmar('ban')}
                  className="w-full flex items-start gap-3 rounded-2xl border border-border/60 bg-secondary/30 px-4 py-4 text-left hover:bg-secondary/60 transition-colors"
                >
                  <Ban className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                  <div>
                    <div className="font-body text-[15px] font-semibold text-foreground">Banir usuário</div>
                    <div className="font-body text-[12.5px] text-muted-foreground mt-0.5">
                      Bloqueia o acesso e mantém o e-mail reservado — não poderá criar outra conta com ele.
                    </div>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmar('delete')}
                  className="w-full flex items-start gap-3 rounded-2xl border border-destructive/40 bg-destructive/10 px-4 py-4 text-left hover:bg-destructive/20 transition-colors"
                >
                  <Trash2 className="w-5 h-5 text-destructive mt-0.5 shrink-0" />
                  <div>
                    <div className="font-body text-[15px] font-semibold text-destructive">Excluir conta</div>
                    <div className="font-body text-[12.5px] text-muted-foreground mt-0.5">
                      Apaga a conta e todos os dados. O e-mail fica livre para um novo cadastro.
                    </div>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmar(null)}
                  className="w-full rounded-2xl border border-border/60 px-4 py-3 font-body text-[14px] text-muted-foreground"
                >
                  Cancelar
                </button>
              </>
            ) : (
              <>
                <div className="flex items-start gap-3">
                  <ShieldAlert className="w-6 h-6 text-destructive shrink-0" />
                  <div>
                    <div className="font-display text-lg font-bold text-foreground">
                      {confirmar === 'ban' ? 'Banir este usuário?' : 'Excluir a conta?'}
                    </div>
                    <p className="font-body text-[13px] text-muted-foreground mt-1">
                      {confirmar === 'ban'
                        ? 'Ele perde o acesso imediatamente e o e-mail continua bloqueado para novos cadastros.'
                        : 'Todos os dados serão apagados definitivamente. Esta ação não pode ser desfeita.'}
                    </p>
                    <p className="font-body text-[12.5px] text-foreground mt-2 truncate">{email || nome}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    disabled={executando}
                    onClick={() => setConfirmar('menu')}
                    className="rounded-2xl border border-border/60 px-4 py-3 font-body text-[14px] text-muted-foreground disabled:opacity-50"
                  >
                    Voltar
                  </button>
                  <button
                    type="button"
                    disabled={executando}
                    onClick={() => executarAcao(confirmar as 'ban' | 'delete')}
                    className="rounded-2xl bg-destructive px-4 py-3 font-body text-[14px] font-semibold text-destructive-foreground inline-flex items-center justify-center gap-2 disabled:opacity-60"
                  >
                    {executando && <Loader2 className="w-4 h-4 animate-spin" />}
                    {confirmar === 'ban' ? 'Banir' : 'Excluir'}
                  </button>
                </div>
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </Sheet>
  );
}


