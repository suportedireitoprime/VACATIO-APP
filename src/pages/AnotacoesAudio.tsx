import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Mic, Square, Trash2, Loader2, Play, Pause, FileText, Sparkles, Download,
  PauseCircle, Radio, ChevronRight, Library, Smartphone, MessageCircle, Upload,
  X, Tag as TagIcon, Check,
} from 'lucide-react';
import { PageHeader } from '@/components/vademecum/PageHeader';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { useRecording, formatHms } from '@/contexts/RecordingContext';
import { motion, AnimatePresence } from 'framer-motion';

// ─────────────────────────────────────────────────────────────
// Tipos
// ─────────────────────────────────────────────────────────────

interface Recording {
  id: string;
  title: string;
  duration_ms: number;
  local_path: string | null;
  file_path: string | null;
  transcript: string | null;
  summary: any;
  status: string;
  mode: string;
  source: string;
  tags: string[];
  created_at: string;
}

type View = 'hub' | 'gravar' | 'lista' | 'resumo' | 'celular' | 'whatsapp';

const TAG_SUGESTOES = [
  'Direito Penal', 'Direito Civil', 'Direito Constitucional',
  'Direito Administrativo', 'Direito Tributário', 'Direito do Trabalho',
  'Direito Processual Civil', 'Direito Processual Penal',
  'Direito Empresarial', 'Direito Previdenciário', 'OAB', 'Concurso',
];

const WHATSAPP_FILE_HINT = /^(PTT|AUD)-\d{8}-WA/i;

// ─────────────────────────────────────────────────────────────
// Página principal
// ─────────────────────────────────────────────────────────────

