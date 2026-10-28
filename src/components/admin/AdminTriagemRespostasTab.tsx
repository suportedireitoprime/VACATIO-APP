import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Users, RefreshCw, Calendar, Sparkles } from 'lucide-react';
import { UserDossieSheet } from '@/components/admin/UserDossieSheet';

interface TriagemRegistro {
  id: string;
  user_id: string;
  nome: string | null;
  categoria: string;
  genero: string | null;
  persona_label: string | null;
  faixa_etaria: string | null;
  dor_id: string | null;
  dor_label: string | null;
  dor_solucao: string | null;
  created_at: string;
  // Campos enriquecidos
  email?: string | null;
  avatar_url?: string | null;
  provider?: string | null;
}

export function AdminTriagemRespostasTab() {
  const [registros, setRegistros] = useState<TriagemRegistro[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<TriagemRegistro | null>(null);

  const fetchRespostas = async () => {
    setLoading(true);
    try {
      // 1. Busca respostas da triagem
      const { data: triagens, error } = await supabase
        .from('triagem_respostas' as any)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);

      if (error) {
        console.error('Erro ao buscar triagens:', error);
        setRegistros([]);
        return;
      }

      const rows: TriagemRegistro[] = (triagens as any[]) || [];
      const userIds = Array.from(new Set(rows.map((r) => r.user_id).filter(Boolean)));

      if (userIds.length > 0) {
        // 2. Busca avatar e dados de profiles
        const { data: profiles } = await supabase
          .from('profiles' as any)
          .select('id, avatar_url, display_name, faixa_etaria')
          .in('id', userIds);

        // 3. Busca provedor auth
        const { data: provs } = await supabase.rpc('admin_user_auth_providers' as any, { _ids: userIds });

        const profileMap = new Map<string, any>((profiles || []).map((p: any) => [p.id, p]));
        const provMap = new Map<string, string>((provs || []).map((p: any) => [p.user_id, p.provider]));

        const enriched = rows.map((r) => {
          const prof = profileMap.get(r.user_id);
          return {
            ...r,
            avatar_url: prof?.avatar_url || null,
            faixa_etaria: r.faixa_etaria || prof?.faixa_etaria || null,
            provider: provMap.get(r.user_id) || null,
          };
        });

        setRegistros(enriched);
      } else {
        setRegistros(rows);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRespostas();
  }, []);

  const getGeneroBadge = (g?: string | null) => {
    if (g === 'f') return <span className="text-[11px] px-2 py-0.5 rounded-full bg-pink-500/15 border border-pink-500/30 text-pink-400 font-bold">Feminino (👩‍⚖️)</span>;
    if (g === 'm') return <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-500/15 border border-blue-500/30 text-blue-400 font-bold">Masculino (👨‍⚖️)</span>;
    return <span className="text-[11px] px-2 py-0.5 rounded-full bg-zinc-500/15 border border-zinc-500/30 text-zinc-400 font-bold">Unissex</span>;
  };

  const formatData = (dStr: string) => {
    try {
      const d = new Date(dStr);
      return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
    } catch {
      return dStr;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Cadastros com Triagem Realizada ({registros.length})
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Dados de momento, categoria, gênero e idade coletados no cadastro.
          </p>
        </div>
        <button
          onClick={fetchRespostas}
          disabled={loading}
          className="h-9 px-3 rounded-xl border border-border bg-secondary/40 text-xs font-semibold flex items-center gap-1.5 hover:bg-secondary transition active:scale-95"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16 text-muted-foreground">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : registros.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-8 text-center">
          <Sparkles className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm font-semibold text-foreground">Nenhuma resposta registrada ainda</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
            Assim que os novos usuários completarem a triagem no cadastro, suas escolhas de perfil, foto e idade aparecerão aqui.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-border/60 bg-secondary/30 divide-y divide-border/50 overflow-hidden">
          {registros.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setSelectedUser(r)}
              className="w-full text-left flex items-start gap-3.5 p-4 hover:bg-secondary/60 active:bg-secondary transition-colors cursor-pointer"
            >
              {/* Foto de Avatar Real ou Fallback */}
              {r.avatar_url ? (
                <img
                  src={r.avatar_url}
                  alt=""
                  referrerPolicy="no-referrer"
                  className="w-11 h-11 shrink-0 rounded-full object-cover bg-muted border border-border/60"
                  onError={(e) => (e.currentTarget.style.display = 'none')}
                />
              ) : (
                <div className="w-11 h-11 shrink-0 rounded-full bg-secondary border border-border/60 flex items-center justify-center font-display text-[16px] font-bold text-muted-foreground uppercase">
                  {(r.nome || 'U').charAt(0)}
                </div>
              )}

              {/* Informações Centrais */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-body text-sm font-bold text-foreground">
                    {r.nome || 'Usuário'}
                  </span>
                  <span className="text-[12px] font-bold px-2 py-0.5 rounded-full bg-primary/15 border border-primary/30 text-primary">
                    {r.persona_label || r.categoria}
                  </span>
                  {getGeneroBadge(r.genero)}
                </div>

                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1.5 flex-wrap">
                  {r.faixa_etaria && (
                    <span className="inline-flex items-center gap-1 font-medium text-foreground/80">
                      🎂 {r.faixa_etaria}
                    </span>
                  )}
                  {r.dor_label && (
                    <span className="truncate max-w-[220px]">
                      🎯 {r.dor_label}
                    </span>
                  )}
                </div>
              </div>

              {/* Data e Provedor */}
              <div className="text-right shrink-0 flex flex-col items-end gap-1">
                <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {formatData(r.created_at)}
                </span>
                {r.provider && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-medium uppercase">
                    {r.provider}
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Dossiê completo ao clicar */}
      {selectedUser && (
        <UserDossieSheet
          userId={selectedUser.user_id}
          nome={selectedUser.nome}
          email={selectedUser.email}
          provider={selectedUser.provider}
          onClose={() => setSelectedUser(null)}
        />
      )}
    </div>
  );
}
