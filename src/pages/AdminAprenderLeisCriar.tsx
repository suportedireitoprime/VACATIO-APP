import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Bot, 
  Play, 
  Square, 
  Terminal, 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  Layers, 
  Scale, 
  BookOpen, 
  ArrowLeft, 
  Sliders, 
  Eye, 
  Copy, 
  Check,
  ShieldAlert,
  Image as ImageIcon,
  Link2,
  ExternalLink,
  Globe,
  Radio
} from 'lucide-react';
import { toast } from 'sonner';
import DesktopPageLayout from '@/components/layout/DesktopPageLayout';
import { PageHeader } from '@/components/vademecum/PageHeader';
import { useAuth } from '@/hooks/useAuth';
import { isAdminEmail } from '@/lib/adminEmails';
import { generateOmniText } from '@/lib/omniRouteClient';
import { supabase } from '@/integrations/supabase/client';

interface LogItem {
  id: string;
  hora: string;
  tipo: 'info' | 'sucesso' | 'erro' | 'aviso';
  mensagem: string;
}

const LEIS_DISPONIVEIS = [
  { id: 'codigo_penal', nome: 'Código Penal (Decreto-Lei nº 2.848/1940)', sigla: 'CP', artigosTotal: 361 },
  { id: 'clt', nome: 'Consolidação das Leis do Trabalho (CLT)', sigla: 'CLT', artigosTotal: 922 },
  { id: 'cf88', nome: 'Constituição Federal de 1988', sigla: 'CF/88', artigosTotal: 250 },
  { id: 'codigo_civil', nome: 'Código Civil (Lei nº 10.406/2002)', sigla: 'CC', artigosTotal: 2046 },
  { id: 'cpp', nome: 'Código de Processo Penal (DL nº 3.689/1941)', sigla: 'CPP', artigosTotal: 810 },
];

const MECANICAS_GERACAO = [
  { id: 'hibrida', nome: 'Trilha Completa (Combina as 5 Mecânicas)', desc: 'Gera aula completa com anatomia, caso real, bate-papo, linha do tempo e desafio' },
  { id: 'anatomia', nome: '1. Anatomia & Tradução Palavra por Palavra', desc: 'Foco em destrinchar o juridiquês em português claro e direto' },
  { id: 'storytelling', nome: '2. Storytelling & Casos Reais', desc: 'Narrativa em capítulos com personagens e dilemas práticos do cotidiano' },
  { id: 'dialogo', nome: '3. Diálogo Tutor & Aluno Curioso', desc: 'Chat interativo com dúvidas reais e metáforas simples' },
  { id: 'linha_tempo', nome: '4. Linha do Tempo & Simulador', desc: 'Régua cronológica interativa de aplicação temporal' },
  { id: 'mapa_decisao', nome: '5. Mapa Mental & Desafio Gamificado', desc: 'Árvore de decisão simples, flashcard 3D e quiz Você é o Juiz' },
];

const MODELOS_OMNIROUTE = [
  { id: 'google/gemini-2.0-flash-001', nome: 'Gemini 2.0 Flash (Rápido e Preciso)' },
  { id: 'anthropic/claude-3-5-sonnet-20241022', nome: 'Claude 3.5 Sonnet (Máxima Didática e Nuance)' },
  { id: 'openai/gpt-4o-mini', nome: 'GPT-4o Mini (Econômico)' },
  { id: 'mistralai/mistral-large-2407', nome: 'Mistral Large' },
];

