import { useNavigate } from 'react-router-dom';
import { ScanEye, ArrowRight, CheckCircle2 } from 'lucide-react';
import { PageHeader } from '@/components/vademecum/PageHeader';
import radarLeisLocal from '@/assets/radares/radar-leis.webp';
import radarLeisAsset from '@/assets/radares/radar-leis.webp.asset.json';
import { pickAsset } from '@/lib/assetUrl';

const radarLeisSrc = pickAsset(radarLeisLocal, radarLeisAsset.url);

// Cache aquecido: pré-carrega a capa assim que o módulo entra em memória.
if (typeof window !== 'undefined') {
  const img = new Image();
  img.decoding = 'async';
  img.src = radarLeisSrc;
}

const item = {
  label: 'Radar 360',
  short: 'Projetos em Tramitação',
  cover: radarLeisSrc,
  icon: ScanEye,
  descricao:
    'Acompanha em tempo real os Projetos de Lei e PECs em tramitação na Câmara dos Deputados e no Senado Federal que podem alterar artigos e leis vigentes.',
  bullets: [
    'Projetos de Lei (PL, PLP, PEC) em tramitação',
    'Deputados e Senadores autores das proposições',
    'Destaque para projetos que alteram Leis e Códigos',
  ],
  cta: 'Abrir Radar 360',
  route: '/radar',
  gradient:
    'radial-gradient(120% 90% at 50% 30%, #3a0f0a 0%, #1a0605 45%, #080303 100%)',
};

export default function Radares() {
  const navigate = useNavigate();

  return (
    <div className="min-h-dvh bg-background pb-[calc(5.5rem+var(--sai-bottom,0px)+var(--active-mini-player-offset,0px))] lg:pb-8">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/85 backdrop-blur-md">
        <div className="max-w-3xl mx-auto">
          <PageHeader
            title="Radares"
            subtitle="Panorama legislativo em tempo real"
            onBack={() => navigate(-1)}
          />
        </div>
      </header>

      {/* Conteúdo direto (sem tabs) mais compacto */}
      <div className="max-w-3xl mx-auto px-4 pt-4">
        {/* Capa */}
        <div
          className="relative rounded-2xl overflow-hidden border border-border shadow-2xl shadow-black/40 aspect-[16/10]"
          style={{ background: item.gradient }}
        >
          {/* halo de luz atrás do objeto */}
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background: 'radial-gradient(45% 40% at 50% 45%, rgba(255,140,80,0.35), transparent 70%)',
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

          {/* gradientes superior e inferior */}
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
      </div>
    </div>
  );
}
