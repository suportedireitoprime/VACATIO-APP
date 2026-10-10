import { supabase } from '@/integrations/supabase/client';

export interface OmniRouteConfig {
  baseUrl: string;
  apiKey: string;
  defaultModel: string;
  enabled: boolean;
}

export type OmniModelComplexity = 'low' | 'medium' | 'high' | 'tiered';

export const OMNI_MODELS: Record<OmniModelComplexity, string> = {
  low: 'antigravity/gemini-3.7-flash-low',
  medium: 'antigravity/gemini-3.7-flash-medium',
  high: 'antigravity/gemini-3.7-flash-high',
  tiered: 'antigravity/gemini-3.7-flash-tiered',
};

export function getOmniRouteConfig(): OmniRouteConfig {
  // Ignora completamente o localStorage para evitar configs antigas/quebradas
  // Força o uso do Railway que acabamos de validar que funciona perfeitamente
  return {
    baseUrl: 'https://omniroute-production-fb57.up.railway.app/v1',
    apiKey: 'sk-03fcfd719bf0cc25-19fbd7-028392e5',
    defaultModel: 'antigravity/gemini-3.7-flash-high',
    enabled: true
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

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (config.apiKey) headers['Authorization'] = `Bearer ${config.apiKey}`;

  const messages = [];
  if (systemPrompt) {
    messages.push({ role: 'system', content: systemPrompt });
  }
  messages.push({ role: 'user', content: prompt });

  const finalModel = modelOverride || (complexity ? OMNI_MODELS[complexity] : config.defaultModel) || 'omniroute/auto';

  const body = JSON.stringify({
    model: finalModel,
    messages,
    temperature
  });

  const res = await fetch(url, { method: 'POST', headers, body });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OmniRoute Error: ${res.status} - ${err}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
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

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (config.apiKey) headers['Authorization'] = `Bearer ${config.apiKey}`;

  const finalModel = modelOverride || (complexity ? OMNI_MODELS[complexity] : config.defaultModel) || 'omniroute/auto';

  const body = JSON.stringify({
    model: finalModel,
    messages,
    temperature
  });

  const res = await fetch(url, { method: 'POST', headers, body });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OmniRoute Chat Error: ${res.status} - ${err}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
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
