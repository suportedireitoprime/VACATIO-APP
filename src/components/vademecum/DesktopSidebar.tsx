import { useState, useEffect } from 'react';
import { pickAsset } from '@/lib/assetUrl';
import { Scale, BookOpen, FileText, Newspaper, Landmark, Shield, ScrollText, Gavel, Settings, PanelLeftClose, Radar, RefreshCw, Bell, Info, LogOut, BookMarked, HeartPulse, Lock, User as UserIcon } from 'lucide-react';
import { tipoToSlug } from '@/lib/legislacaoSlugs';
import SuporteSheet from './SuporteSheet';
import vacatioLogoAsset from '@/assets/logo-vacatio-v2.png.asset.json';
import vacatioLogoBundled from '@/assets/bundled/logo-vacatio-v2.webp';
const vacatioLogo = pickAsset(vacatioLogoBundled, vacatioLogoAsset.url);
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { isAdminEmail } from '@/lib/adminEmails';

type Tab = 'legislacao' | 'noticias' | 'ferramentas';

interface DesktopSidebarProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

const CATEGORIAS = [
  { id: 'constituicao', tipo: 'constituicao', label: 'Constituição', icon: Landmark, color: '#10B981' },
  { id: 'codigo', tipo: 'codigo', label: 'Códigos', icon: BookOpen, color: '#3B82F6' },
  { id: 'estatuto', tipo: 'estatuto', label: 'Estatutos', icon: Shield, color: '#F43F5E' },
  { id: 'lei-ordinaria', tipo: 'lei-ordinaria', label: 'Leis Ordinárias', icon: FileText, color: '#F59E0B' },
  { id: 'decreto', tipo: 'decreto', label: 'Decretos', icon: ScrollText, color: '#F97316' },
  { id: 'sumula', tipo: 'sumula', label: 'Súmulas', icon: Gavel, color: '#EF4444' },
  { id: 'lei-especial', tipo: 'lei-especial', label: 'Leis Especiais', icon: BookMarked, color: '#A855F7' },
  { id: 'previdenciario', tipo: 'previdenciario', label: 'Previdenciário', icon: HeartPulse, color: '#14B8A6' },
];


const CONTEUDO_ITEMS = [
  { id: 'explicacao', label: 'Artigos e Análises', icon: FileText, color: '#6366F1' },
  { id: 'atualizacao', label: 'Notícias Jurídicas', icon: Newspaper, route: '/noticias', color: '#EC4899' },
  { id: 'novidades', label: 'Novidades', icon: Bell, route: '/novidades', color: '#8B5CF6' },
];

const CONFIG_ITEMS = [
  { id: 'perfil', label: 'Perfil', icon: Settings, route: '/perfil', color: '#64748B' },
  { id: 'sobre', label: 'Sobre o App', icon: Info, route: '/sobre', color: '#06B6D4' },
  { id: 'sair', label: 'Sair', icon: LogOut, color: '#EF4444' },
];

