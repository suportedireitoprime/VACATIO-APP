import { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Scroll, Headphones, BookOpen, AlertTriangle } from 'lucide-react';
import { useShortcutBadges } from '@/hooks/useShortcutBadges';
import { prefetchRoute, type PrefetchKey } from '@/lib/routePrefetch';

const UserSpeakingIcon = (props: any) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={props.strokeWidth || 2}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={props.className}
    style={props.style}
  >
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M17.5 6a5 5 0 0 1 0 6" />
    <path d="M20.5 3a9 9 0 0 1 0 12" />
  </svg>
);

const SHORTCUT_ITEMS = [
  { label: 'Me Explique', icon: UserSpeakingIcon, to: '/me-explique' as string | null, action: null as (() => void) | null, color: '#A78BFA', badgeColor: null, badgeKey: null, prefetch: null as PrefetchKey | null },
  { label: 'Blog', icon: Scroll, to: '/blog' as string | null, action: null as (() => void) | null, color: '#F87171', badgeColor: null, badgeKey: null, prefetch: null as PrefetchKey | null },
  { label: 'Boletins', icon: Headphones, to: '/boletins' as string | null, action: null as (() => void) | null, color: '#38BDF8', badgeColor: null, badgeKey: null, prefetch: null as PrefetchKey | null },
  { label: 'Novidades', icon: AlertTriangle, to: '/noticias' as string | null, action: null as (() => void) | null, color: '#FACC15', badgeColor: null, badgeKey: null, prefetch: null as PrefetchKey | null },
];

const HomeActionShortcuts = () => {
  const navigate = useNavigate();
  const shortcutBadges = useShortcutBadges();

  return (
    <div className="flex items-center justify-between gap-2 mx-1 mt-1 bg-black/40 backdrop-blur-md border border-white/10 rounded-3xl p-2 shadow-2xl">
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
            style={{
              '--shimmer-delay': `${index * 150}ms`,
            } as React.CSSProperties}
            className="flex-1 group relative flex flex-col items-center justify-center py-2 px-1 rounded-[14px] hover:bg-white/5 active:bg-white/10 transition-all duration-200 active:scale-95 gap-1.5 text-center select-none cursor-pointer overflow-hidden"
          >
            {badgeCount > 0 && item.badgeColor && (
              <span
                className="absolute top-1 right-2 min-w-[16px] h-[16px] px-1 rounded-full text-white text-[9px] font-bold leading-none flex items-center justify-center border border-white/20 shadow z-10"
                style={{ backgroundColor: item.badgeColor }}
              >
                {badgeCount > 99 ? '99+' : badgeCount}
              </span>
            )}

            <Icon
              className="w-5 h-5 shrink-0 transition-transform duration-200 group-hover:scale-110"
              style={{ color: item.color, filter: 'saturate(1.25) drop-shadow(0 2px 4px rgba(0,0,0,0.5))' }}
              strokeWidth={2}
            />
            <span className="font-body text-white text-[12px] sm:text-[13px] font-semibold leading-tight capitalize tracking-wide drop-shadow-[0_1px_2px_rgba(0,0,0,0.7)]">
              {item.label}
            </span>
          </button>
        );
      })}
    </div>
  );
};

export default memo(HomeActionShortcuts);
