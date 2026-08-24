import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Target, TrendingUp, RotateCcw, BookOpen, ChevronRight, Search, Sparkles, Landmark, Gavel, Scale, Briefcase, Shield, Users, TreePine, Vote, HeartPulse, Building2, ScrollText, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { LEIS_CATALOG, type LeiCatalogItem } from '@/data/leisCatalog';
import { useStudyStats } from '@/hooks/useStudyStats';

/* ── Category definitions ─────────────────────────────── */
interface Categoria {
  id: string;
  label: string;
  icon: React.ElementType;
  gradient: string;
  tabelas: string[];
}

const CATEGORIAS: Categoria[] = [
  { id: 'constituicao', label: 'Constituição', icon: Landmark, gradient: 'from-emerald-600 to-emerald-800', tabelas: ['CF88_CONSTITUICAO_FEDERAL'] },
  { id: 'codigos', label: 'Códigos', icon: Gavel, gradient: 'from-rose-600 to-rose-800', tabelas: ['CP_CODIGO_PENAL', 'CC_CODIGO_CIVIL', 'CPC_CODIGO_PROCESSO_CIVIL', 'CPP_CODIGO_PROCESSO_PENAL', 'CPM_CODIGO_PENAL_MILITAR', 'CPPM_CODIGO_PROCESSO_PENAL_MILITAR', 'CTN_CODIGO_TRIBUTARIO_NACIONAL', 'CDC_CODIGO_DEFESA_CONSUMIDOR', 'CLT_CONSOLIDACAO_LEIS_TRABALHO', 'CTB_CODIGO_TRANSITO_BRASILEIRO', 'CE_CODIGO_ELEITORAL', 'CFLOR_CODIGO_FLORESTAL', 'CAGUA_CODIGO_AGUAS', 'CMIN_CODIGO_MINAS', 'CBA_CODIGO_BRASILEIRO_AERONAUTICA', 'CTEL_CODIGO_TELECOMUNICACOES', 'CCOM_CODIGO_COMERCIAL', 'CES_CODIGO_ETICA_SERVIDOR'] },
  { id: 'estatutos', label: 'Estatutos', icon: ScrollText, gradient: 'from-fuchsia-600 to-fuchsia-800', tabelas: ['ECA_ESTATUTO_CRIANCA_ADOLESCENTE', 'EI_ESTATUTO_IDOSO', 'EPD_ESTATUTO_PESSOA_DEFICIENCIA', 'EIR_ESTATUTO_IGUALDADE_RACIAL', 'EC_ESTATUTO_CIDADE', 'ED_ESTATUTO_DESARMAMENTO', 'EOAB_ESTATUTO_OAB', 'ET_ESTATUTO_TORCEDOR', 'EJ_ESTATUTO_JUVENTUDE', 'EM_ESTATUTO_MILITARES', 'EIND_ESTATUTO_INDIO', 'ETERRA_ESTATUTO_TERRA', 'EMIG_ESTATUTO_MIGRACAO', 'EREF_ESTATUTO_REFUGIADO', 'EMET_ESTATUTO_METROPOLE', 'EMUS_ESTATUTO_MUSEUS', 'EME_ESTATUTO_MICROEMPRESA', 'EPC_ESTATUTO_PESSOA_CANCER'] },
  { id: 'leis_especiais', label: 'Leis Especiais', icon: Scale, gradient: 'from-amber-500 to-amber-700', tabelas: ['LINDB_INTRODUCAO_NORMAS', 'LI_INQUILINATO', 'LRP_REGISTROS_PUBLICOS', 'LALP_ALIENACAO_PARENTAL', 'LALIM_ALIMENTOS', 'LA_ARBITRAGEM', 'LMS_MANDADO_SEGURANCA', 'LACP_ACAO_CIVIL_PUBLICA', 'LJE_JUIZADOS_ESPECIAIS', 'LHD_HABEAS_DATA', 'LMI_MANDADO_INJUNCAO', 'LAP_ACAO_POPULAR', 'LEP_EXECUCAO_PENAL', 'LCH_CRIMES_HEDIONDOS', 'LTORT_TORTURA', 'LOC_ORGANIZACAO_CRIMINOSA', 'LAA_ABUSO_AUTORIDADE', 'LIT_INTERCEPTACAO_TELEFONICA', 'LD_LEI_DROGAS', 'LLAV_LAVAGEM_DINHEIRO', 'LCI_CRIMES_INFORMATICOS', 'LCSF_CRIMES_SISTEMA_FINANCEIRO', 'LCP_CONTRAVENCOES_PENAIS', 'LRAC_RACISMO', 'LAT_ANTITERRORISMO', 'LPT_PROTECAO_TESTEMUNHAS', 'LMP_MARIA_PENHA', 'LCA_CRIMES_AMBIENTAIS', 'LBIO_BIOSSEGURANCA', 'LPP_PARTIDOS_POLITICOS', 'LELE_ELEICOES', 'LFL_FICHA_LIMPA', 'LINE_INELEGIBILIDADES'] },
  { id: 'administrativo', label: 'Administrativo', icon: Shield, gradient: 'from-blue-600 to-blue-800', tabelas: ['L8112_SERVIDORES_FEDERAIS', 'LIA_IMPROBIDADE_ADMINISTRATIVA', 'NLL_LICITACOES', 'LPAF_PROCESSO_ADMINISTRATIVO', 'LAI_ACESSO_INFORMACAO', 'LACE_ANTICORRUPCAO', 'LCON_CONCESSOES', 'LPPP_PARCERIAS_PUBLICO_PRIVADAS', 'LOTCU_ORGANICA_TCU', 'LLE_LIBERDADE_ECONOMICA', 'LOMAN_LEI_ORGANICA_MAGISTRATURA', 'LOMP_ORGANICA_MP'] },
  { id: 'previdenciario', label: 'Previdenciário', icon: HeartPulse, gradient: 'from-cyan-600 to-cyan-800', tabelas: ['LBPS_BENEFICIOS_PREVIDENCIA', 'LCSS_CUSTEIO_SEGURIDADE', 'LPC_PREVIDENCIA_COMPLEMENTAR', 'LOAS_ASSISTENCIA_SOCIAL'] },
  { id: 'tributario', label: 'Tributário', icon: Building2, gradient: 'from-teal-600 to-teal-800', tabelas: ['LRF_RESPONSABILIDADE_FISCAL', 'LRT_REFORMA_TRIBUTARIA'] },
  { id: 'digital', label: 'Digital e Dados', icon: Shield, gradient: 'from-sky-600 to-sky-800', tabelas: ['LGPD_PROTECAO_DADOS', 'MCI_MARCO_CIVIL_INTERNET', 'LMLS_MARCO_LEGAL_STARTUPS'] },
  { id: 'empresarial', label: 'Empresarial', icon: Briefcase, gradient: 'from-yellow-600 to-yellow-800', tabelas: ['LF_FALENCIAS', 'LSA_SOCIEDADES_ACOES', 'LPI_PROPRIEDADE_INDUSTRIAL', 'LDA_DIREITOS_AUTORAIS', 'LCADE_ANTITRUSTE'] },
  { id: 'outros', label: 'Outros', icon: Users, gradient: 'from-gray-500 to-gray-700', tabelas: ['LSUS_SISTEMA_UNICO_SAUDE', 'LDB_DIRETRIZES_EDUCACAO', 'LPSU_PARCELAMENTO_SOLO'] },
];

