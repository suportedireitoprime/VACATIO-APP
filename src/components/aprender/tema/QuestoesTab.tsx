import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, XCircle, ChevronRight, HelpCircle, Trophy, RotateCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export type Questao = {
  id: string;
  enunciado: string;
  opcoes: { id: string; texto: string }[];
  id_correto: string;
  explicacao?: string;
};

type Props = {
  temaId: string;
  questoes: Questao[];
  loading: boolean;
  respostas: Record<string, { acertou: boolean; escolha: string }>;
  onRespondida: (bloco_id: string, acertou: boolean, escolha: string) => void;
  onIrProgresso: () => void;
  disablePersist?: boolean;
};

const QuestoesTab = ({ temaId, questoes, loading, respostas, onRespondida, onIrProgresso, disablePersist }: Props) => {
  const { user } = useAuth();
  const [idx, setIdx] = useState(0);

  useEffect(() => { setIdx(0); }, [temaId, questoes.length]);

  const total = questoes.length;
  const atual = questoes[idx];
  const respAtual = atual ? respostas[atual.id] : undefined;

  const resumo = useMemo(() => {
    const respondidas = questoes.filter((q) => respostas[q.id]);
    const acertos = respondidas.filter((q) => respostas[q.id]?.acertou).length;
    return { respondidas: respondidas.length, acertos, total };
  }, [questoes, respostas, total]);

  const responder = async (opId: string) => {
    if (!atual || respAtual) return;
    const acertou = String(opId).toLowerCase() === String(atual.id_correto).toLowerCase();
    onRespondida(atual.id, acertou, opId);
    if (user && !disablePersist) {
      const { error } = await supabase
        .from('aprender_tema_respostas')
        .upsert(
          {
            user_id: user.id,
            tema_id: temaId,
            bloco_id: atual.id,
            acertou,
            escolha: opId,
          },
          { onConflict: 'user_id,bloco_id' },
        );
      if (error) console.warn('[QuestoesTab] persist error', error);
    }
  };

  if (loading) return <div className="h-[380px] animate-pulse rounded-2xl bg-muted" />;

  if (total === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-muted/40 p-8 text-center">
        <HelpCircle className="h-8 w-8 text-muted-foreground" />
        <p className="text-[15px] font-semibold text-foreground">Nenhuma questão disponível</p>
        <p className="max-w-sm text-[13px] text-muted-foreground">
          As aulas deste tema ainda não têm questões. Elas aparecem aqui assim que forem geradas.
        </p>
      </div>
    );
  }

  // Se todas respondidas, mostra cartão-resumo
  if (resumo.respondidas === total) {
    const pct = Math.round((resumo.acertos / total) * 100);
    return (
      <div className="flex flex-col items-center gap-4 rounded-3xl border-2 border-[#EFE039]/40 bg-gradient-to-b from-card to-secondary/40 p-8 text-center">
        <div
          className="flex h-16 w-16 items-center justify-center rounded-full"
          style={{ background: '#EFE039' }}
        >
          <Trophy className="h-8 w-8 text-black" />
        </div>
        <h3
          className="text-2xl font-bold text-foreground"
          style={{ fontFamily: "'Barlow', system-ui, sans-serif" }}
        >
          {resumo.acertos} / {total} acertos
        </h3>
        <p
          className="text-[15px] text-muted-foreground"
          style={{ fontFamily: "'Barlow', system-ui, sans-serif" }}
        >
          Você concluiu todas as questões deste tema com {pct}% de aproveitamento.
        </p>
        <div className="flex w-full flex-col gap-2 pt-2 sm:flex-row">
          <button
            onClick={() => setIdx(0)}
            className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-border bg-card text-[14px] font-semibold text-foreground transition-colors hover:bg-accent/50"
            style={{ fontFamily: "'Barlow', system-ui, sans-serif" }}
          >
            <RotateCw className="h-4 w-4" /> Revisar
          </button>
          <button
            onClick={onIrProgresso}
            className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-[#EFE039] text-[14px] font-bold text-black transition-transform hover:scale-[1.01]"
            style={{ fontFamily: "'Barlow', system-ui, sans-serif" }}
          >
            Ver progresso <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  const correta = String(atual.id_correto).toLowerCase();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between px-1">
        <span
          className="text-[12px] font-semibold uppercase tracking-wider text-primary"
          style={{ fontFamily: "'Barlow', system-ui, sans-serif" }}
        >
          Questão {idx + 1} / {total}
        </span>
        <span
          className="text-[12px] text-muted-foreground tabular-nums"
          style={{ fontFamily: "'Barlow', system-ui, sans-serif" }}
        >
          {resumo.acertos} acertos
        </span>
      </div>

      <h2
        className="text-[18px] font-bold leading-snug text-foreground"
        style={{ fontFamily: "'Barlow', system-ui, sans-serif" }}
      >
        {atual.enunciado}
      </h2>

      <div className="space-y-2">
        {atual.opcoes.map((op) => {
          const id = String(op.id).toLowerCase();
          const escolhida = respAtual?.escolha?.toLowerCase() === id;
          const acertou = respAtual?.acertou && escolhida;
          const errou = respAtual && escolhida && !respAtual.acertou;
          const revelaCerta = respAtual && id === correta;
          return (
            <button
              key={op.id}
              disabled={!!respAtual}
              onClick={() => responder(id)}
              className={`flex min-h-11 w-full items-center gap-3 rounded-xl border p-4 text-left text-[15px] leading-relaxed transition-colors ${
                acertou || revelaCerta
                  ? 'border-green-500/60 bg-green-500/10 text-foreground'
                  : errou
                  ? 'border-red-500/60 bg-red-500/10 text-foreground'
                  : 'border-border hover:border-primary/50 hover:bg-accent'
              }`}
              style={{ fontFamily: "'Barlow', system-ui, sans-serif" }}
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border text-sm font-bold uppercase">
                {op.id}
              </span>
              <span className="flex-1">{op.texto}</span>
              {(acertou || revelaCerta) && <CheckCircle2 className="h-5 w-5 text-green-600" />}
              {errou && <XCircle className="h-5 w-5 text-red-600" />}
            </button>
          );
        })}
      </div>

      {respAtual && atual.explicacao && (
        <div
          className="rounded-lg bg-muted/60 p-3 text-[15px] text-muted-foreground"
          style={{ fontFamily: "'Barlow', system-ui, sans-serif" }}
        >
          <strong className="text-foreground">Explicação:</strong> {atual.explicacao}
        </div>
      )}

      <div className="flex items-center justify-end pt-2">
        <button
          onClick={() => setIdx((i) => Math.min(total - 1, i + 1))}
          disabled={!respAtual}
          className="inline-flex h-11 items-center justify-center gap-1.5 rounded-xl bg-[#EFE039] px-5 text-[14px] font-bold text-black transition-transform hover:scale-[1.01] disabled:opacity-40"
          style={{ fontFamily: "'Barlow', system-ui, sans-serif" }}
        >
          Próxima <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default QuestoesTab;
