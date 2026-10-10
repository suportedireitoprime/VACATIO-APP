import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { generateOmniText } from '@/lib/omniRouteClient';
import { toast } from 'sonner';
import { ArrowLeft, Play, StopCircle, RefreshCw, Layers, BookOpen, BrainCircuit, GraduationCap, CopyCheck, Brain, NotebookText } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Clock, Terminal, X, ChevronRight, BarChart } from 'lucide-react';

const LeiRow = ({ lei, modulo, onClick }: { lei: any, modulo: string, onClick: (lei: any) => void }) => {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    if (modulo === 'resumos') {
      supabase.from('resumos_juridicos')
        .select('id', { count: 'exact', head: true })
        .eq('area', lei.nome)
        .then(({ count }) => setCount(count || 0));
    } else {
      setCount(0); // placeholder para mapas, aulas, etc
    }
  }, [lei.nome, modulo]);

  const total = lei.total_artigos || 1;
  const progress = count !== null ? Math.min(100, Math.round((count / total) * 100)) : 0;

  return (
    <div onClick={() => onClick(lei)} className="cursor-pointer bg-card hover:bg-secondary/80 border border-border p-4 md:p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors">
      <div className="space-y-1">
        <h3 className="font-bold text-foreground text-lg">{lei.nome}</h3>
        <p className="text-sm text-muted-foreground">{lei.total_artigos || 0} artigos totais</p>
      </div>
      <div className="w-full md:w-64 space-y-2 shrink-0">
        <div className="flex justify-between text-xs font-bold text-muted-foreground">
          <span>{count !== null ? count : '...'} gerados</span>
          <span className="text-primary">{progress}%</span>
        </div>
        <div className="h-2.5 bg-black/20 rounded-full overflow-hidden">
          <div className="h-full bg-primary rounded-full transition-all duration-1000 ease-out" style={{ width: `${progress}%` }} />
        </div>
      </div>
    </div>
  );
};

const fetchAllArtigos = async (leiId: string, selectFields: string) => {
  let allData: any[] = [];
  let from = 0;
  const step = 1000;
  while (true) {
    const { data, error } = await supabase
      .from('vade_mecum_artigos')
      .select(selectFields)
      .eq('lei_id', leiId)
      .order('ordem', { ascending: true })
      .range(from, from + step - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    allData = [...allData, ...data];
    if (data.length < step) break;
    from += step;
  }
  return allData;
};

const fetchAllResumos = async (area: string) => {
  let allData: any[] = [];
  let from = 0;
  const step = 1000;
  while (true) {
    const { data, error } = await supabase
      .from('resumos_juridicos')
      .select('id, subtema')
      .eq('area', area)
      .range(from, from + step - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    allData = [...allData, ...data];
    if (data.length < step) break;
    from += step;
  }
  return allData;
};

const fetchAllMetodologias = async (resumoIds: string[]) => {
  let allData: any[] = [];
  const chunkSize = 200;
  for (let i = 0; i < resumoIds.length; i += chunkSize) {
    const chunk = resumoIds.slice(i, i + chunkSize);
    const { data, error } = await supabase
      .from('resumo_metodologias')
      .select('resumo_id, metodo')
      .in('resumo_id', chunk);
    if (error) throw error;
    if (data) allData = [...allData, ...data];
  }
  return allData;
};

// Item 1 e 6: Timeout e Retry Automático
const generateWithTimeoutAndRetry = async (params: any, retries = 2, timeoutMs = 45000) => {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await Promise.race([
        generateOmniText(params),
        new Promise<string>((_, reject) => setTimeout(() => reject(new Error("Timeout da IA (mais de 45s)")), timeoutMs))
      ]);
      return res;
    } catch (err: any) {
      if (i === retries - 1) throw err;
      await new Promise(r => setTimeout(r, 2000 * (i + 1))); // Exponential backoff
    }
  }
};

// Item 2 e 4: Resiliência de JSON e Sanitização de Chaves
const safeJsonParse = (str: string) => {
  try {
    let clean = str.replace(/```json/gi, '').replace(/```/g, '').trim();
    if (clean.includes('{') && clean.includes('}')) {
      clean = clean.substring(clean.indexOf('{'), clean.lastIndexOf('}') + 1);
    }
    // Remove vírgulas soltas antes de chaves ou colchetes (erro comum de IA)
    clean = clean.replace(/,\s*}/g, '}').replace(/,\s*]/g, ']');
    
    const obj = JSON.parse(clean);
    
    // Sanitizar chaves para lowercase (ex: Markdown -> markdown)
    const sanitizedObj: any = {};
    for (const key in obj) {
      sanitizedObj[key.toLowerCase()] = obj[key];
    }
    
    return sanitizedObj;
  } catch (err: any) {
    throw new Error(`Erro de JSON: ${err.message}`);
  }
};

