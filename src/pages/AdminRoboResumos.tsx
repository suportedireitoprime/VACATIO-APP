import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { generateOmniText } from '@/lib/omniRouteClient';
import { toast } from 'sonner';
import { ArrowLeft, Play, StopCircle, RefreshCw, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function AdminRoboResumos() {
  const [leis, setLeis] = useState<any[]>([]);
  const [selectedLeiId, setSelectedLeiId] = useState<string>('cc'); // Default Código Civil
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [total, setTotal] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  
  // Abort controller to stop loop
  const [abortController, setAbortController] = useState<AbortController | null>(null);

  useEffect(() => {
    supabase.from('vade_mecum_leis')
      .select('id, slug, nome')
      .order('nome')
      .then(({ data }) => setLeis(data || []));
  }, []);

  const addLog = (msg: string) => {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()} - ${msg}`]);
  };

  const startRobot = async () => {
    if (isGenerating) return;
    
    const lei = leis.find(l => l.slug === selectedLeiId || l.id === selectedLeiId);
    if (!lei) {
      toast.error("Selecione uma lei válida.");
      return;
    }
    
    setLogs([]);
    setIsGenerating(true);
    setProgress(0);
    
    const controller = new AbortController();
    setAbortController(controller);
    
    try {
      addLog(`Buscando artigos da lei: ${lei.nome}...`);
      
      // Fetch all articles
      const { data: artigos, error: artError } = await supabase
        .from('vade_mecum_artigos')
        .select('id, numero, texto, ordem')
        .eq('lei_id', selectedLeiId)
        .order('ordem', { ascending: true });
        
      if (artError || !artigos) {
        throw new Error(artError?.message || "Erro ao buscar artigos");
      }
      
      const cleanArtigos = artigos.filter(a => a.texto && a.texto.trim() !== '');
      setTotal(cleanArtigos.length);
      addLog(`Encontrados ${cleanArtigos.length} artigos com texto.`);
      
      // Fetch existing resumos for this law
      const { data: existingResumos } = await supabase
        .from('resumos_juridicos')
        .select('subtema')
        .eq('area', lei.nome)
        .eq('tema', lei.nome);
        
      const existingSubtemas = new Set(existingResumos?.map(r => r.subtema) || []);
      addLog(`${existingSubtemas.size} resumos já existem no banco.`);
      
      let count = 0;
      
      for (const artigo of cleanArtigos) {
        if (controller.signal.aborted) {
          addLog("Robô parado pelo usuário.");
          break;
        }
        
        count++;
        setProgress(count);
        
        const numLabel = artigo.numero.toLowerCase().includes('art') ? artigo.numero : `Art. ${artigo.numero}`;
        
        if (existingSubtemas.has(numLabel) || existingSubtemas.has(artigo.numero)) {
          addLog(`Pulando ${numLabel} - já existe.`);
          continue;
        }
        
        addLog(`Gerando ${numLabel}...`);
        
        try {
          const prompt = `LEGISLAÇÃO: ${lei.nome}\nARTIGO: ${artigo.numero}\nCAPUT: ${artigo.texto}\n\nGere uma explicação PROFUNDA e COMPLETA deste artigo jurídico. Não seja seco ou superficial. Retorne ESTRITAMENTE um objeto JSON válido (sem \`\`\`json) com os seguintes campos:\n{\n  "markdown": "Uma explicação doutrinária extensa e didática, formatada em markdown. Comece do básico e aprofunde. Use analogias, tabelas markdown e listas. OBRIGATÓRIO: Vá direto ao ponto! PROIBIDO usar saudações como 'Olá', 'Bem-vindo', 'Que alegria'. Inicie o texto diretamente com o conteúdo da explicação.",\n  "exemplos": "Pelo menos 2 ou 3 exemplos práticos, ricos em detalhes e do cotidiano, ilustrando perfeitamente a aplicação deste artigo. Formato markdown.",\n  "termos": "Um pequeno glossário explicando detalhadamente de forma acessível os termos ou jargões jurídicos usados neste artigo."\n}`;

          const systemPrompt = "Você é um professor de direito experiente e didático. Seu objetivo é explicar conceitos jurídicos de forma profunda, completa e muito acessível para leigos. IMPORTANTE: NÃO inclua NENHUMA saudação, introdução ou conversa fiada (como 'Olá', 'Que alegria', 'Bem-vindo', 'Aqui está'). Vá DIRETO ao conteúdo da explicação jurídica. Retorne apenas JSON puro, sem marcações markdown em volta do JSON.";

          const res = await generateOmniText({
            prompt,
            systemPrompt,
            modelOverride: 'antigravity/gemini-3.8-flash-tiered',
            complexity: 'tiered'
          });

          let cleanJson = res.replace(/```json/gi, '').replace(/```/g, '').trim();
          const startIdx = cleanJson.indexOf('{');
          const endIdx = cleanJson.lastIndexOf('}');
          if (startIdx >= 0 && endIdx >= 0) {
            cleanJson = cleanJson.substring(startIdx, endIdx + 1);
          }
          
          const raw = JSON.parse(cleanJson);
          
          const { error: insertError } = await supabase
            .from('resumos_juridicos')
            .insert({
              area: lei.nome,
              tema: lei.nome,
              subtema: numLabel,
              ordem_subtema: artigo.ordem || 0,
              markdown: raw.markdown || null,
              exemplos: raw.exemplos || null,
              termos: raw.termos || null
            });
            
          if (insertError) {
            addLog(`❌ Erro ao salvar ${numLabel}: ${insertError.message}`);
          } else {
            addLog(`✅ Sucesso ${numLabel}`);
          }
          
        } catch (e: any) {
          addLog(`❌ Erro em ${numLabel}: ${e?.message}`);
        }
        
        // Pequena pausa para evitar rate limits excessivos do provedor
        await new Promise(r => setTimeout(r, 1000));
      }
      
      addLog("Concluído!");
      
    } catch (err: any) {
      addLog(`ERRO FATAL: ${err.message}`);
      toast.error(err.message);
    } finally {
      setIsGenerating(false);
      setAbortController(null);
    }
  };

  const stopRobot = () => {
    if (abortController) {
      abortController.abort();
    }
  };

  return (
    <div className="min-h-dvh bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Link to="/admin" className="p-2 bg-secondary rounded-xl hover:bg-secondary/80">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </Link>
          <div>
            <h1 className="text-2xl font-black font-display text-foreground">Robô de Resumos</h1>
            <p className="text-muted-foreground text-sm">Geração automática de resumos conceituais para a biblioteca</p>
          </div>
        </div>
        
        <div className="bg-card p-6 rounded-3xl border border-border space-y-6 shadow-sm">
          <div className="space-y-2">
            <label className="text-sm font-bold text-foreground">Selecione a Legislação</label>
            <select 
              value={selectedLeiId}
              onChange={(e) => setSelectedLeiId(e.target.value)}
              disabled={isGenerating}
              className="w-full h-12 bg-secondary border-none rounded-xl px-4 text-foreground focus:ring-2 focus:ring-primary outline-none font-medium"
            >
              <option value="cc">Código Civil (Padrão)</option>
              {leis.map(l => (
                <option key={l.id} value={l.slug || l.id}>{l.nome}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-4 pt-4 border-t border-border">
            {!isGenerating ? (
              <button 
                onClick={startRobot}
                className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-xl font-bold hover:bg-primary/90 active:scale-95 transition-all"
              >
                <Play className="w-5 h-5" />
                Iniciar Geração
              </button>
            ) : (
              <button 
                onClick={stopRobot}
                className="flex items-center gap-2 bg-red-500 text-white px-6 py-3 rounded-xl font-bold hover:bg-red-600 active:scale-95 transition-all"
              >
                <StopCircle className="w-5 h-5" />
                Parar Robô
              </button>
            )}
            
            {isGenerating && (
              <div className="flex items-center gap-3 ml-auto">
                <RefreshCw className="w-5 h-5 text-primary animate-spin" />
                <span className="font-bold text-foreground font-display">
                  {progress} <span className="text-muted-foreground font-normal">/ {total}</span>
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="bg-black rounded-3xl p-4 shadow-xl border border-white/10">
          <div className="flex items-center gap-2 mb-4 px-2">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span className="ml-4 text-xs font-mono text-white/50 uppercase tracking-wider">Terminal Output</span>
          </div>
          
          <ScrollArea className="h-[400px] w-full bg-[#0a0a0a] rounded-xl p-4 font-mono text-sm text-green-400">
            {logs.length === 0 ? (
              <div className="text-white/30 h-full flex items-center justify-center">Aguardando início...</div>
            ) : (
              <div className="space-y-1 pb-4">
                {logs.map((log, i) => (
                  <div key={i} className={log.includes('❌') ? 'text-red-400' : log.includes('✅') ? 'text-green-400' : 'text-blue-300'}>
                    {log}
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
        
      </div>
    </div>
  );
}
