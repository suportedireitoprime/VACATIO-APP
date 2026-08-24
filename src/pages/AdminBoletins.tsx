import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import DesktopPageLayout from '@/components/layout/DesktopPageLayout';
import { PageHeader } from '@/components/vademecum/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2, Sparkles, Play, Film, Download, Youtube, RefreshCw, ExternalLink } from 'lucide-react';
import { useSharedGithubRepo } from '@/hooks/useSharedGithubRepo';
import BoletimPlayer, { type BoletimScene } from '@/components/boletim/BoletimPlayer';

const VOZES = [
  { id: 'Sulafat', label: 'Sulafat — Feminina, calorosa' },
  { id: 'Kore', label: 'Kore — Feminina, firme' },
  { id: 'Aoede', label: 'Aoede — Feminina, leve' },
  { id: 'Leda', label: 'Leda — Feminina, jovem' },
  { id: 'Zephyr', label: 'Zephyr — Feminina, brilhante' },
  { id: 'Autonoe', label: 'Autonoe — Feminina, animada' },
  { id: 'Laomedeia', label: 'Laomedeia — Feminina, alegre' },
  { id: 'Puck', label: 'Puck — Masculina, animada' },
  { id: 'Charon', label: 'Charon — Masculina, grave' },
  { id: 'Fenrir', label: 'Fenrir — Masculina, energética' },
  { id: 'Algenib', label: 'Algenib — Masculina, entusiasta' },
];

