import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Plus, Sparkles, Loader2, Trash2, Mic, Square, Play, Pause, FileText } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useKeyboardHeight } from '@/hooks/useKeyboardListeners';
import { supabase } from '@/integrations/supabase/client';
import { voiceRecorder } from '@/lib/nativeVoiceRecorder';
import { haptic } from '@/lib/nativeHaptics';
import { toast } from 'sonner';
import {
  loadAnotacoes,
  getCachedData,
  invalidateCache,
  anotacoesKey,
  type AnotacoesPayload,
} from '@/lib/artigoFuncoesPrefetch';

interface Anotacao {
  id: string;
  anotacao: string | null;
  audio_url: string | null;
  audio_duration_ms: number | null;
  created_at: string;
  source?: 'note' | 'highlight';
  highlightId?: string;
  trechoReferencia?: string;
  tagKey?: MagicTagKey;
}

interface AnotacoesSheetProps {
  open: boolean;
  onClose: () => void;
  tabelaNome: string;   // tabela_codigo
  artigoNumero: string;
  artigoTexto: string;
  onCountChange?: (count: number) => void;
}

const AUDIO_BUCKET = 'anotacoes-audio';

// Categorias do Grifo Mágico (IA). O texto da anotação é salvo com o prefixo
// "Categoria: explicação..." — aqui detectamos e mostramos como tag colorida.
type MagicTagKey = 'chave' | 'excecao' | 'efeito' | 'termo' | 'pegadinha';

const MAGIC_TAGS: Record<MagicTagKey, { label: string; dot: string; text: string; bg: string; rail: string }> = {
  chave:     { label: 'CHAVE',              dot: 'bg-tool-yellow',  text: 'text-tool-yellow',  bg: 'bg-tool-yellow ring-tool-yellow',  rail: 'bg-tool-yellow' },
  excecao:   { label: 'EXCEÇÃO / CONDIÇÃO', dot: 'bg-tool-emerald', text: 'text-tool-emerald', bg: 'bg-tool-emerald ring-tool-emerald', rail: 'bg-tool-emerald' },
  efeito:    { label: 'EFEITO',             dot: 'bg-tool-sky',     text: 'text-tool-sky',     bg: 'bg-tool-sky ring-tool-sky',     rail: 'bg-tool-sky' },
  termo:     { label: 'TERMO',              dot: 'bg-tool-pink',    text: 'text-tool-pink',    bg: 'bg-tool-pink ring-tool-pink',   rail: 'bg-tool-pink' },
  pegadinha: { label: 'PEGADINHA',          dot: 'bg-tool-orange',  text: 'text-tool-orange',  bg: 'bg-tool-orange ring-tool-orange', rail: 'bg-tool-orange' },
};

interface SavedHighlight {
  id?: string;
  comment?: string;
  comentario?: string;
  origem?: string;
  createdAt?: number;
  text?: string;
  trechoExato?: string;
  categoria?: string;
  corNome?: string;
}

function normalizeTagKey(value?: string): MagicTagKey | undefined {
  const normalized = String(value || '').toLocaleLowerCase('pt-BR').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (normalized.includes('chave') || normalized === 'amarelo') return 'chave';
  if (normalized.includes('exce') || normalized === 'verde') return 'excecao';
  if (normalized.includes('efeito') || normalized === 'azul') return 'efeito';
  if (normalized.includes('termo') || normalized === 'rosa') return 'termo';
  if (normalized.includes('pegadinha') || normalized === 'laranja') return 'pegadinha';
  return undefined;
}

function noteKey(note: Anotacao): string {
  return note.audio_url
    ? `audio:${note.audio_url}`
    : String(note.anotacao || '').trim().toLocaleLowerCase('pt-BR');
}