export default function AnotacoesAudio() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialView = (searchParams.get('view') as View) || 'hub';
  const [view, setView] = useState<View>(initialView);
  const [droppedFile, setDroppedFile] = useState<File | null>(null);

  const goto = (v: View) => {
    setView(v);
    setSearchParams(v === 'hub' ? {} : { view: v });
  };

  const back = () => (view === 'hub' ? navigate(-1) : goto('hub'));

  // Desktop drag-and-drop: quando um áudio é solto na janela, cai aqui.
  useEffect(() => {
    const onDrop = (e: Event) => {
      const detail = (e as CustomEvent).detail as { file: File; target: string } | undefined;
      if (!detail || detail.target !== 'audio') return;
      setDroppedFile(detail.file);
      goto('celular');
      toast.success('Áudio pronto pra transcrever', { description: detail.file.name });
    };
    window.addEventListener('desktop:file-drop', onDrop);
    return () => window.removeEventListener('desktop:file-drop', onDrop);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const titleFor: Record<View, string> = {
    hub: 'Gravar aula',
    gravar: 'Gravar aula',
    lista: 'Minhas gravações',
    resumo: 'Gerar resumo',
    celular: 'Áudio do celular',
    whatsapp: 'Áudio do WhatsApp',
  };

  return (
    <div className="min-h-dvh bg-background">
      <PageHeader title={titleFor[view]} onBack={back} />
      <div className="mx-auto max-w-2xl px-4 pt-4 pb-32">
        <AnimatePresence mode="wait">
          <motion.div
            key={view}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18 }}
          >
            {view === 'hub' && <Hub goto={goto} />}
            {view === 'gravar' && <Gravar onDone={() => goto('lista')} />}
            {view === 'lista' && <Lista />}
            {view === 'resumo' && <Lista soPendentes />}
            {view === 'celular' && (
              <Importar
                source="celular"
                onDone={() => goto('lista')}
                initialFile={droppedFile}
                onInitialConsumed={() => setDroppedFile(null)}
              />
            )}
            {view === 'whatsapp' && <Importar source="whatsapp" onDone={() => goto('lista')} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}


// ─────────────────────────────────────────────────────────────
// HUB
// ─────────────────────────────────────────────────────────────

const HUB_ITENS: Array<{ id: View; label: string; desc: string; icon: any }> = [
  { id: 'gravar', label: 'Gravar aula', desc: 'Comece uma nova gravação com pausa e retomada', icon: Mic },
  { id: 'lista', label: 'Minhas gravações', desc: 'Ver, ouvir e gerenciar gravações salvas', icon: Library },
  { id: 'resumo', label: 'Gerar resumo da gravação', desc: 'Escolha uma gravação e gere resumo estruturado com IA', icon: Sparkles },
  { id: 'celular', label: 'Trazer áudio do celular', desc: 'Envie um arquivo de áudio salvo no seu aparelho', icon: Smartphone },
  { id: 'whatsapp', label: 'Trazer áudio do WhatsApp', desc: 'Compartilhe áudios de conversas direto pra cá', icon: MessageCircle },
];

function Hub({ goto }: { goto: (v: View) => void }) {
  return (
    <>
      <p className="mb-5 text-sm text-muted-foreground">
        Grave, importe e transforme aulas em resumos prontos pra estudar.
      </p>
      <div className="space-y-3">
        {HUB_ITENS.map((f, i) => {
          const Icon = f.icon;
          const primary = f.id === 'gravar';
          return (
            <motion.button
              key={f.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => goto(f.id)}
              className={`flex items-center gap-4 p-5 min-h-[80px] rounded-xl border w-full transition-all group text-left
                ${primary
                  ? 'bg-primary/10 border-primary/40 hover:border-primary'
                  : 'bg-card border-border hover:border-primary/40'}`}
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0
                ${primary ? 'bg-primary text-primary-foreground' : 'bg-primary/15 text-primary'}`}>
                <Icon className="w-6 h-6" strokeWidth={1.6} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-display text-base font-bold text-foreground group-hover:text-primary transition-colors">
                  {f.label}
                </p>
                <p className="text-sm text-muted-foreground mt-0.5 leading-tight">{f.desc}</p>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
            </motion.button>
          );
        })}
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// GRAVAR
// ─────────────────────────────────────────────────────────────

function Gravar({ onDone }: { onDone: () => void }) {
  const rec = useRecording();
  const isRec = rec.status === 'recording';
  const isPaused = rec.status === 'paused';
  const isSaving = rec.status === 'saving';

  return (
    <div className="rounded-3xl border border-border bg-card p-6">
      {rec.status === 'idle' ? (
        <>
          <Input
            placeholder="Título da aula (opcional)"
            value={rec.title}
            onChange={(e) => rec.setTitle(e.target.value)}
            className="mb-4"
          />
          <div className="flex justify-center">
            <Button size="lg" onClick={rec.start} className="h-16 w-16 rounded-full p-0">
              <Mic className="h-7 w-7" />
            </Button>
          </div>
          <p className="mt-3 text-center text-xs text-muted-foreground">Toque pra começar a gravar</p>
        </>
      ) : (
        <>
          <div className="mb-2 flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <Radio className={`h-3 w-3 ${isRec ? 'text-destructive animate-pulse' : ''}`} />
            {isRec ? 'Gravando' : isPaused ? 'Pausado' : 'Salvando…'}
            {rec.title && <> · <span className="max-w-[180px] truncate">{rec.title}</span></>}
          </div>
          <div className="mb-4 text-center text-5xl font-mono text-primary tabular-nums">
            {formatHms(rec.elapsedMs)}
          </div>
          <div className="flex justify-center gap-3">
            {isRec && (
              <Button size="lg" variant="outline" onClick={rec.pause}>
                <PauseCircle className="mr-2 h-5 w-5" /> Pausar
              </Button>
            )}
            {isPaused && (
              <Button size="lg" variant="outline" onClick={rec.resume}>
                <Play className="mr-2 h-5 w-5" /> Retomar
              </Button>
            )}
            <Button size="lg" variant="destructive" onClick={() => rec.stop().then(onDone)} disabled={isSaving}>
              {isSaving ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Square className="mr-2 h-5 w-5" />}
              Parar e salvar
            </Button>
          </div>
          <p className="mt-4 text-center text-[11px] text-muted-foreground">
            Você pode navegar pelo app — a gravação continua num card flutuante.
          </p>
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// IMPORTAR (celular / whatsapp)
// ─────────────────────────────────────────────────────────────

function Importar({
  source,
  onDone,
  initialFile,
  onInitialConsumed,
}: {
  source: 'celular' | 'whatsapp';
  onDone: () => void;
  initialFile?: File | null;
  onInitialConsumed?: () => void;
}) {

  const { user } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [autoResumo, setAutoResumo] = useState(true);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const isWA = source === 'whatsapp';

  // Recebe arquivo vindo do drag-and-drop do desktop
  useEffect(() => {
    if (initialFile) {
      onPick(initialFile);
      onInitialConsumed?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialFile]);


  const onPick = (f: File | null) => {
    if (!f) return;
    if (!/^audio\//.test(f.type) && !/\.(mp3|m4a|wav|ogg|opus|aac)$/i.test(f.name)) {
      return toast.error('Selecione um arquivo de áudio.');
    }
    if (f.size > 20 * 1024 * 1024) return toast.error('Máximo 20 MB.');
    setFile(f);
    if (!title) {
      const base = f.name.replace(/\.[^.]+$/, '');
      if (WHATSAPP_FILE_HINT.test(base)) {
        setTitle(`Áudio WhatsApp — ${new Date().toLocaleDateString('pt-BR')}`);
      } else {
        setTitle(base);
      }
    }
  };

  const addTag = (t: string) => {
    const clean = t.trim();
    if (!clean || tags.includes(clean)) return;
    setTags((prev) => [...prev, clean]);
    setTagInput('');
  };

  const removeTag = (t: string) => setTags((prev) => prev.filter((x) => x !== t));

  const enviar = async () => {
    if (!user) return toast.error('Faça login primeiro.');
    if (!file) return toast.error('Escolha um áudio.');
    setBusy(true);
    try {
      const ext = (file.name.split('.').pop() || 'mp3').toLowerCase();
      const path = `${user.id}/import-${Date.now()}.${ext}`;
      const up = await supabase.storage.from('aulas-audio').upload(path, file, { upsert: false, contentType: file.type || 'audio/mpeg' });
      if (up.error) throw up.error;

      const { data: inserted, error: insErr } = await supabase.from('audio_recordings').insert({
        user_id: user.id,
        title: title || file.name,
        duration_ms: 0,
        file_path: path,
        mode: 'import',
        source,
        tags,
        status: 'ready',
      }).select('id').single();
      if (insErr) throw insErr;

      toast.success('Áudio enviado! Transcrevendo…');
      const t0 = await supabase.functions.invoke('transcrever-audio', { body: { filePath: path, language: 'pt' } });
      if (t0.error) throw t0.error;
      const text = (t0.data as any)?.text ?? '';
      await supabase.from('audio_recordings').update({ transcript: text }).eq('id', inserted!.id);

      if (autoResumo && text) {
        toast.success('Transcrição pronta. Gerando resumo…');
        const r0 = await supabase.functions.invoke('gerar-resumo-aula', { body: { transcript: text, title: title || file.name } });
        if (!r0.error) {
          await supabase.from('audio_recordings').update({ summary: (r0.data as any)?.summary ?? {} }).eq('id', inserted!.id);
        }
      }
      toast.success('Tudo pronto!');
      onDone();
    } catch (e: any) {
      toast.error('Falha: ' + (e?.message ?? 'erro'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      {isWA && (
        <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/5 p-4 text-sm">
          <p className="font-semibold text-foreground mb-2 flex items-center gap-2">
            <MessageCircle className="w-4 h-4 text-emerald-500" /> Como trazer do WhatsApp
          </p>
          <ol className="list-decimal ml-5 space-y-1 text-muted-foreground">
            <li>Abra a conversa e localize o áudio.</li>
            <li>Segure o áudio → toque em <b>Compartilhar</b> (⋮ ou ↗️).</li>
            <li>Escolha <b>Vacatio</b> na lista de aplicativos.</li>
            <li>O áudio abre aqui pronto pra transcrever.</li>
          </ol>
          <p className="mt-2 text-xs text-muted-foreground">
            Se não vir o Vacatio, use o botão abaixo pra escolher o arquivo manualmente
            (no iPhone, salve o áudio em <i>Arquivos</i> antes).
          </p>
        </div>
      )}

      <div
        onClick={() => inputRef.current?.click()}
        className="rounded-2xl border-2 border-dashed border-border p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
      >
        <Upload className="w-8 h-8 mx-auto mb-3 text-muted-foreground" />
        {file ? (
          <>
            <p className="font-semibold text-foreground">{file.name}</p>
            <p className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
          </>
        ) : (
          <>
            <p className="text-sm font-semibold text-foreground">Toque pra escolher o áudio</p>
            <p className="text-xs text-muted-foreground mt-1">MP3, M4A, WAV, OGG, AAC · até 20 MB</p>
          </>
        )}
        <input
          ref={inputRef} type="file" accept="audio/*,.opus,.m4a,.mp3,.wav,.ogg,.aac"
          className="hidden"
          onChange={(e) => onPick(e.target.files?.[0] ?? null)}
        />
      </div>

      <div>
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Título</label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Aula de Penal — 21/07" className="mt-1" />
      </div>

      <div>
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
          <TagIcon className="w-3 h-3" /> Tags
        </label>
        <div className="mt-1 flex gap-2">
          <Input
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(tagInput); } }}
            placeholder="Adicionar tag e Enter"
          />
          <Button variant="outline" onClick={() => addTag(tagInput)}>Adicionar</Button>
        </div>
        {tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {tags.map((t) => (
              <span key={t} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/15 text-primary text-xs font-medium">
                {t}
                <button onClick={() => removeTag(t)} aria-label="remover"><X className="w-3 h-3" /></button>
              </span>
            ))}
          </div>
        )}
        <p className="mt-3 text-[11px] text-muted-foreground">Sugestões:</p>
        <div className="mt-1 flex flex-wrap gap-1.5">
          {TAG_SUGESTOES.filter((t) => !tags.includes(t)).map((t) => (
            <button
              key={t}
              onClick={() => addTag(t)}
              className="px-2.5 py-1 rounded-full text-xs border border-border text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors"
            >{t}</button>
          ))}
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
        <input type="checkbox" checked={autoResumo} onChange={(e) => setAutoResumo(e.target.checked)} className="accent-primary" />
        Gerar resumo automaticamente após a transcrição
      </label>

      <Button className="w-full h-12" onClick={enviar} disabled={!file || busy}>
        {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
        {busy ? 'Enviando…' : 'Enviar e transcrever'}
      </Button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// LISTA
// ─────────────────────────────────────────────────────────────

function Lista({ soPendentes = false }: { soPendentes?: boolean }) {
  const { user } = useAuth();
  const [rows, setRows] = useState<Recording[]>([]);
  const [loading, setLoading] = useState(true);
  const [playing, setPlaying] = useState<string | null>(null);
  const [working, setWorking] = useState<string | null>(null);
  const [filterTag, setFilterTag] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from('audio_recordings')
      .select('*').eq('user_id', user.id).order('created_at', { ascending: false });
    setRows((data as any) || []);
    setLoading(false);
  }, [user]);
  useEffect(() => { load(); }, [load]);

  const allTags = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => (r.tags || []).forEach((t) => set.add(t)));
    return Array.from(set);
  }, [rows]);

  const filtered = useMemo(() => {
    let list = rows;
    if (soPendentes) list = list.filter((r) => r.transcript && !r.summary);
    if (filterTag) list = list.filter((r) => (r.tags || []).includes(filterTag));
    return list;
  }, [rows, soPendentes, filterTag]);

  const signedUrl = async (r: Recording): Promise<string | null> => {
    if (r.local_path) return r.local_path;
    if (r.file_path) {
      const { data } = await supabase.storage.from('aulas-audio').createSignedUrl(r.file_path, 3600);
      return data?.signedUrl ?? null;
    }
    return null;
  };

  const play = async (r: Recording) => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    if (playing === r.id) { setPlaying(null); return; }
    const url = await signedUrl(r);
    if (!url) return toast.error('Áudio indisponível.');
    const a = new Audio(url);
    a.onended = () => setPlaying(null);
    a.play().catch(() => toast.error('Falha ao tocar.'));
    audioRef.current = a;
    setPlaying(r.id);
  };

  const remove = async (r: Recording) => {
    if (!confirm('Excluir esta gravação?')) return;
    const online = typeof navigator === 'undefined' ? true : navigator.onLine !== false;
    if (online) {
      if (r.file_path) {
        try { await supabase.storage.from('aulas-audio').remove([r.file_path]); } catch {}
      }
      const { error } = await supabase.from('audio_recordings').delete().eq('id', r.id);
      if (error) {
        try {
          const { syncQueue } = await import('@/services/syncQueue');
          await syncQueue.enqueue({ kind: 'table.delete', table: 'audio_recordings', match: { id: r.id } });
        } catch {}
      }
    } else {
      try {
        const { syncQueue } = await import('@/services/syncQueue');
        await syncQueue.enqueue({ kind: 'table.delete', table: 'audio_recordings', match: { id: r.id } });
        toast.message('Exclusão enfileirada — sincroniza quando voltar a internet.');
      } catch {}
    }
    load();
  };

  const rename = async (r: Recording, newTitle: string) => {
    const online = typeof navigator === 'undefined' ? true : navigator.onLine !== false;
    if (online) {
      const { error } = await supabase.from('audio_recordings').update({ title: newTitle }).eq('id', r.id);
      if (error) {
        try {
          const { syncQueue } = await import('@/services/syncQueue');
          await syncQueue.enqueue({ kind: 'table.update', table: 'audio_recordings', match: { id: r.id }, values: { title: newTitle } });
        } catch {}
      }
    } else {
      try {
        const { syncQueue } = await import('@/services/syncQueue');
        await syncQueue.enqueue({ kind: 'table.update', table: 'audio_recordings', match: { id: r.id }, values: { title: newTitle } });
        toast.message('Novo nome salvo localmente — sincroniza quando voltar a internet.');
      } catch {}
    }
    load();
  };

  const transcribe = async (r: Recording) => {
    setWorking(r.id);
    try {
      const payload: any = { language: 'pt' };
      if (r.file_path) payload.filePath = r.file_path;
      else if (r.local_path) {
        const [meta, b64] = r.local_path.split(',');
        payload.audioBase64 = b64;
        payload.mimeType = /data:([^;]+);/.exec(meta)?.[1] ?? 'audio/aac';
      } else return toast.error('Sem áudio pra transcrever.');
      const { data, error } = await supabase.functions.invoke('transcrever-audio', { body: payload });
      if (error) throw error;
      const text = (data as any)?.text ?? '';
      await supabase.from('audio_recordings').update({ transcript: text }).eq('id', r.id);
      toast.success('Transcrição pronta!');
      load();
    } catch (e: any) {
      toast.error('Falha: ' + (e?.message ?? 'erro'));
    } finally { setWorking(null); }
  };

  const summarize = async (r: Recording) => {
    if (!r.transcript) return toast.error('Transcreva primeiro.');
    setWorking(r.id);
    try {
      const { data, error } = await supabase.functions.invoke('gerar-resumo-aula', {
        body: { transcript: r.transcript, title: r.title },
      });
      if (error) throw error;
      const summary = (data as any)?.summary ?? {};
      await supabase.from('audio_recordings').update({ summary }).eq('id', r.id);
      toast.success('Resumo gerado!');
      load();
    } catch (e: any) {
      toast.error('Falha: ' + (e?.message ?? 'erro'));
    } finally { setWorking(null); }
  };

  const download = (r: Recording, kind: 'txt' | 'md') => {
    let content = ''; let filename = '';
    if (kind === 'txt') { content = r.transcript ?? ''; filename = `${r.title}.txt`; }
    else {
      const s = r.summary || {};
      content = `# ${s.titulo || r.title}\n\n${s.resumo || ''}\n\n## Tópicos\n${(s.topicos || []).map((t: string) => `- ${t}`).join('\n')}\n\n## Conceitos\n${(s.conceitos || []).map((c: any) => `- **${c.termo}**: ${c.definicao}`).join('\n')}\n\n## Perguntas de revisão\n${(s.duvidas || []).map((d: string) => `- ${d}`).join('\n')}\n`;
      filename = `${r.title} — resumo.md`;
    }
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = filename; a.click();
    URL.revokeObjectURL(a.href);
  };

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="animate-spin" /></div>;

  return (
    <>
      {soPendentes && (
        <p className="mb-3 text-sm text-muted-foreground">
          Escolha uma gravação com transcrição pronta e gere o resumo.
        </p>
      )}
      {allTags.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-1.5">
          <button
            onClick={() => setFilterTag(null)}
            className={`px-2.5 py-1 rounded-full text-xs border transition-colors ${filterTag === null ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:border-primary/40'}`}
          >Todas</button>
          {allTags.map((t) => (
            <button
              key={t}
              onClick={() => setFilterTag(t)}
              className={`px-2.5 py-1 rounded-full text-xs border transition-colors ${filterTag === t ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:border-primary/40'}`}
            >{t}</button>
          ))}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Mic className="mx-auto mb-3 h-10 w-10 opacity-40" />
          {soPendentes ? 'Nenhuma gravação aguardando resumo.' : 'Nenhuma gravação ainda.'}
        </div>
      ) : (
        <ul className="space-y-3">
          {filtered.map((r) => {
            const busy = working === r.id;
            const s = r.summary || null;
            return (
              <li key={r.id} className="rounded-2xl border border-border bg-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <Input
                      defaultValue={r.title}
                      onBlur={(e) => e.target.value !== r.title && rename(r, e.target.value)}
                      className="border-none px-0 h-auto text-base font-semibold bg-transparent focus-visible:ring-0"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatHms(r.duration_ms)} · {new Date(r.created_at).toLocaleString('pt-BR')}
                      {r.source === 'whatsapp' && <> · <span className="text-emerald-500">WhatsApp</span></>}
                      {r.source === 'celular' && <> · <span className="text-primary">Importado</span></>}
                    </p>
                    {r.tags && r.tags.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {r.tags.map((t) => (
                          <span key={t} className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-medium">{t}</span>
                        ))}
                      </div>
                    )}
                    {r.transcript && !s && (
                      <p className="mt-2 text-sm text-muted-foreground line-clamp-2 whitespace-pre-wrap">{r.transcript}</p>
                    )}
                    {s && (
                      <div className="mt-3 space-y-2">
                        {s.titulo && <h4 className="text-sm font-semibold">{s.titulo}</h4>}
                        {s.resumo && <p className="text-sm text-muted-foreground">{s.resumo}</p>}
                        {Array.isArray(s.topicos) && s.topicos.length > 0 && (
                          <ul className="ml-4 list-disc text-sm text-muted-foreground">
                            {s.topicos.slice(0, 5).map((t: string, i: number) => <li key={i}>{t}</li>)}
                          </ul>
                        )}
                      </div>
                    )}
                  </div>
                  <Button size="icon" variant="ghost" onClick={() => remove(r)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => play(r)}>
                    {playing === r.id ? <Pause className="mr-1 h-3.5 w-3.5" /> : <Play className="mr-1 h-3.5 w-3.5" />}
                    {playing === r.id ? 'Pausar' : 'Ouvir'}
                  </Button>
                  {!r.transcript && (
                    <Button size="sm" variant="outline" onClick={() => transcribe(r)} disabled={busy}>
                      {busy ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <FileText className="mr-1 h-3.5 w-3.5" />}
                      Transcrever
                    </Button>
                  )}
                  {r.transcript && !s && (
                    <Button size="sm" variant="outline" onClick={() => summarize(r)} disabled={busy}>
                      {busy ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Sparkles className="mr-1 h-3.5 w-3.5" />}
                      Gerar resumo
                    </Button>
                  )}
                  {r.transcript && (
                    <Button size="sm" variant="ghost" onClick={() => download(r, 'txt')}>
                      <Download className="mr-1 h-3.5 w-3.5" /> .txt
                    </Button>
                  )}
                  {s && (
                    <Button size="sm" variant="ghost" onClick={() => download(r, 'md')}>
                      <Download className="mr-1 h-3.5 w-3.5" /> Resumo .md
                    </Button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
