import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X, FileText, Newspaper, BookOpen, Gavel, Landmark, Shield, ScrollText, Bell, Info, LogOut, ChevronLeft, ChevronRight,
  User, LifeBuoy, Lock, GraduationCap, Library, StickyNote, Star, Gem, MessageSquareHeart,
  Pencil, Sparkles, Bell as BellIcon,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useProfileSummary } from '@/hooks/useProfileSummary';
import { useSubscription } from '@/hooks/useSubscription';
import { useAppUsageTime } from '@/hooks/useAppUsageTime';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { isAdminEmail } from '@/lib/adminEmails';
import { PageHeader } from '@/components/vademecum/PageHeader';
import { useEscapeKey } from '@/hooks/useEscapeKey';
import OpiniaoSheet from '@/components/menu/OpiniaoSheet';
import AvaliarAppSheet from '@/components/vademecum/AvaliarAppSheet';


interface SideMenuProps {
  open: boolean;
  onClose: () => void;
  onNavigate?: (section: string) => void;
}

interface Item {
  id: string;
  label: string;
  icon: any;
  hint?: string;
  danger?: boolean;
}
interface Group { title?: string; items: Item[]; }

// Destaques — Perfil, Planos, Opinião, Avaliar o app (Suporte desceu para "Conta")
const HIGHLIGHT_TRIO: Item[] = [
  { id: 'perfil',  label: 'Perfil',  icon: User },
  { id: 'planos',  label: 'Planos',  icon: Gem },
  { id: 'opiniao', label: 'Opinião', icon: MessageSquareHeart },
  { id: 'avaliar', label: 'Avaliar o app', icon: Star },
];

const GROUPS: Group[] = [
  {
    title: 'Conta',
    items: [
      { id: 'lembretes', label: 'Meus lembretes', icon: BellIcon },
      { id: 'suporte', label: 'Suporte', icon: LifeBuoy },
    ],
  },
  {
    title: 'Sistema',
    items: [
      { id: 'sobre', label: 'Sobre o App', icon: Info },
      { id: 'novidades', label: 'Atualizações', icon: BellIcon },
    ],
  },
  {
    items: [
      { id: 'sair', label: 'Sair', icon: LogOut, danger: true },
    ],
  },
];

