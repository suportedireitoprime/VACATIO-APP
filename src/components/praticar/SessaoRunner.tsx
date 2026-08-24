import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Flame, Sparkles, Target, Star, ChevronRight } from "lucide-react";
import MonteOArtigo from "./desafios/MonteOArtigo";
import CacaPegadinha from "./desafios/CacaPegadinha";
import OrdeneIncisos from "./desafios/OrdeneIncisos";
import VerdadeiroFalso from "./desafios/VerdadeiroFalso";
import LigarPares from "./desafios/LigarPares";
import { Artigo, extrairIncisos, gerarParesLigar, gerarTrechosPegadinha, segmentarParaMontar, shuffle } from "./desafios/utils";
import { registrarResultadoSessao, estrelasDoPct } from "@/lib/praticarProgress";

type Modo = "monte" | "pegadinha" | "ordene" | "vf" | "ligar";

type Desafio = {
  id: string;
  modo: Modo;
  artigo: Artigo;
  trecho?: string;
  rotulo?: string;
};

function criarDesafios(artigos: Artigo[]): Desafio[] {
  const pegadinhas: Desafio[] = [];
  const vfs: Desafio[] = [];
  const ordenacoes: Desafio[] = [];
  const montagens: Desafio[] = [];
  const ligacoes: Desafio[] = [];

  artigos.forEach((artigo) => {
    const texto = artigo.texto ?? "";
    const trechos = gerarTrechosPegadinha(texto);
    trechos.forEach((t, i) => {
      pegadinhas.push({ id: `${artigo.id}-peg-${i}`, modo: "pegadinha", artigo, trecho: t.texto, rotulo: t.rotulo });
      vfs.push({ id: `${artigo.id}-vf-${i}`, modo: "vf", artigo, trecho: t.texto, rotulo: t.rotulo });
    });
    if (extrairIncisos(texto).length >= 3) ordenacoes.push({ id: `${artigo.id}-ord`, modo: "ordene", artigo });
    // Montagem sempre disponível — segmentarParaMontar garante ao menos grupos de palavras
    if (segmentarParaMontar(texto, 3).length >= 2) montagens.push({ id: `${artigo.id}-mon`, modo: "monte", artigo });
    if (gerarParesLigar(texto).length >= 2) ligacoes.push({ id: `${artigo.id}-lig`, modo: "ligar", artigo });
  });

  const p = shuffle(pegadinhas);
  const v = shuffle(vfs);
  const o = shuffle(ordenacoes);
  const m = shuffle(montagens);
  const l = shuffle(ligacoes);

  // Sessão focada em 1 artigo → garante todos os modos disponíveis
  const artigosUnicos = new Set(artigos.map((a) => a.id));
  if (artigosUnicos.size === 1) {
    const resultado: Desafio[] = [];
    if (m[0]) resultado.push(m[0]);
    if (l[0]) resultado.push(l[0]);
    if (p[0]) resultado.push(p[0]);
    if (v[0]) resultado.push(v[0]);
    if (o[0]) resultado.push(o[0]);
    if (p[1]) resultado.push(p[1]);
    if (v[1]) resultado.push(v[1]);
    return resultado;
  }

  const cotas = [...p.slice(0, 6), ...v.slice(0, 6), ...o.slice(0, 3), ...m.slice(0, 5), ...l.slice(0, 4)];
  const usadosIds = new Set(cotas.map((d) => d.id));
  const sobra = [...p, ...v, ...o, ...m, ...l].filter((d) => !usadosIds.has(d.id));
  const total = [...cotas, ...sobra].slice(0, 24);

  const buckets: Record<Modo, Desafio[]> = { pegadinha: [], vf: [], ordene: [], monte: [], ligar: [] };
  shuffle(total).forEach((d) => buckets[d.modo].push(d));
  const resultado: Desafio[] = [];
  while (resultado.length < total.length) {
    (["monte", "pegadinha", "ligar", "vf", "ordene"] as Modo[]).forEach((mo) => {
      const next = buckets[mo].shift();
      if (next) resultado.push(next);
    });
  }
  return resultado;
}

type Props = {
  artigos: Artigo[];
  onSair: () => void;
  artigoIdFoco?: string | null;   // sessão de 1 artigo (a partir da trilha)
  leiId?: string | null;
};