const AdminAprenderLeisCriar = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = isAdminEmail(user?.email);

  // Estados de Configuração
  const [leiSelecionada, setLeiSelecionada] = useState('codigo_penal');
  const [artigoInicio, setArtigoInicio] = useState(1);
  const [artigoFim, setArtigoFim] = useState(2);
  const [mecanicaSelecionada, setMecanicaSelecionada] = useState('hibrida');
  const [modeloOmni, setModeloOmni] = useState('google/gemini-2.0-flash-001');
  const [temperatura, setTemperatura] = useState(0.4);

  // Estados de Execução do Robô
  const [executando, setExecutando] = useState(false);
  const [progresso, setProgresso] = useState({ total: 0, concluidos: 0, erros: 0 });
  const [logs, setLogs] = useState<LogItem[]>([
    {
      id: '1',
      hora: new Date().toLocaleTimeString(),
      tipo: 'info',
      mensagem: 'Estúdio OmniRoute pronto. Configure a lei e clique em Iniciar ou Testar.',
    },
  ]);
  const [resultadoPrevia, setResultadoPrevia] = useState<any | null>(null);
  const [mcpStatus, setMcpStatus] = useState<'idle' | 'online' | 'offline'>('idle');
  const [mcpTestando, setMcpTestando] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);

  const testarMcp = async () => {
    setMcpTestando(true);
    try {
      const res = await fetch('http://localhost:3333/health');
      const data = await res.json();
      if (data.status === 'ok') {
        setMcpStatus('online');
        toast.success('Servidor MCP está online e respondendo na porta 3333!');
      } else {
        setMcpStatus('offline');
        toast.error('Servidor MCP retornou resposta inesperada.');
      }
    } catch {
      setMcpStatus('offline');
      toast.error('Não foi possível conectar ao servidor MCP na porta 3333. Inicie com: cd mcp-server && npm run start');
    } finally {
      setMcpTestando(false);
    }
  };

  const addLog = (tipo: LogItem['tipo'], mensagem: string) => {
    setLogs(prev => [
      ...prev,
      {
        id: Math.random().toString(36).substring(7),
        hora: new Date().toLocaleTimeString(),
        tipo,
        mensagem,
      },
    ]);
  };

  // Botão para testar 1 artigo isolado
  const handleTestarUnico = async () => {
    if (executando) return;
    setExecutando(true);
    setResultadoPrevia(null);

    const lei = LEIS_DISPONIVEIS.find(l => l.id === leiSelecionada);
    addLog('info', `Iniciando teste avulso: ${lei?.sigla} Art. ${artigoInicio} com modelo ${modeloOmni}...`);

    try {
      const prompt = `Você é um especialista em Legal Design, Microlearning e Plain Language (Linguagem Clara).
Sua missão é criar uma aula interativa em slides para ensinar pessoas leigas sobre o seguinte artigo:
Legislação: ${lei?.nome}
Artigo: Art. ${artigoInicio}
Mecânica Pedagógica solicitada: ${mecanicaSelecionada}

DIRETRIZES OBRIGATÓRIAS:
1. Linguagem simples, humana, sem jargões desnecessários (Plain Language).
2. Se usar um termo técnico (ex: "cominação", "anterioridade", "retroatividade"), traduza imediatamente com metáforas do dia a dia.
3. Crie de 4 a 5 slides interativos.
4. Para cada slide, crie um "image_prompt": uma descrição artística e cinematográfica em inglês (16:9 widescreen, clean legal design, conceptual metaphor, dark slate background, cinematic neon accents, strictly zero gibberish text) para o Imagen 3 / Google Gemini Spark gerar uma ilustração.
5. Responda ESTRITAMENTE em formato JSON puro, sem blocos de markdown.

Formato JSON esperado:
{
  "artigo": "Art. ${artigoInicio}",
  "titulo_aula": "Título da Aula para Leigos",
  "objetivo": "O que a pessoa vai aprender em 3 minutos",
  "duracao_min": 3,
  "slides": [
    {
      "ordem": 1,
      "badge": "Passo 1 de 5 · O Texto Oficial",
      "titulo": "Título do Slide",
      "subtitulo": "Subtítulo amigável",
      "texto_didatico": "Explicação em português cristalino.",
      "exemplo_cotidiano": "Exemplo do dia a dia de uma pessoa comum.",
      "image_prompt": "A modern 3D conceptual illustration of a glowing gavel and timeline...",
      "tipo_interacao": "leitura"
    }
  ]
}`;

      const res = await generateOmniText({
        prompt,
        systemPrompt: "Você é um assistente de Legal Design e Educação Jurídica para leigos. Retorne SOMENTE JSON válido.",
        modelOverride: modeloOmni,
        temperature: temperatura,
        complexity: 'tiered',
      });

      let jsonTexto = res.replace(/```json/gi, '').replace(/```/g, '').trim();
      const inicio = jsonTexto.indexOf('{');
      const fim = jsonTexto.lastIndexOf('}');
      if (inicio !== -1 && fim !== -1) {
        jsonTexto = jsonTexto.substring(inicio, fim + 1);
      }

      const parsed = JSON.parse(jsonTexto);
      setResultadoPrevia(parsed);

      // Persistência automática dos prompts de imagem na tabela aprender_leis_imagens
      try {
        const slidesComPrompt = (parsed.slides || []).filter((s: any) => s.image_prompt);
        if (slidesComPrompt.length > 0) {
          for (const s of slidesComPrompt) {
            await (supabase.from('aprender_leis_imagens' as any) as any).insert({
              lei_id: leiSelecionada,
              artigo_numero: `Art. ${artigoInicio}`,
              dispositivo: 'Caput',
              slide_ordem: s.ordem || 1,
              slide_titulo: s.titulo || 'Slide',
              image_prompt: s.image_prompt,
              status: 'pending',
              dimensao: '16:9',
            });
          }
          addLog('sucesso', `🎨 ${slidesComPrompt.length} prompts de imagem salvos no Supabase para o MCP Gemini Spark!`);
        }
      } catch (errDb: any) {
        console.warn('Aviso ao registrar prompts no Supabase:', errDb?.message);
      }

      addLog('sucesso', `Teste concluído com sucesso para o Art. ${artigoInicio}! ${parsed.slides?.length || 0} slides gerados.`);
      toast.success('Aula gerada com sucesso via OmniRoute!');
    } catch (err: any) {
      addLog('erro', `Falha ao gerar aula: ${err?.message || err}`);
      toast.error('Erro ao conectar com OmniRoute.');
    } finally {
      setExecutando(false);
    }
  };

  // Botão para executar lote de artigos
  const handleIniciarLote = async () => {
    if (artigoInicio > artigoFim) {
      toast.error('O artigo inicial não pode ser maior que o final.');
      return;
    }

    const total = artigoFim - artigoInicio + 1;
    setExecutando(true);
    setProgresso({ total, concluidos: 0, erros: 0 });
    abortControllerRef.current = new AbortController();

    const lei = LEIS_DISPONIVEIS.find(l => l.id === leiSelecionada);
    addLog('info', `Iniciando robô OmniRoute para lote: ${lei?.sigla} (Arts. ${artigoInicio} a ${artigoFim}) - Total: ${total} artigos.`);

    const listaArtigos: number[] = [];
    for (let a = artigoInicio; a <= artigoFim; a++) {
      listaArtigos.push(a);
    }

    const BATCH_SIZE = 2; // Processamento seguro para não estourar rate-limits
    for (let i = 0; i < listaArtigos.length; i += BATCH_SIZE) {
      if (abortControllerRef.current?.signal.aborted) {
        addLog('aviso', 'Execução cancelada pelo usuário.');
        break;
      }

      const lote = listaArtigos.slice(i, i + BATCH_SIZE);
      addLog('info', `Processando lote de artigos: ${lote.join(', ')}...`);

      const promises = lote.map(async (artNum) => {
        try {
          const prompt = `Crie uma aula de microlearning para leigos em JSON para o artigo:
Legislação: ${lei?.nome}
Artigo: Art. ${artNum}
Mecanica: ${mecanicaSelecionada}
Inclua para cada slide: "image_prompt" (descrição para gerar ilustração 16:9 widescreen no Gemini Spark/Imagen 3).
Retorne somente JSON com: { "artigo": "Art. ${artNum}", "titulo_aula": "...", "slides": [{ "ordem": 1, "titulo": "...", "texto_didatico": "...", "image_prompt": "..." }] }`;

          const res = await generateOmniText({
            prompt,
            systemPrompt: "Você é um assistente de Legal Design. Retorne SOMENTE JSON.",
            modelOverride: modeloOmni,
            temperature: temperatura,
            complexity: 'tiered',
          });

          // Gravação dos prompts gerados no lote
          try {
            let clean = res.replace(/```json/gi, '').replace(/```/g, '').trim();
            const startIdx = clean.indexOf('{');
            const endIdx = clean.lastIndexOf('}');
            if (startIdx !== -1 && endIdx !== -1) {
              clean = clean.substring(startIdx, endIdx + 1);
              const parsedLote = JSON.parse(clean);
              const slidesPrompt = (parsedLote.slides || []).filter((s: any) => s.image_prompt);
              for (const s of slidesPrompt) {
                await (supabase.from('aprender_leis_imagens' as any) as any).insert({
                  lei_id: leiSelecionada,
                  artigo_numero: `Art. ${artNum}`,
                  dispositivo: 'Caput',
                  slide_ordem: s.ordem || 1,
                  slide_titulo: s.titulo || 'Slide',
                  image_prompt: s.image_prompt,
                  status: 'pending',
                  dimensao: '16:9',
                });
              }
            }
          } catch (eDb) {
            // Silencioso em caso de erro individual de gravação
          }

          addLog('sucesso', `Art. ${artNum} gerado com sucesso via OmniRoute.`);
          setProgresso(prev => ({ ...prev, concluidos: prev.concluidos + 1 }));
        } catch (err: any) {
          addLog('erro', `Erro no Art. ${artNum}: ${err?.message || err}`);
          setProgresso(prev => ({ ...prev, erros: prev.erros + 1 }));
        }
      });

      await Promise.all(promises);
      // Pausa de 2 segundos entre lotes
      await new Promise(r => setTimeout(r, 2000));
    }

    setExecutando(false);
    addLog('sucesso', `Lote finalizado!`);
    toast.success('Processamento do lote finalizado!');
  };

  const handleParar = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setExecutando(false);
    addLog('aviso', 'Comando de parada recebido.');
  };

  const mobileHeader = (
    <PageHeader 
      title="Criar — Aprender Leis" 
      onBack={() => navigate('/admin-aprender-leis')} 
    />
  );

  if (!isAdmin) {
    return (
      <DesktopPageLayout activeId="admin" title="Admin — Aprender Leis Criar" mobileHeader={mobileHeader}>
        <div className="p-8 text-center text-muted-foreground">
          <ShieldAlert className="mx-auto mb-3 h-10 w-10 text-destructive" />
          Acesso restrito para administradores.
        </div>
      </DesktopPageLayout>
    );
  }

  return (
    <DesktopPageLayout
      activeId="admin"
      title="Criar Aulas de Leis com OmniRoute"
      subtitle="Gere trilhas pedagógicas completas para legislação com IA e Legal Design"
      mobileHeader={mobileHeader}
    >
      <div className="px-4 sm:px-6 py-4 lg:px-0 lg:py-0 max-w-4xl mx-auto w-full space-y-5">
        
        {/* Painel de Configuração do Robô */}
        <div className="rounded-2xl border border-border/80 bg-card p-5 space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-border/50">
            <Sliders className="w-5 h-5 text-blue-400" />
            <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">
              Parâmetros da Geração de Aulas
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            
            {/* Escolha da Lei */}
            <div className="space-y-1.5">
              <label className="font-semibold text-foreground">Legislação Alvo</label>
              <select
                value={leiSelecionada}
                onChange={(e) => setLeiSelecionada(e.target.value)}
                disabled={executando}
                className="w-full p-2.5 rounded-xl border border-border bg-secondary/40 text-foreground focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {LEIS_DISPONIVEIS.map(l => (
                  <option key={l.id} value={l.id}>
                    {l.nome} ({l.artigosTotal} artigos)
                  </option>
                ))}
              </select>
            </div>

            {/* Escolha do Modelo OmniRoute */}
            <div className="space-y-1.5">
              <label className="font-semibold text-foreground">Modelo de IA (OmniRoute)</label>
              <select
                value={modeloOmni}
                onChange={(e) => setModeloOmni(e.target.value)}
                disabled={executando}
                className="w-full p-2.5 rounded-xl border border-border bg-secondary/40 text-foreground focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {MODELOS_OMNIROUTE.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.nome}
                  </option>
                ))}
              </select>
            </div>

            {/* Intervalo de Artigos */}
            <div className="space-y-1.5">
              <label className="font-semibold text-foreground">Intervalo de Artigos</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  value={artigoInicio}
                  onChange={(e) => setArtigoInicio(Number(e.target.value))}
                  disabled={executando}
                  placeholder="Do art."
                  className="w-full p-2.5 rounded-xl border border-border bg-secondary/40 text-foreground text-center"
                />
                <span className="text-muted-foreground font-bold">até</span>
                <input
                  type="number"
                  min={1}
                  value={artigoFim}
                  onChange={(e) => setArtigoFim(Number(e.target.value))}
                  disabled={executando}
                  placeholder="Ao art."
                  className="w-full p-2.5 rounded-xl border border-border bg-secondary/40 text-foreground text-center"
                />
              </div>
            </div>

            {/* Formato de Mecânica Pedagógica */}
            <div className="space-y-1.5">
              <label className="font-semibold text-foreground">Formato da Aula (Mecânica)</label>
              <select
                value={mecanicaSelecionada}
                onChange={(e) => setMecanicaSelecionada(e.target.value)}
                disabled={executando}
                className="w-full p-2.5 rounded-xl border border-border bg-secondary/40 text-foreground focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {MECANICAS_GERACAO.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.nome}
                  </option>
                ))}
              </select>
            </div>

          </div>

          {/* Botões de Ação */}
          <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
            <button
              onClick={handleTestarUnico}
              disabled={executando}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-secondary hover:bg-secondary/80 text-foreground text-xs font-bold transition-colors disabled:opacity-50"
            >
              <Eye className="w-4 h-4 text-blue-400" />
              <span>Testar 1 Artigo com IA (Prévia)</span>
            </button>

            <div className="flex items-center gap-2">
              {executando ? (
                <button
                  onClick={handleParar}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-destructive hover:bg-destructive/90 text-white text-xs font-bold transition-all shadow-md"
                >
                  <Square className="w-4 h-4" />
                  <span>Pausar Robô</span>
                </button>
              ) : (
                <button
                  onClick={handleIniciarLote}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold transition-all shadow-md shadow-blue-500/20"
                >
                  <Play className="w-4 h-4 fill-white" />
                  <span>Iniciar Geração em Lote (OmniRoute)</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Prévia do Resultado (se gerado) */}
        {resultadoPrevia && (
          <div className="rounded-2xl border border-teal-500/40 bg-card p-5 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-border/50">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-teal-400" />
                <h4 className="text-sm font-bold text-foreground">
                  Prévia da Aula Gerada: {resultadoPrevia.titulo_aula} ({resultadoPrevia.artigo})
                </h4>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-300">
                {resultadoPrevia.slides?.length || 0} Slides Gerados
              </span>
            </div>

            <p className="text-xs text-muted-foreground">
              <strong>Objetivo:</strong> {resultadoPrevia.objetivo}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {resultadoPrevia.slides?.map((slide: any, idx: number) => (
                <div key={idx} className="p-3 rounded-xl border border-border/60 bg-secondary/30 space-y-1.5 text-xs">
                  <span className="text-[10px] font-bold uppercase text-teal-400">
                    Slide {slide.ordem || idx + 1}: {slide.badge}
                  </span>
                  <h5 className="font-bold text-foreground">{slide.titulo}</h5>
                  <p className="text-muted-foreground leading-relaxed">{slide.texto_didatico}</p>
                  {slide.exemplo_cotidiano && (
                    <div className="p-2 rounded-lg bg-background/60 text-[11px] text-muted-foreground">
                      <strong>Exemplo:</strong> {slide.exemplo_cotidiano}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Card: Integração MCP Server & Google Gemini Spark */}
        <div className="rounded-2xl border border-teal-500/30 bg-gradient-to-br from-card via-card to-teal-950/20 p-5 space-y-4 shadow-md">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/60">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-teal-500/15 border border-teal-500/30 flex items-center justify-center text-teal-400 shrink-0">
                <Radio className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30 uppercase tracking-wider">
                    MCP Server
                  </span>
                  <span className="text-xs text-muted-foreground font-semibold">
                    Model Context Protocol
                  </span>
                </div>
                <h4 className="text-sm sm:text-base font-bold text-foreground">
                  Integração Google Gemini Spark (Imagens Automáticas & Storage)
                </h4>
              </div>
            </div>

            <button
              onClick={testarMcp}
              disabled={mcpTestando}
              className="px-3.5 py-1.5 rounded-xl border border-teal-500/40 bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 text-xs font-bold transition-all flex items-center justify-center gap-1.5 shrink-0"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${mcpTestando ? 'animate-spin' : ''}`} />
              <span>{mcpStatus === 'online' ? '✅ MCP Online' : mcpStatus === 'offline' ? '❌ Desconectado' : 'Testar Servidor'}</span>
            </button>
          </div>

          <p className="text-xs text-muted-foreground leading-relaxed">
            O <strong>Google Gemini Spark</strong> conecta-se diretamente a este servidor MCP para ler os prompts gerados pelo OmniRoute, sintetizar ilustrações via <strong>Imagen 3</strong> e subir os arquivos no <strong>Supabase Storage</strong> (<code>aprender-leis-imagens</code>).
          </p>

          {/* Endpoint SSE e Instruções */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="p-3 rounded-xl border border-border/70 bg-background/60 space-y-1.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block">
                Endpoint SSE para o Spark:
              </span>
              <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-secondary/50 font-mono text-[11px] text-foreground">
                <span className="truncate">http://localhost:3333/sse</span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText('http://localhost:3333/sse');
                    toast.success('URL do MCP copiada!');
                  }}
                  className="p-1 hover:text-teal-400 transition-colors shrink-0"
                  title="Copiar URL"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>
              <span className="text-[10px] text-muted-foreground block">
                💡 Em produção ou agentes na nuvem, exponha via túnel: <code>npx localtunnel --port 3333</code>
              </span>
            </div>

            <div className="p-3 rounded-xl border border-border/70 bg-background/60 space-y-1.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block">
                Ferramentas (Tools) Expostas ao Spark:
              </span>
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-secondary text-foreground font-mono">
                  listar_prompts_pendentes
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-secondary text-foreground font-mono">
                  obter_prompt_slide
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-secondary text-foreground font-mono">
                  upload_imagem_gerada
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-secondary text-foreground font-mono">
                  salvar_url_imagem
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Terminal de Logs em Tempo Real */}
        <div className="rounded-2xl border border-border/90 bg-neutral-950 p-4 space-y-3 shadow-lg">
          <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-bold text-neutral-300 uppercase tracking-wider font-mono">
                Terminal de Logs OmniRoute
              </span>
            </div>
            {executando && (
              <span className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-mono">
                <RefreshCw className="w-3 h-3 animate-spin" />
                Processando...
              </span>
            )}
          </div>

          {/* Barra de Progresso do Lote */}
          {progresso.total > 0 && (
            <div className="space-y-1 font-mono text-[11px]">
              <div className="flex justify-between text-neutral-400">
                <span>Progresso: {progresso.concluidos} de {progresso.total}</span>
                <span>{Math.round((progresso.concluidos / progresso.total) * 100)}%</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-neutral-800 overflow-hidden">
                <div 
                  className="h-full bg-emerald-400 transition-all duration-300"
                  style={{ width: `${(progresso.concluidos / progresso.total) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* Área de Linhas do Terminal */}
          <div className="max-h-60 overflow-y-auto space-y-1 font-mono text-[11px] pr-2">
            {logs.map(log => (
              <div key={log.id} className="flex items-start gap-2">
                <span className="text-neutral-500 shrink-0">[{log.hora}]</span>
                <span className={`leading-relaxed ${
                  log.tipo === 'sucesso' 
                    ? 'text-emerald-400' 
                    : log.tipo === 'erro' 
                    ? 'text-rose-400' 
                    : log.tipo === 'aviso' 
                    ? 'text-amber-400' 
                    : 'text-neutral-300'
                }`}>
                  {log.mensagem}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Link para o Laboratório */}
        <div className="p-4 rounded-xl border border-border/60 bg-secondary/20 flex items-center justify-between text-xs text-muted-foreground">
          <span>Quer testar as mecânicas antes de gerar em lote?</span>
          <button
            onClick={() => navigate('/admin-aprender-leis/laboratorio')}
            className="px-3 py-1.5 rounded-lg border border-border hover:bg-secondary text-foreground font-semibold transition-colors"
          >
            Ir para o Laboratório
          </button>
        </div>

      </div>
    </DesktopPageLayout>
  );
};

export default AdminAprenderLeisCriar;
