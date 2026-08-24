import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { HardDrive, Image as ImageIcon, BookOpen, FileDown, Trash2, RefreshCw, Wifi } from 'lucide-react';
import { PageHeader } from '@/components/vademecum/PageHeader';
import { toast } from 'sonner';
import {
  subscribeCapasProgress,
  startCapasPrefetch,
  resetCapasCache,
  type CapasPrefetchProgress,
} from '@/services/bibliotecaCapasPrefetch';
import {
  subscribeNativoProgress,
  startLeituraNativaPrefetch,
  resetLeituraNativaCache,
  type NativoPrefetchProgress,
} from '@/services/leituraNativaPrefetch';
import { listCachedPdfs, clearAllPdfs } from '@/services/bibliotecaPdfCache';

function fmtBytes(n: number) {
  if (!n) return '0 B';
  const k = 1024, sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(n) / Math.log(k));
  return `${(n / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

const BibliotecaOffline = () => {
  const navigate = useNavigate();
  const isNative = Capacitor.isNativePlatform();
  const [capas, setCapas] = useState<CapasPrefetchProgress>({ done: 0, total: 0, status: 'idle' });
  const [nativo, setNativo] = useState<NativoPrefetchProgress>({ done: 0, total: 0, status: 'idle' });
  const [pdfs, setPdfs] = useState<{ name: string; uri: string; size: number }[]>([]);

  useEffect(() => { const u = subscribeCapasProgress(setCapas); return () => { u(); }; }, []);
  useEffect(() => { const u = subscribeNativoProgress(setNativo); return () => { u(); }; }, []);

  const refreshPdfs = async () => {
    const list = await listCachedPdfs();
    setPdfs(list);
  };
  useEffect(() => { refreshPdfs(); }, []);

  const totalPdfSize = pdfs.reduce((s, p) => s + (p.size || 0), 0);

  const pctCapas = capas.total > 0 ? Math.round((capas.done / capas.total) * 100) : 0;
  const pctNativo = nativo.total > 0 ? Math.round((nativo.done / nativo.total) * 100) : 0;

  return (
    <div className="min-h-dvh bg-background pb-[calc(96px+var(--sai-bottom,0px))]">
      <PageHeader title="Modo Offline" onBack={() => navigate(-1)} />

      <div className="max-w-3xl mx-auto w-full px-4 pt-4 space-y-4">
        {!isNative && (
          <div className="rounded-2xl border border-border/60 bg-secondary/40 p-4 flex items-start gap-3">
            <Wifi className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
            <div className="text-sm text-muted-foreground">
              O modo offline funciona apenas no aplicativo instalado (Android/iOS).
              Na web, as capas são servidas via CDN em tempo real.
            </div>
          </div>
        )}

        <SectionCard
          icon={<ImageIcon className="w-5 h-5" />}
          title="Capas da biblioteca"
          subtitle="Todos os livros do acervo — cerca de 80 MB"
          status={capas.status}
          progress={pctCapas}
          done={capas.done}
          total={capas.total}
          onStart={() => startCapasPrefetch({ wifiOnly: false })}
          onReset={async () => { await resetCapasCache(); toast.success('Capas removidas'); }}
          disabled={!isNative}
        />

        <SectionCard
          icon={<BookOpen className="w-5 h-5" />}
          title="Leitura nativa"
          subtitle="Áreas do Direito, Clássicos e Liderança — cerca de 200 MB"
          status={nativo.status}
          progress={pctNativo}
          done={nativo.done}
          total={nativo.total}
          onStart={() => startLeituraNativaPrefetch({ wifiOnly: false })}
          onReset={async () => { await resetLeituraNativaCache(); toast.success('Leitura nativa removida'); }}
          disabled={!isNative}
        />

        <div className="rounded-2xl border border-border/60 bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
              <FileDown className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm text-foreground">PDFs baixados</div>
              <div className="text-xs text-muted-foreground">
                {pdfs.length} arquivo{pdfs.length === 1 ? '' : 's'} · {fmtBytes(totalPdfSize)}
              </div>
            </div>
            <button
              onClick={refreshPdfs}
              className="w-9 h-9 rounded-full bg-secondary/60 hover:bg-secondary flex items-center justify-center"
              aria-label="Atualizar"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
          <p className="text-[11px] text-muted-foreground mt-3 leading-snug">
            PDFs só são baixados quando você clica em "Baixar" na tela de um livro. Nenhum download automático.
          </p>
          {pdfs.length > 0 && (
            <button
              onClick={async () => { await clearAllPdfs(); refreshPdfs(); toast.success('PDFs removidos'); }}
              className="mt-3 w-full rounded-xl bg-destructive/10 hover:bg-destructive/20 text-destructive text-sm font-semibold py-2 flex items-center justify-center gap-2"
            >
              <Trash2 className="w-4 h-4" /> Liberar todo o espaço de PDFs
            </button>
          )}
        </div>

        <div className="rounded-2xl bg-primary/5 border border-primary/20 p-4 flex items-start gap-3">
          <HardDrive className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <div className="text-[12px] text-muted-foreground leading-snug">
            <strong className="text-foreground">Como funciona:</strong> capas e leitura nativa (texto + imagens do OCR)
            das 3 coleções principais baixam sozinhos no primeiro uso. Os PDFs ficam sob demanda —
            você escolhe quais livros quer para offline.
          </div>
        </div>
      </div>
    </div>
  );
};

function SectionCard({
  icon,
  title,
  subtitle,
  status,
  progress,
  done,
  total,
  onStart,
  onReset,
  disabled,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  status: 'idle' | 'running' | 'complete' | 'error';
  progress: number;
  done: number;
  total: number;
  onStart: () => void;
  onReset: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">{icon}</div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm text-foreground">{title}</div>
          <div className="text-xs text-muted-foreground line-clamp-1">{subtitle}</div>
        </div>
        <span className={
          'text-[10px] uppercase tracking-wider px-2 py-1 rounded-full font-semibold ' +
          (status === 'complete' ? 'bg-emerald-500/15 text-emerald-500'
            : status === 'running' ? 'bg-primary/15 text-primary'
            : status === 'error' ? 'bg-destructive/15 text-destructive'
            : 'bg-secondary text-muted-foreground')
        }>
          {status === 'complete' ? 'Pronto' : status === 'running' ? 'Baixando' : status === 'error' ? 'Erro' : 'Aguardando'}
        </span>
      </div>

      {status === 'running' && total > 0 && (
        <div className="mt-3">
          <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
            <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
          </div>
          <div className="text-[11px] text-muted-foreground mt-1">{done} de {total} · {progress}%</div>
        </div>
      )}

      <div className="mt-3 flex gap-2">
        <button
          onClick={onStart}
          disabled={disabled || status === 'running'}
          className="flex-1 rounded-xl bg-primary text-primary-foreground text-sm font-semibold py-2 disabled:opacity-50"
        >
          {status === 'complete' ? 'Baixar novamente' : status === 'running' ? 'Em andamento…' : 'Baixar agora'}
        </button>
        {status !== 'idle' && (
          <button
            onClick={onReset}
            disabled={disabled}
            className="rounded-xl bg-secondary text-foreground text-sm font-semibold px-3 py-2 flex items-center gap-1.5 disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4" /> Limpar
          </button>
        )}
      </div>
    </div>
  );
}

export default BibliotecaOffline;
