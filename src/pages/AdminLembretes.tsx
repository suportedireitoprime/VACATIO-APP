import { useNavigate } from 'react-router-dom';
import { Bell, BookOpen, GraduationCap, Landmark, Video, ChevronRight, Sparkles } from 'lucide-react';
import { PageHeader } from '@/components/vademecum/PageHeader';

const FUNCOES = [
  { id: 'biblioteca', label: 'Biblioteca', desc: 'Lembretes de leitura de livros', icon: BookOpen, route: '/admin-lembretes/biblioteca', ativo: true },
  { id: 'vademecum', label: 'Vade Mecum', desc: 'Lembretes de artigos e leis', icon: Landmark, ativo: false },
  { id: 'estudos', label: 'Estudos', desc: 'Lembretes de sessões de estudo', icon: GraduationCap, ativo: false },
  { id: 'videoaulas', label: 'Videoaulas', desc: 'Lembretes de aulas', icon: Video, ativo: false },
];

const AdminLembretes = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-dvh bg-background">
      <PageHeader title="Lembretes" subtitle="Funções do app que oferecem lembretes" onBack={() => navigate('/admin-funcoes')} />
      <div className="max-w-3xl mx-auto p-4 space-y-3">
        {FUNCOES.map((f) => {
          const Icon = f.icon;
          const disabled = !f.ativo;
          return (
            <button
              key={f.id}
              disabled={disabled}
              onClick={() => f.route && navigate(f.route)}
              className={`w-full flex items-center gap-4 p-4 rounded-2xl border transition text-left ${
                disabled ? 'bg-card/40 border-border opacity-60 cursor-not-allowed' : 'bg-card border-border hover:border-primary'
              }`}
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${disabled ? 'bg-muted text-muted-foreground' : 'bg-primary/15 text-primary'}`}>
                <Icon className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-body font-bold text-foreground flex items-center gap-2">
                  {f.label}
                  {disabled && (
                    <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground uppercase tracking-wider">
                      <Sparkles className="w-3 h-3" /> Em breve
                    </span>
                  )}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">{f.desc}</p>
              </div>
              {!disabled && <ChevronRight className="w-5 h-5 text-muted-foreground" />}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default AdminLembretes;
