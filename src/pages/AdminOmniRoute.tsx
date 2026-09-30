import { useState, useEffect } from 'react';
import { ArrowLeft, Save, Server, Key, Link as LinkIcon, Cpu } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

export default function AdminOmniRoute() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState({
    baseUrl: 'http://localhost:20128/v1',
    apiKey: '',
    defaultModel: 'openrouter/auto',
    enabled: false
  });
  const [models, setModels] = useState<{ id: string }[]>([]);
  const [fetchingModels, setFetchingModels] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('omniroute_config');
    if (saved) {
      try {
        setConfig(JSON.parse(saved));
      } catch (e) {}
    }
  }, []);

  useEffect(() => {
    async function loadModels() {
      if (!config.baseUrl) return;
      setFetchingModels(true);
      try {
        const url = config.baseUrl.endsWith('/v1') 
          ? `${config.baseUrl}/models` 
          : `${config.baseUrl.replace(/\/$/, '')}/v1/models`;
        
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (config.apiKey) headers['Authorization'] = `Bearer ${config.apiKey}`;
        
        const res = await fetch(url, { headers });
        if (res.ok) {
          const data = await res.json();
          if (data && data.data && Array.isArray(data.data)) {
            setModels(data.data);
          }
        }
      } catch (e) {
        console.error('Failed to load models', e);
      } finally {
        setFetchingModels(false);
      }
    }
    
    const timer = setTimeout(loadModels, 1000);
    return () => clearTimeout(timer);
  }, [config.baseUrl, config.apiKey]);

  const handleSave = () => {
    setLoading(true);
    try {
      localStorage.setItem('omniroute_config', JSON.stringify(config));
      toast.success('Configurações do OmniRoute salvas com sucesso!');
    } catch (e: any) {
      toast.error('Erro ao salvar configurações.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground pb-24">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-white/10 pt-safe">
        <div className="flex h-14 items-center px-4 gap-3">
          <button
            onClick={() => navigate('/admin')}
            className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/5 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-white/70" />
          </button>
          <div className="flex-1">
            <h1 className="font-display text-xl font-bold tracking-wider uppercase">OmniRoute API</h1>
          </div>
        </div>
      </header>

      <div className="p-4 max-w-3xl mx-auto space-y-6 mt-4">
        
        <div className="bg-[#1C1C1E] border border-white/10 p-5 rounded-2xl shadow-xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-semibold text-lg">Configuração do Gateway</h2>
              <p className="text-sm text-white/50">Roteador de API unificado (OpenAI compatível)</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-xl border border-white/10 bg-black/20">
              <div>
                <p className="font-medium text-sm">Habilitar OmniRoute</p>
                <p className="text-xs text-white/50">Redirecionar requisições AI locais para este gateway</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="sr-only peer"
                  checked={config.enabled}
                  onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
                />
                <div className="w-11 h-6 bg-white/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm text-white/70 flex items-center gap-2">
                <LinkIcon className="w-4 h-4" /> Base URL
              </label>
              <input
                type="text"
                value={config.baseUrl}
                onChange={(e) => setConfig({ ...config, baseUrl: e.target.value })}
                placeholder="http://localhost:20128/v1"
                className="w-full h-11 px-4 rounded-xl bg-black/30 border border-white/15 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all font-mono text-sm"
              />
              <p className="text-xs text-white/40 ml-1">URL local do OmniRoute ou gateway na nuvem.</p>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm text-white/70 flex items-center gap-2">
                <Key className="w-4 h-4" /> API Key
              </label>
              <input
                type="password"
                value={config.apiKey}
                onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
                placeholder="sk-or-v1-..."
                className="w-full h-11 px-4 rounded-xl bg-black/30 border border-white/15 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all font-mono text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm text-white/70 flex items-center gap-2">
                <Cpu className="w-4 h-4" /> Modelo Padrão (Fallback)
                {fetchingModels && <span className="text-xs text-white/40 animate-pulse">(buscando modelos...)</span>}
              </label>
              {models.length > 0 ? (
                <div className="relative">
                  <select
                    value={config.defaultModel}
                    onChange={(e) => setConfig({ ...config, defaultModel: e.target.value })}
                    className="w-full h-11 px-4 rounded-xl bg-black/30 border border-white/15 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all font-mono text-sm appearance-none"
                  >
                    <option value="openrouter/auto">openrouter/auto</option>
                    {models.map(m => (
                      <option key={m.id} value={m.id}>{m.id}</option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-white/50">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                  </div>
                </div>
              ) : (
                <input
                  type="text"
                  value={config.defaultModel}
                  onChange={(e) => setConfig({ ...config, defaultModel: e.target.value })}
                  placeholder="openrouter/auto"
                  className="w-full h-11 px-4 rounded-xl bg-black/30 border border-white/15 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all font-mono text-sm"
                />
              )}
            </div>
          </div>
        </div>

        <div className="bg-primary/10 border border-primary/20 p-5 rounded-2xl flex flex-col gap-2">
          <h3 className="font-semibold text-primary">Como usar o OmniRoute</h3>
          <p className="text-sm text-white/70">
            O OmniRoute atua como um hub central. Quando habilitado, o Vacatio enviará todas as chamadas client-side de Inteligência Artificial para este endpoint compatível com a API da OpenAI.
            Certifique-se de estar rodando o servidor OmniRoute na mesma rede caso utilize <b>localhost</b>.
          </p>
        </div>

        <div className="pt-4">
          <button
            onClick={handleSave}
            disabled={loading}
            className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-semibold flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            <Save className="w-5 h-5" />
            {loading ? 'Salvando...' : 'Salvar Configurações'}
          </button>
        </div>

      </div>
    </div>
  );
}