const DesktopSidebar = ({ activeTab, onTabChange }: DesktopSidebarProps) => {
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
  const isAdmin = isAdminEmail(user?.email);
  const [collapsed, setCollapsed] = useState(false);
  const [suporteOpen, setSuporteOpen] = useState(false);
  const [profile, setProfile] = useState<{ display_name?: string; perfil_tipos?: string[] } | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('profiles')
      .select('display_name, perfil_tipos')
      .eq('id', user.id)
      .maybeSingle()
      .then(({ data }) => data && setProfile(data as any));
  }, [user]);

  const handleItemClick = async (item: { id: string; route?: string }) => {
    console.log('[DesktopSidebar] click', item.id, '→', item.route ?? '(sem rota)');
    if (item.id === 'sair') {
      await signOut();
      navigate('/auth');
      return;
    }
    if (item.id === 'explicacao') {
      navigate('/pessoal/artigos');
      return;
    }
    if (item.route) navigate(item.route);
    else console.warn('[DesktopSidebar] item sem rota nem handler:', item.id);
  };

  const displayName = profile?.display_name || user?.email?.split('@')[0] || 'Visitante';
  const initial = displayName.charAt(0).toUpperCase();
  const profissao = (profile?.perfil_tipos && profile.perfil_tipos[0]) || 'Vade Mecum Profissional';

  const renderSection = (title: string, items: typeof CONTEUDO_ITEMS) => (
    <div className="py-1 border-t border-border/50">
      {!collapsed && (
        <p className="px-5 py-1 text-[9px] font-body font-semibold text-muted-foreground uppercase tracking-widest">
          {title}
        </p>
      )}
      {items.map(item => {
        const Icon = item.icon;
        const isDisabled = (item as any).disabled;
        const color = (item as any).color || '#F59E0B';
        return (
          <button
            key={item.id}
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (!isDisabled) handleItemClick(item);
            }}
            disabled={isDisabled}
            title={collapsed ? item.label : undefined}
            className={`w-full flex items-center gap-2.5 ${collapsed ? 'justify-center px-0' : 'px-3 mx-1'} py-1.5 rounded-lg text-[13px] font-body transition-colors ${
              isDisabled
                ? 'text-muted-foreground/40 cursor-not-allowed'
                : 'text-foreground/75 hover:bg-secondary hover:text-foreground'
            }`}
          >
            <div
              className="w-6 h-6 rounded-md flex items-center justify-center shrink-0 relative overflow-hidden shadow-sm"
              style={isDisabled ? {} : { backgroundColor: `${color}33`, boxShadow: `0 2px 6px -2px ${color}55` }}
            >
              <span className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ backgroundColor: isDisabled ? undefined : color }} />
              <Icon
                className="w-[13px] h-[13px] drop-shadow-sm"
                style={isDisabled ? {} : { color, filter: 'saturate(1.4) brightness(1.15)' }}
              />
            </div>
            {!collapsed && <span>{item.label}</span>}
          </button>
        );
      })}
    </div>
  );

  return (
    <>
    <aside className={`${collapsed ? 'w-[68px]' : 'w-[268px]'} shrink-0 sticky top-0 min-h-dvh bg-card border-r border-border flex flex-col`} style={{ transitionProperty: 'width', transitionDuration: '320ms', transitionTimingFunction: 'cubic-bezier(0.22, 0.61, 0.36, 1)' }}>
      {/* Header — user profile */}
      <div className="p-3 border-b border-border">
        {collapsed ? (
          <button
            onClick={() => setCollapsed(false)}
            className="w-11 h-11 rounded-2xl overflow-hidden bg-primary/15 flex items-center justify-center border-2 border-primary/40 mx-auto"
            title="Expandir menu"
            aria-label="Expandir menu lateral"
            aria-expanded={false}
          >
            {false ? (
              <img src={(profile as any).avatar_url} alt={displayName} className="w-full h-full object-cover" />
            ) : (
              <span className="font-display text-lg font-bold text-primary">{initial}</span>
            )}
          </button>
        ) : (
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl overflow-hidden bg-primary/15 flex items-center justify-center border-2 border-primary/40 shrink-0">
              {false ? (
                <img src={(profile as any).avatar_url} alt={displayName} className="w-full h-full object-cover" />
              ) : (
                <span className="font-display text-lg font-bold text-primary" aria-hidden="true">{initial}</span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="font-display text-base text-foreground leading-tight truncate">{displayName}</h1>
              <p className="text-[11px] font-body text-muted-foreground truncate">{profissao}</p>
            </div>
            <button
              onClick={() => setCollapsed(true)}
              className="w-8 h-8 rounded-lg hover:bg-secondary flex items-center justify-center transition-colors shrink-0"
              title="Recolher menu"
              aria-label="Recolher menu lateral"
              aria-expanded={true}
            >
              <PanelLeftClose className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
            </button>
          </div>
        )}
      </div>


      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto py-1">
        {/* Funções Admin - only for admin */}
        {isAdmin && (
          <div className="pb-1">
            {!collapsed && (
              <p className="px-5 py-1 text-[9px] font-body font-semibold text-muted-foreground uppercase tracking-widest">
                Admin
              </p>
            )}
            <button
              onPointerDown={() => { import('@/pages/AdminFuncoes.tsx').catch(() => {}); }}
              onClick={() => navigate('/admin-funcoes')}
              title={collapsed ? 'Funções Admin' : undefined}
              className={`w-full flex items-center gap-2.5 ${collapsed ? 'justify-center px-0' : 'px-3 mx-1'} py-1.5 rounded-lg text-[13px] font-body text-foreground/75 hover:bg-secondary hover:text-foreground transition-colors`}
            >
              <div className="w-6 h-6 rounded-md bg-primary/15 flex items-center justify-center shrink-0">
                <Lock className="w-[13px] h-[13px] text-primary" />
              </div>
              {!collapsed && <span className="font-semibold">Funções Admin</span>}
            </button>
          </div>
        )}

        {/* Main Nav */}
        <div className={`pb-1 ${isAdmin ? 'border-t border-border/50 pt-1' : ''}`}>
          {!collapsed && (
            <p className="px-5 py-1 text-[9px] font-body font-semibold text-muted-foreground uppercase tracking-widest">
              Seções
            </p>
          )}
          {[
            { id: 'radar', label: 'Radar Legislativo', icon: Radar, color: '#0EA5E9', route: '/radar-360' },
            { id: 'legislacao' as Tab, label: 'Legislação', icon: Scale, color: '#F59E0B' },
            { id: 'noticias' as Tab, label: 'Atualizações', icon: RefreshCw, color: '#10B981' },
          ].map(item => {
            const Icon = item.icon;
            const route = (item as any).route as string | undefined;
            const active = !route && activeTab === (item.id as Tab);
            return (
              <button
                key={item.id}
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log('[DesktopSidebar] seção click', item.id, '→', route ?? '(tab)');
                  if (route) navigate(route);
                  else onTabChange(item.id as Tab);
                }}
                title={collapsed ? item.label : undefined}
                className={`w-full flex items-center gap-2.5 ${collapsed ? 'justify-center px-0' : 'px-3 mx-1'} py-1.5 rounded-lg text-[13px] font-body transition-all ${
                  active
                    ? 'bg-primary text-primary-foreground font-bold shadow-md shadow-primary/25'
                    : 'text-foreground/75 hover:bg-secondary hover:text-foreground'
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 relative overflow-hidden ${
                    active ? 'bg-primary-foreground/20' : ''
                  }`}
                  style={active ? {} : { backgroundColor: `${item.color}33`, boxShadow: `0 2px 6px -2px ${item.color}55` }}
                >
                  <Icon
                    className={`w-[14px] h-[14px] drop-shadow-sm ${active ? 'text-primary-foreground' : ''}`}
                    style={active ? {} : { color: item.color, filter: 'saturate(1.4) brightness(1.15)' }}
                  />
                </div>
                {!collapsed && <span>{item.label}</span>}
              </button>
            );
          })}
        </div>

        {/* Categorias — book spine style */}
        <div className="pb-1 border-t border-border/50 pt-1">
          {!collapsed && (
            <p className="px-5 py-1 text-[9px] font-body font-semibold text-muted-foreground uppercase tracking-widest">
              Categorias
            </p>
          )}
          {CATEGORIAS.map(cat => {
            const Icon = cat.icon;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const target = `/legislacao/${tipoToSlug(cat.tipo)}`;
                  console.log('[DesktopSidebar] categoria click', cat.label, '→', target);
                  navigate(target);
                }}
                title={collapsed ? cat.label : undefined}
                className={`w-full flex items-center gap-2.5 ${collapsed ? 'justify-center px-0' : 'px-3 mx-1'} py-1.5 rounded-lg text-[13px] font-body text-foreground/75 hover:bg-secondary hover:text-foreground transition-colors group`}
              >
                <div
                  className="w-6 h-6 rounded-md flex items-center justify-center shrink-0 relative overflow-hidden shadow-sm"
                  style={{ backgroundColor: `${cat.color}33`, boxShadow: `0 2px 6px -2px ${cat.color}55` }}
                >
                  <span className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ backgroundColor: cat.color }} />
                  <Icon className="w-[13px] h-[13px] drop-shadow-sm" style={{ color: cat.color, filter: 'saturate(1.4) brightness(1.15)' }} />
                </div>
                {!collapsed && <span>{cat.label}</span>}
              </button>
            );
          })}
        </div>


        {/* Conteúdo */}
        {renderSection('Conteúdo', CONTEUDO_ITEMS)}

        {/* Configurações */}
        {renderSection('Configurações', CONFIG_ITEMS)}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-border">
        {collapsed ? (
          <div className="flex justify-center">
            <img src={vacatioLogo} alt="Vacatio" className="w-5 h-5 rounded-full object-cover opacity-50" />
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <img src={vacatioLogo} alt="Vacatio" className="w-6 h-6 rounded-lg object-cover opacity-70" />
            <p className="text-[10px] font-body text-muted-foreground">© 2026 Vacatio</p>
          </div>
        )}
      </div>
    </aside>

    <SuporteSheet open={suporteOpen} onClose={() => setSuporteOpen(false)} />
    </>
  );
};

export default DesktopSidebar;
