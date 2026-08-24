import { Check, Palette, ShieldCheck, Bell, Info, Trash2, ChevronRight, MessageCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTheme } from '@/hooks/useTheme';
import { motion } from 'framer-motion';
import { AppHeader } from '@/components/layout/AppHeader';

const Configuracoes = () => {
  const { currentTheme, setTheme, palettes } = useTheme();

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <AppHeader
        title={
          <span className="flex items-center gap-1.5">
            <Palette className="w-4 h-4 text-primary" />
            Configurações
          </span>
        }
      />


      <div className="px-4 py-6 max-w-lg mx-auto">
        <h2 className="font-display text-base text-foreground mb-1">Paleta de Cores</h2>
        <p className="font-body text-sm text-muted-foreground mb-5">
          Escolha o tema visual do aplicativo
        </p>

        <div className="flex flex-col gap-3">
          {palettes.map((palette) => {
            const isActive = currentTheme === palette.id;
            const bg = palette.colors['--background'];
            const primary = palette.colors['--primary'];
            const card = palette.colors['--card'];
            const secondary = palette.colors['--secondary'];
            const muted = palette.colors['--muted'];

            return (
              <motion.button
                key={palette.id}
                whileTap={{ scale: 0.98 }}
                onClick={() => setTheme(palette.id)}
                className={`relative w-full rounded-xl border-2 p-4 text-left transition-all ${
                  isActive
                    ? 'border-primary shadow-lg shadow-primary/20'
                    : 'border-border hover:border-muted-foreground/30'
                }`}
              >
                {/* Active indicator */}
                {isActive && (
                  <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                    <Check className="w-3.5 h-3.5 text-primary-foreground" />
                  </div>
                )}

                <div className="flex items-center gap-4">
                  {/* Color preview circles */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex gap-1.5">
                      <div
                        className="w-8 h-8 rounded-lg"
                        style={{ backgroundColor: `hsl(${bg})` }}
                      />
                      <div
                        className="w-8 h-8 rounded-lg"
                        style={{ backgroundColor: `hsl(${card})` }}
                      />
                    </div>
                    <div className="flex gap-1.5">
                      <div
                        className="w-8 h-8 rounded-lg"
                        style={{ backgroundColor: `hsl(${primary})` }}
                      />
                      <div
                        className="w-8 h-8 rounded-lg"
                        style={{ backgroundColor: `hsl(${secondary})` }}
                      />
                    </div>
                  </div>

                  {/* Mini mockup */}
                  <div
                    className="flex-1 h-[68px] rounded-lg overflow-hidden relative"
                    style={{ backgroundColor: `hsl(${bg})` }}
                  >
                    <div
                      className="absolute top-0 left-0 right-0 h-4"
                      style={{ backgroundColor: `hsl(${primary})` }}
                    />
                    <div className="px-2 pt-6 flex gap-1.5">
                      <div
                        className="w-8 h-4 rounded-sm"
                        style={{ backgroundColor: `hsl(${card})` }}
                      />
                      <div
                        className="w-8 h-4 rounded-sm"
                        style={{ backgroundColor: `hsl(${card})` }}
                      />
                      <div
                        className="w-8 h-4 rounded-sm"
                        style={{ backgroundColor: `hsl(${muted})` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-3">
                  <h3 className="font-display text-sm text-foreground">{palette.name}</h3>
                  <p className="font-body text-xs text-muted-foreground">{palette.description}</p>
                </div>
              </motion.button>
            );
          })}
        </div>

        {/* Seções adicionais */}
        <div className="mt-8 space-y-2">
          <h2 className="font-display text-base text-foreground mb-2">Conta e app</h2>

          {[
            { to: '/ajustes/horus', icon: MessageCircle, label: 'Horus no WhatsApp', desc: 'Receber alertas e tirar dúvidas' },
            { to: '/ajustes/seguranca', icon: ShieldCheck, label: 'Segurança', desc: 'Sessões ativas' },
            { to: '/ajustes/lembretes', icon: Bell, label: 'Lembretes de estudo', desc: 'Notificações agendadas' },
            { to: '/sobre', icon: Info, label: 'Sobre o Vacatio', desc: 'Versão, contato e feedback' },
            { to: '/ajustes/excluir-conta', icon: Trash2, label: 'Excluir minha conta', desc: 'Ação permanente', danger: true },
          ].map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={`flex items-center gap-3 p-4 rounded-xl border transition-colors ${
                item.danger
                  ? 'bg-destructive/5 border-destructive/30 hover:bg-destructive/10'
                  : 'bg-card border-border hover:border-primary/40'
              }`}
            >
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                item.danger ? 'bg-destructive/15 text-destructive' : 'bg-primary/15 text-primary'
              }`}>
                <item.icon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className={`font-body font-semibold text-sm ${item.danger ? 'text-destructive' : 'text-foreground'}`}>
                  {item.label}
                </p>
                <p className="font-body text-xs text-muted-foreground">{item.desc}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Configuracoes;
