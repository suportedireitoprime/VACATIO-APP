import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, RotateCcw, Check, Monitor, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/vademecum/PageHeader';

const FIRST_SEEN_KEY = 'intro:firstSeen';
const VERSION_KEY = 'intro:version';

type IntroVersion = 'v1' | 'v2' | 'v3';

const VERSIONS: Array<{ id: IntroVersion; title: string; subtitle: string; src: string }> = [
  { id: 'v1', title: 'Editorial Silencioso', subtitle: 'Reveals por máscara · câmera parada · hierarquia editorial', src: '/intros/intro-v1.mp4' },
  { id: 'v2', title: 'Cinético', subtitle: 'Stagger por caractere · réguas em movimento · springs soltos', src: '/intros/intro-v2.mp4' },
  { id: 'v3', title: 'Selo Institucional', subtitle: 'Emblema com traço SVG · travamento do selo · reveal final', src: '/intros/intro-v3.mp4' },
];

function VersionCard({
  v,
  active,
  onSelect,
}: {
  v: (typeof VERSIONS)[number];
  active: boolean;
  onSelect: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [playing, setPlaying] = useState(false);

  const play = () => {
    const el = videoRef.current;
    if (!el) return;
    el.currentTime = 0;
    el.play().then(() => setPlaying(true)).catch(() => {});
  };

  return (
    <div className={`rounded-2xl border overflow-hidden bg-card ${active ? 'border-primary ring-2 ring-primary/30' : 'border-border'}`}>
      <div
        className="relative bg-[#EFE039] mx-auto flex items-center justify-center w-full"
        style={{ aspectRatio: '9 / 16', maxHeight: 'min(56vh, 480px)' }}
      >
        <video
          ref={videoRef}
          src={v.src}
          muted
          playsInline
          preload="metadata"
          onEnded={() => setPlaying(false)}
          className="w-full h-full object-contain"
        />
        {!playing && (
          <button
            onClick={play}
            aria-label={`Reproduzir ${v.title}`}
            className="absolute inset-0 flex items-center justify-center bg-black/10 active:bg-black/25"
          >
            <div className="w-16 h-16 rounded-full bg-black/80 flex items-center justify-center">
              <Play className="w-7 h-7 text-primary ml-1" />
            </div>
          </button>
        )}
        {active && (
          <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-primary text-primary-foreground text-[11px] font-semibold flex items-center gap-1">
            <Check className="w-3 h-3" /> Ativa
          </div>
        )}
      </div>
      <div className="p-4 space-y-3">
        <div>
          <h3 className="font-display font-bold text-base leading-tight">{v.title}</h3>
          <p className="font-body text-xs text-muted-foreground mt-1">{v.subtitle}</p>
        </div>
        <button
          onClick={onSelect}
          disabled={active}
          className={`w-full h-11 rounded-xl font-semibold text-sm transition-colors ${
            active
              ? 'bg-secondary text-muted-foreground cursor-default'
              : 'bg-primary text-primary-foreground active:scale-95'
          }`}
        >
          {active ? 'Selecionada' : 'Definir como ativa'}
        </button>
      </div>
    </div>
  );
}

export default function AdminTriagemEntrada() {
  const navigate = useNavigate();
  const [active, setActive] = useState<IntroVersion>('v1');
  const [firstSeen, setFirstSeen] = useState<boolean>(false);

  useEffect(() => {
    try {
      const v = localStorage.getItem(VERSION_KEY);
      if (v === 'v1' || v === 'v2' || v === 'v3') setActive(v);
      setFirstSeen(localStorage.getItem(FIRST_SEEN_KEY) === '1');
    } catch {}
  }, []);

  const handleSelect = (v: IntroVersion) => {
    try {
      localStorage.setItem(VERSION_KEY, v);
      setActive(v);
      toast.success(`Versão ${v.toUpperCase()} definida como ativa.`);
    } catch (e: any) {
      toast.error(String(e?.message || e));
    }
  };

  const handleReset = () => {
    try {
      localStorage.removeItem(FIRST_SEEN_KEY);
      setFirstSeen(false);
      toast.success('Primeira exibição resetada — a intro aparecerá na próxima abertura do app.');
    } catch (e: any) {
      toast.error(String(e?.message || e));
    }
  };

  return (
    <div className="min-h-dvh bg-background">
      <PageHeader title="Triagem de Entrada" onBack={() => navigate('/admin-funcoes')} />

      <div className="hidden lg:flex min-h-[70vh] items-center justify-center p-6">
        <div className="max-w-md text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-primary/15 text-primary flex items-center justify-center mx-auto">
            <Monitor className="w-8 h-8" />
          </div>
          <h2 className="font-display font-bold text-2xl">Disponível apenas em mobile e tablet</h2>
          <p className="font-body text-sm text-muted-foreground">
            A Triagem de Entrada é a intro nativa do app (formato 9:16) e nunca aparece em desktop.
            Abra esta página em um celular ou tablet para pré-visualizar e escolher qual versão fica ativa.
          </p>
          <button
            onClick={() => navigate('/admin-funcoes')}
            className="h-11 px-5 rounded-xl bg-primary text-primary-foreground font-semibold"
          >
            Voltar para Funções
          </button>
        </div>
      </div>

      <div className="lg:hidden max-w-2xl mx-auto p-3 sm:p-4 pb-24 space-y-4">
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-xl bg-primary/15 flex items-center justify-center text-primary shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-display font-bold text-lg leading-tight">Escolha a intro do app</h2>
              <p className="font-body text-sm text-muted-foreground mt-1">
                Três versões animadas em Remotion (9:16, ~4s, sem som). A versão ativa é exibida
                <b> uma única vez</b>, na primeira abertura do app em celular ou tablet.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {VERSIONS.map((v) => (
            <VersionCard key={v.id} v={v} active={active === v.id} onSelect={() => handleSelect(v.id)} />
          ))}
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Status neste dispositivo:</span>
            <span className="font-semibold">{firstSeen ? 'já assistida' : 'ainda não assistida'}</span>
          </div>
          <button
            onClick={handleReset}
            className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-semibold flex items-center justify-center gap-2 active:scale-95"
          >
            <RotateCcw className="w-4 h-4" /> Resetar primeira exibição
          </button>
          <p className="text-[11px] text-muted-foreground text-center">
            A intro aparece 1× por dispositivo, na primeira vez que o app é aberto (armazenado localmente).
          </p>
        </div>
      </div>
    </div>
  );
}