export default function AdminPopularConteudo() {
  const [activeView, setActiveView] = useState<'hub' | 'lista' | 'robo'>('hub');
  const [activeModulo, setActiveModulo] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('código');
  
  const [leis, setLeis] = useState<any[]>([]);
  const [selectedLeiId, setSelectedLeiId] = useState<string>('cc');
  
  // Item 18: Geração Seletiva
  const [options, setOptions] = useState({ conceitual: true, cornell: true, feynman: true });
  
  // Item 22: Pausa Inteligente
  const [isPausing, setIsPausing] = useState(false);
  
  // Item 19: Tempo Médio
  const [avgTimePerItem, setAvgTimePerItem] = useState<string | null>(null);

  // Item 23: Filtro de Geração
  const [rangeStart, setRangeStart] = useState<string>('');
  const [rangeEnd, setRangeEnd] = useState<string>('');
  
  // Item 20: Fila de Falhas
  const [failedItems, setFailedItems] = useState<any[]>([]);
  
  // Item 24: Editor Rápido no Log
  const [editingResumoId, setEditingResumoId] = useState<string | null>(null);
  const [editingResumoMarkdown, setEditingResumoMarkdown] = useState<string>('');

  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [total, setTotal] = useState(0);
  const [logs, setLogs] = useState<{ id: string, text: string, type: 'info'|'success'|'error'|'warn', data?: any }[]>([]);
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  const [estimatedTime, setEstimatedTime] = useState<string | null>(null);
  const [isLogsModalOpen, setIsLogsModalOpen] = useState(false);
  
  // Status counters
  const [stats, setStats] = useState({
    artigos: 0,
    resumos_conceitos: 0,
    resumos_cornell: 0,
    resumos_feynman: 0
  });

  useEffect(() => {
    supabase.from('vade_mecum_leis')
      .select('id, slug, nome, categoria, total_artigos')
      .order('nome')
      .then(({ data }) => setLeis(data || []));
  }, []);

  const loadStats = async () => {
    const lei = leis.find(l => l.slug === selectedLeiId || l.id === selectedLeiId);
    if (!lei) return;

    // Fetch total articles
    const arts = await fetchAllArtigos(lei.id, 'numero, texto');
    const cArtigos = arts.filter(a => {
      if (!a.texto || a.texto.trim() === '') return false;
      if (!a.numero) return false;
      const n = a.numero.toLowerCase();
      return n.startsWith('art') || /^\d/.test(n);
    }).length;
    
    // Fetch total resumos (conceitual)
    const dResumos = await fetchAllResumos(lei.nome);
    const cResumos = dResumos.length;

    // Fetch methodologies
    let cCornell = 0;
    let cFeynman = 0;
    if (cResumos > 0) {
      const ids = dResumos.map(r => r.id);
      const met = await fetchAllMetodologias(ids);
      cCornell = met.filter(m => m.metodo === 'cornell').length;
      cFeynman = met.filter(m => m.metodo === 'feynman').length;
    }

    setStats({
      artigos: cArtigos,
      resumos_conceitos: cResumos,
      resumos_cornell: cCornell,
      resumos_feynman: cFeynman
    });
  };

  useEffect(() => {
    if (selectedLeiId && leis.length > 0) {
      loadStats();
    }
  }, [selectedLeiId, leis]);

  const addLog = (msg: string, type: 'info'|'success'|'error'|'warn' = 'info', data?: any) => {
    setLogs(prev => [{ id: Math.random().toString(), text: `${new Date().toLocaleTimeString()} - ${msg}`, type, data }, ...prev]);
  };

  const startRobotResumos = async () => {
    if (isGenerating) return;
    
    // Request permission for notification (Item 21)
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }

    const lei = leis.find(l => l.slug === selectedLeiId || l.id === selectedLeiId);
    if (!lei) {
      toast.error("Selecione uma lei válida.");
      return;
    }
    
    setLogs([]);
    setIsGenerating(true);
    setIsPausing(false);
    setProgress(0);
    setEstimatedTime(null);
    setAvgTimePerItem(null);
    setFailedItems([]);
    
    const controller = new AbortController();
    setAbortController(controller);
    
    // Setup manual pause check (by ref-like approach using state is harder in a single long function, so we'll check it from the state closure or better, just rely on AbortController for hard stop and a ref for pause)
    let pauseRequested = false; 

    try {
      addLog(`[ROBÔ INICIADO] Buscando artigos da lei: ${lei.nome}...`, 'info');
      
      const artigos = await fetchAllArtigos(lei.id, 'id, numero, texto, ordem');
      if (!artigos) throw new Error("Erro ao buscar artigos.");
      
      const cleanArtigos = artigos.filter(a => {
        if (!a.texto || a.texto.trim() === '') return false;
        if (!a.numero) return false;
        // Item 3: Pular artigos revogados
        if (a.texto.toLowerCase().includes('revogado')) return false;
        
        // Item 23: Filtro Range
        if (rangeStart && a.ordem < parseInt(rangeStart)) return false;
        if (rangeEnd && a.ordem > parseInt(rangeEnd)) return false;
        
        const n = a.numero.toLowerCase();
        return n.startsWith('art') || /^\d/.test(n);
      });
      setTotal(cleanArtigos.length);
      addLog(`Total a processar: ${cleanArtigos.length} artigos.`, 'info');
      
      // Fetch existing resumos
      const existingResumos = await fetchAllResumos(lei.nome);
      const existingMap = new Map(existingResumos.map(r => [r.subtema, r.id]));

      // Fetch all methodologies for existing resumos
      const existingIds = existingResumos.map(r => r.id);
      const allMetodologias = await fetchAllMetodologias(existingIds);
      const metodologiasMap = new Map<string, Set<string>>();
      allMetodologias.forEach(m => {
        if (!metodologiasMap.has(m.resumo_id)) metodologiasMap.set(m.resumo_id, new Set());
        metodologiasMap.get(m.resumo_id)!.add(m.metodo);
      });

      // Filter out completely processed articles
      const missingArtigos = cleanArtigos.filter(artigo => {
        let num = artigo.numero.replace(/art\.?\s*/i, '').trim();
        const numLabel = `Artigo ${num}`;
        let resumoId = existingMap.get(numLabel) || existingMap.get(`Art. ${num}`) || existingMap.get(num) || existingMap.get(artigo.numero);
        
        if (options.conceitual && !resumoId) return true; // Missing concept
        
        const metodos = metodologiasMap.get(resumoId) || new Set();
        if (options.cornell && !metodos.has('cornell')) return true; // Missing Cornell
        if (options.feynman && !metodos.has('feynman')) return true; // Missing Feynman
        
        return false; // Fully generated or ignored by options
      });

      let processed = cleanArtigos.length - missingArtigos.length;
      setProgress(processed);
      addLog(`Encontrados ${processed} artigos já totalmente gerados. Restam ${missingArtigos.length} para processar.`, 'info');
      
      let processedMissing = 0;
      const startTime = Date.now();
      
      // Lote Dinâmico (Item 14)
      let currentBatchSize = 3;
      
      for (let i = 0; i < missingArtigos.length; ) {
        // We can't access updated isPausing from this closure reliably without a ref, 
        // but we can check if it was requested via a small hack or let stopRobot trigger abort.
        // Actually, to implement Pause properly, we check a global or ref.
        if (controller.signal.aborted) {
          addLog("⚠️ Lote atual concluído e robô PAUSADO pelo usuário.", 'warn');
          setEstimatedTime(null);
          break;
        }

        const batch = missingArtigos.slice(i, i + currentBatchSize);
        addLog(`Processando lote ${Math.floor(i/currentBatchSize) + 1} (${batch.length} artigos) [Batch Size: ${currentBatchSize}]...`, 'info');

        let hasErrorInBatch = false;

        const batchPromises = batch.map(async (artigo) => {
          let num = artigo.numero.replace(/art\.?\s*/i, '').trim();
          const numLabel = `Artigo ${num}`;
          let resumoId = existingMap.get(numLabel) || existingMap.get(`Art. ${num}`) || existingMap.get(num) || existingMap.get(artigo.numero);
          const metodos = metodologiasMap.get(resumoId) || new Set();
          
          const missingConcept = options.conceitual && !resumoId;
          const missingCornell = options.cornell && !metodos.has('cornell');
          const missingFeynman = options.feynman && !metodos.has('feynman');

          let pConceitual = null;
          let pCornell = null;
          let pFeynman = null;

          if (missingConcept) {
            addLog(`[CONCEITUAL] Gerando ${numLabel}...`);
            const p = `LEGISLAÇÃO: ${lei.nome}\nARTIGO: ${artigo.numero}\nCAPUT: ${artigo.texto}

Gere uma explicação conceitual ESTRITAMENTE em JSON. Regras:
1. A chave "markdown" DEVE começar com '# Artigo ${num}' e NENHUM outro título principal (PROIBIDO títulos inventados como 'Análise Profunda').
2. Se o artigo for muito longo, divida a explicação por incisos/parágrafos.
3. Se o artigo for curto/óbvio, seja breve, sem encher linguiça.
4. Se houver súmula STF/STJ relacionada, cite-a.
5. Seja extremamente didático (como para um leigo) mas mantenha o rigor técnico.
6. Faça uma auto-revisão na chave "reflection" para garantir precisão jurídica.

Formato exigido: {"reflection": "sua verificação se contraria a lei", "markdown": "texto didático...", "exemplos": "...", "termos": "..."}`;
            pConceitual = generateWithTimeoutAndRetry({ prompt: p, systemPrompt: "Apenas JSON. SEM SAUDAÇÕES. DIRETO AO PONTO. Título '# Artigo X' OBRIGATÓRIO.", modelOverride: 'antigravity/gemini-3.8-flash-tiered', complexity: 'tiered' });
          }

          if (missingCornell) {
            addLog(`[CORNELL] Gerando ${numLabel}...`);
            const p = `LEGISLAÇÃO: ${lei.nome} / ${numLabel}
Crie um resumo Método Cornell. As "perguntas" devem instigar raciocínio clínico/prático (estilo OAB), fugindo da mera cópia do texto.
Retorne ESTRITAMENTE JSON: {"palavras_chave": [], "perguntas": [{"pergunta":"", "resposta":""}], "anotacoes": [{"topico":"", "conteudo":""}], "resumo_geral": ""}`;
            pCornell = generateWithTimeoutAndRetry({ prompt: p, systemPrompt: "Apenas JSON.", complexity: 'low' });
          }

          if (missingFeynman) {
            addLog(`[FEYNMAN] Gerando ${numLabel}...`);
            const p = `LEGISLAÇÃO: ${lei.nome} / ${numLabel}
Crie um resumo Técnica Feynman. As "analogias" devem focar na prática real do advogado ou situações do cotidiano do estudante de direito.
Retorne ESTRITAMENTE JSON: {"conceito": "", "explicacao_simples": "", "lacunas": [{"ponto":"", "explicacao":""}], "analogias": [{"analogia":"", "relacao":""}], "revisao_final": ""}`;
            pFeynman = generateWithTimeoutAndRetry({ prompt: p, systemPrompt: "Apenas JSON.", complexity: 'low' });
          }

          // Await all AI generations in parallel
          const [resConceitual, resCornell, resFeynman] = await Promise.allSettled([pConceitual, pCornell, pFeynman]);

          return {
            artigo, numLabel, resumoId,
            resConceitual, resCornell, resFeynman,
            missingConcept, missingCornell, missingFeynman
          };
        });

        const batchResults = await Promise.all(batchPromises);

        // Item 15: Bulk Insert de Conceituais
        const toInsertResumos: any[] = [];
        for (const res of batchResults) {
          if (res.missingConcept && res.resConceitual.status === 'fulfilled' && res.resConceitual.value) {
            try {
              const raw = safeJsonParse(res.resConceitual.value);
              toInsertResumos.push({
                area: lei.nome, tema: lei.nome, subtema: res.numLabel, ordem_subtema: res.artigo.ordem || 0,
                markdown: raw.markdown, exemplos: raw.exemplos, termos_chave: raw.termos, _raw: raw, _origResult: res
              });
            } catch (e: any) {
              addLog(`❌ [JSON ERRO] ${res.numLabel}: ${e.message}`, 'error');
              hasErrorInBatch = true;
              setFailedItems(prev => { if (!prev.find(p => p.id === res.artigo.id)) return [...prev, res.artigo]; return prev; });
            }
          } else if (res.resConceitual?.status === 'rejected') {
            addLog(`⚠️ [CONCEITUAL] ${res.numLabel} Falhou: ${res.resConceitual.reason?.message}`, 'error');
            hasErrorInBatch = true;
            setFailedItems(prev => { if (!prev.find(p => p.id === res.artigo.id)) return [...prev, res.artigo]; return prev; });
          }
        }

        if (toInsertResumos.length > 0) {
          try {
            const { data: inserted, error: errIns } = await supabase.from('resumos_juridicos').insert(
              toInsertResumos.map(r => ({ area: r.area, tema: r.tema, subtema: r.subtema, ordem_subtema: r.ordem_subtema, markdown: r.markdown, exemplos: r.exemplos, termos_chave: r.termos_chave })) as any
            ).select('id, subtema');
            
            if (errIns) throw errIns;
            
            // Map the new IDs back
            for (const r of toInsertResumos) {
              const dbRow = inserted.find(i => i.subtema === r.subtema);
              if (dbRow) {
                r._origResult.resumoId = dbRow.id;
                existingMap.set(r.subtema, dbRow.id);
                metodologiasMap.set(dbRow.id, new Set());
                addLog(`✅ [CONCEITUAL BULK] ${r.subtema} salvo. (Clique para editar)`, 'success', { id: dbRow.id, markdown: r.markdown });
              }
            }
          } catch (e: any) {
            addLog(`❌ [BULK INSERT ERRO]: ${e.message}`, 'error');
            hasErrorInBatch = true;
          }
        }

        // Item 15: Bulk Insert de Metodologias
        const toInsertMetodologias: any[] = [];
        for (const res of batchResults) {
          const rid = res.resumoId;
          
          if (res.missingCornell && res.resCornell.status === 'fulfilled' && res.resCornell.value && rid) {
            try {
              const raw = safeJsonParse(res.resCornell.value);
              toInsertMetodologias.push({ resumo_id: rid, metodo: 'cornell', conteudo: raw });
              metodologiasMap.get(rid)!.add('cornell');
              addLog(`✅ [CORNELL] ${res.numLabel} processado.`, 'success');
            } catch (e) { hasErrorInBatch = true; setFailedItems(prev => { if (!prev.find(p => p.id === res.artigo.id)) return [...prev, res.artigo]; return prev; }); }
          } else if (res.resCornell?.status === 'rejected') { hasErrorInBatch = true; setFailedItems(prev => { if (!prev.find(p => p.id === res.artigo.id)) return [...prev, res.artigo]; return prev; }); }

          if (res.missingFeynman && res.resFeynman.status === 'fulfilled' && res.resFeynman.value && rid) {
            try {
              const raw = safeJsonParse(res.resFeynman.value);
              toInsertMetodologias.push({ resumo_id: rid, metodo: 'feynman', conteudo: raw });
              metodologiasMap.get(rid)!.add('feynman');
              addLog(`✅ [FEYNMAN] ${res.numLabel} processado.`, 'success');
            } catch (e) { hasErrorInBatch = true; setFailedItems(prev => { if (!prev.find(p => p.id === res.artigo.id)) return [...prev, res.artigo]; return prev; }); }
          } else if (res.resFeynman?.status === 'rejected') { hasErrorInBatch = true; setFailedItems(prev => { if (!prev.find(p => p.id === res.artigo.id)) return [...prev, res.artigo]; return prev; }); }
        }

        if (toInsertMetodologias.length > 0) {
          try {
            const { error: errIns } = await supabase.from('resumo_metodologias').insert(toInsertMetodologias as any);
            if (errIns) throw errIns;
            addLog(`✅ [METODOLOGIAS BULK] ${toInsertMetodologias.length} salvos.`, 'success');
          } catch (e: any) {
            addLog(`❌ [METODOLOGIAS BULK ERRO]: ${e.message}`, 'error');
            hasErrorInBatch = true;
          }
        }

        setProgress(prev => prev + batch.length);
        loadStats(); // Update counters

        processedMissing += batch.length;
        if (processedMissing > 0) {
          const elapsed = Date.now() - startTime;
          const avgPerItem = elapsed / processedMissing;
          // Item 19: Tempo Médio
          setAvgTimePerItem((avgPerItem / 1000).toFixed(1) + 's/artigo');
          
          const remMs = avgPerItem * (missingArtigos.length - processedMissing);
          if (remMs > 0) {
            const mins = Math.floor(remMs / 60000);
            const secs = Math.floor((remMs % 60000) / 1000);
            setEstimatedTime(`~ ${mins}m ${secs}s restantes`);
          } else {
            setEstimatedTime("Concluindo...");
          }
        }

        // Dinamicamente ajusta o lote (Rate limit resilience)
        if (hasErrorInBatch && currentBatchSize > 1) {
          addLog("⚠️ Erros detectados no lote. Reduzindo Batch Size (Rate Limit).");
          currentBatchSize--;
        } else if (!hasErrorInBatch && currentBatchSize < 3) {
          currentBatchSize++;
        }

        i += batch.length; // Avança o loop
        await new Promise(r => setTimeout(r, 2000));
      }
      
      if (!controller.signal.aborted) {
        addLog("🚀 Todos os lotes concluídos!", 'success');
        toast.success("Processamento do robô concluído!");
        
        // Item 21: Alerta Sonoro/Notificação
        try {
          const audio = new Audio('https://www.soundjay.com/misc/sounds/bell-ringing-05.mp3');
          audio.volume = 0.5;
          audio.play().catch(() => {});
          
          if (Notification.permission === 'granted') {
            new Notification('VACATIO-APP', { body: 'O robô terminou de processar os resumos!' });
          }
        } catch (e) {}
      }
    } catch (err: any) {
      addLog(`ERRO FATAL: ${err.message}`, 'error');
      toast.error(err.message);
    } finally {
      setIsGenerating(false);
      setIsPausing(false);
      setEstimatedTime(null);
      setAbortController(null);
    }
  };

  const stopRobot = () => {
    setIsPausing(true);
    toast.info("Pausando após o término do lote atual...");
    if (abortController) {
      abortController.abort(); // Re-purposed to act as Pause signal
    }
  };

  // Item 24: Salvar Edição Rápida
  const saveQuickEdit = async () => {
    if (!editingResumoId) return;
    try {
      const { error } = await supabase.from('resumos_juridicos').update({ markdown: editingResumoMarkdown }).eq('id', editingResumoId);
      if (error) throw error;
      toast.success('Resumo atualizado!');
      setEditingResumoId(null);
    } catch (e: any) {
      toast.error('Erro ao salvar: ' + e.message);
    }
  };

  const tabs = [
    { id: 'resumos', label: 'Resumos (3 Tipos)', icon: NotebookText },
    { id: 'mapas', label: 'Mapas Mentais', icon: BrainCircuit },
    { id: 'aulas', label: 'Aulas', icon: GraduationCap },
    { id: 'licoes', label: 'Lições', icon: BookOpen },
    { id: 'flashcards', label: 'Flashcards', icon: CopyCheck },
    { id: 'questoes', label: 'Questões', icon: Brain },
  ];

  const categorias = leis.reduce((acc, lei) => {
    const cat = lei.categoria || 'Outros';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(lei);
    return acc;
  }, {} as Record<string, any[]>);

  return (
    <div className="min-h-dvh bg-background p-4 md:p-6">
      <div className="w-full max-w-[1600px] mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => {
              if (activeView === 'robo') setActiveView('lista');
              else if (activeView === 'lista') setActiveView('hub');
              else window.history.back();
            }}
            className="p-2 bg-secondary rounded-xl hover:bg-secondary/80"
          >
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <div>
            <h1 className="text-2xl font-black font-display text-foreground">Popular Conteúdo</h1>
            <p className="text-muted-foreground text-sm">Dashboard de povoamento da IA e robôs batch</p>
          </div>
        </div>

        {activeView === 'hub' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-4">
            {tabs.map(t => (
              <button
                key={t.id}
                onClick={() => {
                  setActiveModulo(t.id);
                  setActiveView('lista');
                }}
                className="flex flex-col text-left items-start p-6 rounded-3xl bg-card border border-border hover:border-primary/50 hover:bg-secondary/50 transition-all group"
              >
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <t.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-1">{t.label}</h3>
                <p className="text-sm text-muted-foreground line-clamp-2">Configure os robôs batch para preencher a base de dados em massa de forma automatizada.</p>
              </button>
            ))}
          </div>
        )}

        {activeView === 'lista' && (
          <div className="space-y-8 pt-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">Módulo: <span className="text-primary capitalize">{tabs.find(t => t.id === activeModulo)?.label}</span></h2>
                <p className="text-muted-foreground">Selecione uma lei para visualizar o progresso e iniciar o robô</p>
              </div>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {Object.keys(categorias).sort().map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-4 py-2 rounded-xl font-bold text-sm whitespace-nowrap transition-all ${
                    selectedCategory === cat
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-card border border-border text-foreground hover:bg-secondary'
                  }`}
                >
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </button>
              ))}
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                {categorias[selectedCategory || Object.keys(categorias)[0]]?.map(lei => (
                  <LeiRow 
                    key={lei.id} 
                    lei={lei} 
                    modulo={activeModulo!} 
                    onClick={(lei) => {
                      setSelectedLeiId(lei.id);
                      setActiveView('robo');
                    }} 
                  />
                ))}
              </div>
            </div>
          </div>
        )}
        
        {activeView === 'robo' && activeModulo === 'resumos' && (
          <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6">
            <div className="bg-card p-6 rounded-3xl border border-border space-y-6 shadow-sm h-fit">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Layers className="text-primary w-5 h-5" /> Configuração do Robô
              </h2>
              
              <div className="space-y-2">
                <label className="text-sm font-bold text-foreground">Legislação Alvo</label>
                <select 
                  value={selectedLeiId}
                  onChange={(e) => setSelectedLeiId(e.target.value)}
                  disabled={isGenerating}
                  className="w-full h-12 bg-secondary border-none rounded-xl px-4 text-foreground focus:ring-2 focus:ring-primary outline-none font-medium"
                >
                  <option value="cc">Código Civil</option>
                  {leis.map(l => (
                    <option key={l.id} value={l.slug || l.id}>{l.nome}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-secondary/50 rounded-2xl p-4">
                  <p className="text-xs text-muted-foreground font-semibold uppercase">Total de Artigos</p>
                  <p className="text-2xl font-black">{stats.artigos}</p>
                </div>
                <div className="bg-secondary/50 rounded-2xl p-4">
                  <p className="text-xs text-muted-foreground font-semibold uppercase">Conceituais Gerados</p>
                  <p className="text-2xl font-black text-blue-500">{stats.resumos_conceitos}</p>
                </div>
                <div className="bg-secondary/50 rounded-2xl p-4">
                  <p className="text-xs text-muted-foreground font-semibold uppercase">Cornell Gerados</p>
                  <p className="text-2xl font-black text-amber-500">{stats.resumos_cornell}</p>
                </div>
                <div className="bg-secondary/50 rounded-2xl p-4">
                  <p className="text-xs text-muted-foreground font-semibold uppercase">Feynman Gerados</p>
                  <p className="text-2xl font-black text-emerald-500">{stats.resumos_feynman}</p>
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-border">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <p className="text-sm font-bold text-foreground mb-2">Métodos a Gerar (Geração Seletiva)</p>
                    <div className="flex flex-col gap-2">
                      <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
                        <input type="checkbox" checked={options.conceitual} onChange={e => setOptions({...options, conceitual: e.target.checked})} className="accent-primary" />
                        Conceitual
                      </label>
                      <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
                        <input type="checkbox" checked={options.cornell} onChange={e => setOptions({...options, cornell: e.target.checked})} className="accent-primary" />
                        Cornell
                      </label>
                      <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
                        <input type="checkbox" checked={options.feynman} onChange={e => setOptions({...options, feynman: e.target.checked})} className="accent-primary" />
                        Feynman
                      </label>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground mb-2">Filtro de Geração (Intervalo de Artigos)</p>
                    <div className="flex items-center gap-2">
                      <input 
                        type="number" 
                        placeholder="Início (Ordem)" 
                        value={rangeStart} 
                        onChange={e => setRangeStart(e.target.value)} 
                        className="w-full h-10 bg-secondary border-none rounded-lg px-3 text-sm text-foreground focus:ring-1 focus:ring-primary outline-none"
                      />
                      <span className="text-muted-foreground">até</span>
                      <input 
                        type="number" 
                        placeholder="Fim (Ordem)" 
                        value={rangeEnd} 
                        onChange={e => setRangeEnd(e.target.value)} 
                        className="w-full h-10 bg-secondary border-none rounded-lg px-3 text-sm text-foreground focus:ring-1 focus:ring-primary outline-none"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 text-center">Deixe em branco para processar tudo.</p>
                  </div>
                </div>

                {!isGenerating ? (
                  <button 
                    onClick={startRobotResumos}
                    className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-xl font-bold hover:bg-primary/90 active:scale-95 transition-all w-full justify-center"
                  >
                    <Play className="w-5 h-5" />
                    Iniciar Robô (Dinâmico)
                  </button>
                ) : (
                  <button 
                    onClick={stopRobot}
                    disabled={isPausing}
                    className={`flex items-center gap-2 text-white px-6 py-3 rounded-xl font-bold transition-all w-full justify-center ${isPausing ? 'bg-yellow-600 opacity-70 cursor-not-allowed' : 'bg-yellow-500 hover:bg-yellow-600 active:scale-95'}`}
                  >
                    {isPausing ? <RefreshCw className="w-5 h-5 animate-spin" /> : <StopCircle className="w-5 h-5" />}
                    {isPausing ? 'Aguardando fim do lote...' : 'Pausar Robô'}
                  </button>
                )}
              </div>
            </div>

            <div className="bg-[#0a0a0a] rounded-3xl p-4 shadow-xl border border-white/10 flex flex-col">
              <div className="flex items-center justify-between mb-4 px-2">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <span className="ml-4 text-xs font-mono text-white/50 uppercase tracking-wider hidden sm:block">Terminal</span>
                  <button 
                    onClick={() => setIsLogsModalOpen(true)}
                    className="ml-2 px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-colors"
                  >
                    Ver todos
                  </button>
                </div>
                <div className="flex items-center gap-2 flex-wrap justify-end">
                  {avgTimePerItem && (
                    <div className="flex items-center gap-1.5 text-orange-400 font-mono text-xs bg-orange-400/10 px-2 py-1 rounded-lg border border-orange-400/20">
                      <BarChart className="w-3 h-3" />
                      <span>Velocidade: {avgTimePerItem}</span>
                    </div>
                  )}
                  {estimatedTime && (
                    <div className="flex items-center gap-1.5 text-blue-400 font-mono text-xs bg-blue-400/10 px-2 py-1 rounded-lg border border-blue-400/20">
                      <Clock className="w-3 h-3" />
                      <span>{estimatedTime}</span>
                    </div>
                  )}
                  {isGenerating && (
                    <div className="flex items-center gap-2 text-green-400 font-mono text-sm bg-green-400/10 px-3 py-1.5 rounded-lg border border-green-400/20">
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Progresso: <b>{progress}</b> / {total}</span>
                    </div>
                  )}
                </div>
              </div>
              
              <ScrollArea className="flex-1 w-full bg-black rounded-xl p-4 font-mono text-sm min-h-[400px]">
                {logs.length === 0 ? (
                  <div className="text-white/30 h-full flex items-center justify-center pt-20">Aguardando início...</div>
                ) : (
                  <div className="space-y-1 pb-4">
                    {logs.slice(0, 50).map((log) => (
                      <div 
                        key={log.id} 
                        onClick={() => {
                          if (log.data?.id) {
                            setEditingResumoId(log.data.id);
                            setEditingResumoMarkdown(log.data.markdown || '');
                          }
                        }}
                        className={`${log.data?.id ? 'cursor-pointer hover:bg-white/5 p-1 rounded transition-colors' : ''} ${log.type === 'error' ? 'text-red-400' : log.type === 'success' ? 'text-green-400' : log.type === 'warn' ? 'text-yellow-400' : (log.text.includes('[ROBÔ') || log.text.includes('lote') ? 'text-blue-300 font-bold' : 'text-green-400/80')}`}
                      >
                        {log.text}
                      </div>
                    ))}
                    {logs.length > 50 && (
                      <div className="text-white/50 text-xs pt-2">Mostrando os últimos 50 logs. Clique em "Ver todos" para o histórico completo.</div>
                    )}
                  </div>
                )}
              </ScrollArea>
            </div>
            
            {failedItems.length > 0 && !isGenerating && (
              <div className="col-span-1 lg:col-span-2 bg-red-500/10 border border-red-500/20 p-6 rounded-3xl mt-6">
                <h3 className="text-red-500 font-bold mb-2 flex items-center gap-2">
                  <StopCircle className="w-5 h-5" /> Fila de Falhas ({failedItems.length} itens)
                </h3>
                <p className="text-sm text-red-400/80 mb-4">Esses artigos falharam por timeout, JSON malformado ou Rate Limit.</p>
                <div className="flex flex-wrap gap-2 mb-4">
                  {failedItems.slice(0, 10).map((item, idx) => (
                    <span key={idx} className="bg-red-500/20 text-red-300 px-3 py-1 rounded-full text-xs font-mono">
                      {item.numero}
                    </span>
                  ))}
                  {failedItems.length > 10 && <span className="text-red-400/60 text-xs py-1">... e mais {failedItems.length - 10}</span>}
                </div>
                <button 
                  onClick={() => {
                    // Start retrying only failed items
                    const minOrdem = Math.min(...failedItems.map(i => i.ordem));
                    const maxOrdem = Math.max(...failedItems.map(i => i.ordem));
                    setRangeStart(minOrdem.toString());
                    setRangeEnd(maxOrdem.toString());
                    toast.info("Filtro configurado para a fila de falhas. Clique em Iniciar.");
                  }}
                  className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-xl text-sm transition-colors"
                >
                  Configurar filtro para Falhas
                </button>
              </div>
            )}
          </div>
        )}

        {activeView === 'robo' && activeModulo !== 'resumos' && (
          <div className="bg-card p-12 rounded-3xl border border-border flex flex-col items-center justify-center text-center mt-10">
            <Layers className="w-16 h-16 text-muted-foreground/30 mb-4" />
            <h3 className="text-xl font-bold text-foreground">Em construção</h3>
            <p className="text-muted-foreground max-w-md mt-2">
              Você pode usar o robô populador de resumos como modelo (Skill) para implementar estas outras seções no futuro.
            </p>
          </div>
        )}
      </div>

      {isLogsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="bg-[#0a0a0a] rounded-3xl p-6 shadow-xl border border-white/10 w-full max-w-4xl max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Terminal className="w-5 h-5" /> Histórico Completo de Logs
              </h2>
              <button onClick={() => setIsLogsModalOpen(false)} className="p-2 hover:bg-white/10 rounded-full text-white/70 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <ScrollArea className="flex-1 w-full bg-black rounded-xl p-4 font-mono text-sm">
              <div className="space-y-1 pb-4">
                {logs.map((log) => (
                  <div 
                    key={log.id} 
                    onClick={() => {
                      if (log.data?.id) {
                        setEditingResumoId(log.data.id);
                        setEditingResumoMarkdown(log.data.markdown || '');
                        setIsLogsModalOpen(false); // Close logs modal to show edit modal
                      }
                    }}
                    className={`${log.data?.id ? 'cursor-pointer hover:bg-white/5 p-1 rounded transition-colors' : ''} ${log.type === 'error' ? 'text-red-400' : log.type === 'success' ? 'text-green-400' : log.type === 'warn' ? 'text-yellow-400' : (log.text.includes('[ROBÔ') || log.text.includes('lote') ? 'text-blue-300 font-bold' : 'text-green-400/80')}`}
                  >
                    {log.text}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>
      )}

      {/* Item 24: Modal de Edição Rápida */}
      {editingResumoId && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="bg-card rounded-3xl p-6 shadow-xl border border-border w-full max-w-2xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                Editor Rápido de Conteúdo
              </h2>
              <button onClick={() => setEditingResumoId(null)} className="p-2 hover:bg-secondary rounded-full text-muted-foreground transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <textarea 
                value={editingResumoMarkdown}
                onChange={e => setEditingResumoMarkdown(e.target.value)}
                className="w-full h-[400px] bg-background border border-border rounded-xl p-4 text-foreground font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Markdown..."
              />
              <div className="flex justify-end gap-2">
                <button onClick={() => setEditingResumoId(null)} className="px-4 py-2 rounded-xl font-bold hover:bg-secondary text-foreground transition-colors">
                  Cancelar
                </button>
                <button onClick={saveQuickEdit} className="px-6 py-2 rounded-xl font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
                  Salvar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
