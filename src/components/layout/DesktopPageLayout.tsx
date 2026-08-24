import { useNavigate, useLocation } from 'react-router-dom';
import { Scale, BookOpen, Gavel } from 'lucide-react';
import DesktopHeroBanner from '@/components/vademecum/DesktopHeroBanner';
import DesktopTopHeader from '@/components/vademecum/DesktopTopHeader';
import DesktopBreadcrumb from '@/components/vademecum/DesktopBreadcrumb';
import { useIsDesktop } from '@/hooks/use-desktop';
import { prefetchRoute, type PrefetchKey } from '@/lib/routePrefetch';

const TABS: Array<{ id: string; label: string; icon: any; path: string; prefetch?: PrefetchKey }> = [
  { id: 'legislacao', label: 'Legislação', icon: Scale, path: '/' },
  { id: 'aprender', label: 'Aprender', icon: BookOpen, path: '/aprender', prefetch: 'aprender' },
  { id: 'ferramentas', label: 'Ferramentas', icon: Gavel, path: '/ferramentas', prefetch: 'ferramentas' },
];

interface DesktopPageLayoutProps {
  children: React.ReactNode;
  activeId: string;
  title: string;
  subtitle?: string;
  mobileHeader?: React.ReactNode;
}

const DesktopPageLayout = ({ children, activeId, title, subtitle, mobileHeader }: DesktopPageLayoutProps) => {
  const navigate = useNavigate();
  const isDesktop = useIsDesktop();
  const location = useLocation();

  if (!isDesktop) {
    return (
      <div className="min-h-dvh bg-background pb-20">
        <div className="mx-auto w-full md:max-w-[900px] md:px-6">
          {mobileHeader}
          {children}
        </div>
      </div>
    );
  }


  return (
    <div className="min-h-dvh bg-background flex flex-col">
      {/* Cabeçalho amarelo e breadcrumb agora vêm do GlobalDesktopHeader */}
      <DesktopHeroBanner />





      {/* Tab bar */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-md border-b border-border">
        <div className="flex items-center justify-center gap-1 h-12">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = tab.id === activeId;
            return (
              <button
                key={tab.id}
                onMouseEnter={() => { if (tab.prefetch) prefetchRoute(tab.prefetch); }}
                onFocus={() => { if (tab.prefetch) prefetchRoute(tab.prefetch); }}
                onClick={() => navigate(tab.path)}
                className={`relative flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-body font-medium transition-colors min-w-[130px] ${
                  isActive
                    ? 'text-primary bg-primary/10'
                    : 'text-foreground/60 hover:text-foreground hover:bg-secondary/60'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="whitespace-nowrap">{tab.label}</span>
                {isActive && (
                  <div className="absolute bottom-0 left-3 right-3 h-0.5 bg-primary rounded-full" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-8 py-8">
          <div className="mb-6">
            <h1 className="font-display text-2xl text-foreground font-bold">{title}</h1>
            {subtitle && <p className="text-muted-foreground text-sm mt-1">{subtitle}</p>}
          </div>
          {children}
        </div>
      </div>
    </div>
  );
};

export default DesktopPageLayout;
