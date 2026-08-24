import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Image, Loader2, CheckCircle, Zap, Search, HardDrive, TrendingDown, AlertCircle, RefreshCw } from 'lucide-react';
import { PageHeader } from '@/components/vademecum/PageHeader';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';

interface StorageFile {
  name: string;
  bucket: string;
  size: number;
  type: string;
  publicUrl: string;
  path: string;
}

interface CompressionResult {
  originalSize: number;
  compressedSize: number;
  saved: number;
  pctSaved: number;
  converted: boolean;
  newPath?: string;
}

const LS_FILES_KEY = 'compressao-img-files';
const LS_RESULTS_KEY = 'compressao-img-results';

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function loadCachedFiles(): { files: StorageFile[]; totalSize: number } | null {
  try {
    const raw = localStorage.getItem(LS_FILES_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}

function loadCachedResults(): Map<string, CompressionResult> {
  try {
    const raw = localStorage.getItem(LS_RESULTS_KEY);
    if (!raw) return new Map();
    const arr: [string, CompressionResult][] = JSON.parse(raw);
    return new Map(arr);
  } catch { return new Map(); }
}

function saveCachedResults(results: Map<string, CompressionResult>) {
  localStorage.setItem(LS_RESULTS_KEY, JSON.stringify(Array.from(results.entries())));
}

export default function CompressaoImagens() {
  const navigate = useNavigate();

  // Load cached data on mount
  const cachedFiles = useRef(loadCachedFiles());
  const cachedResults = useRef(loadCachedResults());

  const [files, setFiles] = useState<StorageFile[]>(cachedFiles.current?.files || []);
  const [totalSize, setTotalSize] = useState(cachedFiles.current?.totalSize || 0);
  const [loading, setLoading] = useState(!cachedFiles.current);
  const [search, setSearch] = useState('');
  const [filterBucket, setFilterBucket] = useState('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'done'>('all');
  const [compressing, setCompressing] = useState<Set<string>>(new Set());
  const [results, setResults] = useState<Map<string, CompressionResult>>(cachedResults.current);
  const [batchRunning, setBatchRunning] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ done: 0, total: 0 });
  const batchCancelRef = useRef(false);

  // If no cache, fetch on mount
  useEffect(() => {
    if (!cachedFiles.current) {
      loadFiles();
    } else {
      setLoading(false);
    }
  }, []);

  const loadFiles = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('comprimir-imagens', {
        body: { action: 'list' },
      });
      if (error) throw error;
      const f = data.files || [];
      const ts = data.totalSize || 0;
      setFiles(f);
      setTotalSize(ts);
      localStorage.setItem(LS_FILES_KEY, JSON.stringify({ files: f, totalSize: ts }));
    } catch (err: any) {
      toast.error('Erro ao carregar imagens: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const compressFile = useCallback(async (file: StorageFile): Promise<boolean> => {
    const key = `${file.bucket}/${file.path}`;
    setCompressing(prev => new Set(prev).add(key));

    try {
      const { data, error } = await supabase.functions.invoke('comprimir-imagens', {
        body: { action: 'compress', bucket: file.bucket, path: file.path },
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);

      setResults(prev => {
        const next = new Map(prev).set(key, data);
        saveCachedResults(next);
        return next;
      });
      toast.success(`${file.name}: -${data.pctSaved}% (${formatBytes(data.saved)} economizados)`);
      return true;
    } catch (err: any) {
      toast.error(`Erro em ${file.name}: ${err.message}`);
      return false;
    } finally {
      setCompressing(prev => { const s = new Set(prev); s.delete(key); return s; });
    }
  }, []);

  const filtered = useMemo(() => {
    let list = files;
    if (filterBucket !== 'all') list = list.filter(f => f.bucket === filterBucket);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(f => f.name.toLowerCase().includes(q) || f.path.toLowerCase().includes(q));
    }
    if (filterStatus === 'pending') {
      list = list.filter(f => !results.has(`${f.bucket}/${f.path}`));
    } else if (filterStatus === 'done') {
      list = list.filter(f => results.has(`${f.bucket}/${f.path}`));
    }
    return list;
  }, [files, filterBucket, search, filterStatus, results]);

  const compressBatch = useCallback(async () => {
    batchCancelRef.current = false;
    setBatchRunning(true);
    
    const pending = filtered.filter(f => !results.has(`${f.bucket}/${f.path}`));
    setBatchProgress({ done: 0, total: pending.length });

    const CHUNK_SIZE = 5;
    let processed = 0;

    for (let i = 0; i < pending.length; i += CHUNK_SIZE) {
      if (batchCancelRef.current) break;
      const chunk = pending.slice(i, i + CHUNK_SIZE);
      await Promise.all(chunk.map(file => compressFile(file)));
      processed += chunk.length;
      setBatchProgress({ done: processed, total: pending.length });
    }
    
    setBatchRunning(false);
    if (!batchCancelRef.current) {
      toast.success('Compressão em lote finalizada!');
    }
  }, [filtered, results, compressFile]);

  const cancelBatch = useCallback(() => {
    batchCancelRef.current = true;
    setBatchRunning(false);
    toast.info('Compressão em lote cancelada');
  }, []);

  const buckets = useMemo(() => {
    const set = new Set(files.map(f => f.bucket));
    return ['all', ...Array.from(set)];
  }, [files]);

  const totalSaved = useMemo(() => {
    let saved = 0;
    results.forEach(r => { saved += r.saved; });
    return saved;
  }, [results]);

  const totalCompressed = results.size;
  const pendingCount = files.filter(f => !results.has(`${f.bucket}/${f.path}`)).length;

  return (
    <div className="min-h-dvh bg-background">
      {/* Header */}
      <PageHeader
        title="Compressão de Imagens"
        subtitle={`${files.length} imagens · ${formatBytes(totalSize)} total`}
        onBack={() => navigate(-1)}
        leading={
          <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center">
            <Image className="w-5 h-5 text-primary" />
          </div>
        }
      />


      <div className="max-w-4xl mx-auto px-4 py-4 space-y-4">
        {/* Stats cards */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl bg-card border border-border p-3 text-center">
            <HardDrive className="w-5 h-5 mx-auto text-muted-foreground mb-1" />
            <p className="text-lg font-bold text-foreground">{formatBytes(totalSize)}</p>
            <p className="text-[10px] text-muted-foreground">Total Original</p>
          </div>
          <div className="rounded-xl bg-card border border-border p-3 text-center">
            <TrendingDown className="w-5 h-5 mx-auto text-green-500 mb-1" />
            <p className="text-lg font-bold text-green-500">{formatBytes(totalSaved)}</p>
            <p className="text-[10px] text-muted-foreground">Economia Total</p>
          </div>
          <div className="rounded-xl bg-card border border-border p-3 text-center">
            <CheckCircle className="w-5 h-5 mx-auto text-primary mb-1" />
            <p className="text-lg font-bold text-foreground">{totalCompressed}/{files.length}</p>
            <p className="text-[10px] text-muted-foreground">Comprimidas</p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Buscar imagem..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Button variant="outline" size="icon" onClick={loadFiles} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        {/* Status filter */}
        <div className="flex gap-2">
          {([
            { key: 'all' as const, label: 'Todas' },
            { key: 'pending' as const, label: `Pendentes (${pendingCount})` },
            { key: 'done' as const, label: `Feitas (${totalCompressed})` },
          ]).map(s => (
            <button
              key={s.key}
              onClick={() => setFilterStatus(s.key)}
              className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${filterStatus === s.key ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'}`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Bucket filter */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {buckets.map(b => (
            <button
              key={b}
              onClick={() => setFilterBucket(b)}
              className={`shrink-0 text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${filterBucket === b ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'}`}
            >
              {b === 'all' ? 'Todos' : b}
            </button>
          ))}
        </div>

        {/* Batch compress */}
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">{filtered.length} imagens</p>
          {batchRunning ? (
            <Button size="sm" variant="destructive" className="text-xs" onClick={cancelBatch}>
              Cancelar
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={compressBatch}
              disabled={filtered.length === 0}
              className="text-xs"
            >
              <Zap className="w-3 h-3 mr-1" /> Comprimir Todas ({filtered.filter(f => !results.has(`${f.bucket}/${f.path}`)).length})
            </Button>
          )}
        </div>

        {/* Batch progress */}
        {batchRunning && (
          <div className="space-y-1">
            <Progress value={(batchProgress.done / Math.max(batchProgress.total, 1)) * 100} className="h-2" />
            <p className="text-[10px] text-muted-foreground text-center">
              Comprimindo {batchProgress.done} de {batchProgress.total} (5 simultâneas)
            </p>
          </div>
        )}

        {/* File list */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((file) => {
              const key = `${file.bucket}/${file.path}`;
              const isCompressing = compressing.has(key);
              const result = results.get(key);

              return (
                <div key={key} className="rounded-xl bg-card border border-border overflow-hidden">
                  <div className="flex items-stretch">
                    <div className="w-14 h-14 flex-shrink-0 relative overflow-hidden bg-muted">
                      <img
                        src={file.publicUrl}
                        alt={file.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                    </div>

                    <div className="flex-1 min-w-0 px-3 py-2 flex items-center gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-foreground line-clamp-1">{file.name}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-secondary-foreground">{file.bucket}</span>
                          <span className="text-[10px] text-muted-foreground">{formatBytes(file.size)}</span>
                          <span className="text-[10px] text-muted-foreground">{file.type.split('/')[1]?.toUpperCase()}</span>
                        </div>

                        {result && (
                          <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                            <TrendingDown className="w-3 h-3 text-green-500" />
                            <span className="text-[10px] text-green-500 font-bold">
                              {formatBytes(result.originalSize)} → {formatBytes(result.compressedSize)}
                            </span>
                            <span className="text-[10px] text-green-400">
                              (-{result.pctSaved}%)
                            </span>
                            {result.converted && (
                              <Badge variant="outline" className="text-[8px] h-4 px-1">WebP</Badge>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="shrink-0">
                        {result ? (
                          <Badge variant="default" className="text-[10px]">
                            <CheckCircle className="w-3 h-3 mr-1" />OK
                          </Badge>
                        ) : isCompressing ? (
                          <Loader2 className="w-4 h-4 animate-spin text-primary" />
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs h-7 px-2"
                            onClick={() => compressFile(file)}
                          >
                            <Zap className="w-3 h-3 mr-1" /> Comprimir
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {filtered.length === 0 && !loading && (
              <div className="text-center py-12">
                <AlertCircle className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">Nenhuma imagem encontrada</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