const SideMenu = ({ open, onClose, onNavigate }: SideMenuProps) => {
  const [opiniaoOpen, setOpiniaoOpen] = useState(false);
  const [avaliarOpen, setAvaliarOpen] = useState(false);
  useEscapeKey(open, onClose);
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
  const { isPremium } = useSubscription();
  const { formattedToday, pctToday } = useAppUsageTime();

  useEffect(() => {
    window.dispatchEvent(new CustomEvent('sidemenu-state', { detail: { open } }));
    if (open) {
      document.body.dataset.sideMenuOpen = 'true';
      // Prefetch de rotas frequentes pra navegação instantânea
      import('@/pages/Assinatura.tsx').catch(() => {});
      import('@/pages/Perfil.tsx').catch(() => {});
    } else delete document.body.dataset.sideMenuOpen;
    return () => { delete document.body.dataset.sideMenuOpen; };
  }, [open]);

  const displayName =
    (user?.user_metadata as any)?.display_name ||
    (user?.user_metadata as any)?.full_name ||
    user?.email?.split('@')[0] ||
    'Usuário';
  const userEmail = user?.email || '';
  const { data: profileSummary } = useProfileSummary();
  const rawAvatarUrl =
    (profileSummary?.avatarUrl || undefined) ||
    (user?.user_metadata?.avatar_url as string | undefined) ||
    (user?.user_metadata?.picture as string | undefined);
  const [avatarBroken, setAvatarBroken] = useState(false);
  useEffect(() => { setAvatarBroken(false); }, [rawAvatarUrl]);
  const avatarUrl = avatarBroken ? undefined : rawAvatarUrl;
  const iniciais = (String(displayName)
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n: string) => n[0]?.toUpperCase())
    .join('') || 'U');
  const isAdmin = isAdminEmail(userEmail);

  const handleItemClick = async (id: string) => {
    if (id === 'sair') {
      await signOut();
      navigate('/auth');
      onClose();
      return;
    }

    // Opinião abre um bottom sheet (90% da altura) em vez de navegar.
    if (id === 'opiniao') {
      setOpiniaoOpen(true);
      return;
    }

    // Avaliar o app abre o bottom-sheet (prompt nativo da loja quando disponível).
    if (id === 'avaliar') {
      // Fecha o menu lateral primeiro para o sheet não abrir atrás dele.
      onClose();
      setTimeout(() => setAvaliarOpen(true), 180);
      return;
    }

    const directRoutes: Record<string, string> = {
      'perfil': '/perfil',
      'planos': '/assinatura',
      'suporte': '/suporte',
      'novidades': '/novidades',
      'atualizacao': '/noticias',
      'explicacao': '/explicacao-lei',
      'constituicao': '/legislacao/constituicao',
      'codigos': '/legislacao/codigos',
      'estatutos': '/legislacao/estatutos',
      'leis-ordinarias': '/legislacao/leis-ordinarias',
      'decretos': '/legislacao/decretos',
      'sumulas': '/jurisprudencia',
      'estudar': '/estudos',
      'resumos': '/resumos-juridicos',
      'biblioteca': '/biblioteca',
      'sobre': '/sobre',
      'lembretes': '/meus-lembretes',
    };

    if (directRoutes[id]) {
      navigate(directRoutes[id]);
      onClose();
      return;
    }

    onNavigate?.(id);
    onClose();
  };

  const sheet = (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-[2000] bg-background flex flex-col"
        >
          <PageHeader title="Menu" onBack={onClose} />

          <div className="flex-1 overflow-y-auto px-4 pb-8 pt-3">



              {/* Profile card */}
              <div className="rounded-3xl bg-gradient-to-br from-secondary/80 to-secondary/40 border border-border p-4 mb-4">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => { navigate('/perfil'); onClose(); }}
                    className="relative shrink-0 group"
                    aria-label="Editar perfil"
                  >
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt={String(displayName)}
                        referrerPolicy="no-referrer"
                        onError={() => setAvatarBroken(true)}
                        className="w-14 h-14 rounded-full object-cover border-2 border-primary/50"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-full border-2 border-primary/50 bg-primary/15 flex items-center justify-center">
                        <span className="font-display text-primary text-lg font-bold">{iniciais}</span>
                      </div>
                    )}
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-primary flex items-center justify-center border-2 border-card">
                      <Pencil className="w-3 h-3 text-primary-foreground" />
                    </div>
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="font-display text-base font-bold text-foreground leading-tight truncate">{displayName}</h2>
                      {isPremium ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/20 border border-primary/40 text-[10px] font-body font-bold uppercase tracking-wider text-primary">
                          <Sparkles className="w-3 h-3" /> Premium
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-muted border border-border text-[10px] font-body font-bold uppercase tracking-wider text-muted-foreground">
                          Free
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground font-body truncate">{userEmail}</p>
                  </div>
                  {!isPremium && (
                    <button
                      onMouseEnter={() => { import('@/pages/Assinatura.tsx').catch(() => {}); }}
                      onPointerDown={() => { import('@/pages/Assinatura.tsx').catch(() => {}); }}
                      onClick={() => { navigate('/assinatura'); onClose(); }}
                      className="px-3 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-body font-semibold whitespace-nowrap active:scale-95 transition-transform"
                    >
                      Atualizar
                    </button>
                  )}
                </div>

                {/* Study time bar */}
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-body text-muted-foreground">Tempo de estudo hoje</span>
                    <span className="text-xs font-body font-semibold text-foreground">{formattedToday}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pctToday}%` }}
                      transition={{ duration: 0.6, ease: 'easeOut' }}
                      className="h-full bg-primary rounded-full"
                    />
                  </div>
                </div>
              </div>

              {/* Perfil · Planos · Suporte como itens de lista (mesmo estilo de "Meus lembretes"). */}
              <GroupCard>
                {HIGHLIGHT_TRIO.map((it) => (
                  <MenuRow
                    key={it.id}
                    icon={it.icon}
                    label={it.label}
                    variant={it.id === 'planos' ? 'yellow' : undefined}
                    onClick={() => handleItemClick(it.id)}
                  />
                ))}
              </GroupCard>

              {/* Regular groups */}
              {GROUPS.map((g, idx) => (
                <React.Fragment key={g.title || `g-${idx}`}>
                  <GroupCard title={g.title}>
                    {g.items.map(item => (
                      <MenuRow
                        key={item.id}
                        icon={item.icon}
                        label={item.label}
                        danger={item.danger}
                        onClick={() => handleItemClick(item.id)}
                      />
                    ))}
                  </GroupCard>
                  {g.title === 'Conta' && isAdmin && (
                    <GroupCard title="Admin">
                      <MenuRow
                        icon={Lock}
                        label="Funções Admin"
                        onClick={() => { navigate('/admin-funcoes'); onClose(); }}
                      />
                    </GroupCard>
                  )}
                </React.Fragment>
              ))}


              <p className="text-center text-xs font-body text-muted-foreground pt-4 pb-2">
                Vacatio © 2026
              </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>

  );

  if (typeof document === 'undefined') return null;
  return createPortal(
    <>
      {sheet}
      <OpiniaoSheet open={opiniaoOpen} onClose={() => setOpiniaoOpen(false)} />
      <AvaliarAppSheet
        open={avaliarOpen}
        onClose={() => setAvaliarOpen(false)}
        onFeedback={() => { navigate('/suporte'); onClose(); }}
      />
    </>,
    document.body,
  );
};

function GroupCard({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div className="mb-3">
      {title && (
        <p className="px-3 pb-1.5 text-[11px] font-body font-semibold text-muted-foreground uppercase tracking-wider">
          {title}
        </p>
      )}
      <div className="rounded-2xl bg-secondary/60 border border-border overflow-hidden divide-y divide-border/60">
        {children}
      </div>
    </div>
  );
}

function MenuRow({
  icon: Icon,
  label,
  onClick,
  danger,
  variant,
}: {
  icon: any;
  label: string;
  onClick: () => void;
  danger?: boolean;
  variant?: 'yellow';
}) {
  if (variant === 'yellow') {
    return (
      <button
        onClick={onClick}
        className="group relative w-full flex items-center gap-3 px-4 py-[18px] text-left overflow-hidden transition-transform active:scale-[0.99] text-[hsl(35_85%_15%)]"
        style={{
          background: 'linear-gradient(135deg, hsl(48 96% 62%) 0%, hsl(43 96% 52%) 55%, hsl(38 92% 45%) 100%)',
        }}
      >
        {/* Shine reflection sweep — plays only on this row */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 -skew-x-12 animate-[planos-shine_3.2s_ease-in-out_infinite]"
          style={{
            background:
              'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.55) 50%, transparent 100%)',
          }}
        />
        <Icon className="relative w-5 h-5" strokeWidth={2.4} />
        <span className="relative font-body text-[15px] font-bold flex-1">{label}</span>
        <span className="relative text-[10px] uppercase tracking-widest font-display font-bold px-2 py-0.5 rounded-full bg-[hsl(35_85%_15%)]/15">
          Pro
        </span>
        <ChevronRight className="relative w-4 h-4 opacity-80" strokeWidth={2.6} />
      </button>
    );
  }
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-[18px] text-left transition-colors active:bg-muted/60 ${
        danger ? 'text-red-400 hover:text-red-300' : 'text-foreground/90 hover:bg-secondary'
      }`}
    >
      <Icon className={`w-5 h-5 ${danger ? 'text-red-400' : 'text-primary/80'}`} />
      <span className="font-body text-[15px] flex-1">{label}</span>
    </button>
  );
}

export default SideMenu;
