import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ScanEye, Landmark, ArrowRight, CheckCircle2 } from 'lucide-react';
import { PageHeader } from '@/components/vademecum/PageHeader';
import radarLeisLocal from '@/assets/radares/radar-leis.webp';
import radarLegislativoLocal from '@/assets/radares/radar-legislativo.webp';
import radarLeisAsset from '@/assets/radares/radar-leis.webp.asset.json';
import radarLegislativoAsset from '@/assets/radares/radar-legislativo.webp.asset.json';
import { pickAsset } from '@/lib/assetUrl';

type RadarKey = 'leis' | 'legislativo';

const radarLeisSrc = pickAsset(radarLeisLocal, radarLeisAsset.url);
const radarLegislativoSrc = pickAsset(radarLegislativoLocal, radarLegislativoAsset.url);

// Cache aquecido: pré-carrega ambas as capas assim que o módulo entra em memória.
if (typeof window !== 'undefined') {
  [radarLeisSrc, radarLegislativoSrc].forEach((src) => {
    const img = new Image();
    img.decoding = 'async';
    img.src = src;
  });
}

const RADARES: Record<RadarKey, {
  label: string;
  short: string;
  cover: string;
  icon: typeof ScanEye;
  descricao: string;
  bullets: string[];
  cta: string;
  route: string;
  gradient: string; // gradiente do fundo da capa
}> = {
  leis: {
    label: 'Radar de Leis',
    short: 'Alterações em tempo real',
    cover: radarLeisSrc,
    icon: ScanEye,
    descricao:
      'Monitora, em tempo real, publicações no Diário Oficial da União e no Planalto. Você vê o que foi alterado, revogado ou incluído em cada lei do Vade Mecum, com análise da IA.',
    bullets: [
      'Novidades diárias da CF/88, Códigos e Estatutos',
      'Comparativo do texto original vs. atualizado',
      '"O que pode mudar" — projeções contextuais',
    ],
    cta: 'Abrir Radar de Leis',
    route: '/radar-360',
    gradient:
      'radial-gradient(120% 90% at 50% 30%, #3a0f0a 0%, #1a0605 45%, #080303 100%)',
  },
  legislativo: {
    label: 'Radar Legislativo',
    short: 'Câmara, Senado e projetos',
    cover: radarLegislativoSrc,
    icon: Landmark,
    descricao:
      'Acompanhe a atividade do Congresso Nacional em tempo real: projetos de lei, votações, deputados e rankings. Ideal para entender o que está por vir.',
    bullets: [
      'PLs em andamento na Câmara e no Senado',
      'Perfil e produção de deputados',
      'Rankings, votações e manchetes com IA',
    ],
    cta: 'Abrir Radar Legislativo',
    route: '/radar/proposicoes',
    gradient:
      'radial-gradient(120% 90% at 50% 30%, #0d2246 0%, #08132b 45%, #030814 100%)',
  },
};

export default function Radares() {
  const navigate = useNavigate();
  const [active, setActive] = useState<RadarKey>('leis');
  const item = RADARES[active];

  return (
    <div className="min-h-dvh bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/85 backdrop-blur-md">
        <div className="max-w-3xl mx-auto">
          <PageHeader
            title="Radares"
            subtitle="Panorama legislativo em tempo real"
            onBack={() => navigate(-1)}
          />
        </div>

        {/* Alternância */}
        <div className="max-w-3xl mx-auto px-4 pb-3">
          <div className="relative grid grid-cols-2 bg-secondary/60 rounded-full p-1 border border-border">
            <motion.div
              layout
              transition={{ type: 'spring', stiffness: 400, damping: 32 }}
              className="absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-full bg-primary shadow-md"
              style={{ left: active === 'leis' ? 4 : 'calc(50% + 0px)' }}
            />
            {(Object.keys(RADARES) as RadarKey[]).map((key) => {
              const r = RADARES[key];
              const Icon = r.icon;
              const isActive = active === key;
              return (
                <button
                  key={key}
                  onClick={() => setActive(key)}
                  className={`relative z-[1] flex items-center justify-center gap-2 py-2 rounded-full text-sm font-semibold transition-colors ${
                    isActive ? 'text-primary-foreground' : 'text-foreground/70'
                  }`}
                >
                  <Icon className="w-4 h-4" strokeWidth={2} />
                  <span className="truncate">{r.label.replace('Radar ', '')}</span>
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* Conteúdo dinâmico */}
      <div className="max-w-3xl mx-auto px-4 pt-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={active}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
          >
            {/* Capa — mesmo estilo dos artigos do blog, com imagem vazada centralizada */}
            <div
              className="relative rounded-2xl overflow-hidden border border-border shadow-2xl shadow-black/40 aspect-[16/10]"
              style={{ background: item.gradient }}
            >
              {/* halo de luz atrás do objeto */}
              <div
                className="pointer-events-none absolute inset-0"
                style={{
                  background:
                    active === 'leis'
                      ? 'radial-gradient(45% 40% at 50% 45%, rgba(255,140,80,0.35), transparent 70%)'
                      : 'radial-gradient(45% 40% at 50% 45%, rgba(120,170,255,0.30), transparent 70%)',
                }}
              />

              {/* imagem vazada (PNG transparente) */}
              <img
                src={item.cover}
                alt={item.label}
                width={1280}
                height={1280}
                loading="eager"
                decoding="async"
                className="absolute inset-0 m-auto w-[78%] h-[92%] object-contain drop-shadow-[0_20px_40px_rgba(0,0,0,0.6)]"
              />

              {/* gradientes superior e inferior — padrão blog */}
              <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-black/50 to-transparent" />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />

              {/* chip + título */}
              <div className="absolute bottom-0 left-0 right-0 p-4">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-wide">
                  <item.icon className="w-3.5 h-3.5" />
                  {item.short}
                </div>
                <h2 className="mt-2 font-display text-2xl sm:text-3xl font-bold text-white leading-[1.15] tracking-tight drop-shadow-lg">
                  {item.label}
                </h2>
              </div>
            </div>

            {/* Descrição */}
            <p className="mt-5 font-body text-base text-foreground/80 leading-relaxed">
              {item.descricao}
            </p>

            {/* Bullets */}
            <ul className="mt-5 space-y-3">
              {item.bullets.map((b) => (
                <li key={b} className="flex items-start gap-3 p-3 rounded-xl bg-secondary/40 border border-border">
                  <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <span className="font-body text-sm text-foreground">{b}</span>
                </li>
              ))}
            </ul>

            {/* CTA com reflexo */}
            <button
              onClick={() => navigate(item.route)}
              className="btn-attention-shine mt-6 w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-primary text-primary-foreground font-semibold text-base shadow-lg shadow-primary/30 hover:brightness-110 transition"
            >
              <span className="relative z-[2]">{item.cta}</span>
              <ArrowRight className="w-5 h-5 relative z-[2]" />
            </button>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
