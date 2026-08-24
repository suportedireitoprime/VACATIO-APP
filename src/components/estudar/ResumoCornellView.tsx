import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, Loader2, Key, HelpCircle, StickyNote, FileText, ChevronDown, BookOpen } from 'lucide-react';
import { Document, Page, Text, View, StyleSheet, pdf } from '@react-pdf/renderer';
import { toast } from 'sonner';

interface CornellPergunta {
  pergunta: string;
  resposta: string;
}

interface CornellData {
  titulo: string;
  palavras_chave: string[];
  perguntas: (string | CornellPergunta)[];
  anotacoes: { topico: string; conteudo: string }[];
  resumo_geral: string;
}

function normalizePergunta(p: string | CornellPergunta): CornellPergunta {
  if (typeof p === 'string') return { pergunta: p, resposta: '' };
  return p;
}

const pdfStyles = StyleSheet.create({
  page: { padding: 30, fontFamily: 'Helvetica', fontSize: 10 },
  header: { fontSize: 14, fontWeight: 'bold', textAlign: 'center', marginBottom: 4, fontFamily: 'Helvetica-Bold', color: '#1a1a2e' },
  subtitle: { fontSize: 8, textAlign: 'center', color: '#888', marginBottom: 16 },
  row: { flexDirection: 'row', minHeight: 200 },
  leftCol: { width: '35%', borderRight: '1 solid #ddd', paddingRight: 10 },
  rightCol: { width: '65%', paddingLeft: 10 },
  sectionTitle: { fontSize: 9, fontWeight: 'bold', color: '#6366f1', marginBottom: 6, fontFamily: 'Helvetica-Bold' },
  keyword: { fontSize: 9, color: '#333', marginBottom: 3, paddingLeft: 6 },
  question: { fontSize: 9, color: '#444', marginBottom: 2, paddingLeft: 6, fontFamily: 'Helvetica-Bold' },
  answer: { fontSize: 8, color: '#666', marginBottom: 6, paddingLeft: 12 },
  noteTopico: { fontSize: 9, fontWeight: 'bold', color: '#1a1a2e', marginTop: 6, fontFamily: 'Helvetica-Bold' },
  noteContent: { fontSize: 9, color: '#444', lineHeight: 1.5, marginTop: 2 },
  separator: { borderBottom: '2 solid #6366f1', marginVertical: 10 },
  resumoBox: { backgroundColor: '#f3f4f6', padding: 10, borderRadius: 4, marginTop: 8 },
  resumoTitle: { fontSize: 10, fontWeight: 'bold', color: '#1a1a2e', marginBottom: 4, fontFamily: 'Helvetica-Bold' },
  resumoText: { fontSize: 9, color: '#333', lineHeight: 1.6 },
  footer: { position: 'absolute', bottom: 20, left: 30, right: 30, fontSize: 7, color: '#999', textAlign: 'center' },
});

const CornellPdfDoc = ({ data }: { data: CornellData }) => (
  <Document>
    <Page size="A4" style={pdfStyles.page}>
      <Text style={pdfStyles.header}>{data.titulo}</Text>
      <Text style={pdfStyles.subtitle}>Resumo Cornell — Vacatio 2026</Text>
      <View style={pdfStyles.row}>
        <View style={pdfStyles.leftCol}>
          <Text style={pdfStyles.sectionTitle}>PALAVRAS-CHAVE</Text>
          {data.palavras_chave.map((k, i) => (
            <Text key={i} style={pdfStyles.keyword}>• {k}</Text>
          ))}
          <Text style={{ ...pdfStyles.sectionTitle, marginTop: 14 }}>PERGUNTAS</Text>
          {data.perguntas.map((p, i) => {
            const item = normalizePergunta(p);
            return (
              <View key={i}>
                <Text style={pdfStyles.question}>{i + 1}. {item.pergunta}</Text>
                {item.resposta ? <Text style={pdfStyles.answer}>R: {item.resposta}</Text> : null}
              </View>
            );
          })}
        </View>
        <View style={pdfStyles.rightCol}>
          <Text style={pdfStyles.sectionTitle}>ANOTAÇÕES</Text>
          {data.anotacoes.map((a, i) => (
            <View key={i}>
              <Text style={pdfStyles.noteTopico}>{a.topico}</Text>
              <Text style={pdfStyles.noteContent}>{a.conteudo}</Text>
            </View>
          ))}
        </View>
      </View>
      <View style={pdfStyles.separator} />
      <View style={pdfStyles.resumoBox}>
        <Text style={pdfStyles.resumoTitle}>RESUMO GERAL</Text>
        <Text style={pdfStyles.resumoText}>{data.resumo_geral}</Text>
      </View>
      <Text style={pdfStyles.footer} render={({ pageNumber, totalPages }) => `Vacatio — Resumo Cornell — Página ${pageNumber} de ${totalPages}`} fixed />
    </Page>
  </Document>
);