export default function SessaoRunner({ artigos, onSair, artigoIdFoco, leiId }: Props) {
  const desafios = useMemo(
    () => criarDesafios(artigos.filter((a) => (a.texto ?? "").trim().length > 45)),
    [artigos],
  );
  const [idx, setIdx] = useState(0);
  const [xp, setXp] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [acertos, setAcertos] = useState(0);
  const [respondeuAtual, setRespondeuAtual] = useState(false);
  const salvouRef = useRef(false);
  const [estrelasFinal, setEstrelasFinal] = useState<0 | 1 | 2 | 3 | null>(null);

  const atual = desafios[idx];

  useEffect(() => {
    setRespondeuAtual(false);
  }, [atual]);

  const total = desafios.length;
  const terminou = total > 0 && idx >= total;

  // Persiste ao terminar
  useEffect(() => {
    if (!terminou || salvouRef.current) return;
    salvouRef.current = true;
    const pct = total > 0 ? Math.round((acertos / total) * 100) : 0;
    setEstrelasFinal(estrelasDoPct(pct));

    // Se sessão focada em 1 artigo, credita nesse artigo.
    // Caso contrário, credita proporcionalmente em cada artigo tocado.
    if (artigoIdFoco) {
      void registrarResultadoSessao({ artigoId: artigoIdFoco, leiId, acertos, total });
    } else {
      const porArtigo = new Map<string, { a: number; t: number }>();
      // Cada desafio tem peso 1; distribuir por artigo com base nos desafios feitos.
      // Como não guardamos ac/erro por desafio, usamos a média geral por artigo.
      const artigosUnicos = new Set(desafios.map((d) => d.artigo.id));
      const artigosCount = artigosUnicos.size || 1;
      const acertosPorArtigo = Math.round(acertos / artigosCount);
      const totalPorArtigo = Math.max(1, Math.round(total / artigosCount));
      artigosUnicos.forEach((id) => porArtigo.set(id, { a: acertosPorArtigo, t: totalPorArtigo }));
      for (const [id, v] of porArtigo) {
        void registrarResultadoSessao({ artigoId: id, leiId, acertos: v.a, total: v.t });
      }
    }
  }, [terminou, acertos, total, artigoIdFoco, leiId, desafios]);

  if (desafios.length === 0) {
    return (
      <div className="p-6 text-center space-y-3">
        <Target className="w-10 h-10 mx-auto text-destructive" />
        <p className="text-sm text-muted-foreground">Nenhum artigo com desafios disponíveis neste escopo.</p>
        <button onClick={onSair} className="px-4 py-2 rounded-xl bg-destructive text-destructive-foreground font-semibold">Voltar</button>
      </div>
    );
  }

  if (terminou) {
    const pct = total > 0 ? Math.round((acertos / total) * 100) : 0;
    const estrelas = estrelasFinal ?? estrelasDoPct(pct);
    const mensagem =
      estrelas === 3 ? "Perfeito! Você dominou este trecho." :
      estrelas === 2 ? "Muito bom! Ainda dá pra fechar 100%." :
      estrelas === 1 ? "Progresso registrado. Tente de novo pra subir." :
      "Continue tentando — cada erro ensina.";

    return (
      <div className="p-6 space-y-5 text-center max-w-md mx-auto">
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-24 h-24 mx-auto rounded-full flex items-center justify-center shadow-xl"
          style={{ background: 'linear-gradient(135deg, hsl(0 70% 40%), hsl(0 84% 55%))' }}
        >
          <Target className="w-12 h-12 text-white" strokeWidth={2.5} />
        </motion.div>

        <div>
          <h2 className="font-display text-2xl font-bold">Sessão concluída</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {acertos} de {total} certos · {pct}%
          </p>
        </div>

        {/* Estrelas grandes e animadas */}
        <div className="flex items-center justify-center gap-3 py-2">
          {[1, 2, 3].map((n) => {
            const ativa = n <= estrelas;
            return (
              <motion.div
                key={n}
                initial={{ scale: 0, rotate: -30, opacity: 0 }}
                animate={{ scale: 1, rotate: 0, opacity: 1 }}
                transition={{ delay: 0.25 + n * 0.18, type: 'spring', stiffness: 220 }}
              >
                <Star
                  className="w-14 h-14"
                  strokeWidth={2}
                  fill={ativa ? 'hsl(45 95% 55%)' : 'transparent'}
                  stroke={ativa ? 'hsl(38 92% 40%)' : 'hsl(220 10% 70%)'}
                  style={{
                    filter: ativa ? 'drop-shadow(0 4px 10px rgba(250, 190, 60, 0.45))' : undefined,
                  }}
                />
              </motion.div>
            );
          })}
        </div>

        <p className="text-sm text-muted-foreground italic">{mensagem}</p>

        <div className="grid grid-cols-3 gap-2">
          <div className="p-3 rounded-xl bg-card border border-border">
            <p className="text-2xl font-bold text-destructive tabular-nums">{xp}</p>
            <p className="text-[11px] text-muted-foreground">XP</p>
          </div>
          <div className="p-3 rounded-xl bg-card border border-border">
            <p className="text-2xl font-bold text-destructive tabular-nums">{bestStreak}</p>
            <p className="text-[11px] text-muted-foreground">Melhor combo</p>
          </div>
          <div className="p-3 rounded-xl bg-card border border-border">
            <p className="text-2xl font-bold text-destructive tabular-nums">{pct}%</p>
            <p className="text-[11px] text-muted-foreground">Acerto</p>
          </div>
        </div>

        <button
          onClick={onSair}
          className="w-full min-h-[52px] rounded-2xl text-white font-bold text-base flex items-center justify-center shadow-lg active:scale-[0.99] transition"
          style={{ background: 'linear-gradient(135deg, hsl(0 70% 40%), hsl(0 84% 55%))' }}
        >
          Voltar
        </button>
      </div>
    );
  }

  const handleResult = (ok: boolean) => {
    if (respondeuAtual) return;
    setRespondeuAtual(true);
    if (ok) {
      const novoStreak = streak + 1;
      setStreak(novoStreak);
      setBestStreak((b) => Math.max(b, novoStreak));
      setAcertos((a) => a + 1);
      setXp((x) => x + 10 + Math.min(novoStreak, 5) * 2);
    } else {
      setStreak(0);
    }
  };

  const proximo = () => setIdx((i) => i + 1);
  const pctProgresso = ((idx) / desafios.length) * 100;

  return (
    <div className="pb-8">
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border">
        <div className="max-w-2xl mx-auto px-4 py-3 space-y-2">
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                Desafio {idx + 1} de {desafios.length}
              </p>
              <p className="text-sm font-semibold text-foreground truncate">
                {rotuloModo(atual?.modo)}
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <div className="flex items-center gap-1 text-sm font-bold text-destructive tabular-nums">
                <Sparkles className="w-4 h-4" /> {xp}
              </div>
              <div className={"flex items-center gap-1 text-sm font-bold tabular-nums " + (streak > 0 ? "text-destructive" : "text-muted-foreground")}>
                <Flame className="w-4 h-4" /> {streak}
              </div>
            </div>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <motion.div
              className="h-full bg-destructive rounded-full"
              animate={{ width: `${pctProgresso}%` }}
              transition={{ type: "spring", stiffness: 120, damping: 20 }}
            />
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-5">
        <AnimatePresence mode="wait">
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.2 }}
          >
            {atual && atual.modo === "monte" && <MonteOArtigo artigo={atual.artigo} onResult={handleResult} />}
            {atual && atual.modo === "pegadinha" && (
              <CacaPegadinha artigo={atual.artigo} trecho={atual.trecho} rotulo={atual.rotulo} onResult={handleResult} />
            )}
            {atual && atual.modo === "vf" && (
              <VerdadeiroFalso artigo={atual.artigo} trecho={atual.trecho} rotulo={atual.rotulo} onResult={handleResult} />
            )}
            {atual && atual.modo === "ordene" && <OrdeneIncisos artigo={atual.artigo} onResult={handleResult} />}
            {atual && atual.modo === "ligar" && <LigarPares artigo={atual.artigo} onResult={handleResult} />}
          </motion.div>
        </AnimatePresence>

        {respondeuAtual && (
          <motion.button
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={proximo}
            className="mt-5 w-full min-h-[52px] rounded-2xl bg-destructive text-destructive-foreground font-bold text-base flex items-center justify-center gap-2 shadow-lg active:scale-[0.99] transition"
          >
            Próximo <ChevronRight className="w-5 h-5" />
          </motion.button>
        )}
      </div>
    </div>
  );
}

function rotuloModo(m?: Modo): string {
  switch (m) {
    case "pegadinha": return "Caça-pegadinhas";
    case "vf": return "Verdadeiro ou falso";
    case "monte": return "Monte o artigo";
    case "ordene": return "Ordene os incisos";
    case "ligar": return "Ligar pares";
    default: return "Sessão";
  }
}
