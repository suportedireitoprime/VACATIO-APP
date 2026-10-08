/**
 * aiGatewayService.ts
 * 
 * Central de Roteamento de Inteligência Artificial do Aplicativo Vade Mecum Prime.
 * Permite definir OmniRoute como provedor primário (Preferência 1) ou Chave Própria Gemini,
 * com sugestões inteligentes de modelos conforme o objetivo (Precisão Jurídica vs Custo Econômico).
 */

import { supabase } from '@/integrations/supabase/client';

export type AiFeatureKey =
  | 'chat_juridico'
  | 'resumo_inteligente'
  | 'visao_documentos'
  | 'transcricao_audio'
  | 'geracao_imagens'
  | 'narracao_vademecum'
  | 'horus_whatsapp'
  | 'ligacao_live';

export type AiProviderType = 'omniroute' | 'gemini_propria';

export type ModelTag = 'Precisão Jurídica' | 'Econômico / Rápido' | 'Equilibrado' | 'Especializado' | 'Motor Nativo';

export interface SuggestedModel {
  id: string;
  name: string;
  tag: ModelTag;
  costProfile: 'low' | 'medium' | 'high';
  recommended?: boolean;
  notes?: string;
}

export interface AiFeatureDefinition {
  key: AiFeatureKey;
  title: string;
  subtitle: string;
  category: 'Texto & Chat' | 'Síntese & Estudo' | 'Visão & OCR' | 'Áudio & Fala' | 'Artes & Capas';
  defaultProvider: AiProviderType;
  defaultModel: string;
  suggestedModels: SuggestedModel[];
  ttsOnly?: boolean;
  samplePrompt: string;
}

export interface AiFeatureConfig {
  provider: AiProviderType;
  selectedModel: string;
  temperature?: number;
  customApiKey?: string;
}

