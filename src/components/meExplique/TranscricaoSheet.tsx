import { useMemo, useState } from 'react';
import { Download, FileText, Copy, X, Loader2 } from 'lucide-react';
import { baixarBlob, copiarTexto, haptic } from '@/lib/nativo';
import { toast } from 'sonner';

export type FalaSalva = { quem: 'professor' | 'aluno'; texto: string; em: number };

interface Props {
  open: boolean;
  onClose: () => void;
  falas: FalaSalva[];
}

const hora = (em: number) =>
  new Date(em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

function montarTexto(falas: FalaSalva[]) {
  const data = new Date().toLocaleString('pt-BR');
  const corpo = falas
    .map((f) => `[${hora(f.em)}] ${f.quem === 'professor' ? 'Professor' : 'Você'}: ${f.texto}`)
    .join('\n\n');
  return `ME EXPLIQUE — Direito Prime\nExplicação registrada em ${data}\n\n${corpo}\n`;
}

const TranscricaoSheet = ({ open, onClose, falas }: Props) => {
  const [gerando, setGerando] = useState<'pdf' | 'txt' | null>(null);
  const texto = useMemo(() => montarTexto(falas), [falas]);
  const nomeBase = `me-explique-${new Date().toISOString().slice(0, 10)}`;

  if (!open) return null;

  const baixarTxt = async () => {
    setGerando('txt');
    try {
      void haptic.light();
      await baixarBlob(new Blob([texto], { type: 'text/plain;charset=utf-8' }), `${nomeBase}.txt`, {
        titulo: 'Transcrição do Me Explique',
      });
    } finally {
      setGerando(null);
    }
  };

  const baixarPdf = async () => {
    setGerando('pdf');
    try {
      void haptic.light();
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF({ unit: 'pt', format: 'a4' });
      const margem = 48;
      const largura = doc.internal.pageSize.getWidth() - margem * 2;
      const alturaPagina = doc.internal.pageSize.getHeight();
      let y = margem;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      doc.text('Me Explique', margem, y);
      y += 20;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(120);
      doc.text(`Direito Prime — registrado em ${new Date().toLocaleString('pt-BR')}`, margem, y);
      y += 26;

      falas.forEach((f) => {
        const professor = f.quem === 'professor';
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(professor ? 130 : 40);
        const rotulo = `${professor ? 'PROFESSOR' : 'VOCÊ'} · ${hora(f.em)}`;
        if (y > alturaPagina - margem - 40) {
          doc.addPage();
          y = margem;
        }
        doc.text(rotulo, margem, y);
        y += 14;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(11.5);
        doc.setTextColor(25);
        const linhas = doc.splitTextToSize(f.texto, largura) as string[];
        linhas.forEach((linha) => {
          if (y > alturaPagina - margem) {
            doc.addPage();
            y = margem;
          }
          doc.text(linha, margem, y);
          y += 16;
        });
        y += 12;
      });

      await baixarBlob(doc.output('blob'), `${nomeBase}.pdf`, {
        titulo: 'Explicação em PDF',
      });
    } catch {
      toast.error('Não consegui gerar o PDF.');
    } finally {
      setGerando(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex flex-col justify-end bg-black/60 backdrop-blur-sm">
      <button className="absolute inset-0" aria-label="Fechar" onClick={onClose} />
      <div className="relative max-h-[85vh] rounded-t-3xl bg-background text-foreground shadow-2xl">
        <div className="flex items-center gap-3 border-b border-border px-4 py-3.5">
          <div className="flex-1">
            <p className="font-display text-base font-bold leading-tight">Explicação salva</p>
            <p className="text-[13px] text-muted-foreground">
              {falas.length} {falas.length === 1 ? 'fala registrada' : 'falas registradas'}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-muted active:scale-95"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[52vh] space-y-3 overflow-y-auto px-4 py-4">
          {falas.length === 0 && (
            <p className="py-8 text-center text-[14px] text-muted-foreground">
              Nada gravado ainda. Inicie o “Me explique” e a conversa aparece aqui.
            </p>
          )}
          {falas.map((f, i) => (
            <div
              key={`${f.em}-${i}`}
              className={`rounded-2xl px-4 py-3 text-[15px] leading-relaxed ${
                f.quem === 'professor'
                  ? 'bg-muted text-foreground'
                  : 'bg-primary/10 text-foreground'
              }`}
            >
              <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                {f.quem === 'professor' ? 'Professor' : 'Você'} · {hora(f.em)}
              </p>
              {f.texto}
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-2 border-t border-border px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <button
            onClick={() => void baixarPdf()}
            disabled={!falas.length || gerando !== null}
            className="flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-primary px-5 text-[15px] font-bold text-primary-foreground active:scale-95 disabled:opacity-60"
          >
            {gerando === 'pdf' ? <Loader2 className="h-5 w-5 animate-spin" /> : <FileText className="h-5 w-5" />}
            Baixar PDF
          </button>
          <button
            onClick={() => void baixarTxt()}
            disabled={!falas.length || gerando !== null}
            className="flex h-12 items-center justify-center gap-2 rounded-full bg-muted px-5 text-[15px] font-semibold active:scale-95 disabled:opacity-60"
          >
            {gerando === 'txt' ? <Loader2 className="h-5 w-5 animate-spin" /> : <Download className="h-5 w-5" />}
            TXT
          </button>
          <button
            onClick={() => void copiarTexto(texto)}
            disabled={!falas.length}
            aria-label="Copiar transcrição"
            className="flex h-12 w-12 items-center justify-center rounded-full bg-muted active:scale-95 disabled:opacity-60"
          >
            <Copy className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default TranscricaoSheet;
