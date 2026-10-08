import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { lazy, Suspense, useState } from 'react';
import DesktopPageLayout from '@/components/layout/DesktopPageLayout';
import { PageHeader } from '@/components/vademecum/PageHeader';
import { DESKTOP_TOOL_GROUPS, DESKTOP_TOOLS_FLAT } from '@/config/desktopTools';
import TematicaCarrossel from '@/components/ferramentas/TematicaCarrossel';
import HomeNoticiasCarousel from '@/components/vademecum/HomeNoticiasCarousel';
import { useOutrasNormasCounts } from '@/hooks/useOutrasNormasCounts';
import { Scroll, ScrollText, Stamp, FileWarning } from 'lucide-react';

const DicionarioJuridico = lazy(() => import('@/components/ferramentas/DicionarioJuridico'));

const RADAR_CATS = [
  { id: 'radar-lei',       label: 'Leis Ordinárias',     sublabel: 'Leis ordinárias publicadas no DOU',   icon: Scroll,     radarTipo: 'Lei',                normaSlug: 'leis' },
  { id: 'radar-lc',        label: 'Leis Complementares', sublabel: 'Complementares à Constituição',       icon: ScrollText, radarTipo: 'Lei Complementar',   normaSlug: 'leis-complementares' },
  { id: 'radar-decreto',   label: 'Decretos',            sublabel: 'Regulamentos do Executivo',           icon: Stamp,      radarTipo: 'Decreto',            normaSlug: 'decretos' },
  { id: 'radar-mp',        label: 'Medidas Provisórias', sublabel: 'Editadas pelo Presidente',            icon: FileWarning,radarTipo: 'Medida Provisória',  normaSlug: 'medidas-provisorias' },
];

const Ferramentas = () => {
  const navigate = useNavigate();
  const [dicionarioOpen, setDicionarioOpen] = useState(false);
  const { counts: radarCounts } = useOutrasNormasCounts();
  const [seenCounts, setSeenCounts] = useState<Record<string, number>>(() => {
    try { return JSON.parse(localStorage.getItem('outras_normas_seen') || '{}'); } catch { return {}; }
  });

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
  
  const primaryTools = [itemDesktop, itemDicionario, itemBoletins, itemOffline].filter(Boolean);
  const primaryIds = primaryTools.map(t => t?.id);
  // Tematica will be handled separately by the carousel, so we exclude it from the list
  const usedIds = new Set([...primaryIds, 'tematica', 'noticias', 'resumos']);
  const secondaryTools = DESKTOP_TOOLS_FLAT.filter(t => !usedIds.has(t.id));

  const toolsList = (
    <div className="space-y-8">
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
                className="flex flex-col items-start justify-between p-4 rounded-2xl bg-card border border-border/60 shadow-sm hover:border-primary/40 active:scale-[0.99] transition-all group text-left gap-3 relative"
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

      <section className="mt-2 -mx-2">
        <TematicaCarrossel />
      </section>

      <section className="mt-6 -mx-4 pb-2">
        <HomeNoticiasCarousel />
      </section>

      <section className="space-y-3 mt-4">
        <div className="flex items-baseline gap-2 pb-1 border-b border-border/40 px-1">
          <h2 className="font-display text-lg font-bold text-foreground uppercase">Radar Legislativo</h2>
        </div>
        <div className="space-y-3">
          {RADAR_CATS.map((c) => {
            const Icon = c.icon;
            const n = radarCounts[c.radarTipo] ?? 0;
            const seen = seenCounts[c.id] || 0;
            const isNew = n > seen;

            return (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  if (isNew) {
                    const next = { ...seenCounts, [c.id]: n };
                    setSeenCounts(next);
                    try { localStorage.setItem('outras_normas_seen', JSON.stringify(next)); } catch {}
                  }
                  navigate(`/normas/${c.normaSlug}`);
                }}
                className="w-full flex items-center gap-3 px-4 py-5 min-h-[76px] rounded-2xl bg-card border border-border/60 shadow-sm hover:border-primary/40 active:scale-[0.99] transition cursor-pointer group"
              >
                <div className="w-10 h-10 shrink-0 bg-secondary/50 rounded-xl flex items-center justify-center border border-border/50 shadow-sm group-hover:bg-primary/10 transition-colors">
                  <Icon className="w-5 h-5 text-foreground group-hover:text-primary transition-colors" strokeWidth={1.5} />
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <p className="font-display text-foreground text-[15.5px] font-bold leading-tight truncate group-hover:text-primary transition-colors">
                    {c.label}
                  </p>
                  <p className="font-body text-muted-foreground text-[12px] leading-tight truncate mt-0.5">
                    {c.sublabel}
                  </p>
                </div>
                {isNew && (
                  <span className="shrink-0 text-[11px] font-body font-semibold px-2 py-0.5 rounded-full border bg-primary/15 text-primary border-primary/25">
                    {n} nova{n === 1 ? '' : 's'}
                  </span>
                )}
                <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
              </button>
            );
          })}
        </div>
      </section>

      <section className="space-y-3 mt-4">
        <div className="flex items-baseline gap-2 pb-1 border-b border-border/40 px-1">
          <h2 className="font-display text-lg font-bold text-foreground uppercase">Outros Destaques</h2>
        </div>
        <div className="space-y-3">
          {secondaryTools.map((tool, i) => {
            const Icon = tool.icon;
            return (
              <motion.button
                key={tool.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: (i + primaryTools.length) * 0.04 }}
                onClick={() => handleToolClick(tool.id, tool.route)}
                data-track="ferramenta_abrir"
                data-ferramenta-id={tool.id}
                data-ferramenta-nome={tool.label}
                className="flex items-center gap-3 px-4 h-[76px] rounded-2xl bg-card border border-border/60 shadow-sm hover:border-primary/40 active:scale-[0.99] transition-all group w-full"
              >
                <Icon
                  className="w-8 h-8 shrink-0"
                  style={{
                    color: tool.color,
                    filter: 'saturate(1.35) brightness(1.15) drop-shadow(0 2px 6px rgba(0,0,0,0.45))',
                  }}
                  strokeWidth={1.15}
                />
                <div className="flex-1 min-w-0 text-left">
                  <p className="font-display text-[15.5px] font-bold leading-tight truncate text-foreground">
                    {tool.label}
                  </p>
                  <p className="font-body text-muted-foreground text-[12px] leading-tight truncate mt-0.5">
                    {tool.desc}
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
              </motion.button>
            );
          })}
        </div>
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
