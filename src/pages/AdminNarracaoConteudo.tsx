import { useNavigate } from 'react-router-dom';
import { BookOpen, Newspaper, ChevronRight, AudioLines, Presentation } from 'lucide-react';
import { PageHeader } from '@/components/vademecum/PageHeader';

const OPCOES = [
  {
    id: 'biblioteca',
    titulo: 'Narração Biblioteca',
    desc: 'Escolha um livro da Leitura Nativa, defina a voz e narre página por página ou em fila.',
    icon: BookOpen,
    route: '/admin-narracao/biblioteca',
  },
  {
    id: 'blog',
    titulo: 'Narração Blog e Artigos',
    desc: 'Gere o áudio dos artigos do Blogger Jurídico com prévia de voz antes de publicar.',
    icon: Newspaper,
    route: '/admin-narracao/blog',
  },
  {
    id: 'apresentacao',
    titulo: 'Apresentação Narrada',
    desc: 'Envie o PDF da apresentação de um livro e gere a narração de cada slide, como um professor explicando.',
    icon: Presentation,
    route: '/admin-narracao/apresentacao',
  },
];

const AdminNarracaoConteudo = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-dvh bg-background pb-24">
      <PageHeader
        title="Narração de Conteúdo"
        subtitle="Escolha o que narrar"
        onBack={() => navigate('/admin-funcoes')}
      />
      <div className="max-w-3xl mx-auto p-4 space-y-4">
        <div className="rounded-2xl border border-border bg-card p-4 flex gap-3">
          <AudioLines className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <p className="text-sm text-muted-foreground font-body">
            As narrações usam vozes do Gemini com direção de locutor: o narrador incorpora a obra,
            diferencia personagens e acompanha a emoção do texto. Sempre é possível ouvir uma prévia
            antes de narrar tudo.
          </p>
        </div>

        {OPCOES.map((o) => {
          const Icon = o.icon;
          return (
            <button
              key={o.id}
              onClick={() => navigate(o.route)}
              className="w-full text-left rounded-2xl border border-border bg-card p-4 flex items-center gap-4 hover:border-primary/50 transition-colors"
            >
              <span className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Icon className="w-6 h-6 text-primary" />
              </span>
              <span className="flex-1 min-w-0">
                <span className="block font-heading font-bold text-base">{o.titulo}</span>
                <span className="block text-xs text-muted-foreground font-body mt-0.5">{o.desc}</span>
              </span>
              <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default AdminNarracaoConteudo;
