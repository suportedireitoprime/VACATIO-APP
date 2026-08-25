import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, MessageCircle, Bug, Sparkles, MessageCircleWarning, HelpCircle, LifeBuoy, Image as ImageIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { PageHeader } from '@/components/vademecum/PageHeader';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type Opiniao = {
  id: string;
  user_id: string;
  email: string | null;
  display_name: string | null;
  comentario: string;
  tag: string;
  photo_url: string | null;
  is_premium: boolean;
  platform: string;
  created_at: string;
};

type Suporte = {
  id: string;
  user_id: string;
  email: string;
  assunto: string;
  mensagem: string;
  created_at: string;
};

const TAG_INFO: Record<string, { label: string, icon: any, color: string }> = {
  'funcionalidade': { label: 'Funcionalidade', icon: Sparkles, color: 'text-primary' },
  'critica': { label: 'Crítica', icon: MessageCircleWarning, color: 'text-orange-400' },
  'bug': { label: 'Bug', icon: Bug, color: 'text-red-400' },
  'duvida': { label: 'Dúvida', icon: HelpCircle, color: 'text-sky-400' },
};

export default function AdminFeedbacks() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'opiniao' | 'suporte'>('opiniao');
  
  const [opinioes, setOpinioes] = useState<Opiniao[]>([]);
  const [suportes, setSuportes] = useState<Suporte[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'opiniao') {
        const { data } = await supabase
          .from('app_feedback' as any)
          .select('*')
          .order('created_at', { ascending: false })
          .limit(100);
        setOpinioes(data || []);
      } else {
        const { data } = await supabase
          .from('mensagens_suporte' as any)
          .select('*')
          .order('created_at', { ascending: false })
          .limit(100);
        setSuportes(data || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh flex flex-col bg-background pb-12">
      <PageHeader title="Feedbacks e Suporte" onBack={() => navigate('/admin-funcoes')} />
      
      <div className="p-4 max-w-4xl w-full mx-auto space-y-4">
        {/* Segmented Control */}
        <div className="flex bg-secondary/50 rounded-xl p-1 mb-4 border border-border/50">
          <button
            onClick={() => setActiveTab('opiniao')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              activeTab === 'opiniao' 
                ? 'bg-background text-foreground shadow-sm' 
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary/80'
            }`}
          >
            <MessageCircle className="w-4 h-4" />
            Opiniões
          </button>
          <button
            onClick={() => setActiveTab('suporte')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              activeTab === 'suporte' 
                ? 'bg-background text-foreground shadow-sm' 
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary/80'
            }`}
          >
            <LifeBuoy className="w-4 h-4" />
            Suporte
          </button>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm font-medium">Carregando mensagens...</p>
          </div>
        ) : activeTab === 'opiniao' ? (
          <div className="space-y-4">
            {opinioes.length === 0 && (
              <div className="text-center py-10 text-muted-foreground">Nenhuma opinião recebida ainda.</div>
            )}
            {opinioes.map((op) => {
              const tagInfo = TAG_INFO[op.tag] || { label: op.tag, icon: MessageCircle, color: 'text-primary' };
              const Icon = tagInfo.icon;
              return (
                <div key={op.id} className="bg-secondary/30 border border-border/50 rounded-2xl p-4 flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <div className={`p-2 rounded-lg bg-background ${tagInfo.color}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-semibold text-sm text-foreground">{op.display_name || op.email || 'Usuário Anônimo'}</p>
                        <p className="text-xs text-muted-foreground">{op.email}</p>
                      </div>
                    </div>
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap bg-secondary px-2 py-1 rounded-md">
                      {format(new Date(op.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </span>
                  </div>
                  <p className="text-sm text-foreground/90 whitespace-pre-wrap font-body leading-relaxed">
                    {op.comentario}
                  </p>
                  <div className="flex items-center gap-3 mt-1 pt-3 border-t border-border/30">
                    <span className={`text-[11px] font-semibold px-2 py-1 rounded border border-border/50 bg-background ${tagInfo.color}`}>
                      {tagInfo.label}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {op.is_premium ? '⭐ Premium' : 'Free'} • {op.platform}
                    </span>
                    {op.photo_url && (
                      <div className="flex items-center gap-1 text-[11px] text-blue-400 ml-auto bg-blue-400/10 px-2 py-1 rounded border border-blue-400/20">
                        <ImageIcon className="w-3 h-3" /> Foto anexada
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="space-y-4">
            {suportes.length === 0 && (
              <div className="text-center py-10 text-muted-foreground">Nenhuma mensagem de suporte.</div>
            )}
            {suportes.map((sup) => (
              <div key={sup.id} className="bg-secondary/30 border border-border/50 rounded-2xl p-4 flex flex-col gap-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-background text-primary">
                      <LifeBuoy className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-foreground">{sup.assunto}</p>
                      <p className="text-xs text-muted-foreground">{sup.email}</p>
                    </div>
                  </div>
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap bg-secondary px-2 py-1 rounded-md">
                    {format(new Date(sup.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                  </span>
                </div>
                <p className="text-sm text-foreground/90 whitespace-pre-wrap font-body leading-relaxed bg-background/50 p-3 rounded-xl border border-border/30">
                  {sup.mensagem}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
