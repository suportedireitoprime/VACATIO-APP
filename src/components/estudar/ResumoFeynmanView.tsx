import { useState } from 'react';
import { motion } from 'framer-motion';
import { Download, Loader2, Lightbulb, MessageCircle, AlertTriangle, Sparkles, CheckCircle2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Document, Page, Text, View, StyleSheet, pdf } from '@react-pdf/renderer';
import { toast } from 'sonner';

interface FeynmanData {
  titulo: string;
  conceito: string;
  explicacao_simples: string;
  lacunas: string[];
  analogia: string;
  pontos_chave: string[];
}

const pdfStyles = StyleSheet.create({
  page: { padding: 30, fontFamily: 'Helvetica', fontSize: 10 },
  header: { fontSize: 14, fontWeight: 'bold', textAlign: 'center', marginBottom: 4, fontFamily: 'Helvetica-Bold', color: '#1a1a2e' },
  subtitle: { fontSize: 8, textAlign: 'center', color: '#888', marginBottom: 16 },
  block: { marginBottom: 14, padding: 10, backgroundColor: '#f9fafb', borderRadius: 4 },
  blockTitle: { fontSize: 10, fontWeight: 'bold', color: '#6366f1', marginBottom: 6, fontFamily: 'Helvetica-Bold' },
  blockText: { fontSize: 9, color: '#333', lineHeight: 1.6 },
  stepNumber: { fontSize: 18, fontWeight: 'bold', color: '#6366f1', fontFamily: 'Helvetica-Bold' },
  bulletItem: { fontSize: 9, color: '#444', marginBottom: 3, paddingLeft: 8 },
  footer: { position: 'absolute', bottom: 20, left: 30, right: 30, fontSize: 7, color: '#999', textAlign: 'center' },
});

const FeynmanPdfDoc = ({ data }: { data: FeynmanData }) => (
  <Document>
    <Page size="A4" style={pdfStyles.page}>
      <Text style={pdfStyles.header}>{data.titulo}</Text>
      <Text style={pdfStyles.subtitle}>Resumo Feynman — Vacatio 2026</Text>

      <View style={pdfStyles.block}>
        <Text style={pdfStyles.blockTitle}>1️⃣ CONCEITO</Text>
        <Text style={pdfStyles.blockText}>{data.conceito}</Text>
      </View>

      <View style={pdfStyles.block}>
        <Text style={pdfStyles.blockTitle}>2️⃣ EXPLICAÇÃO SIMPLES</Text>
        <Text style={pdfStyles.blockText}>{data.explicacao_simples}</Text>
      </View>

      <View style={pdfStyles.block}>
        <Text style={pdfStyles.blockTitle}>3️⃣ LACUNAS IDENTIFICADAS</Text>
        {data.lacunas.map((l, i) => (
          <Text key={i} style={pdfStyles.bulletItem}>⚠️ {l}</Text>
        ))}
      </View>

      <View style={pdfStyles.block}>
        <Text style={pdfStyles.blockTitle}>4️⃣ ANALOGIA</Text>
        <Text style={pdfStyles.blockText}>{data.analogia}</Text>
      </View>

      <View style={pdfStyles.block}>
        <Text style={pdfStyles.blockTitle}>✅ PONTOS-CHAVE</Text>
        {data.pontos_chave.map((p, i) => (
          <Text key={i} style={pdfStyles.bulletItem}>• {p}</Text>
        ))}
      </View>

      <Text style={pdfStyles.footer} render={({ pageNumber, totalPages }) => `Vacatio — Resumo Feynman — Página ${pageNumber} de ${totalPages}`} fixed />
    </Page>
  </Document>
);

interface Props {
  data: FeynmanData;
  leiNome: string;
  artigoNumero: string;
}

const STEPS = [
  { num: 1, label: 'Conceito', icon: Lightbulb, field: 'conceito' as const, color: 'text-primary' },
  { num: 2, label: 'Explicação Simples', icon: MessageCircle, field: 'explicacao_simples' as const, color: 'text-accent' },
  { num: 3, label: 'Lacunas', icon: AlertTriangle, field: 'lacunas' as const, color: 'text-yellow-500' },
  { num: 4, label: 'Analogia', icon: Sparkles, field: 'analogia' as const, color: 'text-purple-500' },
];

const ResumoFeynmanView = ({ data, leiNome, artigoNumero }: Props) => {
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      const blob = await pdf(<FeynmanPdfDoc data={data} />).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `feynman-${artigoNumero.replace(/\s+/g, '-')}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('PDF Feynman exportado!');
    } catch (e) {
      toast.error('Erro ao gerar PDF');
      console.error(e);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Title */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <h2 className="font-display text-xl font-bold text-foreground">{data.titulo}</h2>
        <p className="text-sm text-muted-foreground mt-1">{leiNome} — Técnica Feynman</p>
      </motion.div>

      {/* 4 Steps */}
      {STEPS.map((step, idx) => {
        const Icon = step.icon;
        const content = data[step.field];

        return (
          <motion.div key={step.num} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.1 }}
            className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-3 bg-muted/30 border-b border-border">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <span className="text-sm font-bold text-primary">{step.num}</span>
              </div>
              <Icon className={`w-4 h-4 ${step.color}`} />
              <span className="text-sm font-bold uppercase tracking-wider text-foreground/70">{step.label}</span>
            </div>
            <div className="p-4">
              {step.field === 'lacunas' ? (
                <ul className="space-y-2">
                  {(content as string[]).map((l, i) => (
                    <li key={i} className="flex items-start gap-2 text-base text-foreground/80 leading-[1.8]">
                      <AlertTriangle className="w-3.5 h-3.5 text-yellow-500 mt-0.5 shrink-0" />
                      {l}
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="prose prose-invert prose-base max-w-none leading-[1.8] text-foreground/80 [&_p]:mb-4 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_strong]:text-foreground [&_em]:text-foreground/90">
                  <ReactMarkdown>{content as string}</ReactMarkdown>
                </div>
              )}
            </div>
          </motion.div>
        );
      })}

      {/* Key points */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
        className="rounded-xl bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 border border-primary/20 p-4">
        <div className="flex items-center gap-2 mb-3">
          <CheckCircle2 className="w-4 h-4 text-primary" />
          <span className="text-xs font-bold text-primary uppercase tracking-wider">Pontos-chave</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {data.pontos_chave.map((p, i) => (
            <span key={i} className="px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-[11px] font-medium">{p}</span>
          ))}
        </div>
      </motion.div>

      {/* Export button */}
      <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
        onClick={handleExport} disabled={exporting}
        className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold flex items-center justify-center gap-2 disabled:opacity-50">
        {exporting ? <><Loader2 className="w-4 h-4 animate-spin" /> Gerando PDF...</> : <><Download className="w-4 h-4" /> Baixar PDF Feynman</>}
      </motion.button>
    </div>
  );
};

export default ResumoFeynmanView;
