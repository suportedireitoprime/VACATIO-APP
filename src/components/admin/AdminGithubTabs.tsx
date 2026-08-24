import { useNavigate, useLocation } from 'react-router-dom';
import { KeyRound, ImageIcon } from 'lucide-react';

/**
 * Tabs de alternância no topo das telas admin ligadas ao mesmo repositório GitHub.
 * Permite pular entre "Secrets" e "Ícones & Splash" mantendo o mesmo repo salvo.
 */
export function AdminGithubTabs() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const tabs = [
    { id: 'secrets', label: 'Secrets', icon: KeyRound, path: '/admin-secrets' },
    { id: 'assets',  label: 'Ícones & Splash', icon: ImageIcon, path: '/admin-native-assets' },
  ];

  return (
    <div className="w-full p-1 rounded-2xl bg-secondary/70 border border-border flex items-center gap-1">
      {tabs.map(t => {
        const active = pathname === t.path;
        const Icon = t.icon;
        return (
          <button
            key={t.id}
            onClick={() => !active && navigate(t.path)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-body text-xs sm:text-sm font-semibold transition-all ${
              active
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Icon className="w-4 h-4" />
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
