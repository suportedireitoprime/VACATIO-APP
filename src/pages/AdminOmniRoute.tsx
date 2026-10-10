import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/vademecum/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { PremiumMarkdown } from '@/components/ui/PremiumMarkdown';
import { ShapeGrid } from '@/components/ui/ShapeGrid';
import { toast } from 'sonner';
import {
  Sparkles,
  Type,
  ImageIcon,
  Send,
  Loader2,
  CheckCircle2,
  XCircle,
  Copy,
  RefreshCw,
  ExternalLink,
  Download,
  Eye,
  Settings,
  Cpu,
  Clock,
  Layers,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  SlidersHorizontal,
  Bot,
  Mic,
  Square,
  FileAudio,
  Volume2,
  Upload,
  ArrowRight,
  BookOpen,
  FileText,
  Zap,
  Play,
  AlertCircle,
  MessageSquare,
  X,
  PhoneCall
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AI_FEATURES_REGISTRY,
  getAiFeaturesRouting,
  updateAiFeatureConfig,
  executeAiTask,
  getOmniRouteApiKey,
  AiFeatureKey,
  AiFeatureDefinition,
  AiProviderType
} from '@/services/aiGatewayService';

const STORAGE_KEYS = {
  BASE_URL: 'omniroute_test_base_url',
  API_KEY: 'omniroute_test_api_key',
  LAST_MODEL: 'omniroute_test_model',
};

const DEFAULT_BASE_URL = 'https://omniroute-production-fb57.up.railway.app/v1';
const DEFAULT_API_KEY = 'sk-03fcfd719bf0cc25-19fbd7-028392e5';

export interface AntigravityModelInfo {
  id: string;
  name: string;
  group: 'Google Gemini' | 'Anthropic Claude' | 'OpenAI GPT';
}

const ANTIGRAVITY_TEXT_MODELS: AntigravityModelInfo[] = [
  // Google Gemini
  { id: 'antigravity/gemini-3.8-flash', name: 'Gemini 3.8 Flash (Última Geração)', group: 'Google Gemini' },
  { id: 'antigravity/gemini-3.7-flash-high', name: 'Gemini 3.7 Flash High (Recomendado)', group: 'Google Gemini' },
  { id: 'antigravity/gemini-3.7-flash-thinking', name: 'Gemini 3.7 Flash Thinking (Raciocínio Profundo)', group: 'Google Gemini' },
  { id: 'antigravity/gemini-3.6-flash', name: 'Gemini 3.6 Flash (Velocidade & Precisão)', group: 'Google Gemini' },
  { id: 'antigravity/gemini-3.1-pro-low', name: 'Gemini 3.1 Pro (Precisão Jurídica)', group: 'Google Gemini' },
  { id: 'antigravity/gemini-pro-agent', name: 'Gemini Pro Agent (Agente Autônomo)', group: 'Google Gemini' },
  // Anthropic Claude
  { id: 'antigravity/claude-sonnet-4-6', name: 'Claude 3.7 Sonnet / 4.6 (Redação e Análise)', group: 'Anthropic Claude' },
  { id: 'antigravity/claude-opus-4-6-thinking', name: 'Claude Opus 4.6 Thinking (Raciocínio Avançado)', group: 'Anthropic Claude' },
  // OpenAI GPT
  { id: 'antigravity/gpt-4o', name: 'GPT-4o (Omni Multimodal)', group: 'OpenAI GPT' },
  { id: 'antigravity/gpt-o3-mini', name: 'GPT-o3-mini (Raciocínio Eficiente)', group: 'OpenAI GPT' },
  { id: 'antigravity/gpt-o1', name: 'GPT-o1 (Lógica Complexa)', group: 'OpenAI GPT' },
];

const POPULAR_IMAGE_MODELS = [
  'antigravity/gemini-3.1-flash-image',
  'dall-e-3',
  'imagen-3.0-generate-002',
];

const POPULAR_AUDIO_MODELS = [
  'antigravity/gemini-3.7-flash-high',
  'antigravity/gemini-3.8-flash',
  'whisper-1',
];

interface FeatureStyle {
  iconBg: string;
  iconBorder: string;
  iconColor: string;
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
  accentHex: string;
}

const FEATURE_STYLES: Record<string, FeatureStyle> = {
  // 1. Chat Jurídico / Me Explique / Mentor: Azul Tecnológico / Royal Blue
  chat_juridico: {
    iconBg: 'bg-[#3B82F6]/15',
    iconBorder: 'border-[#3B82F6]/35',
    iconColor: 'text-[#60A5FA]',
    badgeBg: 'bg-[#3B82F6]/15',
    badgeBorder: 'border-[#3B82F6]/30',
    badgeText: 'text-[#93C5FD]',
    accentHex: '#3B82F6',
  },
  // 2. Resumos Inteligentes & Sínteses: Laranja / Âmbar Quente
  resumo_inteligente: {
    iconBg: 'bg-[#F97316]/15',
    iconBorder: 'border-[#F97316]/35',
    iconColor: 'text-[#FB923C]',
    badgeBg: 'bg-[#F97316]/15',
    badgeBorder: 'border-[#F97316]/30',
    badgeText: 'text-[#FDBA74]',
    accentHex: '#F97316',
  },
  // 3. Visão Computacional & OCR de Documentos: Violeta / Roxo
  visao_documentos: {
    iconBg: 'bg-[#8B5CF6]/15',
    iconBorder: 'border-[#8B5CF6]/35',
    iconColor: 'text-[#A78BFA]',
    badgeBg: 'bg-[#8B5CF6]/15',
    badgeBorder: 'border-[#8B5CF6]/30',
    badgeText: 'text-[#C4B5FD]',
    accentHex: '#8B5CF6',
  },
  // 4. Transcrição de Áudio (Speech-to-Text): Esmeralda / Verde Neon
  transcricao_audio: {
    iconBg: 'bg-[#10B981]/15',
    iconBorder: 'border-[#10B981]/35',
    iconColor: 'text-[#34D399]',
    badgeBg: 'bg-[#10B981]/15',
    badgeBorder: 'border-[#10B981]/30',
    badgeText: 'text-[#6EE7B7]',
    accentHex: '#10B981',
  },
  // 5. Geração de Imagens & Capas Editoriais: Rosa / Magenta Vibrante
  geracao_imagens: {
    iconBg: 'bg-[#EC4899]/15',
    iconBorder: 'border-[#EC4899]/35',
    iconColor: 'text-[#F472B6]',
    badgeBg: 'bg-[#EC4899]/15',
    badgeBorder: 'border-[#EC4899]/30',
    badgeText: 'text-[#F9A8D4]',
    accentHex: '#EC4899',
  },
  // 6. Narração de Leis e Artigos (TTS): Ciano / Turquesa
  narracao_vademecum: {
    iconBg: 'bg-[#06B6D4]/15',
    iconBorder: 'border-[#06B6D4]/35',
    iconColor: 'text-[#22D3EE]',
    badgeBg: 'bg-[#06B6D4]/15',
    badgeBorder: 'border-[#06B6D4]/30',
    badgeText: 'text-[#67E8F9]',
    accentHex: '#06B6D4',
  },
  // 7. Horus WhatsApp: Verde Esmeralda (WhatsApp)
  horus_whatsapp: {
    iconBg: 'bg-[#22C55E]/15',
    iconBorder: 'border-[#22C55E]/35',
    iconColor: 'text-[#4ADE80]',
    badgeBg: 'bg-[#22C55E]/15',
    badgeBorder: 'border-[#22C55E]/30',
    badgeText: 'text-[#86EFAC]',
    accentHex: '#22C55E',
  },
  // 8. Ligação Live: Vermelho Rosa
  ligacao_live: {
    iconBg: 'bg-[#F43F5E]/15',
    iconBorder: 'border-[#F43F5E]/35',
    iconColor: 'text-[#FB7185]',
    badgeBg: 'bg-[#F43F5E]/15',
    badgeBorder: 'border-[#F43F5E]/30',
    badgeText: 'text-[#FDA4AF]',
    accentHex: '#F43F5E',
  },
};

