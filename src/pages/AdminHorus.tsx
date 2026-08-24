import { useNavigate, useSearchParams } from 'react-router-dom';
import { PageHeader } from '@/components/vademecum/PageHeader';
import { MessageCircle, Settings, Sparkles, MessagesSquare, Megaphone, Bell, BarChart3, Dumbbell, Trophy, ChevronRight, Radio } from 'lucide-react';
import { HorusAdminTab } from '@/components/admin/horus/HorusAdminTab';
import { HorusFuncoesTab } from '@/components/admin/horus/HorusFuncoesTab';
import { HorusConversasTab } from '@/components/admin/horus/HorusConversasTab';
import { HorusMarketingTab } from '@/components/admin/horus/HorusMarketingTab';
import { HorusNotificacoesTab } from '@/components/admin/horus/HorusNotificacoesTab';
import { HorusEstatisticasTab } from '@/components/admin/horus/HorusEstatisticasTab';
import { HorusPoderesTab } from '@/components/admin/horus/HorusPoderesTab';
import { HorusRankingTab } from '@/components/admin/horus/HorusRankingTab';
import { HorusCanalTab } from '@/components/admin/horus/HorusCanalTab';

const SECTIONS = [
  { id: 'admin', label: 'Admin', desc: 'Instância, QR code e conexão', icon: Settings, color: '#3B82F6', Component: HorusAdminTab },
  { id: 'funcoes', label: 'Funções', desc: 'Agentes, prompts e configurações', icon: Sparkles, color: '#A855F7', Component: HorusFuncoesTab },
  { id: 'poderes', label: 'Poderes', desc: 'Superpoderes open-source: memória, Wikipedia, BrasilAPI, BCB…', icon: Dumbbell, color: '#F59E0B', Component: HorusPoderesTab },
  { id: 'ranking', label: 'Ranking de gastos', desc: 'Top usuários por custo (USD) e tokens — 7 e 30 dias', icon: Trophy, color: '#F59E0B', Component: HorusRankingTab },
  { id: 'estatisticas', label: 'Estatísticas & Proativos', desc: 'Contexto do aluno, intenções e mensagens automáticas', icon: BarChart3, color: '#EC4899', Component: HorusEstatisticasTab },
  { id: 'conversas', label: 'Conversas', desc: 'Histórico e resposta manual', icon: MessagesSquare, color: '#10B981', Component: HorusConversasTab },
  { id: 'marketing', label: 'Marketing', desc: 'Campanhas e disparos em massa', icon: Megaphone, color: '#F59E0B', Component: HorusMarketingTab },
  { id: 'canal', label: 'Canal', desc: 'Publicar no canal do WhatsApp (Vacatio vade mecum)', icon: Radio, color: '#22C55E', Component: HorusCanalTab },
  { id: 'notifs', label: 'Notificações', desc: 'Logs de envio e diagnóstico', icon: Bell, color: '#EF4444', Component: HorusNotificacoesTab },
] as const;

export default function AdminHorus() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab');
  const active = SECTIONS.find((s) => s.id === tab);

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <PageHeader
        title="Horus"
        onBack={() => (active ? setParams({}, { replace: true }) : navigate('/admin-funcoes'))}
      />
      <div className={`px-4 py-4 ${active ? 'max-w-2xl' : 'max-w-3xl'} mx-auto`}>
        {active ? (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <active.icon className="w-5 h-5" style={{ color: active.color }} />
              <h2 className="text-lg font-semibold">{active.label}</h2>
            </div>
            <active.Component />
          </div>
        ) : (
          <>
            <p className="font-body text-[12px] text-muted-foreground mb-3 px-1">
              Toque em um card para abrir a seção.
            </p>
            <div className="grid grid-cols-2 gap-3">
              {SECTIONS.map(({ id, label, desc, icon: Icon, color }) => (
                <button
                  key={id}
                  onClick={() => setParams({ tab: id }, { replace: true })}
                  className="text-left rounded-2xl border border-border/60 bg-secondary/30 p-4 min-h-[140px] flex flex-col gap-3 hover:bg-secondary/60 active:bg-secondary transition-colors"
                >
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
                    style={{ backgroundColor: `${color}22` }}
                  >
                    <Icon className="w-6 h-6" style={{ color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-body text-sm font-semibold text-foreground leading-tight">
                      {label}
                    </div>
                    <div className="font-body text-[11.5px] text-muted-foreground mt-1 line-clamp-3">
                      {desc}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </>
        )}
      </div>

    </div>
  );
}