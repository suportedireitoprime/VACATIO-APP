import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Mic2, User, FileText, CheckCircle2 } from 'lucide-react';
import { haptic } from '@/lib/nativo';

export interface MeExpliqueConfig {
  voz: 'feminina' | 'masculina';
  nome: string;
  formatoRelatorio: string;
}

export const DEFAULT_CONFIG: MeExpliqueConfig = {
  voz: 'feminina',
  nome: 'Me Explique',
  formatoRelatorio: 'Resumo detalhado',
};

const FORMATOS = [
  'Resumo detalhado',
  'Tópicos principais',
  'Foco em Exame da OAB',
  'Mapa mental verbal',
];

interface Props {
  open: boolean;
  onClose: () => void;
  configAtual: MeExpliqueConfig;
  onSave: (config: MeExpliqueConfig) => void;
}

const MeExpliqueConfigSheet = ({ open, onClose, configAtual, onSave }: Props) => {
  const [config, setConfig] = useState<MeExpliqueConfig>(configAtual);

  useEffect(() => {
    if (open) {
      setConfig(configAtual);
    }
  }, [open, configAtual]);

  if (!open) return null;

  const handleSave = () => {
    void haptic.selection();
    onSave(config);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[70] flex flex-col justify-end bg-black/60 backdrop-blur-sm">
      <button className="absolute inset-0" aria-label="Fechar" onClick={onClose} />
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="relative max-h-[90vh] rounded-t-3xl bg-background text-foreground shadow-2xl flex flex-col"
      >
        <div className="flex items-center gap-3 border-b border-border px-5 py-4">
          <div className="flex-1">
            <h2 className="font-display text-lg font-bold leading-tight">Configurar Professor</h2>
            <p className="text-[13px] text-muted-foreground mt-0.5">
              Personalize a voz e o formato das explicações
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-muted active:scale-95 transition-transform"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Voz */}
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-sm font-bold text-foreground">
              <Mic2 className="w-4 h-4 text-primary" /> Voz do Professor
            </label>
            <div className="grid grid-cols-2 gap-3">
              {(['feminina', 'masculina'] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => { void haptic.light(); setConfig({ ...config, voz: v }) }}
                  className={`relative flex items-center justify-center py-3.5 rounded-2xl border-2 transition-all ${
                    config.voz === v
                      ? 'border-primary bg-primary/10 text-primary font-bold'
                      : 'border-border text-muted-foreground hover:border-primary/50'
                  }`}
                >
                  {v === 'feminina' ? 'Feminina' : 'Masculina'}
                  {config.voz === v && <CheckCircle2 className="absolute top-2 right-2 w-4 h-4" />}
                </button>
              ))}
            </div>
          </div>

          {/* Nome */}
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-sm font-bold text-foreground">
              <User className="w-4 h-4 text-primary" /> Nome do Professor
            </label>
            <input
              type="text"
              value={config.nome}
              onChange={(e) => setConfig({ ...config, nome: e.target.value })}
              placeholder="Ex: Professora Maria"
              className="w-full h-14 bg-muted/50 border border-border rounded-2xl px-4 text-base focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
            />
            <p className="text-[11px] text-muted-foreground ml-1">
              A IA agirá de acordo com o nome escolhido durante a chamada.
            </p>
          </div>

          {/* Formato do Relatório */}
          <div className="space-y-3 pb-4">
            <label className="flex items-center gap-2 text-sm font-bold text-foreground">
              <FileText className="w-4 h-4 text-primary" /> Formato das Respostas
            </label>
            <div className="grid grid-cols-1 gap-2">
              {FORMATOS.map((f) => (
                <button
                  key={f}
                  onClick={() => { void haptic.light(); setConfig({ ...config, formatoRelatorio: f }) }}
                  className={`flex items-center justify-between px-4 py-3.5 rounded-2xl border transition-all ${
                    config.formatoRelatorio === f
                      ? 'border-primary bg-primary/5 text-primary font-bold'
                      : 'border-border bg-card text-foreground hover:bg-muted/50'
                  }`}
                >
                  <span>{f}</span>
                  {config.formatoRelatorio === f && <div className="w-2 h-2 rounded-full bg-primary" />}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="border-t border-border p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <button
            onClick={handleSave}
            className="w-full h-14 bg-primary text-primary-foreground font-black text-base rounded-2xl shadow-lg shadow-primary/20 active:scale-95 transition-transform"
          >
            SALVAR CONFIGURAÇÕES
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default MeExpliqueConfigSheet;
