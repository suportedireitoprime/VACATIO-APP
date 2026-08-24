import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, Loader2, FileText } from 'lucide-react';
import { Document, Page, Text, View, StyleSheet, pdf, Font } from '@react-pdf/renderer';
import { toast } from 'sonner';
import type { ArtigoLei } from '@/data/mockData';

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: 'Helvetica', fontSize: 11 },
  header: { fontSize: 16, fontWeight: 'bold', marginBottom: 10, textAlign: 'center', fontFamily: 'Helvetica-Bold' },
  subheader: { fontSize: 10, color: '#666', marginBottom: 20, textAlign: 'center' },
  artigo: { marginBottom: 12 },
  artigoNum: { fontSize: 11, fontWeight: 'bold', color: '#333', fontFamily: 'Helvetica-Bold' },
  artigoText: { fontSize: 10, color: '#444', lineHeight: 1.5, marginTop: 2 },
  separator: { borderBottom: '1 solid #eee', marginVertical: 8 },
  footer: { position: 'absolute', bottom: 25, left: 40, right: 40, fontSize: 8, color: '#999', textAlign: 'center' },
  highlightNote: { fontSize: 9, color: '#6366f1', marginTop: 3, paddingLeft: 10 },
});

interface PdfExportDialogProps {
  open: boolean;
  onClose: () => void;
  artigos: ArtigoLei[];
  leiNome: string;
  highlights?: Record<string, any[]>;
}

const ArtigoPdfDoc = ({ artigos, leiNome, highlights }: { artigos: ArtigoLei[]; leiNome: string; highlights?: Record<string, any[]> }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <Text style={styles.header}>{leiNome}</Text>
      <Text style={styles.subheader}><Text style={styles.subheader}>Exportado via Vacatio - Vade Mecum Jurídico Profissional</Text></Text>
      {artigos.map((art, i) => (
        <View key={art.id} style={styles.artigo}>
          <Text style={styles.artigoNum}>Art. {art.numero}</Text>
          <Text style={styles.artigoText}>{art.caput}</Text>
          {highlights?.[art.id]?.map((h: any, j: number) => (
            h.comment ? <Text key={j} style={styles.highlightNote}>📝 {h.comment}</Text> : null
          ))}
          {i < artigos.length - 1 && <View style={styles.separator} />}
        </View>
      ))}
      <Text style={styles.footer} render={({ pageNumber, totalPages }) => `Vacatio — Página ${pageNumber} de ${totalPages}`} fixed />
    </Page>
  </Document>
);

const PdfExportDialog = ({ open, onClose, artigos, leiNome, highlights }: PdfExportDialogProps) => {
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      const blob = await pdf(<ArtigoPdfDoc artigos={artigos} leiNome={leiNome} highlights={highlights} />).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${leiNome.replace(/\s+/g, '_')}_DrLeis.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('PDF exportado com sucesso!');
      onClose();
    } catch (e) {
      toast.error('Erro ao gerar PDF');
      console.error(e);
    } finally {
      setExporting(false);
    }
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-card rounded-2xl p-6 max-w-sm w-full shadow-2xl"
          onClick={e => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              <h3 className="font-display text-lg font-bold text-foreground">Exportar PDF</h3>
            </div>
            <button onClick={onClose} className="p-1 rounded-full hover:bg-muted">
              <X className="w-4 h-4" />
            </button>
          </div>

          <p className="text-sm text-muted-foreground mb-4">
            Exportar {artigos.length} artigo{artigos.length !== 1 ? 's' : ''} de <strong>{leiNome}</strong> com destaques e anotações.
          </p>

          <button
            onClick={handleExport}
            disabled={exporting}
            className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {exporting ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Gerando PDF...</>
            ) : (
              <><Download className="w-4 h-4" /> Baixar PDF</>
            )}
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default PdfExportDialog;