interface Props {
  data: CornellData;
  leiNome: string;
  artigoNumero: string;
}

const ResumoCornellView = ({ data, leiNome, artigoNumero }: Props) => {
  const [exporting, setExporting] = useState(false);
  const [expandedQ, setExpandedQ] = useState<number | null>(null);

  const handleExport = async () => {
    setExporting(true);
    try {
      const blob = await pdf(<CornellPdfDoc data={data} />).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cornell-${artigoNumero.replace(/\s+/g, '-')}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('PDF Cornell exportado!');
    } catch (e) {
      toast.error('Erro ao gerar PDF');
      console.error(e);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Title */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <h2 className="font-display text-xl font-bold text-foreground">{data.titulo}</h2>
        <p className="text-sm text-muted-foreground mt-1">{leiNome} — Método Cornell</p>
      </motion.div>

      {/* Two columns layout */}
      <div className="grid grid-cols-1 md:grid-cols-[35%_1fr] gap-4">
        {/* Left: Keywords + Questions */}
        <div className="space-y-4">
          <motion.div initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}
            className="rounded-xl border border-primary/20 bg-primary/5 p-5">
            <div className="flex items-center gap-2 mb-3">
              <Key className="w-5 h-5 text-primary" />
              <span className="text-sm font-bold text-primary uppercase tracking-wider">Palavras-chave</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {data.palavras_chave.map((k, i) => (
                <span key={i} className="px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium">{k}</span>
              ))}
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}
            className="rounded-xl border border-accent/20 bg-accent/5 p-5">
            <div className="flex items-center gap-2 mb-4">
              <HelpCircle className="w-5 h-5 text-accent" />
              <span className="text-sm font-bold text-accent uppercase tracking-wider">Perguntas</span>
            </div>
            <div className="space-y-2">
              {data.perguntas.map((p, i) => {
                const item = normalizePergunta(p);
                const isOpen = expandedQ === i;
                return (
                  <div key={i} className="rounded-lg border border-accent/15 bg-background/50 overflow-hidden">
                    <button
                      onClick={() => setExpandedQ(isOpen ? null : i)}
                      className="w-full flex items-center gap-2 px-4 py-3 text-left"
                    >
                      <span className="font-bold text-accent text-sm shrink-0">{i + 1}.</span>
                      <span className="text-base font-semibold text-foreground flex-1">{item.pergunta}</span>
                      <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
                        <ChevronDown className="w-4 h-4 text-accent shrink-0" />
                      </motion.div>
                    </button>
                    <AnimatePresence>
                      {isOpen && item.resposta && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.25 }}
                        >
                          <div className="px-4 pb-4 pt-0">
                            <div className="p-3 rounded-lg bg-accent/10 border border-accent/20">
                              <p className="text-base text-foreground leading-[1.8]">
                                <span className="font-bold text-accent">R:</span> {item.resposta}
                              </p>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </motion.div>
        </div>

        {/* Right: Notes */}
        <motion.div initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 }}
          className="rounded-xl border border-border bg-card p-3 md:p-5">
          <div className="flex items-center gap-2 mb-5">
            <StickyNote className="w-5 h-5 text-foreground/60" />
            <span className="text-sm font-bold text-foreground/60 uppercase tracking-wider">Anotações</span>
          </div>
          <div className="space-y-4">
            {data.anotacoes.map((a, i) => (
              <div key={i} className="rounded-xl bg-muted/30 border border-primary/10 p-3">
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0">
                    {i + 1}
                  </div>
                  <BookOpen className="w-3.5 h-3.5 text-primary/60 shrink-0" />
                  <h4 className="font-bold text-base text-foreground">{a.topico}</h4>
                </div>
                <p className="text-base leading-[1.8] text-foreground ml-8">{a.conteudo}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Summary footer */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
        className="rounded-xl bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 border border-primary/20 p-5">
        <div className="flex items-center gap-2 mb-3">
          <FileText className="w-5 h-5 text-primary" />
          <span className="text-sm font-bold text-primary uppercase tracking-wider">Resumo Geral</span>
        </div>
        <p className="text-base text-foreground/80 leading-[1.8]">{data.resumo_geral}</p>
      </motion.div>

      {/* Export button */}
      <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
        onClick={handleExport} disabled={exporting}
        className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground font-semibold text-base flex items-center justify-center gap-2 disabled:opacity-50">
        {exporting ? <><Loader2 className="w-5 h-5 animate-spin" /> Gerando PDF...</> : <><Download className="w-5 h-5" /> Baixar PDF Cornell</>}
      </motion.button>
    </div>
  );
};

export default ResumoCornellView;
