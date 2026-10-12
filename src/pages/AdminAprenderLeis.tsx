import { useNavigate } from 'react-router-dom';
import { 
  Scale, 
  FlaskConical, 
  Bot, 
  Sparkles, 
  BookOpen, 
  ArrowRight, 
  ShieldAlert, 
  BrainCircuit, 
  Layers, 
  MessageSquare, 
  History, 
  CheckCircle2,
  ChevronRight
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { isAdminEmail } from '@/lib/adminEmails';
import DesktopPageLayout from '@/components/layout/DesktopPageLayout';
import { PageHeader } from '@/components/vademecum/PageHeader';

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
      subtitle="Trilhas pedagógicas de legislação para pessoas leigas com IA & Legal Design"
      mobileHeader={mobileHeader}
    >
      <div className="px-4 sm:px-6 py-6 lg:px-0 lg:py-0 max-w-4xl mx-auto w-full space-y-6">
        
        {/* Banner de Apresentação */}
        <div className="relative overflow-hidden rounded-2xl border border-teal-500/30 bg-gradient-to-br from-teal-950/40 via-secondary/40 to-background p-5 sm:p-6 shadow-lg">
          <div className="absolute -right-8 -bottom-8 w-40 h-40 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-teal-500/15 border border-teal-500/30 flex items-center justify-center text-teal-400 shrink-0 shadow-inner">
              <Scale className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-teal-500/20 text-teal-300 border border-teal-500/30">
                  Nova Arquitetura de Aulas
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-secondary text-muted-foreground">
                  Legal Design & Plain Language
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold font-display text-foreground tracking-tight">
                Aprender Leis
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1.5 leading-relaxed">
                Transforme artigos de leis complexos em trilhas interativas de alta didática para o público geral.
                Escolha entre testar mecânicas pedagógicas no laboratório ou gerar lotes massivos de aulas com o robô OmniRoute.
              </p>
            </div>
          </div>
        </div>

        {/* As 2 Opções Principais Solicitadas */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Opção 1: Laboratório */}
          <div 
            onClick={() => navigate('/admin-aprender-leis/laboratorio')}
            role="button"
            tabIndex={0}
            className="group relative rounded-2xl border border-border/80 bg-card hover:bg-secondary/40 hover:border-teal-500/50 transition-all duration-200 p-5 cursor-pointer flex flex-col justify-between shadow-sm hover:shadow-md"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-teal-500/15 text-teal-400 flex items-center justify-center border border-teal-500/20 group-hover:scale-105 transition-transform">
                  <FlaskConical className="w-6 h-6" />
                </div>
                <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-teal-500/10 text-teal-300 border border-teal-500/20">
                  5 Mecânicas de Aula
                </span>
              </div>

              <h3 className="text-lg font-bold font-display text-foreground group-hover:text-teal-300 transition-colors flex items-center gap-2">
                Aprender Leis — Laboratório
                <ArrowRight className="w-4 h-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-teal-400" />
              </h3>

              <p className="text-xs sm:text-sm text-muted-foreground mt-2 leading-relaxed">
                Ambiente de prototipagem e validação pedagógica. Teste 5 abordagens didáticas diferentes passo a passo usando o <strong>Código Penal (Artigos 1º e 2º)</strong> como modelo para pessoas leigas.
              </p>

              <div className="mt-4 pt-3 border-t border-border/40 space-y-2">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <CheckCircle2 className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                  <span>Anatomia da lei e tradução palavra por palavra</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <CheckCircle2 className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                  <span>Storytelling com personagens e casos da vida real</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <CheckCircle2 className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                  <span>Diálogo tutor & aluno com analogias do cotidiano</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <CheckCircle2 className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                  <span>Simulador de linha do tempo e mapas mentais</span>
                </div>
              </div>
            </div>

            <div className="mt-5 pt-3 flex items-center justify-between text-xs font-semibold text-teal-400 group-hover:underline">
              <span>Abrir Laboratório Interativo</span>
              <ChevronRight className="w-4 h-4" />
            </div>
          </div>

          {/* Opção 2: Criar (OmniRoute) */}
          <div 
            onClick={() => navigate('/admin-aprender-leis/criar')}
            role="button"
            tabIndex={0}
            className="group relative rounded-2xl border border-border/80 bg-card hover:bg-secondary/40 hover:border-blue-500/50 transition-all duration-200 p-5 cursor-pointer flex flex-col justify-between shadow-sm hover:shadow-md"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-blue-500/15 text-blue-400 flex items-center justify-center border border-blue-500/20 group-hover:scale-105 transition-transform">
                  <Bot className="w-6 h-6" />
                </div>
                <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-300 border border-blue-500/20">
                  OmniRoute IA
                </span>
              </div>

              <h3 className="text-lg font-bold font-display text-foreground group-hover:text-blue-300 transition-colors flex items-center gap-2">
                Aprender Leis — Criar
                <ArrowRight className="w-4 h-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-blue-400" />
              </h3>

              <p className="text-xs sm:text-sm text-muted-foreground mt-2 leading-relaxed">
                Estúdio de geração em lote de aulas completas para legislação. Conectado ao <strong>OmniRoute</strong> para criar trilhas estruturadas com IA a partir dos artigos selecionados.
              </p>

              <div className="mt-4 pt-3 border-t border-border/40 space-y-2">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  <span>Geração em lote com controle de taxa e pausas</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  <span>Seleção de leis: Código Penal, CLT, CF/88, CC…</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  <span>Padrão de Plain Language e Legal Design nos prompts</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  <span>Terminal de logs em tempo real e AbortController</span>
                </div>
              </div>
            </div>

            <div className="mt-5 pt-3 flex items-center justify-between text-xs font-semibold text-blue-400 group-hover:underline">
              <span>Abrir Gerador OmniRoute</span>
              <ChevronRight className="w-4 h-4" />
            </div>
          </div>

        </div>

        {/* Pilares Pedagógicos das Trilhas */}
        <div className="rounded-2xl border border-border/60 bg-secondary/20 p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <h4 className="text-sm font-bold text-foreground uppercase tracking-wider">
              Pilares do Método de Ensino para Leigos
            </h4>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="rounded-xl border border-border/50 bg-background/50 p-3.5 space-y-1.5">
              <div className="font-semibold text-foreground flex items-center gap-1.5">
                <BrainCircuit className="w-4 h-4 text-teal-400" />
                1. Plain Language
              </div>
              <p className="text-muted-foreground leading-relaxed">
                Zero jargões vazios. O texto oficial é sempre traduzido para o português natural e direto, preservando a exatidão jurídica.
              </p>
            </div>

            <div className="rounded-xl border border-border/50 bg-background/50 p-3.5 space-y-1.5">
              <div className="font-semibold text-foreground flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-blue-400" />
                2. Legal Design
              </div>
              <p className="text-muted-foreground leading-relaxed">
                Informação visual em camadas, cartões táteis, diagramas de causa-efeito e linhas do tempo interativas.
              </p>
            </div>

            <div className="rounded-xl border border-border/50 bg-background/50 p-3.5 space-y-1.5">
              <div className="font-semibold text-foreground flex items-center gap-1.5">
                <History className="w-4 h-4 text-purple-400" />
                3. Microlearning
              </div>
              <p className="text-muted-foreground leading-relaxed">
                Aulas de 3 a 5 minutos com slides progressivos que não sobrecarregam a atenção do aluno.
              </p>
            </div>
          </div>
        </div>

        {/* Atalho para Aprender Livros */}
        <div className="flex items-center justify-between rounded-xl border border-border/60 bg-card p-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-3">
            <BookOpen className="w-5 h-5 text-teal-400 shrink-0" />
            <div>
              <p className="font-semibold text-foreground">Procurando a geração por livros da biblioteca?</p>
              <p className="text-muted-foreground">Acesse o módulo de livros com OCR e Mistral.</p>
            </div>
          </div>
          <button
            onClick={() => navigate('/admin-aprender')}
            className="px-3 py-1.5 rounded-lg border border-border hover:bg-secondary text-foreground font-medium transition-colors shrink-0"
          >
            Ir para Livros
          </button>
        </div>

      </div>
    </DesktopPageLayout>
  );
};

export default AdminAprenderLeis;
