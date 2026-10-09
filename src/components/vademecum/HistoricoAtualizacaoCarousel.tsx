import { useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import { ArtigoLei } from '@/data/mockData';

interface HistoricoAtualizacaoCarouselProps {
  artigos: ArtigoLei[];
  dbAlteracoes: Record<string, any>[];
  leiAccent: string;
  onOpenNovidade: (item: any) => void;
  onViewAll?: () => void;
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

export default function HistoricoAtualizacaoCarousel({ artigos, dbAlteracoes, leiAccent, onOpenNovidade, onViewAll }: HistoricoAtualizacaoCarouselProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);

  const historicoAlteracoes = useMemo(() => {
    const modRegex = /\((?:Redação\s+dada|Incluíd[oa]|Acrescid[oa]|Revogad[oa]|Alterad[oa]|Vetad[oa]|Regulamento|Vide|Promulgação|Renumerado|Transformado|Suprimido|Restabelecido|Ressalvado|Produção de efeito)[^)\n]*(?:\)|$)/gi;
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
    return items;
  }, [artigos, dbAlteracoes]);

  if (historicoAlteracoes.length === 0) return null;

  return (
    <div className="space-y-3 pt-6 pb-2">
      <div className="px-2 flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-foreground text-[16px] sm:text-[18px] font-bold mb-0.5 flex items-center gap-2">
            <span className="w-1 h-5 rounded-full shrink-0" style={{ backgroundColor: leiAccent }} />
            <span className="truncate">Novidades</span>
          </h3>
          <p className="font-body text-muted-foreground text-[12px] leading-snug ml-[14px] truncate">
            Últimos artigos atualizados nesta legislação
          </p>
        </div>
        
        {onViewAll && (
          <button
            type="button"
            onClick={onViewAll}
            className="shrink-0 inline-flex items-center gap-1 rounded-full border border-white/10 bg-card hover:bg-muted/80 px-3 py-1.5 text-[12px] font-semibold text-foreground active:scale-[0.96] transition-all shadow-sm"
          >
            <span>Ver tudo</span>
            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        )}
      </div>

      <div
        ref={scrollerRef}
        className="flex gap-3 md:gap-4 overflow-x-auto snap-x snap-mandatory scroll-smooth pb-3 pt-1 px-[5%] md:px-[4%] lg:px-[3%] [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
      >
        {historicoAlteracoes.map((item, i) => {
          const t = item.tipo.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
          let typeColor = 'text-muted-foreground border-white/10 bg-white/5';
          if (t.startsWith('revogad') || t.startsWith('vetad') || t.startsWith('suprimid')) typeColor = 'text-red-500 border-red-500/20 bg-red-500/10';
          else if (t.startsWith('incluid') || t.startsWith('acrescid')) typeColor = 'text-emerald-500 border-emerald-500/20 bg-emerald-500/10';
          else if (t.startsWith('redacao') || t.startsWith('alterad')) typeColor = 'text-[#60a5fa] border-[#3b82f6]/20 bg-[#3b82f6]/10';

          const previewText = item.artigo.caput
            .replace(/\s*\((?:Redação|Incluído|Revogado|Acrescido|Alterado|Vetado|Vide|Regulamento|Promulgação|Renumerado|Transformado|Suprimido|Restabelecido|Ressalvado|Produção de efeito)[^)]*\)/gi, '')
            .split('\n').filter(l => l.trim())[0] || '';

          const totalAlt = (item.artigo.caput.match(/\((?:Redação|Incluído|Revogado|Acrescido|Alterado|Vetado|Vide|Regulamento|Promulgação|Renumerado|Transformado|Suprimido|Restabelecido|Ressalvado|Produção de efeito)[^)]*\)/gi) || []).length;

          return (
            <motion.button
              key={`${item.artigo.id}-${i}`}
              onClick={() => onOpenNovidade(item)}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.04, 0.2) }}
              className="snap-center shrink-0 w-[85%] sm:w-[60%] md:w-[45%] lg:w-[30%] text-left"
            >
              <div className="w-full h-[140px] flex flex-col p-4 rounded-2xl transition-all duration-300 bg-card hover:bg-secondary/60 shadow-sm border border-white/5 group-active:scale-[0.98]">
                <div className="flex items-center justify-between mb-2">
                  <span className={`inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${typeColor.replace('/10', '/20')}`}>
                    {item.tipo} {item.ano ? `EM ${item.ano}` : ''}
                  </span>
                  <div className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground"><path d="M7 17l9.2-9.2M17 17V7H7"/></svg>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 mb-1.5">
                  <span className="font-display text-[15.5px] font-bold text-primary-light">Art. {item.artigo.numero.replace(/^Art\.\s*/i, '')}</span>
                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-white/5 text-muted-foreground">
                    {item.parteModificada}
                  </span>
                  {totalAlt > 0 && (
                    <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-secondary text-muted-foreground/80 shrink-0">
                      {totalAlt} {totalAlt === 1 ? 'alt. total' : 'alts. totais'}
                    </span>
                  )}
                </div>

                {previewText && (
                  <div className="bg-black/20 rounded-lg px-2.5 py-1.5 flex-1 overflow-hidden flex flex-col justify-center border border-white/[0.02]">
                    <p className="text-[11.5px] text-muted-foreground/80 leading-[1.4] line-clamp-2 italic font-medium">
                      "{previewText}"
                    </p>
                  </div>
                )}
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