function notesFromHighlights(value: unknown): Anotacao[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item, index) => {
    const highlight = item as SavedHighlight;
    const comment = String(highlight.comment || highlight.comentario || '').trim();
    if (!comment || highlight.origem !== 'ia') return [];
    return [{
      id: `highlight:${highlight.id || index}`,
      anotacao: comment,
      audio_url: null,
      audio_duration_ms: null,
      created_at: new Date(highlight.createdAt || 0).toISOString(),
      source: 'highlight' as const,
      highlightId: highlight.id,
      trechoReferencia: String(highlight.trechoExato || highlight.text || '').trim() || undefined,
      tagKey: normalizeTagKey(highlight.corNome || highlight.categoria || comment.split(':')[0]),
    }];
  });
}

function mergeNotes(notes: Anotacao[], highlightNotes: Anotacao[]): Anotacao[] {
  const highlightByKey = new Map(highlightNotes.map((note) => [noteKey(note), note]));
  const seen = new Set<string>();
  return [...notes, ...highlightNotes].map((note) => {
    const match = highlightByKey.get(noteKey(note));
    return match ? { ...note, trechoReferencia: match.trechoReferencia, tagKey: match.tagKey } : note;
  }).filter((note) => {
    const key = noteKey(note);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function parseMagicTag(anot: string | null, preferredKey?: MagicTagKey): { tag: typeof MAGIC_TAGS[MagicTagKey] | null; body: string } {
  if (!anot) return { tag: null, body: '' };
  const m = anot.match(/^\s*(Chave|Exceção|Excecao|Efeito|Termo|Pegadinha)\s*:\s*([\s\S]*)$/i);
  const key = preferredKey || normalizeTagKey(m?.[1]);
  return { tag: key ? MAGIC_TAGS[key] : null, body: m ? (m[2] || '').trim() : anot };
}

function b64toBlob(b64: string, mime: string) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}
function fmtDuration(ms: number | null) {
  if (!ms) return '';
  const s = Math.round(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

const AnotacoesSheet = ({ open, onClose, tabelaNome, artigoNumero, artigoTexto, onCountChange }: AnotacoesSheetProps) => {
  const [notas, setNotas] = useState<Anotacao[]>([]);
  const [novaTexto, setNovaTexto] = useState('');
  const [loading, setLoading] = useState(false);
  const [sugerindo, setSugerindo] = useState(false);
  const [sugestoes, setSugestoes] = useState<string[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [composerOpen, setComposerOpen] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const keyboardHeight = useKeyboardHeight();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  useEffect(() => {
    if (!open || !userId) return;
    const key = anotacoesKey(tabelaNome, artigoNumero, userId);
    const cached = getCachedData<AnotacoesPayload>(key);
    if (cached) {
      // Dados já pré-carregados: abre instantaneamente, sem spinner.
      const merged = mergeNotes(cached.notes as Anotacao[], notesFromHighlights(cached.highlights));
      setNotas(merged);
      onCountChange?.(merged.length);
      setLoading(false);
      return;
    }
    (async () => {
      setLoading(true);
      try {
        const payload = await loadAnotacoes(tabelaNome, artigoNumero, userId);
        const merged = mergeNotes(payload.notes as Anotacao[], notesFromHighlights(payload.highlights));
        setNotas(merged);
        onCountChange?.(merged.length);
      } catch (error) {
        console.error('Erro ao carregar anotações:', error);
        toast.error('Não foi possível carregar as anotações');
      } finally {
        setLoading(false);
      }
    })();
  }, [open, tabelaNome, artigoNumero, userId, onCountChange]);

  const addTextNote = async (texto: string, sugerida = false) => {
    if (!userId) { toast.error('Faça login para anotar'); return; }
    if (!texto.trim()) return;
    const payload = {
      user_id: userId,
      tabela_codigo: tabelaNome,
      numero_artigo: artigoNumero,
      artigo_id: `${tabelaNome}::${artigoNumero}`,
      anotacao: texto.trim(),
    };
    const { data, error } = await supabase.from('artigos_anotacoes').insert(payload).select('id, anotacao, audio_url, audio_duration_ms, created_at').single();
    if (error) {
      toast.error(error.code === '23505' ? 'Esta anotação já está salva' : 'Erro ao salvar');
      return;
    }
    if (data) setNotas(prev => {
      const next = mergeNotes([...prev, data as Anotacao], []);
      onCountChange?.(next.length);
      return next;
    });
    if (userId) invalidateCache(anotacoesKey(tabelaNome, artigoNumero, userId));
    if (!sugerida) setComposerOpen(false);
  };

  const deleteNote = useCallback(async (nota: Anotacao) => {
    if (nota.source === 'highlight') {
      if (!userId) return;
      const { data, error: loadError } = await supabase
        .from('artigos_grifos')
        .select('highlights')
        .eq('user_id', userId)
        .eq('tabela_codigo', tabelaNome)
        .eq('numero_artigo', artigoNumero)
        .maybeSingle();
      if (loadError) { toast.error('Erro ao apagar'); return; }
      const updated = Array.isArray(data?.highlights)
        ? (data.highlights as unknown as SavedHighlight[]).filter((item) => item.id !== nota.highlightId)
        : [];
      const { error } = await supabase
        .from('artigos_grifos')
        .update({ highlights: updated as any, updated_at: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('tabela_codigo', tabelaNome)
        .eq('numero_artigo', artigoNumero);
      if (error) { toast.error('Erro ao apagar'); return; }
    } else {
      const { error } = await supabase.from('artigos_anotacoes').delete().eq('id', nota.id);
      if (error) { toast.error('Erro ao apagar'); return; }
    }
    if (nota.audio_url && userId) {
      // audio_url é o path no bucket: {user_id}/{filename}
      supabase.storage.from(AUDIO_BUCKET).remove([nota.audio_url]).catch(() => {});
    }
    setNotas(prev => {
      const next = prev.filter(n => n.id !== nota.id);
      onCountChange?.(next.length);
      return next;
    });
    if (userId) invalidateCache(anotacoesKey(tabelaNome, artigoNumero, userId));
    haptic.light();
  }, [userId, tabelaNome, artigoNumero, onCountChange]);

  const handleAdd = async () => {
    await addTextNote(novaTexto);
    setNovaTexto('');
  };

  const handleSugerir = async () => {
    setSugerindo(true); setSugestoes([]);
    try {
      const { data, error } = await supabase.functions.invoke('assistente-juridica', {
        body: { mode: 'sugerir-anotacoes', artigoTexto, artigoNumero, leiNome: tabelaNome },
      });
      if (!error && data?.reply) {
        const lines = data.reply.split('\n')
          .map((l: string) => l.replace(/^\d+[\.\)]\s*/, '').replace(/^\*\*/, '').replace(/\*\*$/, '').replace(/^[-•]\s*/, '').trim())
          .filter((l: string) => l.length > 10);
        setSugestoes(lines.slice(0, 6));
      }
    } catch (e) { console.error(e); }
    finally { setSugerindo(false); }
  };

  // ============ Áudio ============
  const startRecording = async () => {
    if (!voiceRecorder.isAvailable()) {
      toast.info('Gravação de áudio disponível apenas no app');
      return;
    }
    const res = await voiceRecorder.start();
    if (!res.ok) {
      if (res.reason === 'permission_denied') toast.error('Permissão de microfone negada');
      else toast.error('Não foi possível iniciar a gravação');
      return;
    }
    haptic.medium();
    setRecording(true);
  };

  const stopRecording = async () => {
    setRecording(false);
    const res = await voiceRecorder.stop();
    if (!res.ok || !res.base64) { toast.error('Falha ao encerrar gravação'); return; }
    if (!userId) { toast.error('Faça login pra salvar áudio'); return; }
    haptic.success();

    setUploading(true);
    try {
      const mime = res.mimeType ?? 'audio/aac';
      const ext = mime.includes('mp4') || mime.includes('m4a') ? 'm4a' : (mime.includes('aac') ? 'aac' : 'webm');
      const path = `${userId}/${Date.now()}.${ext}`;
      const blob = b64toBlob(res.base64, mime);
      const { error: upErr } = await supabase.storage.from(AUDIO_BUCKET).upload(path, blob, { contentType: mime });
      if (upErr) throw upErr;

      const { data, error } = await supabase.from('artigos_anotacoes').insert({
        user_id: userId,
        tabela_codigo: tabelaNome,
        numero_artigo: artigoNumero,
        artigo_id: `${tabelaNome}::${artigoNumero}`,
        anotacao: null,
        audio_url: path,
        audio_duration_ms: res.duration ?? null,
      }).select('id, anotacao, audio_url, audio_duration_ms, created_at').single();
      if (error) throw error;
      if (data) setNotas(prev => {
        const next = mergeNotes([...prev, data as Anotacao], []);
        onCountChange?.(next.length);
        return next;
      });
      invalidateCache(anotacoesKey(tabelaNome, artigoNumero, userId));
      setComposerOpen(false);
    } catch (e) {
      console.error(e); toast.error('Erro ao salvar áudio');
    } finally {
      setUploading(false);
    }
  };

  const togglePlay = async (nota: Anotacao) => {
    if (!nota.audio_url) return;
    if (playingId === nota.id) {
      audioRef.current?.pause();
      setPlayingId(null);
      return;
    }
    let url = signedUrls[nota.id];
    if (!url) {
      const { data, error } = await supabase.storage.from(AUDIO_BUCKET).createSignedUrl(nota.audio_url, 3600);
      if (error || !data) { toast.error('Áudio não disponível'); return; }
      url = data.signedUrl;
      setSignedUrls(prev => ({ ...prev, [nota.id]: url }));
    }
    audioRef.current?.pause();
    const a = new Audio(url);
    audioRef.current = a;
    a.onended = () => setPlayingId(null);
    a.play().then(() => setPlayingId(nota.id)).catch(() => toast.error('Erro ao reproduzir'));
  };

  useEffect(() => () => { audioRef.current?.pause(); }, []);

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 340 }}
        className="fixed inset-0 z-[80] bg-background flex flex-col"
      >
        <header className="pt-safe border-b border-border bg-card">
          <div className="h-16 px-4 flex items-center justify-between gap-3">
            <Button variant="ghost" size="icon" onClick={onClose} aria-label="Voltar ao artigo">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl text-foreground font-display">Anotações</h2>
              <p className="text-xs text-muted-foreground truncate">Art. {artigoNumero} · {notas.length} {notas.length === 1 ? 'anotação' : 'anotações'}</p>
            </div>
            <Button
              size="icon"
              onClick={() => setComposerOpen((current) => !current)}
              aria-label={composerOpen ? 'Fechar nova anotação' : 'Criar nova anotação'}
              aria-expanded={composerOpen}
            >
              <Plus className={`w-5 h-5 transition-transform ${composerOpen ? 'rotate-45' : ''}`} />
            </Button>
          </div>
        </header>

        <div
          className="flex-1 overflow-y-auto px-4 sm:px-6 py-5 pb-safe space-y-5"
          style={{ paddingBottom: keyboardHeight > 0 ? `${keyboardHeight + 24}px` : undefined }}
        >
          <AnimatePresence initial={false}>
            {composerOpen && (
              <motion.section
                initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                className="border border-border bg-card rounded-lg p-4 space-y-4"
              >
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary" />
                  <h3 className="font-body text-sm font-semibold text-foreground">Nova anotação</h3>
                </div>
                <Textarea
                  value={novaTexto}
                  onChange={e => setNovaTexto(e.target.value)}
                  placeholder="Escreva sua anotação sobre este artigo..."
                  className="min-h-[108px] rounded-lg bg-secondary/30 border-border text-sm resize-none focus:border-primary/50 placeholder:text-muted-foreground"
                />
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="secondary" onClick={recording ? stopRecording : startRecording} disabled={uploading}>
                    {uploading ? <Loader2 className="animate-spin" /> : recording ? <Square /> : <Mic />}
                    {recording ? 'Parar áudio' : 'Gravar áudio'}
                  </Button>
                  <Button onClick={handleAdd} disabled={!novaTexto.trim()}>
                    <Plus /> Salvar texto
                  </Button>
                </div>
                {recording && <p className="text-xs text-destructive text-center animate-pulse">● Gravando… toque em “Parar áudio” para salvar</p>}
                <Button variant="outline" className="w-full border-primary/40 text-primary" onClick={handleSugerir} disabled={sugerindo}>
                  {sugerindo ? <Loader2 className="animate-spin" /> : <Sparkles />}
                  {sugerindo ? 'Gerando sugestões...' : 'Sugerir anotação com IA'}
                </Button>
                {sugestoes.length > 0 && (
                  <div className="space-y-2 pt-1">
                    <p className="text-xs text-muted-foreground font-semibold uppercase">Sugestões da IA</p>
                    {sugestoes.map((s, i) => (
                      <Button key={i} variant="secondary" onClick={() => { addTextNote(s, true); setSugestoes(prev => prev.filter(x => x !== s)); }}
                        className="w-full h-auto min-h-12 justify-start whitespace-normal text-left px-3 py-3 leading-relaxed">
                        <Plus className="text-primary" /> {s}
                      </Button>
                    ))}
                  </div>
                )}
              </motion.section>
            )}
          </AnimatePresence>

          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
          ) : notas.length > 0 ? (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground font-semibold uppercase">Suas anotações ({notas.length})</p>
              {notas.map(nota => (
                <article key={nota.id} className="relative overflow-hidden p-4 rounded-lg border border-border bg-card text-sm leading-relaxed flex items-start gap-3 text-foreground">
                  {parseMagicTag(nota.anotacao, nota.tagKey).tag && (
                    <span className={`absolute inset-y-0 left-0 w-1 ${parseMagicTag(nota.anotacao, nota.tagKey).tag?.rail}`} aria-hidden="true" />
                  )}
                  {nota.audio_url ? (
                    <Button variant="secondary" size="icon" onClick={() => togglePlay(nota)} aria-label={playingId === nota.id ? 'Pausar áudio' : 'Reproduzir áudio'}>
                      {playingId === nota.id ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                    </Button>
                  ) : null}
                  <div className="flex-1 min-w-0">
                    {nota.audio_url ? (
                      <p className="text-xs text-muted-foreground">
                        🎙️ Áudio {nota.audio_duration_ms ? `• ${fmtDuration(nota.audio_duration_ms)}` : ''}
                      </p>
                    ) : (
                      (() => {
                        const { tag, body } = parseMagicTag(nota.anotacao, nota.tagKey);
                        return (
                          <div className="space-y-2.5">
                            {tag && (
                              <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md ${tag.bg}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${tag.dot}`} />
                                <span className={`text-[10px] font-bold ${tag.text}`}>{tag.label}</span>
                              </div>
                            )}
                            {nota.trechoReferencia && (
                              <blockquote className="border-l-2 border-primary/60 pl-3 text-xs text-muted-foreground italic leading-relaxed">
                                “{nota.trechoReferencia}”
                              </blockquote>
                            )}
                            <p className="text-foreground/90">{body}</p>
                          </div>
                        );
                      })()
                    )}
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => deleteNote(nota)} aria-label="Apagar anotação" className="shrink-0 text-muted-foreground hover:text-destructive">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </article>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 space-y-3">
              <FileText className="w-8 h-8 text-muted-foreground mx-auto" />
              <p className="text-muted-foreground text-sm">Nenhuma anotação ainda.</p>
              <Button variant="outline" onClick={() => setComposerOpen(true)}><Plus /> Criar anotação</Button>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default AnotacoesSheet;
