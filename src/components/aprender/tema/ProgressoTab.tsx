import { RotateCw, TrendingUp, CheckCircle2, XCircle, Layers } from 'lucide-react';
import { calcularNivel, mascotesNivel, rotuloNivel } from '@/lib/aprenderMascotes';

type Props = {
  totalQuestoes: number;
  totalFlashcards: number;
  respondidas: number;
  acertos: number;
  onResetar: () => void;
};

const ProgressoTab = ({ totalQuestoes, totalFlashcards, respondidas, acertos, onResetar }: Props) => {
  const erros = Math.max(0, respondidas - acertos);
  const pct = respondidas ? Math.round((acertos / respondidas) * 100) : 0;
  const nivel = calcularNivel(pct, respondidas);
  const mascote = mascotesNivel[nivel];

  return (
    <div className="space-y-4">
      {/* Painel amarelo com nível + mascote */}
      <div
        className="relative flex min-h-[180px] items-stretch overflow-hidden rounded-2xl bg-hero-yellow p-5 pr-2 sm:p-6 sm:pr-3"
      >
        <div className="flex min-w-0 flex-1 flex-col justify-center gap-2 text-black">
          <span
            className="text-[11px] font-bold uppercase tracking-widest text-black/70"
            style={{ fontFamily: "'Barlow', system-ui, sans-serif" }}
          >
            Seu nível
          </span>
          <div className="flex items-baseline gap-2">
            <span
              className="text-5xl font-black tabular-nums leading-none sm:text-6xl"
              style={{ fontFamily: "'Barlow', system-ui, sans-serif" }}
            >
              {pct}
            </span>
            <span
              className="text-2xl font-bold text-black/70"
              style={{ fontFamily: "'Barlow', system-ui, sans-serif" }}
            >
              /100
            </span>
          </div>
          <div
            className="inline-flex w-fit items-center gap-1.5 rounded-full bg-black/85 px-3 py-1.5 text-[12px] font-bold uppercase tracking-wider text-[#EFE039]"
            style={{ fontFamily: "'Barlow', system-ui, sans-serif" }}
          >
            <TrendingUp className="h-3.5 w-3.5" />
            {rotuloNivel[nivel]}
          </div>
        </div>
        <img
          src={mascote}
          alt={`Nível ${rotuloNivel[nivel]}`}
          loading="lazy"
          width={200}
          height={200}
          className="h-[170px] w-auto self-end object-contain sm:h-[190px]"
          style={{ marginBottom: '-8px' }}
        />
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <StatCard label="Questões" value={`${respondidas}/${totalQuestoes}`} Icon={TrendingUp} />
        <StatCard label="Acertos" value={String(acertos)} Icon={CheckCircle2} tint="text-green-600" />
        <StatCard label="Erros" value={String(erros)} Icon={XCircle} tint="text-red-600" />
        <StatCard label="Flashcards" value={String(totalFlashcards)} Icon={Layers} />
      </div>

      {/* Barra de aproveitamento */}
      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="mb-2 flex items-center justify-between">
          <span
            className="text-[13px] font-semibold text-foreground"
            style={{ fontFamily: "'Barlow', system-ui, sans-serif" }}
          >
            Aproveitamento
          </span>
          <span
            className="text-[13px] font-bold tabular-nums text-primary"
            style={{ fontFamily: "'Barlow', system-ui, sans-serif" }}
          >
            {pct}%
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${pct}%`, background: '#EFE039' }}
          />
        </div>
        <p
          className="mt-2 text-[12px] text-muted-foreground"
          style={{ fontFamily: "'Barlow', system-ui, sans-serif" }}
        >
          {respondidas < 5
            ? `Responda pelo menos ${5 - respondidas} questão(ões) para desbloquear a avaliação de nível.`
            : nivel === 'dominante'
            ? 'Você domina esse tema. Continue revisando para manter o desempenho.'
            : nivel === 'mediano'
            ? 'Você está indo bem. Foque nos flashcards e reveja as questões que errou.'
            : 'Comece pelas aulas e flashcards antes de tentar mais questões.'}
        </p>
      </div>

      {respondidas > 0 && (
        <button
          onClick={onResetar}
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-border bg-card text-[14px] font-semibold text-foreground transition-colors hover:bg-accent/50"
          style={{ fontFamily: "'Barlow', system-ui, sans-serif" }}
        >
          <RotateCw className="h-4 w-4" /> Refazer questões
        </button>
      )}
    </div>
  );
};

const StatCard = ({
  label, value, Icon, tint,
}: { label: string; value: string; Icon: typeof TrendingUp; tint?: string }) => (
  <div className="rounded-xl border border-border bg-card p-3">
    <div className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
      <Icon className={`h-3.5 w-3.5 ${tint || ''}`} /> {label}
    </div>
    <p
      className={`text-[18px] font-bold tabular-nums ${tint || 'text-foreground'}`}
      style={{ fontFamily: "'Barlow', system-ui, sans-serif" }}
    >
      {value}
    </p>
  </div>
);

export default ProgressoTab;
