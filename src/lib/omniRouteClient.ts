import { supabase } from '@/integrations/supabase/client';

export interface OmniRouteConfig {
  baseUrl: string;
  apiKey: string;
  defaultModel: string;
  enabled: boolean;
}

export type OmniModelComplexity = 'low' | 'medium' | 'high' | 'tiered';

export const OMNI_MODELS: Record<OmniModelComplexity, string> = {
  low: 'antigravity/gemini-3.8-flash-tiered',
  medium: 'antigravity/gemini-3.8-flash-tiered',
  high: 'antigravity/gemini-3.8-flash-tiered',
  tiered: 'antigravity/gemini-3.8-flash-tiered',
};

export const DEFAULT_OMNIROUTE_URL = 'https://omniroute-production-fb57.up.railway.app/v1';
export const DEFAULT_OMNIROUTE_MODEL = 'antigravity/gemini-3.8-flash-tiered';

export function getOmniRouteConfig(): OmniRouteConfig {
  try {
    const raw = localStorage.getItem('omniroute_config');
    if (raw) {
      const config = JSON.parse(raw) as Partial<OmniRouteConfig>;
      let formattedUrl = config.baseUrl || DEFAULT_OMNIROUTE_URL;
      if (!/^https?:\/\//i.test(formattedUrl)) {
        formattedUrl = `https://${formattedUrl}`;
      }
      let model = config.defaultModel;
      if (!model || model.startsWith('openrouter/') || model === 'omniroute/auto' || model === 'auto') {
        model = DEFAULT_OMNIROUTE_MODEL;
      }
      return {
        enabled: config.enabled ?? true,
        baseUrl: formattedUrl,
        apiKey: config.apiKey || '',
        defaultModel: model,
      };
    }
  } catch (e) {
    console.error('Erro ao ler omniroute_config', e);
  }

  // Padrão do sistema: OmniRoute sempre ativo usando antigravity/gemini-3.8-flash-tiered
  return {
    enabled: true,
    baseUrl: DEFAULT_OMNIROUTE_URL,
    apiKey: '',
    defaultModel: DEFAULT_OMNIROUTE_MODEL,
  };
}

/**
 * Função para gerar texto usando o OmniRoute Gateway ou fallback para Supabase (Gemini puro)
 */
export async function generateOmniText({
  prompt,
  systemPrompt,
  temperature = 0.7,
  modelOverride,
  complexity
}: {
  prompt: string;
  systemPrompt?: string;
  temperature?: number;
  modelOverride?: string;
  complexity?: OmniModelComplexity;
}) {
  const config = getOmniRouteConfig();
  
  if (!config) {
    // Fallback: Se o OmniRoute não estiver configurado/habilitado, usa o Supabase/Gemini original
    console.log('OmniRoute desativado, usando Edge Function original...');
    const { data, error } = await supabase.functions.invoke('assistente-juridica', {
      body: { prompt, systemPrompt, temperature }
    });
    if (error) throw error;
    return data.text || data.response;
  }

  const url = config.baseUrl.endsWith('/v1')
    ? `${config.baseUrl}/chat/completions`
    : `${config.baseUrl.replace(/\/$/, '')}/v1/chat/completions`;

  const messages = [];
  if (systemPrompt) {
    messages.push({ role: 'system', content: systemPrompt });
  }
  messages.push({ role: 'user', content: prompt });

  const candidateModel = modelOverride || (complexity ? OMNI_MODELS[complexity] : config.defaultModel) || DEFAULT_OMNIROUTE_MODEL;
  const finalModel = (candidateModel.startsWith('openrouter/') || candidateModel === 'omniroute/auto' || candidateModel === 'auto')
    ? DEFAULT_OMNIROUTE_MODEL
    : candidateModel;

  const payload = {
    model: finalModel,
    messages
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 90000); // 90s timeout

  try {
    const { data, error } = await supabase.functions.invoke('assistente-juridica', {
      body: { 
        mode: 'omniroute_proxy',
        url,
        payload 
      }
    });
    clearTimeout(timeoutId);
    
    if (error) {
      console.error(`OmniRoute Proxy Error:`, error);
      throw new Error(`OmniRoute Proxy: ${error.message || JSON.stringify(error)}`);
    }

    let parsedData = data;
    if (typeof data === 'string') {
      try {
        parsedData = JSON.parse(data);
      } catch {
        parsedData = null;
      }
    }

    if (parsedData?.error) {
       throw new Error(`OmniRoute HTTP Error: ${JSON.stringify(parsedData.error)}`);
    }

    return parsedData?.choices?.[0]?.message?.content || (typeof data === 'string' ? data : '');
  } catch (err: any) {
    clearTimeout(timeoutId);
    console.error(`[OmniRoute] Falhou ou deu timeout:`, err);
    throw err;
  }
}

/**
 * Função para Chat contínuo (usado no Assistente Hórus)
 */
