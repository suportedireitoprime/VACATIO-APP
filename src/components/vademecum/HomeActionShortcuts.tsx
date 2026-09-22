import { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageCircle, ScrollText, Feather, Heart } from 'lucide-react';
import { useShortcutBadges } from '@/hooks/useShortcutBadges';
import { prefetchRoute, type PrefetchKey } from '@/lib/routePrefetch';

const SHORTCUT_ITEMS = [
  { label: 'Favoritos', icon: Heart, to: '/pessoal/favoritos' as string | null, action: null as (() => void) | null, color: '#F87171', badgeColor: null, badgeKey: null, prefetch: null as PrefetchKey | null },
  { label: 'Anotações', icon: ScrollText, to: '/pessoal/anotacoes' as string | null, action: null as (() => void) | null, color: '#38BDF8', badgeColor: null, badgeKey: null, prefetch: null as PrefetchKey | null },
  { label: 'Grifos', icon: Feather, to: '/pessoal/grifos' as string | null, action: null as (() => void) | null, color: '#34D399', badgeColor: null, badgeKey: null, prefetch: null as PrefetchKey | null },
  { label: 'Chat', icon: MessageCircle, to: null as string | null, action: () => window.dispatchEvent(new CustomEvent('vacatio:open-chat')), color: '#FACC15', badgeColor: null, badgeKey: null, prefetch: null as PrefetchKey | null },
];

const HomeActionShortcuts = () => {
  const navigate = useNavigate();
  const shortcutBadges = useShortcutBadges();

  return (
    <div className="grid grid-cols-4 gap-2 mx-1 mt-1">
      {SHORTCUT_ITEMS.map((item, index) => {
        const Icon = item.icon;
        const badgeCount = item.badgeKey ? shortcutBadges.counts[item.badgeKey] : 0;
        return (
          <button
            key={item.label}
            type="button"
            onPointerDown={() => item.prefetch && prefetchRoute(item.prefetch)}
            onMouseEnter={() => item.prefetch && prefetchRoute(item.prefetch)}
            onFocus={() => item.prefetch && prefetchRoute(item.prefetch)}
            onClick={() => {
              try {
                if (item.badgeKey) shortcutBadges.markSeen(item.badgeKey);
              } catch (err) {
                console.warn('[HomeActionShortcuts] Feedback error:', err);
              }
              if (item.action) {
                item.action();
              } else if (item.to) {
                navigate(item.to);
              }
            }}
            style={{ '--shimmer-delay': `${index * 150}ms` } as React.CSSProperties}
            className="group flex flex-col items-center justify-center py-3 px-1 rounded-2xl bg-card hover:bg-secondary backdrop-blur-md border border-white/10 shadow-xl transition-all active:scale-95 gap-2 text-center min-h-[48px] select-none cursor-pointer overflow-hidden"
          >
            {badgeCount > 0 && item.badgeColor && (
              <span
                className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full text-white text-[10px] font-bold leading-none flex items-center justify-center border border-white/20 shadow z-10"
                style={{ backgroundColor: item.badgeColor }}
              >
                {badgeCount > 99 ? '99+' : badgeCount}
              </span>
            )}

            <Icon
              className="w-5 h-5 shrink-0 transition-all group-hover:scale-110"
              style={{ color: item.color }}
              strokeWidth={2}
            />
            <span className="text-[9px] font-extrabold text-white/90 leading-tight uppercase tracking-wider">
              {item.label}
            </span>
          </button>
        );
      })}
    </div>
  );
};

export default memo(HomeActionShortcuts);
