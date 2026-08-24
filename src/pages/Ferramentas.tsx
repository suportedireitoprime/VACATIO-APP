import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { lazy, Suspense, useState } from 'react';
import DesktopPageLayout from '@/components/layout/DesktopPageLayout';
import { PageHeader } from '@/components/vademecum/PageHeader';
import { DESKTOP_TOOL_GROUPS, DESKTOP_TOOLS_FLAT } from '@/config/desktopTools';

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

  const itemDesktop = DESKTOP_TOOLS_FLAT.find(t => t.id === 'desktop');
  const itemDicionario = DESKTOP_TOOLS_FLAT.find(t => t.id === 'dicionario');
  const itemBoletins = DESKTOP_TOOLS_FLAT.find(t => t.id === 'boletins');
  const itemOffline = DESKTOP_TOOLS_FLAT.find(t => t.id === 'offline');
  const itemTematica = DESKTOP_TOOLS_FLAT.find(t => t.id === 'tematica');
  const usedIds = new Set(['desktop', 'dicionario', 'boletins', 'offline', 'tematica']);
  const remainingTools = DESKTOP_TOOLS_FLAT.filter(t => !usedIds.has(t.id));

  const renderSmallCard = (tool: any, index: number) => {
    if (!tool) return null;
    const Icon = tool.icon;
    return (
      <motion.button
        key={tool.id}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.05 }}
        onClick={() => handleToolClick(tool.id, tool.route)}
        className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-card border border-border hover:border-primary/40 transition-all text-center aspect-[4/3]"
      >
        <span
          className="flex h-12 w-12 items-center justify-center rounded-xl shadow-sm mb-1"
          style={{ backgroundColor: `${tool.color}1A` }}
        >
          <Icon className="h-6 w-6" style={{ color: tool.color }} strokeWidth={1.6} />
        </span>
        <span className="font-display text-[13px] font-bold text-foreground leading-tight">
          {tool.label}
        </span>
      </motion.button>
    );
  };

  const renderListCard = (tool: any, index: number) => {
    if (!tool) return null;
    const Icon = tool.icon;
    return (
      <motion.button
        key={tool.id}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.05 }}
        onClick={() => handleToolClick(tool.id, tool.route)}
        className="flex items-center gap-4 p-5 min-h-[80px] rounded-xl bg-card border border-border hover:border-primary/40 transition-all group w-full text-left"
      >
        <span
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl shadow-sm"
          style={{ backgroundColor: `${tool.color}1A` }}
        >
          <Icon className="h-6 w-6" style={{ color: tool.color }} strokeWidth={1.6} />
        </span>
        <div className="flex-1 min-w-0">
          <p className="font-display text-[15px] font-bold text-foreground group-hover:text-primary transition-colors">
            {tool.label}
          </p>
          <p className="text-[13px] text-muted-foreground mt-0.5 leading-snug truncate">
            {tool.desc}
          </p>
        </div>
        <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
      </motion.button>
    );
  };

  const toolsList = (
    <div className="space-y-4 pb-8">
      {/* Grid Superior */}
      <div className="grid grid-cols-2 gap-3">
        {renderSmallCard(itemDesktop, 0)}
        {renderSmallCard(itemDicionario, 1)}
        {renderSmallCard(itemBoletins, 2)}
        {renderSmallCard(itemOffline, 3)}
      </div>

      {/* Carrossel / Destaque Temática Jurídica */}
      {itemTematica && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="w-full"
        >
          {/* Se houver mais de um item no futuro, basta usar flex overflow-x-auto aqui */}
          <button
            onClick={() => handleToolClick(itemTematica.id, itemTematica.route)}
            className="w-full relative overflow-hidden rounded-2xl aspect-[21/9] bg-gradient-to-br from-[#0891B2] to-[#164E63] text-left p-5 flex flex-col justify-end border border-white/10 shadow-lg active:scale-[0.98] transition-transform"
          >
            <div className="absolute inset-0 bg-black/20" />
            <div className="relative z-10">
              <itemTematica.icon className="w-8 h-8 text-white/90 mb-2" />
              <div className="font-display text-lg font-black text-white">{itemTematica.label}</div>
              <div className="text-sm text-white/70">{itemTematica.desc}</div>
            </div>
          </button>
        </motion.div>
      )}

      {/* Lista Restante */}
      <div className="space-y-3 pt-2">
        <h3 className="font-display text-sm font-bold text-muted-foreground px-1 pb-1">OUTRAS FERRAMENTAS</h3>
        {remainingTools.map((tool, i) => renderListCard(tool, i + 4))}
      </div>
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
                  className="group flex items-start gap-4 rounded-2xl border border-border bg-card p-5 text-left transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5"
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
      <div className="px-4 sm:px-6 py-4 lg:hidden">
        {toolsList}
      </div>
      <div className="hidden lg:block">
        {desktopGrid}
      </div>

      <Suspense fallback={null}>
        {dicionarioOpen && <DicionarioJuridico open={dicionarioOpen} onClose={() => setDicionarioOpen(false)} />}
      </Suspense>
    </DesktopPageLayout>
  );
};

export default Ferramentas;
