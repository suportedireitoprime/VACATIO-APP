import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { lazy, Suspense, useState } from 'react';
import DesktopPageLayout from '@/components/layout/DesktopPageLayout';
import { PageHeader } from '@/components/vademecum/PageHeader';
import { DESKTOP_TOOL_GROUPS, DESKTOP_TOOLS_FLAT } from '@/config/desktopTools';
import TematicaCarrossel from '@/components/ferramentas/TematicaCarrossel';
import HomeNoticiasCarousel from '@/components/vademecum/HomeNoticiasCarousel';
import ShapeGrid from '@/components/ui/ShapeGrid';

const DicionarioJuridico = lazy(() => import('@/components/ferramentas/DicionarioJuridico'));

const Ferramentas = () => {
  const navigate = useNavigate();
  const [dicionarioOpen, setDicionarioOpen] = useState(false);

  const handleToolClick = (id: string, route: string) => {
    navigate(route);
  };

  const mobileHeader = (
    <PageHeader
      title="Ferramentas"
      subtitle="Recursos para potencializar seus estudos"
      onBack={() => navigate('/')}
    />
  );

  const itemBiblioteca = DESKTOP_TOOLS_FLAT.find(t => t.id === 'biblioteca');
  const itemDicionario = DESKTOP_TOOLS_FLAT.find(t => t.id === 'dicionario');
  const itemBoletins = DESKTOP_TOOLS_FLAT.find(t => t.id === 'boletins');
  const itemOffline = DESKTOP_TOOLS_FLAT.find(t => t.id === 'offline');
  const itemAudioLeis = DESKTOP_TOOLS_FLAT.find(t => t.id === 'audio-leis');
  const itemAudioaulas = DESKTOP_TOOLS_FLAT.find(t => t.id === 'audioaulas');
  
  const primaryTools = [itemBiblioteca, itemDicionario, itemBoletins, itemOffline, itemAudioLeis, itemAudioaulas].filter(Boolean);

  const toolsList = (
    <div className="space-y-6">
      {/* 1. Notícias Jurídicas acima dos cards de Destaques */}
      <section className="-mx-4 md:mx-0 pb-2">
        <HomeNoticiasCarousel />
      </section>

      {/* 2. Cards de Destaques */}
      <section className="space-y-3">
        <div className="flex items-baseline gap-2 pb-1 border-b border-border/40 px-1">
          <h2 className="font-display text-lg font-bold text-foreground">Destaques</h2>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {primaryTools.map((tool, i) => {
            if (!tool) return null;
            const Icon = tool.icon;
            return (
              <motion.button
                key={tool.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                onClick={() => handleToolClick(tool.id, tool.route)}
                data-track="ferramenta_abrir"
                data-ferramenta-id={tool.id}
                data-ferramenta-nome={tool.label}
                className="flex flex-col items-start justify-between p-4 rounded-2xl bg-card border border-border/60 shadow-sm hover:border-primary/40 active:scale-[0.99] transition-all group text-left gap-3 relative cursor-pointer"
              >
                <div className="flex justify-between items-start w-full">
                  <Icon
                    className="w-8 h-8"
                    style={{
                      color: tool.color,
                      filter: 'saturate(1.35) brightness(1.15) drop-shadow(0 2px 6px rgba(0,0,0,0.45))',
                    }}
                    strokeWidth={1.15}
                  />
                  <ChevronRight className="w-5 h-5 text-muted-foreground/40 group-hover:text-primary transition-colors shrink-0" />
                </div>
                <div className="flex flex-col items-start w-full mt-auto gap-0.5">
                  <span className="font-display text-[14px] font-bold leading-tight text-foreground line-clamp-1 w-full">
                    {tool.label}
                  </span>
                  <span className="text-[11px] font-medium text-muted-foreground line-clamp-1 w-full text-left">
                    {tool.desc}
                  </span>
                </div>
              </motion.button>
            );
          })}
        </div>
      </section>

      {/* 3. Carrossel Temática Jurídica */}
      <section className="mt-2 -mx-2">
        <TematicaCarrossel />
      </section>
    </div>
  );

  const desktopGrid = (
    <div className="mx-auto w-full max-w-[1600px] space-y-10">
      {DESKTOP_TOOL_GROUPS.map((group) => (
        <section key={group.id}>
          <div className="mb-4 flex items-baseline gap-3 border-b border-border pb-2">
            <h2 className="font-display text-lg font-bold text-foreground">{group.label}</h2>
            <p className="text-xs text-muted-foreground">{group.hint}</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {group.tools.map((tool) => {
              const Icon = tool.icon;
              return (
                <button
                  key={tool.id}
                  onClick={() => handleToolClick(tool.id, tool.route)}
                  data-track="ferramenta_abrir"
                  data-ferramenta-id={tool.id}
                  data-ferramenta-nome={tool.label}
                  className="group flex items-start gap-4 rounded-2xl border border-border bg-card p-5 text-left transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 cursor-pointer"
                >
                  <span
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl shadow-sm"
                    style={{ backgroundColor: `${tool.color}26` }}
                  >
                    <Icon className="h-6 w-6" style={{ color: tool.color }} strokeWidth={1.6} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-display text-[15px] font-bold text-foreground group-hover:text-primary transition-colors">
                      {tool.label}
                    </span>
                    <span className="mt-1 block text-[13px] leading-snug text-muted-foreground">
                      {tool.desc}
                    </span>
                  </span>
                  <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                </button>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );

  return (
    <DesktopPageLayout
      activeId="ferramentas"
      title="Ferramentas"
      subtitle="Todos os recursos em um só lugar"
      mobileHeader={mobileHeader}
    >
      {/* Fundo dinâmico com quadrados mágicos ShapeGrid idêntico ao início do app */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <ShapeGrid 
          speed={0.5} 
          squareSize={40}
          direction='diagonal'
          borderColor='rgba(255, 255, 255, 0.05)'
          hoverFillColor='rgba(255, 255, 255, 0.1)'
          shape='square'
          hoverTrailAmount={5}
        />
      </div>

      <div className="relative z-10 px-4 sm:px-6 pt-4 pb-[calc(7.5rem+var(--sai-bottom,0px)+var(--active-mini-player-offset,0px))] lg:hidden">
        {toolsList}
      </div>
      <div className="relative z-10 hidden lg:block">
        {desktopGrid}
      </div>

      <Suspense fallback={null}>
        {dicionarioOpen && <DicionarioJuridico open={dicionarioOpen} onClose={() => setDicionarioOpen(false)} />}
      </Suspense>
    </DesktopPageLayout>
  );
};

export default Ferramentas;