export const AI_FEATURES_REGISTRY: AiFeatureDefinition[] = [
  {
    key: 'chat_juridico',
    title: 'Chat Jurídico / Me Explique / Mentor',
    subtitle: 'Assistente e tutor jurídico em tempo real para dúvidas processuais e materiais',
    category: 'Texto & Chat',
    defaultProvider: 'omniroute',
    defaultModel: 'antigravity/gemini-3.7-flash-high',
    suggestedModels: [
      {
        id: 'antigravity/gemini-3.8-flash',
        name: 'Gemini 3.8 Flash',
        tag: 'Precisão Jurídica',
        costProfile: 'medium',
        recommended: true,
        notes: 'Mais recente geração: alta velocidade com rigor técnico-jurídico'
      },
      {
        id: 'antigravity/claude-sonnet-4-6',
        name: 'Claude 3.7 Sonnet / 4.6',
        tag: 'Precisão Jurídica',
        costProfile: 'high',
        notes: 'Superior para teses doutrinárias complexas e redação de peças'
      },
      {
        id: 'antigravity/gemini-3.7-flash-high',
        name: 'Gemini 3.7 Flash High',
        tag: 'Equilibrado',
        costProfile: 'medium',
        notes: 'Excelente balanço entre raciocínio jurídico e latência'
      },
      {
        id: 'antigravity/gemini-3.6-flash',
        name: 'Gemini 3.6 Flash',
        tag: 'Econômico / Rápido',
        costProfile: 'low',
        notes: 'Máxima economia de tokens com resposta ultrarrápida'
      },
    ],
    samplePrompt: 'Explique a diferença entre prescrição e decadência no Código Civil Brasileiro com exemplos práticos.',
  },
  {
    key: 'resumo_inteligente',
    title: 'Resumos Inteligentes & Sínteses',
    subtitle: 'Síntese de doutrina, artigos de leis, Cornell Notes e criação de flashcards',
    category: 'Síntese & Estudo',
    defaultProvider: 'omniroute',
    defaultModel: 'antigravity/gemini-3.7-flash-high',
    suggestedModels: [
      {
        id: 'antigravity/gemini-3.6-flash',
        name: 'Gemini 3.6 Flash',
        tag: 'Econômico / Rápido',
        costProfile: 'low',
        recommended: true,
        notes: 'Recomendado: ideal para processar grandes volumes de texto gastando menos'
      },
      {
        id: 'antigravity/gemini-3.8-flash',
        name: 'Gemini 3.8 Flash',
        tag: 'Precisão Jurídica',
        costProfile: 'medium',
        notes: 'Para resumos acadêmicos que demandam máxima fidelidade à letra da lei'
      },
      {
        id: 'antigravity/gemini-3.7-flash-thinking',
        name: 'Gemini 3.7 Flash Thinking',
        tag: 'Equilibrado',
        costProfile: 'medium',
        notes: 'Raciocínio dedutivo aprimorado para casos práticos'
      },
    ],
    samplePrompt: 'Resuma em 3 tópicos os pontos fundamentais do Recurso Especial no STJ (Art. 105, III da CF/88).',
  },
  {
    key: 'visao_documentos',
    title: 'Visão Computacional & OCR de Documentos',
    subtitle: 'Extração de texto de fotos de livros, certidões, petições escaneadas e contratos',
    category: 'Visão & OCR',
    defaultProvider: 'omniroute',
    defaultModel: 'antigravity/gemini-3.7-flash-high',
    suggestedModels: [
      {
        id: 'antigravity/gemini-3.7-flash-high',
        name: 'Gemini 3.7 Flash High',
        tag: 'Precisão Jurídica',
        costProfile: 'medium',
        recommended: true,
        notes: 'Recomendado: OCR de altíssima definição mesmo em documentos amassados ou antigos'
      },
      {
        id: 'antigravity/gemini-pro-agent',
        name: 'Gemini Pro Agent',
        tag: 'Especializado',
        costProfile: 'high',
        notes: 'Para análise profunda de estruturas contratuais completas'
      },
      {
        id: 'antigravity/gemini-3.8-flash',
        name: 'Gemini 3.8 Flash',
        tag: 'Econômico / Rápido',
        costProfile: 'low',
        notes: 'Rápida identificação visual com menor consumo'
      },
    ],
    samplePrompt: 'Analise este documento e extraia o cabeçalho, as partes qualificadas e os pedidos.',
  },
  {
    key: 'transcricao_audio',
    title: 'Transcrição de Áudio (Speech-to-Text)',
    subtitle: 'Transcrição de audiências, notas por voz, busca fonética e aulas gravadas',
    category: 'Áudio & Fala',
    defaultProvider: 'omniroute',
    defaultModel: 'antigravity/gemini-3.7-flash-high',
    suggestedModels: [
      {
        id: 'antigravity/gemini-3.7-flash-high',
        name: 'Gemini 3.7 Flash High Multimodal',
        tag: 'Precisão Jurídica',
        costProfile: 'medium',
        recommended: true,
        notes: 'Recomendado: Transcrição fonética com pontuação e termos jurídicos impecáveis'
      },
      {
        id: 'whisper-1',
        name: 'OpenAI Whisper v1',
        tag: 'Especializado',
        costProfile: 'medium',
        notes: 'Padrão tradicional de transcrição via /v1/audio/transcriptions'
      },
      {
        id: 'antigravity/gemini-3.8-flash',
        name: 'Gemini 3.8 Flash',
        tag: 'Econômico / Rápido',
        costProfile: 'low',
        notes: 'Transcrição ágil para buscas rápidas de jurisprudência por voz'
      },
    ],
    samplePrompt: 'Transcreva com precisão o áudio informado.',
  },
  {
    key: 'geracao_imagens',
    title: 'Geração de Imagens & Capas Editoriais',
    subtitle: 'Ilustrações de capa para Biografias, Clássicos do Direito e posts jurídicos',
    category: 'Artes & Capas',
    defaultProvider: 'omniroute',
    defaultModel: 'antigravity/gemini-3.1-flash-image',
    suggestedModels: [
      {
        id: 'antigravity/gemini-3.1-flash-image',
        name: 'Gemini 3.1 Flash Image',
        tag: 'Precisão Jurídica',
        costProfile: 'medium',
        recommended: true,
        notes: 'Recomendado: Gera imagens editoriais direto pela rota Antigravity do OmniRoute'
      },
      {
        id: 'imagen-3.0-generate-002',
        name: 'Google Imagen 3.0',
        tag: 'Especializado',
        costProfile: 'high',
        notes: 'Alta fidelidade fotográfica e estética clássica'
      },
      {
        id: 'dall-e-3',
        name: 'OpenAI DALL-E 3',
        tag: 'Especializado',
        costProfile: 'high',
        notes: 'Fidelidade estrita a prompts conceituais detalhados'
      },
    ],
    samplePrompt: 'Capa clássica de livro de direito em couro escuro com detalhes em ouro gravado e brasão da justiça.',
  },
  {
    key: 'narracao_vademecum',
    title: 'Narração de Leis e Artigos (TTS)',
    subtitle: 'Síntese de voz nativa dos artigos do Vade Mecum e obras jurídicas',
    category: 'Áudio & Fala',
    defaultProvider: 'gemini_propria',
    defaultModel: 'gemini-tts-native',
    ttsOnly: true,
    suggestedModels: [
      {
        id: 'gemini-tts-native',
        name: 'Gemini TTS / Síntese Nativa do Dispositivo',
        tag: 'Motor Nativo',
        costProfile: 'low',
        recommended: true,
        notes: 'Exclusivo: OmniRoute não possui motor de síntese de voz (TTS). Permanece 100% nativo.'
      },
    ],
    samplePrompt: 'Artigo 1º A República Federativa do Brasil, formada pela união indissolúvel dos Estados...',
  },
  {
    key: 'horus_whatsapp',
    title: 'Horus (Assistente WhatsApp)',
    subtitle: 'Atendimento e suporte jurídico 24/7 direto pelo WhatsApp',
    category: 'Texto & Chat',
    defaultProvider: 'omniroute',
    defaultModel: 'antigravity/gemini-3.7-flash-high',
    suggestedModels: [
      {
        id: 'antigravity/gemini-3.7-flash-high',
        name: 'Gemini 3.7 Flash High',
        tag: 'Equilibrado',
        costProfile: 'medium',
        recommended: true,
        notes: 'Bom equilíbrio para respostas rápidas e contextualizadas no WhatsApp',
      },
      {
        id: 'antigravity/gemini-3.6-flash',
        name: 'Gemini 3.6 Flash',
        tag: 'Econômico / Rápido',
        costProfile: 'low',
        notes: 'Velocidade máxima para alto volume de mensagens curtas',
      }
    ],
    samplePrompt: 'Responda como Horus: Olá, gostaria de saber como acesso o Vade Mecum.',
  },
  {
    key: 'ligacao_live',
    title: 'Ligação em Tempo Real (Me ligando)',
    subtitle: 'Interação por voz bidirecional instantânea (WebRTC)',
    category: 'Áudio & Fala',
    defaultProvider: 'gemini_propria',
    defaultModel: 'gemini-live-api',
    ttsOnly: true,
    suggestedModels: [
      {
        id: 'gemini-live-api',
        name: 'API Live / WebRTC',
        tag: 'Motor Nativo',
        costProfile: 'high',
        recommended: true,
        notes: 'Exclusivo: Utiliza a API Live que a gente já paga para garantir baixíssima latência na voz. Não usa OmniRoute.'
      }
    ],
    samplePrompt: 'Iniciando conexão de voz...',
  },
];

