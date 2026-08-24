import { motion } from 'framer-motion';
import { Check, Lock } from 'lucide-react';
import type { BlocoLei, ArtigoTrilha } from '@/lib/praticarLeiEstrutura';
import { getProgressoArtigos, nivelDoArtigo } from '@/lib/praticarProgress';
import type { ArtigoProgress, NivelDominio } from '@/lib/praticarProgress';

type Props = {
  blocos: BlocoLei[];
  onSelectArtigo: (artigo: ArtigoTrilha, bloco: BlocoLei) => void;
};

// Deslocamento horizontal em zigue-zague (5 posições, tipo Duolingo)
const OFFSETS = [0, 56, 84, 56, 0, -56, -84, -56];

const NIVEL_COR: Record<NivelDominio, { ring: string; bg: string; label: string }> = {
  dominante: { ring: 'ring-yellow-300', bg: 'bg-yellow-500', label: 'Dominante' },
  mediano:   { ring: 'ring-orange-200', bg: 'bg-orange-400', label: 'Em progresso' },
  aprendiz:  { ring: 'ring-red-200',    bg: 'bg-red-500',    label: 'Reforçar' },
  novo:      { ring: 'ring-white/30',   bg: 'bg-neutral-600', label: 'Novo' },
};

export default function TrilhaArtigos({ blocos, onSelectArtigo }: Props) {
  const todosIds = blocos.flatMap((b) => b.artigos.map((a) => a.id));
  const progressos = getProgressoArtigos(todosIds) as Record<string, ArtigoProgress>;

  // Encontrar próximo nó (primeiro não-dominado)
  const proximoId = todosIds.find((id) => !progressos[id]?.dominado) ?? null;

  return (
    <div
      className="relative overflow-hidden"
      style={{
        background:
          'linear-gradient(180deg, hsl(0 70% 38%) 0%, hsl(0 75% 42%) 40%, hsl(0 72% 36%) 100%)',
      }}
    >
      {/* textura sutil */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.15),transparent_60%)]" />

      <div className="relative mx-auto max-w-md px-4 py-6 space-y-8">
        {blocos.map((bloco, bIdx) => (
          <section key={bloco.titulo + bIdx}>
            {/* Cabeçalho de seção */}
            <div className="mb-4 flex items-center gap-3">
              <div className="h-px flex-1 bg-white/25" />
              <div className="px-3 py-1.5 rounded-full bg-black/30 backdrop-blur-sm border border-white/20">
                <p className="text-[10px] font-bold uppercase tracking-widest text-white/80">
                  {bloco.tipo === 'ARTIGOS' ? 'Bloco' : bloco.tipo.toLowerCase()} {bIdx + 1}
                </p>
                <p className="text-sm font-bold text-white leading-tight text-center">
                  {bloco.titulo}
                </p>
              </div>
              <div className="h-px flex-1 bg-white/25" />
            </div>

            {/* Nós em zigue-zague */}
            <ul className="flex flex-col items-center gap-4">
              {bloco.artigos.map((artigo, aIdx) => {
                const offset = OFFSETS[aIdx % OFFSETS.length];
                const prog = progressos[artigo.id];
                const nivel = nivelDoArtigo(prog);
                const cor = NIVEL_COR[nivel];
                const dominado = prog?.dominado === true;
                const eProximo = artigo.id === proximoId;

                return (
                  <li
                    key={artigo.id}
                    className="w-full flex justify-center"
                    style={{ transform: `translateX(${offset}px)` }}
                  >
                    <motion.button
                      type="button"
                      onClick={() => onSelectArtigo(artigo, bloco)}
                      initial={{ opacity: 0, scale: 0.85 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: Math.min(aIdx, 20) * 0.015 }}
                      whileTap={{ scale: 0.93 }}
                      aria-label={`Praticar Art. ${artigo.numero ?? aIdx + 1} · ${cor.label}`}
                      className={[
                        'relative w-16 h-16 rounded-full flex items-center justify-center',
                        'font-black text-white text-lg',
                        'ring-4 ring-offset-2 ring-offset-transparent',
                        cor.bg,
                        cor.ring,
                        eProximo ? 'ring-white animate-pulse' : '',
                      ].join(' ')}
                      style={{
                        boxShadow: dominado
                          ? '0 10px 24px rgba(250,204,21,0.45), 0 4px 8px rgba(0,0,0,0.3), inset 0 -4px 0 rgba(0,0,0,0.22), inset 0 2px 0 rgba(255,255,255,0.35)'
                          : '0 10px 22px rgba(0,0,0,0.4), 0 4px 8px rgba(0,0,0,0.25), inset 0 -4px 0 rgba(0,0,0,0.28), inset 0 2px 0 rgba(255,255,255,0.18)',
                      }}
                    >
                      {dominado ? (
                        <Check className="w-7 h-7 drop-shadow" strokeWidth={3.5} />
                      ) : (
                        <span className="tabular-nums drop-shadow-[0_2px_2px_rgba(0,0,0,0.4)]">
                          {artigo.numero?.replace(/\D+$/, '') ?? aIdx + 1}
                        </span>
                      )}

                      {/* Estrelas (1 a 3) */}
                      {prog && (prog.estrelas ?? 0) > 0 && (
                        <span className="absolute -top-3 left-1/2 -translate-x-1/2 flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-black/70 backdrop-blur-sm">
                          {[1, 2, 3].map((n) => (
                            <span
                              key={n}
                              className="text-[10px] leading-none"
                              style={{ color: n <= (prog.estrelas ?? 0) ? '#facc15' : 'rgba(255,255,255,0.25)' }}
                            >
                              ★
                            </span>
                          ))}
                        </span>
                      )}
                      {prog && prog.tentativas > 0 && (prog.estrelas ?? 0) === 0 && (
                        <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-black/70 text-white tabular-nums">
                          {Math.round((prog.acertos / prog.tentativas) * 100)}%
                        </span>
                      )}
                    </motion.button>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}

        <p className="text-center text-[11px] text-white/70 pt-2 pb-4">
          Toque num artigo pra começar a prática
        </p>
      </div>
    </div>
  );
}

/* Retorna o Lock só pra manter o import se algum dia ativar bloqueios encadeados */
export { Lock as _LockIcon };
