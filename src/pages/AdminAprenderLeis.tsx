import { useNavigate } from 'react-router-dom';
import { 
  FlaskConical, 
  Bot, 
  ChevronRight, 
  ShieldAlert 
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { isAdminEmail } from '@/lib/adminEmails';
import DesktopPageLayout from '@/components/layout/DesktopPageLayout';
import { PageHeader } from '@/components/vademecum/PageHeader';

const OPCOES = [
  {
    id: 'laboratorio',
    titulo: 'Laboratório',
    descricao: 'Ambiente de prototipagem e teste das 5 mecânicas pedagógicas.',
    rota: '/admin-aprender-leis/laboratorio',
    icone: FlaskConical,
    bgIcon: 'bg-teal-500/15 text-teal-400 border-teal-500/25',
  },
  {
    id: 'criar',
    titulo: 'Criar',
    descricao: 'Estúdio de criação em lote de aulas de legislação com OmniRoute.',
    rota: '/admin-aprender-leis/criar',
    icone: Bot,
    bgIcon: 'bg-blue-500/15 text-blue-400 border-blue-500/25',
  },
];

const AdminAprenderLeis = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = isAdminEmail(user?.email);

  const mobileHeader = (
    <PageHeader 
      title="Admin — Aprender Leis" 
      onBack={() => navigate('/admin-funcoes')} 
    />
  );

  if (!isAdmin) {
    return (
      <DesktopPageLayout activeId="admin" title="Admin — Aprender Leis" mobileHeader={mobileHeader}>
        <div className="p-8 text-center text-muted-foreground">
          <ShieldAlert className="mx-auto mb-3 h-10 w-10 text-destructive" />
          Acesso restrito para administradores.
        </div>
      </DesktopPageLayout>
    );
  }

  return (
    <DesktopPageLayout
      activeId="admin"
      title="Admin — Aprender Leis"
      subtitle="Escolha entre o laboratório de prototipagem ou o estúdio de criação"
      mobileHeader={mobileHeader}
    >
      <div className="px-4 sm:px-6 py-4 lg:px-0 lg:py-0 max-w-2xl mx-auto w-full space-y-3">
        <p className="font-body text-[12px] text-muted-foreground px-1">
          Selecione uma opção:
        </p>

        <div className="rounded-2xl border border-border/60 bg-secondary/30 divide-y divide-border/50 overflow-hidden shadow-sm">
          {OPCOES.map((item) => {
            const Icone = item.icone;
            return (
              <button
                key={item.id}
                onClick={() => navigate(item.rota)}
                className="w-full flex items-center gap-4 px-4 py-4 min-h-[76px] text-left hover:bg-secondary/60 active:bg-secondary/80 transition-colors group cursor-pointer"
              >
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border ${item.bgIcon} transition-transform group-hover:scale-105`}>
                  <Icone className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-body text-base font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                    {item.titulo}
                  </div>
                  <div className="font-body text-xs text-muted-foreground mt-0.5 line-clamp-1">
                    {item.descricao}
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all shrink-0" />
              </button>
            );
          })}
        </div>
      </div>
    </DesktopPageLayout>
  );
};

export default AdminAprenderLeis;