export default function AdminBoletins() {
  const navigate = useNavigate();
  const [cfg, setCfg] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [gerando, setGerando] = useState(false);
  const [boletins, setBoletins] = useState<any[]>([]);
  const [player, setPlayer] = useState<{ id: string; scenes: BoletimScene[]; youtubeUrl?: string } | null>(null);
  const { repo, setRepo } = useSharedGithubRepo('');
  const [rendering, setRendering] = useState<string | null>(null);

  const load = async () => {
    const [c, b] = await Promise.all([
      supabase.from('boletim_config').select('*').eq('id', 1).maybeSingle(),
      supabase.from('boletins_juridicos').select('*').order('created_at', { ascending: false }).limit(40),
    ]);
    setCfg(c.data);
    // Deduplica por data_ref + tipo, mantendo o mais recente (a query já vem desc).
    const seen = new Set<string>();
    const unique = (b.data || []).filter((row: any) => {
      const key = `${row.data_ref}::${row.tipo || 'juridico'}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    setBoletins(unique);
  };


  useEffect(() => { load(); }, []);

  const salvar = async () => {
    setSaving(true);
    const { error } = await supabase.from('boletim_config').update({
      voz_id: cfg.voz_id,
      voz_genero: cfg.voz_genero,
      prompt_tts_extra: cfg.prompt_tts_extra,
      horario_geracao: cfg.horario_geracao,
      max_normas: cfg.max_normas,
      ativo: cfg.ativo,
      enviar_push: cfg.enviar_push,
      noticias_ativo: cfg.noticias_ativo,
      noticias_horario: cfg.noticias_horario,
      noticias_voz_id: cfg.noticias_voz_id,
      noticias_max_itens: cfg.noticias_max_itens,
      noticias_prompt_tts_extra: cfg.noticias_prompt_tts_extra,
    }).eq('id', 1);
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success('Configuração salva');
  };

  const gerarAgora = async () => {
    setGerando(true);
    toast.info('Gerando boletim... isso leva ~1 min');
    const { data, error } = await supabase.functions.invoke('boletim-juridico-gerar', { body: {} });
    setGerando(false);
    if (error) { toast.error(error.message); return; }
    toast.success(`Boletim gerado (${data.cenas} cenas, ${data.duracao_s}s)`);
    load();
  };

  const [gerandoNoticias, setGerandoNoticias] = useState(false);
  const gerarNoticias = async () => {
    setGerandoNoticias(true);
    toast.info('Gerando boletim de notícias… ~1 min');
    const { data, error } = await supabase.functions.invoke('boletim-noticias-gerar', { body: {} });
    setGerandoNoticias(false);
    if (error) { toast.error(error.message); return; }
    toast.success(`Boletim de notícias gerado (${data.cenas} cenas, ${data.duracao_s}s)`);
    load();
  };


  const renderizarMp4 = async (boletim_id: string) => {
    if (!repo) { toast.error('Configure o repositório GitHub abaixo (ex.: usuario/repo)'); return; }
    setRendering(boletim_id);
    const { data, error } = await supabase.functions.invoke('boletim-render-trigger', { body: { boletim_id, repo } });
    setRendering(null);
    if (error) { toast.error(error.message); return; }
    toast.success('Render disparado no GitHub Actions. Aguarde ~5 min e recarregue.');
    load();
  };

  const reuploadYoutube = async (boletim_id: string) => {
    setRendering(boletim_id);
    const { error } = await supabase.functions.invoke('boletim-youtube-upload', { body: { boletim_id } });
    setRendering(null);
    if (error) { toast.error(error.message); return; }
    toast.success('Upload para YouTube disparado. Aguarde ~2 min e recarregue.');
    load();
  };

  const resetarStatus = async (boletim_id: string) => {
    const { error } = await supabase
      .from('boletins_juridicos')
      .update({ status: 'pronto' })
      .eq('id', boletim_id);
    if (error) { toast.error(error.message); return; }
    toast.success('Status resetado. Você pode disparar o render novamente.');
    load();
  };

  const header = <PageHeader title="Boletins Jurídicos" subtitle="Configuração e geração" onBack={() => navigate('/admin-funcoes')} />;

  if (!cfg) return <DesktopPageLayout activeId="ferramentas" title="Boletins Jurídicos" mobileHeader={header}><div className="p-6 text-center opacity-60">Carregando…</div></DesktopPageLayout>;

  return (
    <DesktopPageLayout activeId="ferramentas" title="Boletins Jurídicos" mobileHeader={header}>
      <div className="px-4 sm:px-6 py-4 lg:px-0 space-y-6">
        {/* Ação principal */}
        <div className="rounded-2xl p-5 bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/30">
          <div className="flex items-center gap-3 mb-3">
            <Sparkles className="w-6 h-6 text-primary" />
            <div>
              <p className="font-display font-bold text-lg">Gerar boletim de hoje</p>
              <p className="text-xs text-muted-foreground">Roteiro + narração TTS · usa até {cfg.max_normas} normas recentes</p>
            </div>
          </div>
          <Button onClick={gerarAgora} disabled={gerando} size="lg" className="w-full">
            {gerando ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Gerando…</> : 'Gerar agora'}
          </Button>
        </div>

        {/* Boletim de Notícias */}
        <div className="rounded-2xl p-5 bg-gradient-to-br from-red-600/15 to-red-600/5 border border-red-600/30 space-y-4">
          <div className="flex items-center gap-3">
            <Sparkles className="w-6 h-6 text-red-500" />
            <div>
              <p className="font-display font-bold text-lg">Boletim de Notícias</p>
              <p className="text-xs text-muted-foreground">
                Top {cfg.noticias_max_itens || 10} manchetes do dia com lead persuasivo · gera às {String(cfg.noticias_horario || '07:00:00').slice(0, 5)}
              </p>
            </div>
          </div>
          <Button onClick={gerarNoticias} disabled={gerandoNoticias} size="lg" className="w-full bg-red-600 hover:bg-red-700 text-white">
            {gerandoNoticias ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Gerando…</> : 'Gerar notícias de hoje'}
          </Button>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Voz (notícias)</Label>
              <Select value={cfg.noticias_voz_id || 'Kore'} onValueChange={(v) => setCfg({ ...cfg, noticias_voz_id: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {VOZES.map(v => <SelectItem key={v.id} value={v.id}>{v.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Horário</Label>
              <Input type="time" value={String(cfg.noticias_horario || '07:00:00').slice(0, 5)} onChange={(e) => setCfg({ ...cfg, noticias_horario: e.target.value + ':00' })} />
            </div>
          </div>
          <div>
            <Label>Manchetes por boletim</Label>
            <Input type="number" min={3} max={15} value={cfg.noticias_max_itens || 10} onChange={(e) => setCfg({ ...cfg, noticias_max_itens: parseInt(e.target.value) || 10 })} />
          </div>
          <div>
            <Label>Prompt de entonação (TTS)</Label>
            <Textarea rows={3} value={cfg.noticias_prompt_tts_extra || ''} onChange={(e) => setCfg({ ...cfg, noticias_prompt_tts_extra: e.target.value })} />
          </div>
          <div className="flex items-center justify-between">
            <Label>Ativo (gera todo dia automaticamente)</Label>
            <Switch checked={!!cfg.noticias_ativo} onCheckedChange={(v) => setCfg({ ...cfg, noticias_ativo: v })} />
          </div>
        </div>

        {/* Render MP4 (GitHub Actions) */}
        <div className="rounded-2xl p-5 bg-card border border-border space-y-3">
          <div className="flex items-center gap-2">
            <Film className="w-5 h-5 text-primary" />
            <p className="font-display font-bold">Render MP4 (Remotion + GitHub Actions)</p>
          </div>
          <p className="text-xs text-muted-foreground">Gera um arquivo MP4 vertical (1080×1920) do boletim para compartilhar.</p>
          <div>
            <Label>Repositório GitHub</Label>
            <Input placeholder="usuario/repositorio" value={repo} onChange={(e) => setRepo(e.target.value)} />
          </div>
        </div>

        {/* Configuração */}
        <div className="rounded-2xl p-5 bg-card border border-border space-y-4">
          <p className="font-display font-bold">Configuração</p>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Voz</Label>
              <Select value={cfg.voz_id} onValueChange={(v) => setCfg({ ...cfg, voz_id: v, voz_genero: v === 'Puck' || v === 'Charon' || v === 'Fenrir' || v === 'Algenib' ? 'masculina' : 'feminina' })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {VOZES.map(v => <SelectItem key={v.id} value={v.id}>{v.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Horário</Label>
              <Input type="time" value={String(cfg.horario_geracao).slice(0, 5)} onChange={(e) => setCfg({ ...cfg, horario_geracao: e.target.value + ':00' })} />
            </div>
          </div>

          <div>
            <Label>Máximo de normas</Label>
            <Input type="number" min={1} max={10} value={cfg.max_normas} onChange={(e) => setCfg({ ...cfg, max_normas: parseInt(e.target.value) || 6 })} />
          </div>

          <div>
            <Label>Prompt de entonação (TTS)</Label>
            <Textarea rows={4} value={cfg.prompt_tts_extra} onChange={(e) => setCfg({ ...cfg, prompt_tts_extra: e.target.value })} />
          </div>

          <div className="flex items-center justify-between">
            <Label>Ativo (geração automática diária)</Label>
            <Switch checked={cfg.ativo} onCheckedChange={(v) => setCfg({ ...cfg, ativo: v })} />
          </div>
          <div className="flex items-center justify-between">
            <Label>Enviar push quando pronto</Label>
            <Switch checked={cfg.enviar_push} onCheckedChange={(v) => setCfg({ ...cfg, enviar_push: v })} />
          </div>

          <Button onClick={salvar} disabled={saving} className="w-full">
            {saving ? 'Salvando…' : 'Salvar configuração'}
          </Button>
        </div>

        {/* Repositório GitHub (compartilhado com Secrets/Native Assets) */}
        <div className="rounded-2xl p-5 bg-card border border-border space-y-3">
          <div className="flex items-center justify-between">
            <p className="font-display font-bold">Repositório GitHub</p>
            {repo && <span className="text-[10px] bg-emerald-500/15 text-emerald-500 px-2 py-0.5 rounded font-bold">VINCULADO</span>}
          </div>
          <p className="text-xs text-muted-foreground">
            Usado pelo GitHub Actions para renderizar o MP4. Compartilhado com Secrets e Native Assets — configure em um lugar só.
          </p>
          <div className="flex gap-2">
            <Input
              placeholder="usuario/repo"
              value={repo}
              onChange={(e) => setRepo(e.target.value)}
              onBlur={(e) => setRepo(e.target.value, { normalize: true })}
              className="flex-1"
            />
            <Button
              variant="outline"
              size="sm"
              type="button"
              onClick={() => {
                const saved = (typeof window !== 'undefined' && localStorage.getItem('admin_github_repo')) || '';
                if (!saved) { toast.error('Nenhum repositório salvo em Secrets ainda.'); return; }
                setRepo(saved, { normalize: true });
                toast.success(`Vinculado: ${saved}`);
              }}
            >
              Usar o de Secrets
            </Button>
          </div>
          <button
            type="button"
            onClick={() => navigate('/admin-secrets-download')}
            className="text-xs text-primary hover:underline"
          >
            Abrir painel de Secrets →
          </button>
        </div>

        {/* Últimos boletins */}
        <div className="rounded-2xl p-4 sm:p-5 bg-card border border-border">
          <div className="flex items-center justify-between mb-4">
            <p className="font-display font-bold">Últimos boletins</p>
            <span className="text-xs text-muted-foreground">{boletins.length} {boletins.length === 1 ? 'boletim' : 'boletins'}</span>
          </div>
          <div className="space-y-3">
            {boletins.map(b => {
              const isNoticias = b.tipo === 'noticias';
              const statusLabel =
                b.status === 'pronto' ? 'Pronto' :
                b.status === 'gerando' ? 'Gerando roteiro' :
                b.status === 'renderizando' ? 'Renderizando vídeo' :
                b.status === 'erro' ? 'Erro' : b.status;
              const statusColor =
                b.status === 'pronto' ? 'bg-emerald-500/15 text-emerald-500' :
                b.status === 'erro' ? 'bg-destructive/15 text-destructive' :
                'bg-amber-500/15 text-amber-500';
              const dataFmt = b.data_ref ? new Date(b.data_ref + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }) : '';
              return (
                <div key={b.id} className="flex flex-col gap-3 p-4 rounded-xl bg-muted/40 border border-border/50">
                  {/* Cabeçalho: título + tags */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded ${isNoticias ? 'bg-blue-500/15 text-blue-500' : 'bg-primary/15 text-primary'}`}>
                        {isNoticias ? 'Notícias' : 'Jurídico'}
                      </span>
                      <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded ${statusColor}`}>
                        {statusLabel}
                      </span>
                      {b.youtube_url && (
                        <span className="inline-flex items-center gap-1 text-[10px] bg-red-600/20 text-red-500 px-2 py-0.5 rounded font-bold uppercase tracking-wide">
                          <Youtube className="w-3 h-3" /> YouTube
                        </span>
                      )}
                    </div>
                    <p className="font-semibold text-sm sm:text-base leading-snug break-words">{b.titulo}</p>
                    <p className="text-xs text-muted-foreground">
                      {dataFmt}
                      {typeof b.duracao_s === 'number' && b.duracao_s > 0 && ` · ${b.duracao_s} segundos`}
                    </p>
                  </div>

                  {/* Ações */}
                  <div className="flex flex-wrap gap-2">
                    {Array.isArray(b.roteiro_json) && b.roteiro_json.length > 0 && (
                      <Button size="sm" variant="secondary" className="flex-1 sm:flex-none min-w-[110px]" onClick={() => setPlayer({ id: b.id, scenes: b.roteiro_json, youtubeUrl: b.youtube_url })}>
                        <Play className="w-4 h-4 mr-1.5" /> Ouvir
                      </Button>
                    )}
                    {b.youtube_url ? (
                      <a href={b.youtube_url} target="_blank" rel="noreferrer" className="flex-1 sm:flex-none">
                        <Button size="sm" variant="outline" className="w-full min-w-[130px]">
                          <ExternalLink className="w-4 h-4 mr-1.5" /> Ver no YouTube
                        </Button>
                      </a>
                    ) : b.video_url ? (
                      <a href={b.video_url} target="_blank" rel="noreferrer" className="flex-1 sm:flex-none">
                        <Button size="sm" variant="outline" className="w-full min-w-[130px]">
                          <Download className="w-4 h-4 mr-1.5" /> Baixar vídeo
                        </Button>
                      </a>
                    ) : (
                      <Button size="sm" variant="outline" className="flex-1 sm:flex-none min-w-[130px]" disabled={rendering === b.id} onClick={() => renderizarMp4(b.id)}>
                        {rendering === b.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Film className="w-4 h-4 mr-1.5" /> Renderizar vídeo</>}
                      </Button>
                    )}
                    {(b.youtube_url || b.video_url || b.status === 'renderizando' || b.status === 'erro') && (
                      <Button size="sm" variant="ghost" className="flex-1 sm:flex-none" disabled={rendering === b.id} onClick={() => (b.youtube_url || b.video_url) ? reuploadYoutube(b.id) : resetarStatus(b.id)}>
                        {(b.youtube_url || b.video_url) ? <><RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Reenviar ao YouTube</> : 'Resetar status'}
                      </Button>
                    )}
                  </div>

                  {b.status === 'erro' && b.erro && (
                    <p className="text-xs text-destructive/90 break-words bg-destructive/5 rounded-lg p-2">
                      <strong>Erro:</strong> {b.erro}
                    </p>
                  )}
                </div>
              );
            })}
            {boletins.length === 0 && <p className="text-sm opacity-60">Nenhum boletim gerado ainda.</p>}
          </div>
        </div>

      </div>

      {player && <BoletimPlayer boletimId={player.id} scenes={player.scenes} youtubeUrl={player.youtubeUrl || undefined} onClose={() => setPlayer(null)} />}
    </DesktopPageLayout>
  );
}