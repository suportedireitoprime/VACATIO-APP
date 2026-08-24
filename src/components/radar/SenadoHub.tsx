import { useState } from 'react';
import { ArrowLeft, Landmark, Users, ChevronRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import senadoHeroAsset from '@/assets/radar/senado-hero.webp';
const senadoHero = senadoHeroAsset;
import SenadoresPanel from './SenadoresPanel';

type SubView = 'hub' | 'senadores';

interface SenadoHubProps {
  searchQuery: string;
  onBack: () => void;
}

const SenadoHub = ({ searchQuery, onBack }: SenadoHubProps) => {
  const [subView, setSubView] = useState<SubView>('hub');

  if (subView === 'senadores') {
    return (
      <div>
        <button onClick={() => setSubView('hub')} className="flex items-center gap-1.5 text-sm text-primary mb-4">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </button>
        <h2 className="font-display text-lg font-bold mb-1">Senadores</h2>
        <p className="text-xs text-muted-foreground mb-4">Senadores em exercício</p>
        <SenadoresPanel searchQuery={searchQuery} />
      </div>
    );
  }

  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-primary mb-4">
        <ArrowLeft className="w-4 h-4" /> Voltar
      </button>

      <h1 className="font-display text-xl font-bold mb-1">Senado Federal</h1>
      <p className="text-xs text-muted-foreground mb-5">Poder Legislativo Federal</p>

      {/* Hero card */}
      <Card className="overflow-hidden border-border/50 bg-gradient-to-br from-primary/10 to-primary/5 mb-6">
        <CardContent className="p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-primary/20">
              <Landmark className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-display text-sm font-bold">Senado Federal</p>
              <p className="text-xs text-muted-foreground">Poder Legislativo Federal</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Acompanhe senadores em exercício, matérias legislativas e votações do plenário.
          </p>
        </CardContent>
      </Card>

      {/* Menu items */}
      <div className="flex items-center gap-2 mb-4">
        <Landmark className="w-4 h-4 text-muted-foreground" />
        <h2 className="font-display text-sm font-semibold">Explorar</h2>
      </div>

      <div className="space-y-3">
        <button onClick={() => setSubView('senadores')} className="w-full text-left">
          <Card className="border-border/50 bg-card/50 hover:bg-muted/50 transition-colors cursor-pointer">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="relative w-14 h-14 rounded-xl overflow-hidden shrink-0">
                <img src={senadoHero} alt="" className="w-full h-full object-cover" loading="lazy" />
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                  <Users className="w-5 h-5 text-primary" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-[10px] font-bold text-primary tracking-wider">81 SENADORES</span>
                <p className="text-sm font-medium">Senadores em Exercício</p>
                <p className="text-xs text-muted-foreground truncate">Lista completa com perfil, partido...</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
            </CardContent>
          </Card>
        </button>
      </div>
    </div>
  );
};

export default SenadoHub;
