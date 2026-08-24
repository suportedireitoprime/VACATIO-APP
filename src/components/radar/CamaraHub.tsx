import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Users, FileText, TrendingUp, Vote, ChevronRight, Building2, Trophy } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import camaraHeroAsset from '@/assets/radar/camara-hero.webp';
const camaraHero = camaraHeroAsset;
import DeputadosPanel from './DeputadosPanel';
import VotacoesPanel from './VotacoesPanel';
import RankingPanel from './RankingPanel';

type SubView = 'hub' | 'deputados' | 'votacoes' | 'rankings';

const MENU_ITEMS: { id: SubView; label: string; subtitle: string; icon: typeof Users; badge?: string; color: string }[] = [
  { id: 'deputados', label: 'Deputados Federais', subtitle: 'Lista completa com perfil, partido...', icon: Users, badge: '513 DEPUTADOS', color: 'text-emerald-400' },
  { id: 'votacoes', label: 'Votações', subtitle: 'Resultados e votos nominais...', icon: Vote, badge: 'PLENÁRIO', color: 'text-purple-400' },
  { id: 'rankings', label: 'Rankings', subtitle: 'Gastos, produtividade e presença...', icon: Trophy, badge: 'DESEMPENHO', color: 'text-yellow-400' },
];

interface CamaraHubProps {
  searchQuery: string;
  onBack: () => void;
}

const CamaraHub = ({ searchQuery, onBack }: CamaraHubProps) => {
  const [subView, setSubView] = useState<SubView>('hub');

  if (subView === 'deputados') {
    return (
      <div>
        <button onClick={() => setSubView('hub')} className="flex items-center gap-1.5 text-sm text-primary mb-4">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </button>
        <h2 className="font-display text-lg font-bold mb-1">Deputados Federais</h2>
        <p className="text-xs text-muted-foreground mb-4">513 deputados em exercício</p>
        <DeputadosPanel searchQuery={searchQuery} />
      </div>
    );
  }

  if (subView === 'votacoes') {
    return (
      <div>
        <button onClick={() => setSubView('hub')} className="flex items-center gap-1.5 text-sm text-primary mb-4">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </button>
        <h2 className="font-display text-lg font-bold mb-1">Votações</h2>
        <p className="text-xs text-muted-foreground mb-4">Votações recentes do plenário</p>
        <VotacoesPanel />
      </div>
    );
  }

  if (subView === 'rankings') {
    return (
      <div>
        <button onClick={() => setSubView('hub')} className="flex items-center gap-1.5 text-sm text-primary mb-4">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </button>
        <h2 className="font-display text-lg font-bold mb-1">Rankings</h2>
        <p className="text-xs text-muted-foreground mb-4">Desempenho dos deputados federais</p>
        <RankingPanel />
      </div>
    );
  }

  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-primary mb-4">
        <ArrowLeft className="w-4 h-4" /> Voltar
      </button>

      <h1 className="font-display text-xl font-bold mb-1">Câmara dos Deputados</h1>
      <p className="text-xs text-muted-foreground mb-5">Poder Legislativo Federal</p>

      {/* Hero card */}
      <Card className="overflow-hidden border-border/50 bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 mb-6">
        <CardContent className="p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-emerald-500/20">
              <Building2 className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="font-display text-sm font-bold">Câmara dos Deputados</p>
              <p className="text-xs text-muted-foreground">57ª Legislatura (2023-2027)</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Explore informações sobre deputados federais, projetos de lei em tramitação e a cota parlamentar.
          </p>
        </CardContent>
      </Card>

      {/* Menu items */}
      <div className="flex items-center gap-2 mb-4">
        <Building2 className="w-4 h-4 text-muted-foreground" />
        <h2 className="font-display text-sm font-semibold">Explorar</h2>
      </div>

      <div className="space-y-3">
        {MENU_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => setSubView(item.id)}
              className="w-full text-left"
            >
              <Card className="border-border/50 bg-card/50 transition-colors hover:bg-muted/50 cursor-pointer">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="relative w-14 h-14 rounded-xl overflow-hidden shrink-0">
                    <img src={camaraHero} alt="" className="w-full h-full object-cover" loading="lazy" />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <Icon className={`w-5 h-5 ${item.color}`} />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    {item.badge && (
                      <span className={`text-[10px] font-bold ${item.color} tracking-wider`}>
                        {item.badge}
                      </span>
                    )}
                    <p className="text-sm font-medium">{item.label}</p>
                    <p className="text-xs text-muted-foreground truncate">{item.subtitle}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                </CardContent>
              </Card>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default CamaraHub;