export async function generateOmniChat({
  messages,
  temperature = 0.7,
  modelOverride,
  complexity
}: {
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  temperature?: number;
  modelOverride?: string;
  complexity?: OmniModelComplexity;
}) {
  const config = getOmniRouteConfig();
  
  if (!config) {
    // Fallback Supabase/Gemini
    const { data, error } = await supabase.functions.invoke('assistente-juridica', {
      body: { messages, temperature }
    });
    if (error) throw error;
    return data.text || data.response;
  }

  const url = config.baseUrl.endsWith('/v1')
    ? `${config.baseUrl}/chat/completions`
    : `${config.baseUrl.replace(/\/$/, '')}/v1/chat/completions`;

  const candidateModel = modelOverride || (complexity ? OMNI_MODELS[complexity] : config.defaultModel) || DEFAULT_OMNIROUTE_MODEL;
  const finalModel = (candidateModel.startsWith('openrouter/') || candidateModel === 'omniroute/auto' || candidateModel === 'auto')
    ? DEFAULT_OMNIROUTE_MODEL
    : candidateModel;

  const payload = {
    model: finalModel,
    messages
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 90000);

  try {
    const { data, error } = await supabase.functions.invoke('assistente-juridica', {
      body: { 
        mode: 'omniroute_proxy',
        url,
        payload 
      }
    });
    clearTimeout(timeoutId);
    
    if (error) {
      console.error(`OmniRoute Chat Proxy Error:`, error);
      throw new Error(`OmniRoute Chat Proxy: ${error.message || JSON.stringify(error)}`);
    }

    let parsedData = data;
    if (typeof data === 'string') {
      try {
        parsedData = JSON.parse(data);
      } catch {
        parsedData = null;
      }
    }

    if (parsedData?.error) {
       throw new Error(`OmniRoute Chat HTTP Error: ${JSON.stringify(parsedData.error)}`);
    }

    return parsedData?.choices?.[0]?.message?.content || (typeof data === 'string' ? data : '');
  } catch (err: any) {
    clearTimeout(timeoutId);
    console.error(`[OmniRoute Chat] Falhou ou deu timeout:`, err);
    throw err;
  }
}

/**
 * Função para Chat com streaming em tempo real (Estilo ChatGPT)
 * Transmite tokens diretamente para callback conforme são gerados
 */
export async function generateOmniChatStream({
  messages,
  temperature = 0.7,
  modelOverride,
  complexity,
  onDelta,
  signal,
}: {
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  temperature?: number;
  modelOverride?: string;
  complexity?: OmniModelComplexity;
  onDelta: (textChunk: string, accumulated: string) => void;
  signal?: AbortSignal;
}): Promise<string> {
  const config = getOmniRouteConfig();

  const url = config.baseUrl.endsWith('/v1')
    ? `${config.baseUrl}/chat/completions`
    : `${config.baseUrl.replace(/\/$/, '')}/v1/chat/completions`;

  const candidateModel = modelOverride || (complexity ? OMNI_MODELS[complexity] : config.defaultModel) || DEFAULT_OMNIROUTE_MODEL;
  const finalModel = (candidateModel.startsWith('openrouter/') || candidateModel === 'omniroute/auto' || candidateModel === 'auto')
    ? DEFAULT_OMNIROUTE_MODEL
    : candidateModel;

  const payload = {
    model: finalModel,
    messages,
    stream: true,
    temperature
  };

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  const res = await fetch(`${supabaseUrl}/functions/v1/assistente-juridica`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': anonKey,
      'Authorization': `Bearer ${anonKey}`,
    },
    body: JSON.stringify({
      mode: 'omniroute_proxy',
      url,
      payload,
      stream: true
    }),
    signal
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Erro no streaming da IA (${res.status}): ${errorText}`);
  }

  const reader = res.body?.getReader();
  if (!reader) {
    throw new Error('ReadableStream não suportado pelo navegador');
  }

  const decoder = new TextDecoder();
  let buffer = '';
  let accumulated = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line || line.startsWith(':')) continue;
        if (line === 'data: [DONE]') continue;
        if (line.startsWith('data: ')) {
          const jsonStr = line.slice(6).trim();
          if (!jsonStr) continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              accumulated += delta;
              onDelta(delta, accumulated);
            }
          } catch {
            // Ignora linhas parciais ou inválidas
          }
        }
      }
    }

    if (buffer.trim().startsWith('data: ')) {
      const jsonStr = buffer.trim().slice(6).trim();
      if (jsonStr && jsonStr !== '[DONE]') {
        try {
          const parsed = JSON.parse(jsonStr);
          const delta = parsed.choices?.[0]?.delta?.content;
          if (delta) {
            accumulated += delta;
            onDelta(delta, accumulated);
          }
        } catch {}
      }
    }
  } catch (err: any) {
    if (signal?.aborted) return accumulated;
    console.warn('[Stream] Erro durante leitura dos chunks:', err);
    if (!accumulated) throw err;
  }

  // Se por alguma anomalia o stream não gerou nenhum texto, faz fallback para generateOmniChat
  if (!accumulated) {
    console.warn('[Stream] Stream vazio, acionando fallback síncrono');
    const fallbackText = await generateOmniChat({ messages, temperature, modelOverride, complexity });
    accumulated = fallbackText;
    onDelta(fallbackText, fallbackText);
  }

  return accumulated;
}


/**
 * Função para gerar imagens usando OmniRoute
 */
export async function generateOmniImage({
  prompt,
  modelOverride
}: {
  prompt: string;
  modelOverride?: string;
}) {
  const config = getOmniRouteConfig();
  
  if (!config) {
    // Fallback Supabase/Gemini Image
    const { data, error } = await supabase.functions.invoke('gerar-imagem-slide', {
      body: { prompt }
    });
    if (error) throw error;
    return data.url || data.image;
  }

  const url = config.baseUrl.endsWith('/v1')
    ? `${config.baseUrl}/images/generations`
    : `${config.baseUrl.replace(/\/$/, '')}/v1/images/generations`;

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (config.apiKey) headers['Authorization'] = `Bearer ${config.apiKey}`;

  const body = JSON.stringify({
    model: modelOverride || config.defaultModel || 'omniroute/auto',
    prompt,
    n: 1,
    size: '1024x1024'
  });

  const res = await fetch(url, { method: 'POST', headers, body });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OmniRoute Image Error: ${res.status} - ${err}`);
  }

  const data = await res.json();
  return data.data?.[0]?.url || data.data?.[0]?.b64_json || '';
}