const STORAGE_KEY_ROUTING = 'omniroute_ai_feature_routing_v2';
const OMNIROUTE_DEFAULT_BASE_URL = 'https://omniroute-production-fb57.up.railway.app/v1';

let cachedOmniRouteKey: string | null = null;

export async function getOmniRouteApiKey(): Promise<string> {
  if (cachedOmniRouteKey) return cachedOmniRouteKey;
  try {
    const edgeCall = supabase.functions.invoke('get-omniroute-key');
    const timeout = new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout edge function')), 5000));
    
    // @ts-ignore
    const { data, error } = await Promise.race([edgeCall, timeout]);
    
    if (!error && data?.key) {
      cachedOmniRouteKey = data.key;
      return cachedOmniRouteKey;
    }
  } catch (err) {
    console.warn('Fallback ativado: Erro ao buscar OMNIROUTE_API_KEY do Supabase:', err);
  }
  // Fallback para localStorage se houver
  return localStorage.getItem('omniroute_test_api_key') || '';
}

/** Carrega todas as preferências do localStorage */
export function getAiFeaturesRouting(): Record<AiFeatureKey, AiFeatureConfig> {
  const defaults: Record<AiFeatureKey, AiFeatureConfig> = AI_FEATURES_REGISTRY.reduce((acc, feat) => {
    acc[feat.key] = {
      provider: feat.defaultProvider,
      selectedModel: feat.defaultModel,
      temperature: 0.7,
    };
    return acc;
  }, {} as Record<AiFeatureKey, AiFeatureConfig>);

  try {
    const raw = localStorage.getItem(STORAGE_KEY_ROUTING);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw);
    return { ...defaults, ...parsed };
  } catch (err) {
    console.warn('Erro ao ler omniroute_ai_feature_routing:', err);
    return defaults;
  }
}