export default function AdminOmniRoute() {
  const navigate = useNavigate();

  // Conexão
  const [baseUrl, setBaseUrl] = useState(() => localStorage.getItem(STORAGE_KEYS.BASE_URL) || DEFAULT_BASE_URL);
  const [apiKey, setApiKey] = useState(() => localStorage.getItem(STORAGE_KEYS.API_KEY) || DEFAULT_API_KEY);
  const [connStatus, setConnStatus] = useState<'idle' | 'checking' | 'connected' | 'error'>('idle');
  const [connError, setConnError] = useState<string | null>(null);
  const [availableModels, setAvailableModels] = useState<string[]>(() =>
    ANTIGRAVITY_TEXT_MODELS.map((m) => m.id)
  );
  const [showConfig, setShowConfig] = useState(false);

  // Busca a key do Supabase caso o usuário não tenha sobrescrito manualmente
  useEffect(() => {
    async function loadKey() {
      const stored = localStorage.getItem(STORAGE_KEYS.API_KEY);
      if (!stored) {
        const key = await getOmniRouteApiKey();
        if (key && key !== DEFAULT_API_KEY) {
          setApiKey(key);
        }
      }
    }
    loadKey();
  }, []);

  // Tab Principal de Alternância ('texto' | 'imagem' | 'visao' | 'audio')
  type MainTabType = 'texto' | 'imagem' | 'visao' | 'audio';
  const [mainTab, setMainTab] = useState<MainTabType>('texto');

  // Tab Texto
  const [textModel, setTextModel] = useState(() => localStorage.getItem(STORAGE_KEYS.LAST_MODEL) || 'antigravity/gemini-3.7-flash-high');
  const [textPrompt, setTextPrompt] = useState('Explique de forma concisa e didática o princípio da dignidade da pessoa humana para um estudante de direito, destacando base constitucional e jurisprudência.');
  const [textSystem, setTextSystem] = useState('Você é um jurista e tutor de alta precisão do Vade Mecum Prime. Utilize formatação rica em Markdown (negritos, listas e títulos claros).');
  const [temperature, setTemperature] = useState(0.7);
  const [textLoading, setTextLoading] = useState(false);
  const [textResponse, setTextResponse] = useState<string | null>(null);
  const [textMeta, setTextMeta] = useState<{ durationMs: number; tokens?: { prompt: number; completion: number; total: number }; raw?: unknown } | null>(null);

  // Tab Imagem (Geração)
  const [imagePrompt, setImagePrompt] = useState('Balança da justiça dourada reluzente sobre pedestal de mármore e livros clássicos de direito, iluminação cinematográfica dramática, 8k ultra detalhado');
  const [imageModel, setImageModel] = useState('antigravity/gemini-3.1-flash-image');
  const [imageSize, setImageSize] = useState('1024x1024');
  const [imageLoading, setImageLoading] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageMeta, setImageMeta] = useState<{ durationMs: number } | null>(null);

  // Tab Visão (Análise Multimodal & OCR)
  const [visionImageBase64, setVisionImageBase64] = useState<string | null>(null);
  const [visionPrompt, setVisionPrompt] = useState('Descreva os elementos jurídicos e visuais presentes nesta imagem.');
  const [visionModel, setVisionModel] = useState('antigravity/gemini-3.7-flash-high');
  const [visionLoading, setVisionLoading] = useState(false);
  const [visionResponse, setVisionResponse] = useState<string | null>(null);

  // Tab Áudio (Gravação & Transcrição)
  const [audioModel, setAudioModel] = useState('whisper-1');
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioFileName, setAudioFileName] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [audioLoading, setAudioLoading] = useState(false);
  const [audioTranscription, setAudioTranscription] = useState<string | null>(null);
  const [audioMeta, setAudioMeta] = useState<{ durationMs: number } | null>(null);
  const timerRef = React.useRef<NodeJS.Timeout | null>(null);
  const audioChunksRef = React.useRef<Blob[]>([]);

  // Central de Roteamento de IA por Função (Preferência 1: OmniRoute)
  const [routingConfigs, setRoutingConfigs] = useState(() => getAiFeaturesRouting());
  const [featureTestResults, setFeatureTestResults] = useState<Record<string, {
    loading?: boolean;
    response?: string;
    imageUrl?: string;
    durationMs?: number;
    error?: string;
    modelUsed?: string;
    providerUsed?: string;
  }>>({});

  // Estados para Bottom Sheets de 95%
  const [selectedFeature, setSelectedFeature] = useState<AiFeatureDefinition | null>(null);
  const [showOmniRouteTestSheet, setShowOmniRouteTestSheet] = useState(false);

  const handleFeatureProviderChange = (featureKey: AiFeatureKey, provider: AiProviderType) => {
    updateAiFeatureConfig(featureKey, { provider });
    setRoutingConfigs(getAiFeaturesRouting());
    toast.success(`Função atualizada para ${provider === 'omniroute' ? 'OmniRoute (Principal)' : 'Chave Própria Gemini'}!`);
  };

  const handleFeatureModelChange = (featureKey: AiFeatureKey, modelId: string) => {
    updateAiFeatureConfig(featureKey, { selectedModel: modelId });
    setRoutingConfigs(getAiFeaturesRouting());
    toast.success(`Modelo selecionado: ${modelId}`);
  };

  const handleTestFeatureCard = async (feature: AiFeatureDefinition) => {
    if (feature.ttsOnly) {
      toast.info('Narração dos artigos mantida 100% no Motor Nativo / Gemini TTS.', {
        description: 'OmniRoute não possui geração de fala.',
      });
      return;
    }

    setFeatureTestResults(prev => ({
      ...prev,
      [feature.key]: { loading: true }
    }));

    try {
      const res = await executeAiTask({
        featureKey: feature.key,
        prompt: feature.samplePrompt,
        systemPrompt: 'Você é um jurista e tutor de alta precisão do Vade Mecum Prime. Seja didático, conciso e estruturado.',
      });

      setFeatureTestResults(prev => ({
        ...prev,
        [feature.key]: {
          loading: false,
          response: res.text,
          imageUrl: res.imageUrl,
          durationMs: res.durationMs,
          modelUsed: res.modelUsed,
          providerUsed: res.providerUsed,
        }
      }));
      addLog(feature.title.split('/')[0].trim(), res.modelUsed, res.durationMs, 200);
      toast.success(`Teste de ${feature.title.split('/')[0]} concluído em ${res.durationMs}ms!`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setFeatureTestResults(prev => ({
        ...prev,
        [feature.key]: {
          loading: false,
          error: msg,
        }
      }));
      toast.error(`Erro no teste: ${msg}`);
    }
  };

  // Histórico de requisições
  const [logs, setLogs] = useState<Array<{ id: string; time: string; type: string; model: string; duration: number; status: number | string }>>([]);

  const saveConnection = (newUrl: string, newKey: string) => {
    const cleanUrl = newUrl.trim().replace(/\/+$/, '');
    setBaseUrl(cleanUrl);
    setApiKey(newKey.trim());
    localStorage.setItem(STORAGE_KEYS.BASE_URL, cleanUrl);
    localStorage.setItem(STORAGE_KEYS.API_KEY, newKey.trim());
    toast.success('Configurações salvas localmente');
  };

  const addLog = (type: string, model: string, duration: number, status: number | string) => {
    setLogs((prev) => [
      {
        id: Math.random().toString(36).substring(7),
        time: new Date().toLocaleTimeString(),
        type,
        model,
        duration,
        status,
      },
      ...prev.slice(0, 9),
    ]);
  };

  const checkConnection = useCallback(async () => {
    setConnStatus('checking');
    setConnError(null);
    const start = performance.now();

    try {
      const cleanUrl = baseUrl.trim().replace(/\/+$/, '');
      const res = await fetch(`${cleanUrl}/models`, {
        headers: {
          'Authorization': `Bearer ${apiKey.trim()}`,
        },
      });

      const elapsed = Math.round(performance.now() - start);

      if (!res.ok) {
        const errorText = await res.text().catch(() => '');
        throw new Error(`HTTP ${res.status}: ${errorText || res.statusText}`);
      }

      const data = await res.json();
      const rawList: string[] = Array.isArray(data?.data)
        ? data.data.map((m: { id: string }) => m.id).filter(Boolean)
        : [];

      // Filtra estritamente os modelos com prefixo antigravity/
      const remoteAntigravity = rawList.filter((m) =>
        m.toLowerCase().startsWith('antigravity/')
      );

      // Combina com os modelos canônicos do Antigravity sem duplicatas
      const combined = Array.from(
        new Set([
          ...ANTIGRAVITY_TEXT_MODELS.map((m) => m.id),
          ...remoteAntigravity,
        ])
      );

      setAvailableModels(combined);
      setConnStatus('connected');
      toast.success(`OmniRoute conectado (${combined.length} modelos Antigravity)!`);

      if (combined.length > 0 && !combined.includes(textModel)) {
        const found = combined.find((m) => m === 'antigravity/gemini-3.7-flash-high') || combined[0];
        setTextModel(found);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setConnStatus('error');
      setConnError(msg);
      toast.error(`Falha ao conectar no OmniRoute: ${msg}`);
    }
  }, [baseUrl, apiKey, textModel]);

  useEffect(() => {
    void checkConnection();
  }, [checkConnection]);

  // 1. Executar Teste de Texto
  const handleRunTextTest = async () => {
    if (!textPrompt.trim()) {
      toast.error('Digite um prompt para testar');
      return;
    }

    setTextLoading(true);
    setTextResponse(null);
    setTextMeta(null);
    const start = performance.now();

    try {
      const cleanUrl = baseUrl.trim().replace(/\/+$/, '');
      const messages: Array<{ role: string; content: string }> = [];
      if (textSystem.trim()) {
        messages.push({ role: 'system', content: textSystem.trim() });
      }
      messages.push({ role: 'user', content: textPrompt.trim() });

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000); // 20s timeout

      const res = await fetch(`${cleanUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey.trim()}`,
        },
        body: JSON.stringify({
          model: textModel,
          messages,
          temperature,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const elapsed = Math.round(performance.now() - start);

      if (!res.ok) {
        const errorText = await res.text().catch(() => '');
        let parsedMsg = errorText;
        try {
          const parsed = JSON.parse(errorText);
          parsedMsg = parsed?.error?.message || errorText;
        } catch {}
        addLog('Texto', textModel, elapsed, res.status);
        throw new Error(parsedMsg || `HTTP ${res.status}: ${res.statusText}`);
      }

      const data = await res.json();
      const content = data?.choices?.[0]?.message?.content || 'Sem resposta de texto.';
      const usage = data?.usage;

      setTextResponse(content);
      setTextMeta({
        durationMs: elapsed,
        tokens: usage
          ? {
              prompt: usage.prompt_tokens || 0,
              completion: usage.completion_tokens || 0,
              total: usage.total_tokens || 0,
            }
          : undefined,
        raw: data,
      });

      addLog('Texto', textModel, elapsed, 200);
      toast.success(`Resposta gerada em ${elapsed}ms!`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setTextResponse(`❌ **Erro na execução:**\n\`\`\`\n${msg}\n\`\`\``);
      toast.error(`Erro: ${msg}`);
    } finally {
      setTextLoading(false);
    }
  };

  // 2. Executar Teste de Imagem (Geração)
  const handleRunImageGeneration = async () => {
    if (!imagePrompt.trim()) {
      toast.error('Descreva a imagem que deseja gerar');
      return;
    }

    setImageLoading(true);
    setImageUrl(null);
    setImageMeta(null);
    const start = performance.now();

    try {
      const cleanUrl = baseUrl.trim().replace(/\/+$/, '');
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000); // 20s timeout

      const res = await fetch(`${cleanUrl}/images/generations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey.trim()}`,
        },
        body: JSON.stringify({
          model: imageModel,
          prompt: imagePrompt.trim(),
          n: 1,
          size: imageSize,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const elapsed = Math.round(performance.now() - start);

      if (!res.ok) {
        const errorText = await res.text().catch(() => '');
        let parsedMsg = errorText;
        try {
          const parsed = JSON.parse(errorText);
          parsedMsg = parsed?.error?.message || errorText;
        } catch {}
        addLog('Imagem Gerada', imageModel, elapsed, res.status);
        throw new Error(parsedMsg || `HTTP ${res.status}: ${res.statusText}`);
      }

      const data = await res.json();
      const generatedUrl = data?.data?.[0]?.url || (data?.data?.[0]?.b64_json ? `data:image/jpeg;base64,${data.data[0].b64_json}` : null);

      if (!generatedUrl) {
        throw new Error('Nenhuma URL ou base64 retornada pela API.');
      }

      setImageUrl(generatedUrl);
      setImageMeta({ durationMs: elapsed });
      addLog('Imagem Gerada', imageModel, elapsed, 200);
      toast.success(`Imagem gerada em ${elapsed}ms!`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`Erro ao gerar imagem: ${msg}`);
    } finally {
      setImageLoading(false);
    }
  };

  // 3. Executar Análise de Visão
  const handleVisionImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Por favor, selecione um arquivo de imagem válido.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setVisionImageBase64(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleRunVisionAnalysis = async () => {
    if (!visionImageBase64) {
      toast.error('Carregue uma imagem para analisar.');
      return;
    }
    if (!visionPrompt.trim()) {
      toast.error('Digite uma pergunta ou instrução sobre a imagem.');
      return;
    }

    setVisionLoading(true);
    setVisionResponse(null);
    const start = performance.now();

    try {
      const cleanUrl = baseUrl.trim().replace(/\/+$/, '');
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000); // 20s timeout

      const res = await fetch(`${cleanUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey.trim()}`,
        },
        body: JSON.stringify({
          model: visionModel,
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: visionPrompt.trim() },
                { type: 'image_url', image_url: { url: visionImageBase64 } },
              ],
            },
          ],
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const elapsed = Math.round(performance.now() - start);

      if (!res.ok) {
        const errorText = await res.text().catch(() => '');
        addLog('Visão', visionModel, elapsed, res.status);
        throw new Error(`HTTP ${res.status}: ${errorText || res.statusText}`);
      }

      const data = await res.json();
      const content = data?.choices?.[0]?.message?.content || 'Sem análise gerada.';
      setVisionResponse(content);
      addLog('Visão', visionModel, elapsed, 200);
      toast.success(`Análise visual concluída em ${elapsed}ms!`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setVisionResponse(`❌ **Erro na análise visual:**\n\`\`\`\n${msg}\n\`\`\``);
      toast.error(`Erro: ${msg}`);
    } finally {
      setVisionLoading(false);
    }
  };

  // Funções de Áudio (Gravação & Transcrição)
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  const startRecording = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        toast.error('Navegador não possui suporte a microfone.');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const mime = recorder.mimeType || 'audio/webm';
        const blob = new Blob(audioChunksRef.current, { type: mime });
        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        setAudioFileName(`gravacao_${Date.now()}.webm`);
        stream.getTracks().forEach((track) => track.stop());
      };

      recorder.start(250);
      setMediaRecorder(recorder);
      setIsRecording(true);
      setRecordingSeconds(0);

      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
      toast.info('Gravando microfone... Fale com clareza.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`Acesso ao microfone negado: ${msg}`);
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      toast.success('Gravação finalizada!');
    }
  };

  const handleAudioFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('audio/') && !file.name.match(/\.(mp3|wav|m4a|ogg|webm|flac|aac)$/i)) {
      toast.error('Selecione um arquivo de áudio válido (.mp3, .wav, .m4a, .ogg, .webm)');
      return;
    }

    setAudioBlob(file);
    setAudioFileName(file.name);
    const url = URL.createObjectURL(file);
    setAudioUrl(url);
    toast.success(`Áudio "${file.name}" carregado!`);
  };

  const handleTranscribeAudio = async () => {
    if (!audioBlob) {
      toast.error('Grave um áudio ou selecione um arquivo de áudio primeiro.');
      return;
    }

    if (audioBlob.size > 15 * 1024 * 1024) {
      toast.error('O arquivo é muito grande! O limite para a transcrição via Base64 inline é de 15MB. Por favor, grave um áudio mais curto ou corte o arquivo.');
      return;
    }

    setAudioLoading(true);
    setAudioTranscription(null);
    const start = performance.now();

    try {
      const cleanUrl = baseUrl.trim().replace(/\/+$/, '');
      const formData = new FormData();
      const ext = audioBlob.type.includes('webm') ? 'webm' : audioBlob.type.includes('mp3') ? 'mp3' : 'wav';
      const fileToSend = new File([audioBlob], audioFileName || `audio_${Date.now()}.${ext}`, { type: audioBlob.type || 'audio/webm' });
      formData.append('file', fileToSend);
      formData.append('model', audioModel);

      let res;
      let directFailed = false;
      try {
        res = await fetch(`${cleanUrl}/audio/transcriptions`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey.trim()}`,
          },
          body: formData,
        });
        if (!res.ok) directFailed = true;
      } catch (err) {
        directFailed = true;
      }

      // Se o endpoint direto de audio falhar (ex: por erro de CORS, rota inexistente no backend, ou modelo incompatível),
      // faz fallback automático para /chat/completions enviando o áudio em base64!
      if (directFailed) {
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve, reject) => {
          reader.onloadend = () => {
            const base64 = (reader.result as string).split(',')[1];
            resolve(base64);
          };
          reader.onerror = reject;
        });
        reader.readAsDataURL(audioBlob);
        const base64Audio = await base64Promise;

        let chatRes;
        try {
          chatRes = await fetch(`${cleanUrl}/chat/completions`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${apiKey.trim()}`,
            },
            body: JSON.stringify({
              model: audioModel.includes('gemini') ? audioModel : 'antigravity/gemini-3.7-flash-high',
              messages: [
                {
                  role: 'user',
                  content: [
                    {
                      type: 'text',
                      text: 'Transcreva este áudio fielmente para texto em português do Brasil com pontuação rigorosa e estruturação em parágrafos claros. Retorne exclusivamente a transcrição do áudio.',
                    },
                    {
                      type: 'input_audio',
                      input_audio: {
                        data: base64Audio,
                        format: ext,
                      },
                    },
                  ],
                },
              ],
            }),
          });
        } catch (fallbackErr: any) {
           throw new Error(`A conexão caiu (Failed to fetch). Isso geralmente ocorre se o arquivo for muito pesado para o servidor (Payload Too Large) ou bloqueio de CORS. Erro original: ${fallbackErr.message}`);
        }

        if (!chatRes.ok) {
          const errText = await chatRes.text().catch(() => '');
          throw new Error(`Fallback HTTP ${chatRes.status} / ${errText}`);
        }

        const chatData = await chatRes.json();
        const content = chatData?.choices?.[0]?.message?.content || 'Áudio processado sem texto.';
        const elapsed = Math.round(performance.now() - start);
        setAudioTranscription(content);
        setAudioMeta({ durationMs: elapsed });
        addLog('Áudio', audioModel, elapsed, 200);
        toast.success(`Transcrição concluída em ${elapsed}ms!`);
        return;
      }

      const data = await res!.json();
      const content = data?.text || data?.transcription || JSON.stringify(data);
      const elapsed = Math.round(performance.now() - start);
      setAudioTranscription(content);
      setAudioMeta({ durationMs: elapsed });
      addLog('Áudio', audioModel, elapsed, 200);
      toast.success(`Transcrição concluída em ${elapsed}ms!`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setAudioTranscription(`❌ **Erro na transcrição:**\n\`\`\`\n${msg}\n\`\`\``);
      toast.error(`Erro na transcrição: ${msg}`);
    } finally {
      setAudioLoading(false);
    }
  };

  const useTranscriptionInChat = () => {
    if (!audioTranscription) return;
    setTextPrompt(audioTranscription);
    setMainTab('texto');
    toast.success('Transcrição enviada para o Teste de Texto!');
  };

  const copyToClipboard = (text: string) => {
    void navigator.clipboard.writeText(text);
    toast.success('Copiado para a área de transferência!');
  };

  return (
    <div className="relative min-h-screen bg-[#0D0D0D] text-white flex flex-col antialiased overflow-hidden">
      <div className="absolute inset-0 pointer-events-none z-0">
        <ShapeGrid />
      </div>
      
      <div className="relative z-10 flex flex-col min-h-screen w-full">
        <PageHeader
          title={
            <div className="flex items-center justify-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-400" />
              <span className="!font-sans !font-semibold tracking-normal text-base sm:text-lg text-white normal-case">
                Teste OmniRoute
              </span>
            </div>
          }
          subtitle="Gateway de Inteligência Artificial: Texto e Imagem com auto-fallback"
          onBack={() => navigate('/admin-funcoes')}
          variant="dark"
        />

        {/* Conteúdo Fluido - Margens amplas e responsivas sem aperto lateral */}
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4 pb-24">
        {/* Barra de Status e Conexão */}
        <Card className="bg-[#141416] border-white/10 text-white shadow-2xl rounded-2xl overflow-hidden">
          <CardHeader className="py-3.5 px-4 sm:px-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 flex-wrap">
                <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                  <Cpu className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="!font-sans text-sm sm:text-base font-semibold text-white tracking-normal normal-case">
                      Gateway OmniRoute
                    </h2>
                    {connStatus === 'connected' && (
                      <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 !font-sans font-medium text-[11px] px-2 py-0.5">
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                        Online ({availableModels.length} modelos Antigravity)
                      </Badge>
                    )}
                    {connStatus === 'checking' && (
                      <Badge className="bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[11px] px-2 py-0.5">
                        <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                        Conectando...
                      </Badge>
                    )}
                    {connStatus === 'error' && (
                      <Badge className="bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[11px] px-2 py-0.5">
                        <XCircle className="w-3.5 h-3.5 mr-1" />
                        Offline
                      </Badge>
                    )}
                  </div>
                  <p className="text-[11px] text-white/50 font-mono mt-0.5 truncate max-w-xs sm:max-w-md">
                    {baseUrl}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowConfig(!showConfig)}
                  className="border-white/15 bg-white/5 hover:bg-white/10 text-white text-xs gap-1.5 h-9 rounded-xl transition-all"
                >
                  <Settings className="w-3.5 h-3.5 text-white/70" />
                  {showConfig ? 'Ocultar' : 'Configurar'}
                  {showConfig ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={checkConnection}
                  disabled={connStatus === 'checking'}
                  className="bg-amber-500 hover:bg-amber-600 text-black font-semibold text-xs gap-1.5 h-9 rounded-xl shadow-lg shadow-amber-500/20 transition-all"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${connStatus === 'checking' ? 'animate-spin' : ''}`} />
                  Testar Conexão
                </Button>
              </div>
            </div>

            {connError && (
              <div className="text-xs text-rose-400 mt-3 bg-rose-950/40 p-3 rounded-xl border border-rose-800/40 break-all flex items-start gap-2">
                <XCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                <span>{connError}</span>
              </div>
            )}
          </CardHeader>

          {showConfig && (
            <CardContent className="pt-0 px-4 sm:px-6 pb-4 border-t border-white/5 space-y-4 mt-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3">
                <div className="space-y-1.5">
                  <label className="text-xs text-white/70 font-medium">Base URL (Endpoint)</label>
                  <Input
                    value={baseUrl}
                    onChange={(e) => setBaseUrl(e.target.value)}
                    placeholder="https://sua-url.up.railway.app/v1"
                    className="bg-black/50 border-white/10 text-xs font-mono h-10 rounded-xl"
                  />
                  <p className="text-[11px] text-white/40">URL pública gerada no Railway terminando em /v1</p>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-white/70 font-medium">Chave de API (OmniRoute API Key)</label>
                  <Input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="sk-..."
                    className="bg-black/50 border-white/10 text-xs font-mono h-10 rounded-xl"
                  />
                  <p className="text-[11px] text-white/40">Token gerado no menu API Keys do OmniRoute</p>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => saveConnection(baseUrl, apiKey)}
                  className="border-white/15 bg-white/5 text-xs h-9 rounded-xl"
                >
                  Salvar Conexão
                </Button>
              </div>
            </CardContent>
          )}
        </Card>

        {/* ============================================================== */}
        {/* 1. PRIMEIRA FUNÇÃO EM LISTA: TESTAR OMNIROUTE */}
        {/* ============================================================== */}
        <div className="pt-1">
          <div className="bg-[#141416] hover:bg-[#18181c] border border-[#F59E0B]/35 hover:border-[#F59E0B]/50 rounded-2xl shadow-xl shadow-black/40 transition-all">
            <button
              type="button"
              onClick={() => setShowOmniRouteTestSheet(true)}
              className="w-full flex items-center justify-between gap-2 sm:gap-3 p-3.5 sm:p-4 text-left group cursor-pointer"
            >
              <div className="flex items-center gap-3.5 min-w-0 w-full sm:flex-1">
                <div className="w-10 h-10 rounded-xl bg-[#F59E0B]/15 border border-[#F59E0B]/35 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-md shadow-[#F59E0B]/10">
                  <Sparkles className="w-5 h-5 text-[#FBBF24]" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="!font-sans text-[13px] sm:text-sm font-semibold text-white tracking-normal normal-case group-hover:text-[#FBBF24] transition-colors leading-tight break-words">
                      Testar OmniRoute
                    </h3>
                    <span className="!font-sans text-[10px] sm:text-[11px] font-semibold px-2 py-0.5 rounded bg-[#F59E0B]/15 text-[#FBBF24] border border-[#F59E0B]/30 whitespace-nowrap shadow-sm">
                      Sandbox de IA
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 shrink-0">
                <span className="!font-sans text-[11px] text-[#FBBF24] font-medium hidden sm:inline">
                  Abrir Testes
                </span>
                <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:text-[#FBBF24] group-hover:translate-x-0.5 transition-all" />
              </div>
            </button>
          </div>
        </div>

        {/* ============================================================== */}
        {/* 2. TÍTULO E LISTA: FUNÇÕES DO APLICATIVO */}
        {/* ============================================================== */}
        <div className="space-y-4 pt-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="!font-sans text-base sm:text-lg font-bold text-white tracking-normal normal-case">
                Funções do Aplicativo
              </h3>
              <p className="!font-sans text-xs sm:text-[13px] text-zinc-400 mt-1">
                Toque em uma função para abrir as configurações (OmniRoute ou Chave Própria) e testar o modelo
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                AI_FEATURES_REGISTRY.forEach(f => {
                  if (!f.ttsOnly) updateAiFeatureConfig(f.key, { provider: 'omniroute' });
                });
                setRoutingConfigs(getAiFeaturesRouting());
                toast.success('Todas as funções de IA definidas para OmniRoute (Principal)!');
              }}
              className="border-[#F59E0B]/35 bg-[#F59E0B]/10 hover:bg-[#F59E0B]/20 text-[#FBBF24] text-xs h-8 px-3 rounded-xl font-medium hidden sm:flex !font-sans shrink-0"
            >
              <Zap className="w-3.5 h-3.5 mr-1 text-[#FBBF24]" />
              OmniRoute em Tudo
            </Button>
          </div>

          {/* CARDS INDIVIDUAIS BEM DISTRIBUÍDOS SEM ABREVIAÇÕES */}
          <div className="space-y-3 sm:space-y-3.5">
            {AI_FEATURES_REGISTRY.map((feature) => {
              const config = routingConfigs[feature.key] || {
                provider: feature.defaultProvider,
                selectedModel: feature.defaultModel,
              };
              const isOmni = config.provider === 'omniroute';
              const currentModel = feature.suggestedModels.find(m => m.id === config.selectedModel) || feature.suggestedModels[0];
              const style = FEATURE_STYLES[feature.key] || FEATURE_STYLES.chat_juridico;

              return (
                <div
                  key={feature.key}
                  className="bg-[#141416] hover:bg-[#18181c] border border-white/10 hover:border-white/20 rounded-2xl shadow-lg transition-all"
                >
                  <button
                    type="button"
                    onClick={() => setSelectedFeature(feature)}
                    className="w-full flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-3 p-3.5 sm:p-4 text-left group cursor-pointer"
                  >
                    <div className="flex items-center gap-3.5 min-w-0 w-full sm:flex-1">
                      <div className={`w-10 h-10 rounded-xl border shrink-0 flex items-center justify-center group-hover:scale-105 transition-transform shadow-md ${style.iconBg} ${style.iconBorder} ${style.iconColor}`}>
                        {feature.key === 'chat_juridico' && <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5" />}
                        {feature.key === 'resumo_inteligente' && <BookOpen className="w-4 h-4 sm:w-5 sm:h-5" />}
                        {feature.key === 'visao_documentos' && <Eye className="w-4 h-4 sm:w-5 sm:h-5" />}
                        {feature.key === 'transcricao_audio' && <Mic className="w-4 h-4 sm:w-5 sm:h-5" />}
                        {feature.key === 'geracao_imagens' && <ImageIcon className="w-4 h-4 sm:w-5 sm:h-5" />}
                        {feature.key === 'narracao_vademecum' && <Volume2 className="w-4 h-4 sm:w-5 sm:h-5" />}
                        {feature.key === 'horus_whatsapp' && <Bot className="w-4 h-4 sm:w-5 sm:h-5" />}
                        {feature.key === 'ligacao_live' && <PhoneCall className="w-4 h-4 sm:w-5 sm:h-5" />}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="!font-sans text-[13px] sm:text-sm font-semibold text-white group-hover:text-[#FBBF24] transition-colors tracking-normal normal-case leading-tight break-words">
                            {feature.title}
                          </h4>
                          <span className="!font-sans text-[10px] sm:text-[11px] text-zinc-500 font-medium shrink-0">
                            • {feature.category}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto shrink-0 mt-2 sm:mt-0 pl-[52px] sm:pl-0">
                      {feature.ttsOnly ? (
                        <span className="!font-sans text-[10px] sm:text-xs font-medium px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700 whitespace-nowrap">
                          Motor Nativo
                        </span>
                      ) : (
                        <div className="flex items-center sm:flex-col sm:items-end gap-2 sm:gap-0">
                          <span className={`!font-sans text-[10px] sm:text-[11px] font-semibold px-2 py-0.5 rounded whitespace-nowrap shadow-sm ${
                            isOmni
                              ? 'bg-[#F59E0B]/15 text-[#FBBF24] border border-[#F59E0B]/30'
                              : 'bg-zinc-800 text-zinc-300 border border-zinc-700'
                          }`}>
                            {isOmni ? '★ OmniRoute' : 'Chave Própria'}
                          </span>
                          <span className="text-[9px] sm:text-[10px] text-zinc-500 font-mono sm:mt-0.5 whitespace-nowrap">
                            {currentModel?.name.split('(')[0].trim()}
                          </span>
                        </div>
                      )}
                      <ChevronRight className="w-4 h-4 text-zinc-500 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* ============================================================== */}
        {/* BOTTOM SHEET 95%: CONFIGURAÇÃO MINIMALISTA DA FUNÇÃO SELECIONADA */}
        {/* ============================================================== */}
        <AnimatePresence>
          {selectedFeature && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setSelectedFeature(null)}
                className="fixed inset-0 bg-black/85 z-50"
              />
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 28, stiffness: 280 }}
                className="fixed inset-x-0 bottom-0 max-h-[95vh] h-[95vh] bg-[#121215] border-t border-white/10 rounded-t-3xl z-[60] flex flex-col shadow-2xl overflow-hidden"
              >
                {/* Puxador Central */}
                <div className="w-12 h-1.5 rounded-full bg-white/20 mx-auto mt-3 shrink-0" />

                {/* Header do Sheet */}
                <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-white/10 shrink-0">
                  <div className="flex items-center gap-3">
                    {(() => {
                      const sheetStyle = FEATURE_STYLES[selectedFeature.key] || FEATURE_STYLES.chat_juridico;
                      return (
                        <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${sheetStyle.iconBg} ${sheetStyle.iconBorder} ${sheetStyle.iconColor}`}>
                          {selectedFeature.key === 'chat_juridico' && <MessageSquare className="w-5 h-5" />}
                          {selectedFeature.key === 'resumo_inteligente' && <BookOpen className="w-5 h-5" />}
                          {selectedFeature.key === 'visao_documentos' && <Eye className="w-5 h-5" />}
                          {selectedFeature.key === 'transcricao_audio' && <Mic className="w-5 h-5" />}
                          {selectedFeature.key === 'geracao_imagens' && <ImageIcon className="w-5 h-5" />}
                          {selectedFeature.key === 'narracao_vademecum' && <Volume2 className="w-5 h-5" />}
                        </div>
                      );
                    })()}
                    <div>
                      <h3 className="!font-sans text-base sm:text-lg font-bold text-white tracking-normal normal-case">
                        {selectedFeature.title}
                      </h3>
                      <p className="!font-sans text-xs text-zinc-400">
                        {selectedFeature.category}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedFeature(null)}
                    className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Conteúdo Minimalista com Scroll */}
                <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-4">
                  <p className="text-xs text-zinc-300 leading-relaxed bg-white/[0.02] p-3 rounded-xl border border-white/5">
                    {selectedFeature.subtitle}
                  </p>

                  {/* Bloco 1: Provedor / Tipo de Chave */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-white flex items-center justify-between">
                      <span>Tipo de Chave / Provedor:</span>
                      {selectedFeature.ttsOnly && (
                        <span className="text-[11px] text-amber-400 font-mono">Exclusivo Nativo</span>
                      )}
                    </label>

                    {selectedFeature.ttsOnly ? (
                      <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200/90 leading-snug flex items-start gap-2.5">
                        <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                        <span>
                          A narração dos artigos do Vade Mecum é mantida <strong>100% no Motor Nativo / Gemini TTS</strong> do dispositivo, pois o OmniRoute não possui motor de síntese de voz (TTS).
                        </span>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-2 p-1 bg-black/40 rounded-xl border border-white/5">
                        <button
                          type="button"
                          onClick={() => handleFeatureProviderChange(selectedFeature.key, 'omniroute')}
                          className={`py-2 px-3 rounded-lg text-xs font-medium transition-all text-center cursor-pointer ${
                            (routingConfigs[selectedFeature.key]?.provider ?? selectedFeature.defaultProvider) === 'omniroute'
                              ? 'bg-amber-500 text-black font-bold shadow-md shadow-amber-500/25'
                              : 'text-zinc-400 hover:text-white hover:bg-white/5'
                          }`}
                        >
                          OmniRoute (1ª Opção - Principal)
                        </button>
                        <button
                          type="button"
                          onClick={() => handleFeatureProviderChange(selectedFeature.key, 'gemini_propria')}
                          className={`py-2 px-3 rounded-lg text-xs font-medium transition-all text-center cursor-pointer ${
                            (routingConfigs[selectedFeature.key]?.provider ?? selectedFeature.defaultProvider) === 'gemini_propria'
                              ? 'bg-zinc-700 text-white font-bold'
                              : 'text-zinc-400 hover:text-white hover:bg-white/5'
                          }`}
                        >
                          Chave Própria Gemini
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Bloco 2: Seletor de Modelo Sugerido */}
                  {!selectedFeature.ttsOnly && (
                    <div className="space-y-2 pt-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold text-white">
                          Modelo Sugerido:
                        </label>
                        {(() => {
                          const currentConfig = routingConfigs[selectedFeature.key] || { selectedModel: selectedFeature.defaultModel };
                          const found = selectedFeature.suggestedModels.find(m => m.id === currentConfig.selectedModel);
                          return found?.tag ? (
                            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-md ${
                              found.tag === 'Precisão Jurídica'
                                ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                                : found.tag === 'Econômico / Rápido'
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                            }`}>
                              {found.tag}
                            </span>
                          ) : null;
                        })()}
                      </div>

                      <select
                        value={routingConfigs[selectedFeature.key]?.selectedModel || selectedFeature.defaultModel}
                        onChange={(e) => handleFeatureModelChange(selectedFeature.key, e.target.value)}
                        className="w-full bg-black/60 border border-white/15 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500 transition-colors font-mono cursor-pointer"
                      >
                        {selectedFeature.suggestedModels.map((m) => (
                          <option key={m.id} value={m.id} className="bg-[#1a1a1e] text-white py-1">
                            {m.name} {m.recommended ? '★ (Recomendado)' : ''} — [{m.tag}]
                          </option>
                        ))}
                      </select>

                      {(() => {
                        const currentConfig = routingConfigs[selectedFeature.key] || { selectedModel: selectedFeature.defaultModel };
                        const found = selectedFeature.suggestedModels.find(m => m.id === currentConfig.selectedModel);
                        return found?.notes ? (
                          <p className="text-[11px] text-zinc-400 italic bg-white/[0.02] p-2.5 rounded-lg border border-white/5 leading-relaxed">
                            💡 <strong>Dica de uso:</strong> {found.notes}
                          </p>
                        ) : null;
                      })()}
                    </div>
                  )}

                  {/* Bloco 3: Teste da Função */}
                  <div className="pt-3 border-t border-white/10 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-white">
                        Validação em Tempo Real:
                      </span>
                      <span className="text-[11px] text-zinc-500">
                        Dispara chamada real com o modelo selecionado
                      </span>
                    </div>

                    <Button
                      size="sm"
                      disabled={featureTestResults[selectedFeature.key]?.loading || selectedFeature.ttsOnly}
                      onClick={() => handleTestFeatureCard(selectedFeature)}
                      className="w-full text-xs h-9 rounded-xl font-medium bg-amber-500 hover:bg-amber-600 text-black shadow-lg shadow-amber-500/20 cursor-pointer"
                    >
                      {featureTestResults[selectedFeature.key]?.loading ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin text-black" />
                          Executando teste com o modelo...
                        </>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5 mr-2 text-black" />
                          Testar Função Agora
                        </>
                      )}
                    </Button>

                    {/* Resposta do Teste */}
                    {featureTestResults[selectedFeature.key] && !featureTestResults[selectedFeature.key]?.loading && (
                      <div className="p-3 rounded-xl bg-black/60 border border-white/10 text-xs space-y-2">
                        <div className="flex items-center justify-between text-[11px] text-zinc-400 border-b border-white/5 pb-2">
                          <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Concluído com sucesso ({featureTestResults[selectedFeature.key]?.durationMs}ms)
                          </span>
                          <span className="font-mono text-[10px] text-zinc-400">
                            {featureTestResults[selectedFeature.key]?.modelUsed}
                          </span>
                        </div>

                        {featureTestResults[selectedFeature.key]?.imageUrl && (
                          <div className="rounded-xl overflow-hidden border border-white/10 mt-2">
                            <img
                              src={featureTestResults[selectedFeature.key]?.imageUrl}
                              alt="Preview da imagem gerada"
                              className="w-full h-44 object-cover"
                            />
                          </div>
                        )}

                        {featureTestResults[selectedFeature.key]?.response && (
                          <div className="max-h-56 overflow-y-auto pr-1 text-zinc-300 text-xs leading-relaxed font-sans">
                            <PremiumMarkdown content={featureTestResults[selectedFeature.key]?.response || ''} />
                          </div>
                        )}

                        {featureTestResults[selectedFeature.key]?.error && (
                          <p className="text-rose-400 text-xs font-mono leading-tight">
                            ❌ {featureTestResults[selectedFeature.key]?.error}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Rodapé do Sheet */}
                <div className="p-4 border-t border-white/10 bg-[#141416] shrink-0">
                  <Button
                    onClick={() => setSelectedFeature(null)}
                    className="w-full bg-white/10 hover:bg-white/15 text-white text-xs h-9 rounded-xl font-medium cursor-pointer"
                  >
                    Concluído
                  </Button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* ============================================================== */}
        {/* BOTTOM SHEET 95%: TESTAR OMNIROUTE (SANDBOX DE TESTE COMPLETO) */}
        {/* ============================================================== */}
        {typeof document !== 'undefined' && createPortal(
<AnimatePresence>
          {showOmniRouteTestSheet && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowOmniRouteTestSheet(false)}
                className="fixed inset-0 bg-black/85 z-50"
              />
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 28, stiffness: 280 }}
                className="fixed inset-x-0 bottom-0 max-h-[95vh] h-[95vh] bg-[#121215] border-t border-white/10 rounded-t-3xl z-[60] flex flex-col shadow-2xl overflow-hidden"
              >
                {/* Puxador Central */}
                <div className="w-12 h-1.5 rounded-full bg-white/20 mx-auto mt-3 shrink-0" />

                {/* Header do Sheet */}
                <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-white/10 shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#F59E0B]/15 border border-[#F59E0B]/30 text-[#FBBF24] flex items-center justify-center shrink-0">
                      <Sparkles className="w-5 h-5 text-[#FBBF24]" />
                    </div>
                    <div>
                      <h3 className="!font-sans text-base sm:text-lg font-bold text-white tracking-normal normal-case">
                        Testar OmniRoute — Sandbox de IA
                      </h3>
                      <p className="!font-sans text-xs text-zinc-400">
                        Validação interativa de Texto, Imagens, Visão e Áudio
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowOmniRouteTestSheet(false)}
                    className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Conteúdo com Scroll */}
                <div className="flex-1 overflow-y-auto px-2 sm:px-4 md:px-6 py-4 space-y-4">
                  {/* Menu de Alternância Integrado ao Layout (4 Módulos) */}
        <div className="w-full bg-[#141416] p-1.5 rounded-2xl border border-white/10 shadow-xl">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <button
              type="button"
              onClick={() => setMainTab('texto')}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs sm:text-sm !font-sans font-semibold transition-all duration-200 cursor-pointer ${
                mainTab === 'texto'
                  ? 'bg-amber-500 text-black shadow-md shadow-amber-500/25'
                  : 'text-zinc-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Type className={`w-4 h-4 ${mainTab === 'texto' ? 'text-black' : 'text-zinc-400'}`} />
              <span className="!font-sans font-semibold tracking-normal normal-case">Teste de Texto</span>
            </button>

            <button
              type="button"
              onClick={() => setMainTab('imagem')}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs sm:text-sm !font-sans font-semibold transition-all duration-200 cursor-pointer ${
                mainTab === 'imagem'
                  ? 'bg-amber-500 text-black shadow-md shadow-amber-500/25'
                  : 'text-zinc-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <ImageIcon className={`w-4 h-4 ${mainTab === 'imagem' ? 'text-black' : 'text-zinc-400'}`} />
              <span className="!font-sans font-semibold tracking-normal normal-case">Teste de Imagem</span>
            </button>

            <button
              type="button"
              onClick={() => setMainTab('visao')}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs sm:text-sm !font-sans font-semibold transition-all duration-200 cursor-pointer ${
                mainTab === 'visao'
                  ? 'bg-amber-500 text-black shadow-md shadow-amber-500/25'
                  : 'text-zinc-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Eye className={`w-4 h-4 ${mainTab === 'visao' ? 'text-black' : 'text-zinc-400'}`} />
              <span className="!font-sans font-semibold tracking-normal normal-case">Análise & Visão</span>
            </button>

            <button
              type="button"
              onClick={() => setMainTab('audio')}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs sm:text-sm !font-sans font-semibold transition-all duration-200 cursor-pointer ${
                mainTab === 'audio'
                  ? 'bg-amber-500 text-black shadow-md shadow-amber-500/25'
                  : 'text-zinc-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Mic className={`w-4 h-4 ${mainTab === 'audio' ? 'text-black' : 'text-zinc-400'}`} />
              <span className="!font-sans font-semibold tracking-normal normal-case">Transcrição de Áudio</span>
            </button>
          </div>
        </div>

        {/* TAB 1: TESTE DE TEXTO */}
        {mainTab === 'texto' && (
          <div className="space-y-4">
            <Card className="bg-[#141416] border-white/10 text-white rounded-2xl shadow-2xl overflow-hidden">
              <CardHeader className="pb-3 px-4 sm:px-6 pt-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="!font-sans text-base sm:text-lg font-semibold text-white tracking-normal normal-case flex items-center gap-2">
                      <Bot className="w-5 h-5 text-amber-400" />
                      <span>Geração de Texto e Raciocínio (Chat)</span>
                    </h2>
                    <p className="!font-sans text-xs text-white/50 mt-1 font-normal tracking-normal normal-case">
                      Roteamento inteligente para Google Gemini / Antigravity com fallback automático
                    </p>
                  </div>

                  {/* Seletor de Modelo */}
                  <div className="flex items-center gap-2 bg-black/40 px-3 py-1.5 rounded-xl border border-white/10">
                    <span className="text-xs text-white/60">Modelo:</span>
                    <select
                      value={textModel}
                      onChange={(e) => {
                        setTextModel(e.target.value);
                        localStorage.setItem(STORAGE_KEYS.LAST_MODEL, e.target.value);
                      }}
                      className="bg-transparent text-xs text-amber-400 font-mono focus:outline-none cursor-pointer"
                    >
                      <optgroup label="Google Gemini (Antigravity)">
                        {ANTIGRAVITY_TEXT_MODELS.filter((m) => m.group === 'Google Gemini').map((m) => (
                          <option key={m.id} value={m.id} className="bg-zinc-900 text-white">
                            {m.name}
                          </option>
                        ))}
                      </optgroup>
                      <optgroup label="Anthropic Claude (Antigravity)">
                        {ANTIGRAVITY_TEXT_MODELS.filter((m) => m.group === 'Anthropic Claude').map((m) => (
                          <option key={m.id} value={m.id} className="bg-zinc-900 text-white">
                            {m.name}
                          </option>
                        ))}
                      </optgroup>
                      <optgroup label="OpenAI GPT (Antigravity)">
                        {ANTIGRAVITY_TEXT_MODELS.filter((m) => m.group === 'OpenAI GPT').map((m) => (
                          <option key={m.id} value={m.id} className="bg-zinc-900 text-white">
                            {m.name}
                          </option>
                        ))}
                      </optgroup>
                      {availableModels.filter((m) => !ANTIGRAVITY_TEXT_MODELS.some((known) => known.id === m)).length > 0 && (
                        <optgroup label="Outros Modelos Antigravity Detectados">
                          {availableModels
                            .filter((m) => !ANTIGRAVITY_TEXT_MODELS.some((known) => known.id === m))
                            .map((m) => (
                              <option key={m} value={m} className="bg-zinc-900 text-white">
                                {m}
                              </option>
                            ))}
                        </optgroup>
                      )}
                    </select>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4 px-4 sm:px-6 pb-6">
                {/* Prompts Rápidos Sugeridos */}
                <div className="flex flex-wrap gap-2 items-center">
                  <span className="text-[11.5px] text-white/40 mr-1 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    Sugestões:
                  </span>
                  {[
                    'Explicar HC para leigo',
                    'Resumo Art. 121 CP',
                    'Princípios Constitucionais',
                    'Diferença dolo e culpa',
                    'Recurso Especial vs Extraordinário',
                  ].map((sug) => (
                    <button
                      key={sug}
                      type="button"
                      onClick={() => setTextPrompt(sug)}
                      className="text-xs bg-white/5 hover:bg-white/10 active:opacity-70 border border-white/10 px-2.5 py-1.5 rounded-lg text-white/80 hover:text-white transition-all"
                    >
                      {sug}
                    </button>
                  ))}
                </div>

                {/* Prompt do Sistema */}
                <div className="space-y-1.5">
                  <label className="text-xs text-white/60 font-medium">Instrução de Sistema (Opcional):</label>
                  <Input
                    value={textSystem}
                    onChange={(e) => setTextSystem(e.target.value)}
                    placeholder="Instruções de sistema..."
                    className="bg-black/50 border-white/10 text-xs h-10 rounded-xl"
                  />
                </div>

                {/* Prompt Principal */}
                <div className="space-y-1.5">
                  <label className="text-xs text-white/80 font-medium">Prompt do Usuário:</label>
                  <Textarea
                    rows={4}
                    value={textPrompt}
                    onChange={(e) => setTextPrompt(e.target.value)}
                    placeholder="Digite sua dúvida, caso ou instrução jurídica para testar o modelo..."
                    className="bg-black/50 border-white/10 text-sm leading-relaxed rounded-xl p-3.5 focus-visible:ring-amber-500/50"
                  />
                </div>

                {/* Slider de Temperatura & Botão de Executar */}
                <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
                  <div className="flex-1 min-w-[200px] max-w-sm space-y-1.5">
                    <div className="flex justify-between text-xs text-white/60">
                      <span className="flex items-center gap-1">
                        <SlidersHorizontal className="w-3.5 h-3.5 text-white/40" />
                        Temperatura (Criatividade):
                      </span>
                      <span className="font-mono text-amber-400 font-semibold">{temperature.toFixed(2)}</span>
                    </div>
                    <Slider
                      min={0}
                      max={1}
                      step={0.05}
                      value={[temperature]}
                      onValueChange={([val]) => setTemperature(val)}
                      className="w-full"
                    />
                  </div>

                  <Button
                    onClick={handleRunTextTest}
                    disabled={textLoading}
                    className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black font-bold text-xs sm:text-sm px-6 h-11 rounded-xl shadow-lg shadow-amber-500/20 shrink-0 gap-2 transition-all active:opacity-70"
                  >
                    {textLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    {textLoading ? 'Gerando Resposta...' : 'Executar Teste'}
                  </Button>
                </div>

                {/* Exibição da Resposta com Markdown Lapidado */}
                {textResponse && (
                  <div className="mt-5 pt-5 border-t border-white/10 space-y-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4" />
                        Resposta do Modelo ({textModel})
                      </span>
                      <div className="flex items-center gap-3">
                        {textMeta && (
                          <div className="flex items-center gap-3 text-xs text-white/50 font-mono">
                            <span className="flex items-center gap-1 bg-white/5 px-2 py-0.5 rounded border border-white/10">
                              <Clock className="w-3.5 h-3.5 text-amber-400" />
                              {textMeta.durationMs}ms
                            </span>
                            {textMeta.tokens && (
                              <span className="flex items-center gap-1 bg-white/5 px-2 py-0.5 rounded border border-white/10">
                                <Layers className="w-3.5 h-3.5 text-sky-400" />
                                {textMeta.tokens.total} tokens
                              </span>
                            )}
                          </div>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyToClipboard(textResponse)}
                          className="h-8 text-xs border-white/15 bg-white/5 hover:bg-white/10 text-white/80 hover:text-white px-3 gap-1.5 rounded-xl"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          Copiar
                        </Button>
                      </div>
                    </div>

                    {/* Container Markdown Formatado */}
                    <div className="bg-[#0e0e10] p-4 sm:p-6 rounded-2xl border border-white/10 text-sm leading-relaxed text-zinc-100 max-h-[600px] overflow-y-auto select-text prose prose-invert max-w-none shadow-inner">
                      <PremiumMarkdown>{textResponse}</PremiumMarkdown>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* TAB 2: TESTE DE IMAGEM */}
        {mainTab === 'imagem' && (
          <div className="space-y-4">
            <Card className="bg-[#141416] border-white/10 text-white rounded-2xl shadow-2xl overflow-hidden">
              <CardHeader className="pb-3 px-4 sm:px-6 pt-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="!font-sans text-base sm:text-lg font-semibold text-white tracking-normal normal-case flex items-center gap-2">
                      <ImageIcon className="w-5 h-5 text-amber-400" />
                      <span>Geração de Imagens (Texto para Imagem)</span>
                    </h2>
                    <p className="!font-sans text-xs text-white/50 mt-1 font-normal tracking-normal normal-case">
                      Geração de ilustrações e arte com IA através do modelo Antigravity / Gemini
                    </p>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4 px-4 sm:px-6 pb-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs text-white/70 font-medium !font-sans">Modelo de Imagem:</label>
                    <select
                      value={imageModel}
                      onChange={(e) => setImageModel(e.target.value)}
                      className="w-full bg-black/50 border border-white/15 text-xs rounded-xl px-3 py-2.5 text-amber-400 font-mono focus:outline-none cursor-pointer"
                    >
                      {POPULAR_IMAGE_MODELS.map((m) => (
                        <option key={m} value={m} className="bg-zinc-900 text-white">
                          {m}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs text-white/70 font-medium !font-sans">Resolução:</label>
                    <select
                      value={imageSize}
                      onChange={(e) => setImageSize(e.target.value)}
                      className="w-full bg-black/50 border border-white/15 text-xs rounded-xl px-3 py-2.5 text-white focus:outline-none cursor-pointer"
                    >
                      <option value="1024x1024" className="bg-zinc-900 text-white">1024x1024 (Quadrado - Padrão)</option>
                      <option value="1024x1792" className="bg-zinc-900 text-white">1024x1792 (Vertical / Story)</option>
                      <option value="1792x1024" className="bg-zinc-900 text-white">1792x1024 (Horizontal / Banner)</option>
                      <option value="512x512" className="bg-zinc-900 text-white">512x512 (Rápido)</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-white/80 font-medium !font-sans">Prompt de Imagem:</label>
                  <Textarea
                    rows={3}
                    value={imagePrompt}
                    onChange={(e) => setImagePrompt(e.target.value)}
                    placeholder="Descreva a ilustração jurídica que deseja criar..."
                    className="bg-black/50 border-white/10 text-sm leading-relaxed rounded-xl p-3.5 focus-visible:ring-amber-500/50 !font-sans"
                  />
                </div>

                <div className="flex justify-end pt-1">
                  <Button
                    onClick={handleRunImageGeneration}
                    disabled={imageLoading}
                    className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black font-bold text-xs sm:text-sm px-6 h-11 rounded-xl shadow-lg shadow-amber-500/20 gap-2 active:opacity-70 transition-all !font-sans cursor-pointer"
                  >
                    {imageLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
                    {imageLoading ? 'Gerando Imagem...' : 'Gerar Imagem'}
                  </Button>
                </div>

                {/* Exibição da Imagem Gerada */}
                {imageUrl && (
                  <div className="mt-5 p-4 sm:p-5 bg-black/60 rounded-2xl border border-white/10 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5 !font-sans">
                        <CheckCircle2 className="w-4 h-4" />
                        Imagem Gerada com Sucesso
                      </span>
                      {imageMeta && (
                        <span className="text-xs text-white/50 font-mono bg-white/5 px-2.5 py-0.5 rounded border border-white/10">
                          <Clock className="w-3.5 h-3.5 inline mr-1 text-amber-400" />
                          {imageMeta.durationMs}ms
                        </span>
                      )}
                    </div>

                    <div className="relative group max-w-lg mx-auto overflow-hidden rounded-xl border border-white/15 bg-black shadow-2xl">
                      <img
                        src={imageUrl}
                        alt="Resultado do teste de imagem"
                        className="w-full h-auto object-cover max-h-[500px] transition-transform duration-300 group-hover:scale-[1.02]"
                      />
                    </div>

                    <div className="flex justify-center gap-3 pt-2">
                      <a
                        href={imageUrl}
                        download={`omniroute-${Date.now()}.jpg`}
                        className="inline-flex items-center gap-1.5 text-xs text-white font-medium bg-white/10 hover:bg-white/20 px-4 py-2 rounded-xl border border-white/15 transition-all active:opacity-70 !font-sans"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Baixar Imagem
                      </a>
                      <a
                        href={imageUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs text-amber-400 font-medium bg-amber-500/10 hover:bg-amber-500/20 px-4 py-2 rounded-xl border border-amber-500/20 transition-all active:opacity-70 !font-sans"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Abrir em Nova Aba
                      </a>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* TAB 3: ANÁLISE & VISÃO */}
        {mainTab === 'visao' && (
          <div className="space-y-4">
            <Card className="bg-[#141416] border-white/10 text-white rounded-2xl shadow-2xl overflow-hidden">
              <CardHeader className="pb-3 px-4 sm:px-6 pt-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="!font-sans text-base sm:text-lg font-semibold text-white tracking-normal normal-case flex items-center gap-2">
                      <Eye className="w-5 h-5 text-amber-400" />
                      <span>Análise Visual & Multimodal (Visão / OCR)</span>
                    </h2>
                    <p className="!font-sans text-xs text-white/50 mt-1 font-normal tracking-normal normal-case">
                      Envie uma foto ou documento para a IA analisar elementos, transcrever texto ou responder dúvidas
                    </p>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4 px-4 sm:px-6 pb-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs text-white/70 font-medium !font-sans">Modelo de Visão:</label>
                    <select
                      value={visionModel}
                      onChange={(e) => setVisionModel(e.target.value)}
                      className="w-full bg-black/50 border border-white/15 text-xs rounded-xl px-3 py-2.5 text-amber-400 font-mono focus:outline-none cursor-pointer"
                    >
                      {POPULAR_VISION_MODELS.map((m) => (
                        <option key={m} value={m} className="bg-zinc-900 text-white">
                          {m}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs text-white/70 font-medium !font-sans">Carregar Imagem para Análise:</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleVisionImageUpload}
                      className="block w-full text-xs text-white/60 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-white/10 file:text-white hover:file:bg-white/20 cursor-pointer"
                    />
                  </div>
                </div>

                {visionImageBase64 && (
                  <div className="flex items-center gap-3 p-3 bg-black/40 rounded-xl border border-white/10">
                    <img
                      src={visionImageBase64}
                      alt="Preview da análise"
                      className="w-16 h-16 object-cover rounded-lg border border-white/10"
                    />
                    <div className="text-xs text-white/70">
                      <span className="text-emerald-400 font-medium flex items-center gap-1 !font-sans">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Imagem carregada com sucesso
                      </span>
                      <p className="text-[11px] text-white/40 mt-0.5 !font-sans">Pronta para envio ao modelo de visão multimodal</p>
                    </div>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-xs text-white/80 font-medium !font-sans">Pergunta ou Instrução sobre a Imagem:</label>
                  <Input
                    value={visionPrompt}
                    onChange={(e) => setVisionPrompt(e.target.value)}
                    placeholder="Ex: O que está escrito neste documento? Descreva a cena."
                    className="bg-black/50 border-white/10 text-xs h-10 rounded-xl !font-sans"
                  />
                </div>

                <div className="flex justify-end pt-1">
                  <Button
                    onClick={handleRunVisionAnalysis}
                    disabled={visionLoading || !visionImageBase64}
                    className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black font-bold text-xs sm:text-sm px-6 h-11 rounded-xl shadow-lg shadow-amber-500/20 gap-2 active:opacity-70 transition-all !font-sans cursor-pointer"
                  >
                    {visionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
                    {visionLoading ? 'Analisando Imagem...' : 'Analisar Imagem'}
                  </Button>
                </div>

                {visionResponse && (
                  <div className="mt-5 p-4 sm:p-6 bg-[#0e0e10] rounded-2xl border border-white/10 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5 !font-sans">
                        <CheckCircle2 className="w-4 h-4" />
                        Análise Multimodal da IA
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(visionResponse)}
                        className="h-8 text-xs border-white/15 bg-white/5 hover:bg-white/10 text-white/80 hover:text-white px-3 gap-1.5 rounded-xl !font-sans cursor-pointer"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        Copiar
                      </Button>
                    </div>
                    <div className="text-sm leading-relaxed text-zinc-100 prose prose-invert max-w-none !font-sans">
                      <PremiumMarkdown>{visionResponse}</PremiumMarkdown>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* TAB 4: TRANSCRIÇÃO DE ÁUDIO */}
        {mainTab === 'audio' && (
          <div className="space-y-4">
            <Card className="bg-[#141416] border-white/10 text-white rounded-2xl shadow-2xl overflow-hidden">
              <CardHeader className="pb-3 px-4 sm:px-6 pt-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="!font-sans text-base sm:text-lg font-semibold text-white tracking-normal normal-case flex items-center gap-2">
                      <Mic className="w-5 h-5 text-amber-400" />
                      <span>Transcrição de Áudio & Reconhecimento de Voz</span>
                    </h2>
                    <p className="!font-sans text-xs text-white/50 mt-1 font-normal tracking-normal normal-case">
                      Grave diretamente pelo microfone ou envie um arquivo de áudio (.mp3, .wav, .m4a, .webm) para transcrever
                    </p>
                  </div>

                  {/* Seletor de Modelo de Áudio */}
                  <div className="flex items-center gap-2 bg-black/40 px-3 py-1.5 rounded-xl border border-white/10">
                    <span className="text-xs text-white/60 !font-sans">Modelo:</span>
                    <select
                      value={audioModel}
                      onChange={(e) => setAudioModel(e.target.value)}
                      className="bg-transparent text-xs text-amber-400 font-mono focus:outline-none cursor-pointer"
                    >
                      {POPULAR_AUDIO_MODELS.map((m) => (
                        <option key={m} value={m} className="bg-zinc-900 text-white">
                          {m}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-5 px-4 sm:px-6 pb-6">
                {/* Opções de Entrada de Áudio: Gravação vs Upload */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Bloco 1: Microfone */}
                  <div className="p-4 rounded-2xl bg-black/40 border border-white/10 flex flex-col justify-between space-y-4">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-white flex items-center gap-2 !font-sans">
                          <Mic className="w-4 h-4 text-amber-400" />
                          Gravar Microfone ao Vivo
                        </span>
                        {isRecording && (
                          <span className="flex items-center gap-1.5 text-xs text-rose-400 font-mono animate-pulse">
                            <span className="w-2 h-2 rounded-full bg-rose-500" />
                            {Math.floor(recordingSeconds / 60).toString().padStart(2, '0')}:
                            {(recordingSeconds % 60).toString().padStart(2, '0')}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-white/50 !font-sans">
                        Fale uma dúvida, ementa jurídica ou depoimento
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      {!isRecording ? (
                        <Button
                          onClick={startRecording}
                          type="button"
                          className="flex-1 bg-amber-500 hover:bg-amber-600 text-black font-bold text-xs h-10 rounded-xl gap-2 !font-sans cursor-pointer shadow-md shadow-amber-500/10"
                        >
                          <Mic className="w-4 h-4" />
                          Iniciar Gravação
                        </Button>
                      ) : (
                        <Button
                          onClick={stopRecording}
                          type="button"
                          className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs h-10 rounded-xl gap-2 !font-sans cursor-pointer animate-pulse"
                        >
                          <Square className="w-4 h-4" />
                          Parar Gravação
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Bloco 2: Upload de Arquivo */}
                  <div className="p-4 rounded-2xl bg-black/40 border border-white/10 flex flex-col justify-between space-y-4">
                    <div className="space-y-1">
                      <span className="text-xs font-semibold text-white flex items-center gap-2 !font-sans">
                        <Upload className="w-4 h-4 text-amber-400" />
                        Carregar Arquivo de Áudio
                      </span>
                      <p className="text-[11px] text-white/50 !font-sans">
                        Formatos suportados: .mp3, .wav, .m4a, .ogg, .webm
                      </p>
                    </div>

                    <div>
                      <input
                        type="file"
                        accept="audio/*,.mp3,.wav,.m4a,.ogg,.webm,.flac,.aac"
                        onChange={handleAudioFileUpload}
                        className="block w-full text-xs text-white/60 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-white/10 file:text-white hover:file:bg-white/20 cursor-pointer"
                      />
                    </div>
                  </div>
                </div>

                {/* Player de Reprodução do Áudio Carregado/Gravado */}
                {audioUrl && (
                  <div className="p-3.5 bg-black/60 rounded-xl border border-white/10 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        <Volume2 className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-medium text-white !font-sans truncate max-w-[200px] sm:max-w-xs">
                          {audioFileName || 'Áudio gravado'}
                        </div>
                        <div className="text-[10.5px] text-white/40 !font-sans">
                          {audioBlob ? `${(audioBlob.size / 1024).toFixed(1)} KB` : ''}
                        </div>
                      </div>
                    </div>

                    <audio controls src={audioUrl} className="h-8 max-w-[280px]" />
                  </div>
                )}

                {/* Botão de Transcrição */}
                <div className="flex justify-end pt-1">
                  <Button
                    onClick={handleTranscribeAudio}
                    disabled={audioLoading || !audioBlob}
                    className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black font-bold text-xs sm:text-sm px-6 h-11 rounded-xl shadow-lg shadow-amber-500/20 gap-2 active:opacity-70 transition-all !font-sans cursor-pointer"
                  >
                    {audioLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileAudio className="w-4 h-4" />}
                    {audioLoading ? 'Transcrevendo Áudio...' : 'Transcrever Áudio com IA'}
                  </Button>
                </div>

                {/* Exibição da Transcrição */}
                {audioTranscription && (
                  <div className="mt-5 p-4 sm:p-6 bg-[#0e0e10] rounded-2xl border border-white/10 space-y-4">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5 !font-sans">
                          <CheckCircle2 className="w-4 h-4" />
                          Áudio Transcrito com Sucesso
                        </span>
                        {audioMeta && (
                          <span className="text-xs text-white/50 font-mono bg-white/5 px-2.5 py-0.5 rounded border border-white/10">
                            <Clock className="w-3.5 h-3.5 inline mr-1 text-amber-400" />
                            {audioMeta.durationMs}ms
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyToClipboard(audioTranscription)}
                          className="h-8 text-xs border-white/15 bg-white/5 hover:bg-white/10 text-white/80 hover:text-white px-3 gap-1.5 rounded-xl !font-sans cursor-pointer"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          Copiar
                        </Button>
                        <Button
                          size="sm"
                          onClick={useTranscriptionInChat}
                          className="h-8 text-xs bg-amber-500 hover:bg-amber-600 text-black font-semibold px-3 gap-1.5 rounded-xl !font-sans cursor-pointer shadow-md shadow-amber-500/20"
                        >
                          <span>Usar no Teste de Texto</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>

                    <div className="text-sm leading-relaxed text-zinc-100 prose prose-invert max-w-none !font-sans bg-black/40 p-4 rounded-xl border border-white/5">
                      <PremiumMarkdown>{audioTranscription}</PremiumMarkdown>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Histórico Recente de Execuções */}
        {logs.length > 0 && (
          <Card className="bg-[#141416] border-white/10 text-white rounded-2xl overflow-hidden shadow-xl">
            <CardHeader className="py-3 px-4 sm:px-6">
              <h3 className="!font-sans text-xs sm:text-sm font-medium text-white/70 tracking-normal normal-case flex items-center gap-2">
                <Clock className="w-4 h-4 text-white/40" />
                <span>Histórico Recente de Execuções</span>
              </h3>
            </CardHeader>
            <CardContent className="px-4 sm:px-6 pb-4 pt-0">
              <div className="divide-y divide-white/5 text-xs font-mono">
                {logs.map((log) => (
                  <div key={log.id} className="py-2.5 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <span className="text-white/40 text-[11px] shrink-0">{log.time}</span>
                      <Badge variant="outline" className="text-[10px] border-white/15 bg-white/5 text-white/90 py-0.5 truncate block shrink-0 max-w-[70px] sm:max-w-[140px]">
                        {log.type}
                      </Badge>
                      <span className="text-white/60 text-xs truncate flex-1">
                        {log.model}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-white/40">{log.duration}ms</span>
                      <span
                        className={`text-xs font-semibold ${log.status === 200 ? 'text-emerald-400' : 'text-rose-400'}`}
                      >
                        {log.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>, document.body)}

      </main>
      </div>
    </div>
  );
}