interface Props {
  onSelectLei: (lei: { id: string; nome: string; sigla: string; tabela: string }) => void;
  onNavigateDesempenho: () => void;
  onBack: () => void;
}

export default function QuestoesDashboard({ onSelectLei, onNavigateDesempenho, onBack }: Props) {
  const { lawStats, totalSessions, totalQuestions, totalCorrect, avgPct, loading: statsLoading } = useStudyStats();
  const [view, setView] = useState<'dashboard' | 'categorias' | 'leis'>('dashboard');
  const [selectedCat, setSelectedCat] = useState<Categoria | null>(null);
  const [searchCat, setSearchCat] = useState('');

  /* ── Stats per category ──────────────────────────────── */
  const catStats = useMemo(() => {
    const map: Record<string, { total: number; correct: number; sessions: number }> = {};
    CATEGORIAS.forEach(cat => {
      const s = { total: 0, correct: 0, sessions: 0 };
      cat.tabelas.forEach(t => {
        const ls = lawStats.find(l => l.tabela === t);
        if (ls) { s.total += ls.total; s.correct += ls.correct; s.sessions += ls.sessions; }
      });
      map[cat.id] = s;
    });
    return map;
  }, [lawStats]);

  /* ── Laws in selected category ─────────────────────── */
  const leisCategoria = useMemo(() => {
    if (!selectedCat) return [];
    return selectedCat.tabelas
      .map(t => LEIS_CATALOG.find(l => l.tabela_nome === t))
      .filter(Boolean) as LeiCatalogItem[];
  }, [selectedCat]);

  /* ── Dra. Arabella analysis ──────────────────────────── */
  const arabellaText = useMemo(() => {
    if (totalQuestions === 0) return 'Olá! Você ainda não respondeu nenhuma questão. Comece praticando para que eu possa analisar seu desempenho! 📚';
    const sorted = [...lawStats].sort((a, b) => b.pct - a.pct);
    const best = sorted[0];
    const worst = sorted.length > 1 ? sorted[sorted.length - 1] : null;
    let text = `Você já respondeu ${totalQuestions} questões com ${avgPct}% de acerto. `;
    if (best) text += `Seu ponto forte é ${best.nome} (${best.pct}%). `;
    if (worst && worst.pct < 60) text += `Sugiro reforçar ${worst.nome} (${worst.pct}%). `;
    if (avgPct >= 70) text += '🎉 Excelente desempenho!';
    else if (avgPct >= 40) text += '💪 Continue praticando!';
    else text += '📖 Foque nos pontos fracos!';
    return text;
  }, [lawStats, totalQuestions, avgPct]);

  const errorPct = totalQuestions > 0 ? 100 - avgPct : 0;

  const filteredCats = useMemo(() => {
    if (!searchCat.trim()) return CATEGORIAS;
    const q = searchCat.toLowerCase();
    return CATEGORIAS.filter(c => c.label.toLowerCase().includes(q));
  }, [searchCat]);

  const handleBack = () => {
    if (view === 'leis') setView('categorias');
    else if (view === 'categorias') setView('dashboard');
    else onBack();
  };

  /* ── Dashboard ───────────────────────────────────────── */
  if (view === 'dashboard') {
    return (
      <div className="space-y-5">

        {/* Stats bar */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: 'Respondidas', value: totalQuestions },
            { label: 'Acertos', value: `${avgPct}%` },
            { label: 'Erros', value: `${errorPct}%` },
            { label: 'Sessões', value: totalSessions },
          ].map(s => (
            <div key={s.label} className="bg-card border border-border rounded-xl p-3 text-center">
              <p className="text-lg font-bold text-foreground">{s.value}</p>
              <p className="text-[10px] text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Action grid 2×2 */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Praticar', desc: 'Escolha a disciplina', icon: Target, gradient: 'from-rose-500 to-red-700', onClick: () => setView('categorias') },
            { label: 'Progresso', desc: 'Estatísticas gerais', icon: TrendingUp, gradient: 'from-emerald-500 to-emerald-700', onClick: onNavigateDesempenho },
            { label: 'Reforço', desc: 'Artigos com < 40%', icon: RotateCcw, gradient: 'from-amber-500 to-orange-600', onClick: () => setView('categorias') },
            { label: 'Cadernos', desc: 'Em breve', icon: BookOpen, gradient: 'from-purple-600 to-purple-800', onClick: () => {} },
          ].map((item, i) => (
            <motion.button
              key={item.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={item.onClick}
              className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-card border border-border hover:border-primary/40 transition-all group"
            >
              <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${item.gradient} flex items-center justify-center`}>
                <item.icon className="w-5 h-5 text-white" />
              </div>
              <div className="text-center">
                <p className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">{item.label}</p>
                <p className="text-[10px] text-muted-foreground">{item.desc}</p>
              </div>
            </motion.button>
          ))}
        </div>

        {/* Dra. Arabella */}
        <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <p className="font-display text-sm font-bold text-foreground">Dra. Arabella</p>
              <p className="text-[10px] text-muted-foreground">Sua mentora de estudos</p>
            </div>
          </div>
          <div className="bg-muted/30 rounded-xl p-3">
            <p className="text-xs text-foreground/80 leading-relaxed">{arabellaText}</p>
          </div>
          <button onClick={onNavigateDesempenho} className="text-xs text-primary font-medium hover:underline">
            Ver análise completa →
          </button>
        </div>
      </div>
    );
  }

  /* ── Categorias grid ─────────────────────────────────── */
  if (view === 'categorias') {
    return (
      <div className="space-y-4">
        <button onClick={handleBack} className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground text-sm transition-colors">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </button>
        <h2 className="font-display text-lg font-bold text-foreground">Escolha a categoria</h2>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar categoria..." value={searchCat} onChange={e => setSearchCat(e.target.value)} className="pl-9" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          {filteredCats.map((cat, i) => {
            const s = catStats[cat.id];
            const pct = s && s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0;
            return (
              <motion.button
                key={cat.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.03 }}
                onClick={() => { setSelectedCat(cat); setView('leis'); }}
                className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-card border border-border hover:border-primary/40 transition-all group relative overflow-hidden"
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${cat.gradient} flex items-center justify-center`}>
                  <cat.icon className="w-6 h-6 text-white" />
                </div>
                <p className="text-sm font-bold text-foreground group-hover:text-primary transition-colors text-center">{cat.label}</p>
                {s && s.total > 0 && (
                  <span className={`text-[10px] font-bold ${pct >= 70 ? 'text-emerald-500' : pct >= 40 ? 'text-primary' : 'text-red-500'}`}>
                    {pct}% · {s.total} feitas
                  </span>
                )}
                {s && s.total === 0 && (
                  <span className="text-[10px] text-muted-foreground">{cat.tabelas.length} leis</span>
                )}
              </motion.button>
            );
          })}
        </div>
      </div>
    );
  }

  /* ── Laws in category ────────────────────────────────── */
  return (
    <div className="space-y-4">
      <button onClick={handleBack} className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground text-sm transition-colors">
        <ArrowLeft className="w-4 h-4" /> Voltar
      </button>
      <h2 className="font-display text-lg font-bold text-foreground">{selectedCat?.label}</h2>
      {leisCategoria.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {leisCategoria.map((lei, i) => {
            const ls = lawStats.find(l => l.tabela === lei.tabela_nome);
            const pct = ls?.pct ?? 0;
            return (
              <motion.button
                key={lei.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                onClick={() => onSelectLei({ id: lei.id, nome: lei.nome, sigla: lei.sigla, tabela: lei.tabela_nome })}
                className="flex flex-col items-start gap-2 p-4 rounded-2xl bg-card border border-border hover:border-primary/40 transition-all text-left group"
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: lei.iconColor + '22' }}>
                  <span className="text-xs font-bold" style={{ color: lei.iconColor }}>{lei.sigla}</span>
                </div>
                <div className="min-w-0 w-full">
                  <p className="text-xs font-bold text-foreground group-hover:text-primary transition-colors line-clamp-2 leading-tight">{lei.nome}</p>
                  {ls ? (
                    <div className="mt-1.5 flex items-center gap-1.5">
                      <div className="flex-1 h-1.5 rounded-full bg-muted/30 overflow-hidden">
                        <div className="h-full rounded-full bg-emerald-500" style={{ width: `${pct}%` }} />
                      </div>
                      <span className={`text-[9px] font-bold ${pct >= 70 ? 'text-emerald-500' : pct >= 40 ? 'text-primary' : 'text-red-500'}`}>{pct}%</span>
                    </div>
                  ) : (
                    <p className="text-[10px] text-muted-foreground mt-1">Não iniciado</p>
                  )}
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground self-end" />
              </motion.button>
            );
          })}
        </div>
      )}
    </div>
  );
}
