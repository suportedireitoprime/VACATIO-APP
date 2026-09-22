import { useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import { ArtigoLei } from '@/data/mockData';

interface HistoricoAtualizacaoCarouselProps {
  artigos: ArtigoLei[];
  dbAlteracoes: Record<string, any>[];
  leiAccent: string;
  onOpenArtigo: (artigo: ArtigoLei) => void;
}

export type ModItem = { 
  artigo: ArtigoLei; 
  tipo: string; 
  referencia: string; 
  ano: number; 
  parteModificada: string; 
  leiNome: string; 
  linhasModificadas: number[]; 
  fromMonitor?: boolean;
};

export default function HistoricoAtualizacaoCarousel({ artigos, dbAlteracoes, leiAccent, onOpenArtigo }: HistoricoAtualizacaoCarouselProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);

  const historicoAlteracoes = useMemo(() => {
    const modRegex = /\((?:Redação\s+dada|Incluíd[oa]|Acrescid[oa]|Revogad[oa]|Alterad[oa]|Vetad[oa]|Regulamento|Vide|Promulgação|Renumerado|Transformado|Suprimido|Restabelecido|Ressalvado|Produção de efeito)[^)]*\)/gi;
    const yearRegex = /\b(1\d{3}|20\d{2})\b/;
    const typeRegex = /^\((Redação\s+dada|Incluíd[oa]|Acrescid[oa]|Revogad[oa]|Alterad[oa]|Vetad[oa]|Regulamento|Vide|Promulgação|Renumerado|Transformado|Suprimido|Restabelecido|Ressalvado|Produção de efeito)/i;

    const items: ModItem[] = [];

    for (const artigo of artigos) {
      const lines = artigo.caput.split('\n').filter(l => l.trim());
      const refGroups = new Map<string, { indices: number[]; tipo: string; ref: string; ano: number }>();
      for (let li = 0; li < lines.length; li++) {
        const lineMatches = lines[li].match(modRegex);
        if (!lineMatches) continue;
        const ref = lineMatches[lineMatches.length - 1];
        const refKey = ref.replace(/^\(/, '').replace(/\)$/, '');
        const tm = ref.match(typeRegex);
        const ym = ref.match(yearRegex);
        let tipo = tm ? tm[1].replace(/\s+dada/i, '') : 'Alteração';
        if (/^redaç/i.test(tipo)) tipo = 'Alterada';
        const ano = ym ? parseInt(ym[1]) : 0;
        if (!refGroups.has(refKey)) {
          refGroups.set(refKey, { indices: [], tipo, ref: refKey, ano });
        }
        refGroups.get(refKey)!.indices.push(li);
      }
      if (refGroups.size === 0) continue;
      for (const [refKey, group] of refGroups) {
        let parteModificada = 'Artigo inteiro';
        if (group.indices.length < lines.length) {
          const firstModLine = lines[group.indices[0]];
          if (/^§\s*\d+[º°]?/i.test(firstModLine)) {
            const pMatch = firstModLine.match(/^(§\s*\d+[º°]?)/i);
            parteModificada = pMatch ? pMatch[1].replace(/°/g, 'º') : '§';
          } else if (/^[IVXLC]+\s*[-–.]/i.test(firstModLine)) {
            const iMatch = firstModLine.match(/^([IVXLC]+)/i);
            parteModificada = iMatch ? `Inciso ${iMatch[1]}` : 'Inciso';
          } else if (/^[a-z]\)/i.test(firstModLine)) {
            const aMatch = firstModLine.match(/^([a-z]\))/i);
            parteModificada = aMatch ? `Alínea ${aMatch[1]}` : 'Alínea';
          } else if (/^Parágrafo\s+único/i.test(firstModLine)) {
            parteModificada = 'Parágrafo único';
          } else if (/caput/i.test(refKey)) {
            parteModificada = 'Caput';
          }
          if (group.indices.length > 1) {
            parteModificada += ` (+${group.indices.length - 1})`;
          }
        }
        const leiMatch = refKey.match(/(?:Lei(?:\s+Complementar)?|Decreto(?:-Lei)?|Emenda\s+Constitucional|Medida\s+Provisória)\s+n[º°]?\s*[\d.]+(?:,\s*de\s*\d{4})?/i);
        const leiNome = leiMatch ? leiMatch[0] : refKey;
        items.push({ artigo, tipo: group.tipo, referencia: refKey, ano: group.ano, parteModificada, leiNome, linhasModificadas: group.indices });
      }
    }
    items.sort((a, b) => b.ano - a.ano);

    // Merge DB alteracoes
    const parsedKeys = new Set(items.map(i => `${i.artigo.numero}::${i.ano}`));
    for (const dbItem of dbAlteracoes) {
      const ano = dbItem.detectado_em ? new Date(dbItem.detectado_em).getFullYear() : 0;
      const key = `${dbItem.artigo_numero}::${ano}`;
      if (parsedKeys.has(key)) continue;
      const matchingArtigo = artigos.find(a => a.numero === dbItem.artigo_numero);
      const tipoLabel = dbItem.tipo_alteracao === 'artigo_revogado' ? 'Revogado'
        : dbItem.tipo_alteracao === 'artigo_novo' ? 'Incluído'
        : dbItem.tipo_alteracao === 'texto_alterado' ? 'Alterada'
        : 'Alteração';
      items.push({
        artigo: matchingArtigo || { id: dbItem.artigo_numero, numero: dbItem.artigo_numero, caput: dbItem.texto_atual || dbItem.texto_anterior || '' } as ArtigoLei,
        tipo: tipoLabel,
        referencia: dbItem.fonte_alteracao || 'Monitoramento',
        ano,
        parteModificada: 'Artigo atualizado',
        leiNome: dbItem.fonte_alteracao || 'Atualização Legislativa',
        linhasModificadas: [],
        fromMonitor: true
      });
    }
    // Retornamos os primeiros 10 pra não pesar o DOM
    return items.slice(0, 10);
  }, [artigos, dbAlteracoes]);

  if (historicoAlteracoes.length === 0) return null;

  return (
    <div className="space-y-3 pt-6 pb-2">
      <div className="px-5 flex items-center justify-between gap-3">
        <div>
          <h3 className="font-display text-foreground text-[16px] sm:text-[18px] font-bold mb-0.5 flex items-center gap-2">
            <span className="w-1 h-5 rounded-full shrink-0" style={{ backgroundColor: leiAccent }} />
            <span>Histórico de Atualização</span>
          </h3>
          <p className="font-body text-muted-foreground text-[12px] leading-snug ml-[14px]">
            Últimos artigos atualizados nesta legislação
          </p>
        </div>
      </div>

      <div
        ref={scrollerRef}
        className="flex gap-3 md:gap-4 overflow-x-auto snap-x snap-mandatory scroll-smooth pb-3 pt-1 px-[5%] md:px-[4%] lg:px-[3%] [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
      >
        {historicoAlteracoes.map((item, i) => {
          const typeColor = item.tipo === 'Revogado' ? 'text-red-400 border-red-400/20 bg-red-400/10'
            : item.tipo === 'Incluído' ? 'text-emerald-400 border-emerald-400/20 bg-emerald-400/10'
            : 'text-amber-400 border-amber-400/20 bg-amber-400/10';

          return (
            <motion.button
              key={`${item.artigo.id}-${i}`}
              onClick={() => onOpenArtigo(item.artigo)}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.04, 0.2) }}
              className="snap-center shrink-0 w-[85%] sm:w-[60%] md:w-[45%] lg:w-[30%] text-left"
            >
              <div className="relative w-full h-[120px] rounded-2xl bg-card border border-white/[0.04] p-4 flex flex-col hover:bg-secondary/60 transition-colors">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h4 className="font-display text-[15px] font-bold" style={{ color: leiAccent }}>
                    {item.artigo.numero}
                  </h4>
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${typeColor}`}>
                    {item.tipo} {item.ano ? `em ${item.ano}` : ''}
                  </span>
                </div>
                <p className="text-sm text-foreground/80 line-clamp-3 leading-snug flex-1">
                  {item.artigo.caput.substring(0, 150)}{item.artigo.caput.length > 150 ? '...' : ''}
                </p>
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