/** Salva configuração completa de roteamento */
export function saveAiFeaturesRouting(config: Record<AiFeatureKey, AiFeatureConfig>): void {
  try {
    localStorage.setItem(STORAGE_KEY_ROUTING, JSON.stringify(config));
  } catch (err) {
    console.error('Erro ao salvar omniroute_ai_feature_routing:', err);
  }
}

/** Atualiza configuração de uma função específica */
export function updateAiFeatureConfig(key: AiFeatureKey, patch: Partial<AiFeatureConfig>): void {
  const current = getAiFeaturesRouting();
  current[key] = { ...current[key], ...patch };
  saveAiFeaturesRouting(current);
}

/** Executa uma tarefa usando o roteamento ativo para a função correspondente */
export async function executeAiTask(options: {
  featureKey: AiFeatureKey;
  prompt: string;
  systemPrompt?: string;
  temperature?: number;
  imageBase64?: string;
  audioBlob?: Blob;
}): Promise<{
  text?: string;
  imageUrl?: string;
  providerUsed: AiProviderType;
  modelUsed: string;
  durationMs: number;
}> {
  const { featureKey, prompt, systemPrompt, imageBase64, audioBlob } = options;
  const config = getAiFeaturesRouting()[featureKey];
  const baseUrl = localStorage.getItem('omniroute_test_base_url') || OMNIROUTE_DEFAULT_BASE_URL;
  const apiKey = await getOmniRouteApiKey();

  const start = performance.now();

  // Se a função for Narração TTS, OmniRoute não atua (orientação do usuário)
  if (featureKey === 'narracao_vademecum' || config.provider === 'gemini_propria') {
    return {
      text: `[Execução via Chave Própria Gemini / Motor Nativo para ${featureKey}]`,
      providerUsed: 'gemini_propria',
      modelUsed: config.selectedModel,
      durationMs: Math.round(performance.now() - start),
    };
  }

  // Execução via OmniRoute (Preferência 1)
  const cleanUrl = baseUrl.trim().replace(/\/+$/, '');

  // 1. Geração de Imagem
  if (featureKey === 'geracao_imagens') {
    try {
      const res = await fetch(`${cleanUrl}/images/generations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey.trim()}`,
        },
        body: JSON.stringify({
          prompt,
          model: config.selectedModel,
          n: 1,
          size: '1024x1024',
        }),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const elapsed = Math.round(performance.now() - start);
      const data = await res.json();
      const url = data?.data?.[0]?.url || (data?.data?.[0]?.b64_json ? `data:image/png;base64,${data.data[0].b64_json}` : undefined);
      return {
        imageUrl: url,
        text: 'Imagem gerada com sucesso!',
        providerUsed: 'omniroute',
        modelUsed: config.selectedModel,
        durationMs: elapsed,
      };
    } catch (err) {
      console.warn(`[OmniRoute] Falha ao gerar imagem com ${config.selectedModel}. Tentando fallback para 3.1 Flash Light...`);
      // Fallback
      const res = await fetch(`${cleanUrl}/images/generations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey.trim()}`,
        },
        body: JSON.stringify({
          prompt,
          model: 'antigravity/gemini-3.1-flash-light',
          n: 1,
          size: '1024x1024',
        }),
      });

      const elapsed = Math.round(performance.now() - start);
      if (!res.ok) {
        const errorText = await res.text().catch(() => '');
        throw new Error(`Fallback Falhou [HTTP ${res.status}]: ${errorText}`);
      }

      const data = await res.json();
      const url = data?.data?.[0]?.url || (data?.data?.[0]?.b64_json ? `data:image/png;base64,${data.data[0].b64_json}` : undefined);
      return {
        imageUrl: url,
        text: 'Imagem gerada com sucesso! (Fallback)',
        providerUsed: 'omniroute',
        modelUsed: 'antigravity/gemini-3.1-flash-light',
        durationMs: elapsed,
      };
    }
  }

  // 2. Transcrição de Áudio
  if (featureKey === 'transcricao_audio' && audioBlob) {
    const ext = audioBlob.type.includes('webm') ? 'webm' : audioBlob.type.includes('mp3') ? 'mp3' : 'wav';
    const fileToSend = new File([audioBlob], `audio_${Date.now()}.${ext}`, { type: audioBlob.type || 'audio/webm' });
    const formData = new FormData();
    formData.append('file', fileToSend);
    formData.append('model', config.selectedModel);

    try {
      const res = await fetch(`${cleanUrl}/audio/transcriptions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey.trim()}`,
        },
        body: formData,
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const elapsed = Math.round(performance.now() - start);
      const data = await res.json();
      return {
        text: data?.text || data?.transcription || JSON.stringify(data),
        providerUsed: 'omniroute',
        modelUsed: config.selectedModel,
        durationMs: elapsed,
      };
    } catch (err) {
      console.warn(`[OmniRoute] Falha ao transcrever com ${config.selectedModel}. Tentando fallback para 3.1 Flash Light...`);
      const fallbackFormData = new FormData();
      fallbackFormData.append('file', fileToSend);
      fallbackFormData.append('model', 'antigravity/gemini-3.1-flash-light');
      
      const res = await fetch(`${cleanUrl}/audio/transcriptions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey.trim()}`,
        },
        body: fallbackFormData,
      });

      const elapsed = Math.round(performance.now() - start);
      if (!res.ok) {
        const errorText = await res.text().catch(() => '');
        throw new Error(`Fallback Falhou [HTTP ${res.status}]: ${errorText}`);
      }

      const data = await res.json();
      return {
        text: data?.text || data?.transcription || JSON.stringify(data),
        providerUsed: 'omniroute',
        modelUsed: 'antigravity/gemini-3.1-flash-light',
        durationMs: elapsed,
      };
    }
  }

  // 3. Visão Computacional / OCR
  if (featureKey === 'visao_documentos' && imageBase64) {
    try {
      const res = await fetch(`${cleanUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey.trim()}`,
        },
        body: JSON.stringify({
          model: config.selectedModel,
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: prompt },
                { type: 'image_url', image_url: { url: imageBase64 } },
              ],
            },
          ],
        }),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const elapsed = Math.round(performance.now() - start);
      const data = await res.json();
      return {
        text: data?.choices?.[0]?.message?.content || 'Sem resposta gerada.',
        providerUsed: 'omniroute',
        modelUsed: config.selectedModel,
        durationMs: elapsed,
      };
    } catch (err) {
      console.warn(`[OmniRoute] Falha ao analisar visão com ${config.selectedModel}. Tentando fallback para 3.1 Flash Light...`);
      const res = await fetch(`${cleanUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey.trim()}`,
        },
        body: JSON.stringify({
          model: 'antigravity/gemini-3.1-flash-light',
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: prompt },
                { type: 'image_url', image_url: { url: imageBase64 } },
              ],
            },
          ],
        }),
      });

      const elapsed = Math.round(performance.now() - start);
      if (!res.ok) {
        const errorText = await res.text().catch(() => '');
        throw new Error(`Fallback Falhou [HTTP ${res.status}]: ${errorText}`);
      }

      const data = await res.json();
      return {
        text: data?.choices?.[0]?.message?.content || 'Sem resposta gerada.',
        providerUsed: 'omniroute',
        modelUsed: 'antigravity/gemini-3.1-flash-light',
        durationMs: elapsed,
      };
    }
  }

  // 4. Chat & Resumo Jurídico (Texto)
  const messages: Array<{ role: string; content: string | any[] }> = [];
  if (systemPrompt) {
    messages.push({ role: 'system', content: systemPrompt });
  }
  messages.push({ role: 'user', content: prompt });

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);
    
    const payload: any = {
        model: config.selectedModel,
        messages,
        temperature: options.temperature ?? 0.7,
        tools: [{
          type: "function",
          function: {
            name: "search_web",
            description: "Faça pesquisas na internet",
            parameters: {
              type: "object",
              properties: { query: { type: "string" } },
              required: ["query"]
            }
          }
        }]
    };

    let res = await fetch(`${cleanUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey.trim()}`,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    
    let data = await res.json();
    
    if (res.ok && data?.choices?.[0]?.message?.tool_calls) {
       const toolCall = data.choices[0].message.tool_calls[0];
       if (toolCall.function.name === 'search_web') {
         const args = JSON.parse(toolCall.function.arguments);
         messages.push(data.choices[0].message);
         
         try {
           const searchRes = await supabase.functions.invoke('omniroute-web-search', { body: { query: args.query } });
           const searchTxt = searchRes.data?.result || 'Sem resultados na internet.';
           
           messages.push({
             role: 'tool',
             tool_call_id: toolCall.id,
             name: 'search_web',
             content: searchTxt
           });
           
           res = await fetch(`${cleanUrl}/chat/completions`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey.trim()}`,
              },
              body: JSON.stringify({ ...payload, messages }),
              signal: controller.signal,
           });
           data = await res.json();
         } catch (e) {
           console.warn("Falha na tool search_web", e);
         }
       }
    }
    
    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const elapsed = Math.round(performance.now() - start);
    return {
      text: data?.choices?.[0]?.message?.content || 'Sem resposta gerada.',
      providerUsed: 'omniroute',
      modelUsed: config.selectedModel,
      durationMs: elapsed,
    };
  } catch (err) {
    console.warn(`[OmniRoute] Falha no texto com ${config.selectedModel}. Tentando fallback para 3.1 Flash Light...`);
    try {
      const controllerFallback = new AbortController();
      const timeoutIdFallback = setTimeout(() => controllerFallback.abort(), 6000);

      const res = await fetch(`${cleanUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey.trim()}`,
        },
        body: JSON.stringify({
          model: 'antigravity/gemini-3.1-flash-light',
          messages,
          temperature: options.temperature ?? 0.7,
        }),
        signal: controllerFallback.signal,
      });
      clearTimeout(timeoutIdFallback);

      const elapsed = Math.round(performance.now() - start);
      if (!res.ok) {
        const errorText = await res.text().catch(() => '');
        throw new Error(`Fallback Falhou [HTTP ${res.status}]: ${errorText}`);
      }

      const data = await res.json();
      return {
        text: data?.choices?.[0]?.message?.content || 'Sem resposta gerada.',
        providerUsed: 'omniroute',
        modelUsed: 'antigravity/gemini-3.1-flash-light',
        durationMs: elapsed,
      };
    } catch (fallbackErr) {
      console.warn('[OmniRoute] Falha em todos os endpoints de texto:', fallbackErr);
      throw fallbackErr;
    }
  }
}
