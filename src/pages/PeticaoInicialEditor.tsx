import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Mic,
  Square,
  Pause,
  Play,
  Sparkles,
  CheckCircle2,
  Loader2,
  Pencil,
  FileText,
  Download,
  BookOpen,
  RefreshCw,
  Trash2,
  Plus,
  ExternalLink,
  Lock,
  ChevronRight,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useFeatureLimit } from '@/hooks/useFeatureLimit';
import { useDictation } from '@/hooks/useDictation';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { gerarPeticaoPDF } from '@/lib/peticaoPdf';
import horusOwl from '@/assets/horus/horus-owl.webp';

// =============== Types ===============
interface Peticao {
  id: string;
  user_id: string;
  titulo: string;
  fatos_texto: string | null;
  area_direito: string | null;
  tags: string[];
  resumo: string | null;
  pedidos: any;
  partes: any;
  dados_sensiveis: any;
  peca_markdown: string | null;
  jurisprudencias: any;
  fontes: any;
  status: string;
  etapa: number;
}

interface Juris {
  tribunal: string;
  tipo?: string;
  numero?: string;
  titulo?: string;
  tese?: string;
  ementa?: string;
  link?: string;
  relator?: string;
  data?: string;
}

// Campos sensíveis padrão
const CAMPOS_SENSIVEIS = [
  { key: 'NOME_AUTOR', label: 'Nome completo do autor', mask: '' },
  { key: 'CPF_AUTOR', label: 'CPF do autor', mask: '000.000.000-00' },
  { key: 'RG_AUTOR', label: 'RG do autor', mask: '' },
  { key: 'ENDERECO_AUTOR', label: 'Endereço do autor', mask: '' },
  { key: 'TEL_AUTOR', label: 'Telefone do autor', mask: '(00) 00000-0000' },
  { key: 'EMAIL_AUTOR', label: 'E-mail do autor', mask: '' },
  { key: 'CIDADE_AUTOR', label: 'Cidade', mask: '' },
  { key: 'NOME_REU', label: 'Nome do réu', mask: '' },
  { key: 'CNPJ_REU', label: 'CNPJ do réu', mask: '00.000.000/0000-00' },
  { key: 'ENDERECO_REU', label: 'Endereço do réu', mask: '' },
  { key: 'VALOR_CAUSA', label: 'Valor da causa (R$)', mask: '' },
  { key: 'NOME_ADVOGADO', label: 'Nome do advogado', mask: '' },
  { key: 'OAB_ADVOGADO', label: 'Número da OAB', mask: '' },
];

const SECOES = [
  { id: 'cabecalho', label: 'Endereçamento e qualificação' },
  { id: 'fatos', label: 'Dos fatos' },
  { id: 'direito', label: 'Do direito' },
  { id: 'jurisprudencia', label: 'Da jurisprudência' },
  { id: 'pedidos', label: 'Dos pedidos' },
  { id: 'encerramento', label: 'Valor da causa e encerramento' },
];

const STEPS = [
  { n: 1, label: 'Fatos' },
  { n: 2, label: 'Triagem' },
  { n: 3, label: 'Resumo' },
  { n: 4, label: 'Partes' },
  { n: 5, label: 'Jurisprudência' },
  { n: 6, label: 'Elaboração' },
  { n: 7, label: 'Pronta' },
];

export default function PeticaoInicialEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { canUse, register } = useFeatureLimit('peticao_inicial');
  const [pet, setPet] = useState<Peticao | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!id || !user) return;
    const { data, error } = await supabase
      .from('peticoes_iniciais' as any)
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error || !data) {
      toast.error(error?.message ?? 'Petição não encontrada');
      navigate('/ferramentas/peticao-inicial');
      return;
    }
    setPet(data as any);
    setLoading(false);
  }, [id, user, navigate]);

  useEffect(() => {
    load();
  }, [load]);

  const patch = async (fields: Partial<Peticao>) => {
    if (!pet) return;
    setSaving(true);
    // Aplica localmente primeiro para UX offline-first.
    setPet({ ...pet, ...fields });
    const online = typeof navigator === 'undefined' ? true : navigator.onLine !== false;
    if (!online) {
      try {
        const { syncQueue } = await import('@/services/syncQueue');
        await syncQueue.enqueue({
          kind: 'table.update', table: 'peticoes_iniciais',
          match: { id: pet.id }, values: fields as any,
        });
      } catch {}
      setSaving(false);
      toast.message('Salvo localmente. Sincroniza quando voltar a internet.');
      return;
    }
    const { error } = await supabase
      .from('peticoes_iniciais' as any)
      .update(fields)
      .eq('id', pet.id);
    setSaving(false);
    if (error) {
      // Rede caiu no meio? Enfileira e informa.
      try {
        const { syncQueue } = await import('@/services/syncQueue');
        await syncQueue.enqueue({
          kind: 'table.update', table: 'peticoes_iniciais',
          match: { id: pet.id }, values: fields as any,
        });
        toast.message('Salvo localmente. Sincroniza quando voltar a internet.');
      } catch {
        toast.error(error.message);
      }
    }
  };

  if (loading || !pet) {
    return (
      <div className="min-h-screen grid place-items-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const etapa = pet.etapa || 1;

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Top bar */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border">
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            onClick={() => navigate('/ferramentas/peticao-inicial')}
            className="w-10 h-10 grid place-items-center rounded-full hover:bg-muted"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <p className="font-display text-base font-bold truncate">{pet.titulo}</p>
            <p className="text-xs text-muted-foreground">
              Etapa {etapa}/7 · {STEPS[etapa - 1]?.label}
              {saving ? ' · salvando…' : ''}
            </p>
          </div>
        </div>
        {/* Progresso em bolinhas */}
        <div className="flex items-center justify-between gap-1 px-4 pb-3">
          {STEPS.map((s) => (
            <div
              key={s.n}
              className={`h-1.5 flex-1 rounded-full transition ${
                s.n <= etapa ? 'bg-gradient-to-r from-[#EFE039] to-[#D4B800]' : 'bg-muted'
              }`}
            />
          ))}
        </div>
      </div>

      <div className="px-4 py-4 max-w-2xl mx-auto">
        {etapa === 1 && <StepFatos pet={pet} onNext={(v) => patch({ ...v, etapa: 2 })} />}
        {etapa === 2 && (
          <StepTriagem
            pet={pet}
            onNext={(v) => patch({ ...v, etapa: 3 })}
            onBack={() => patch({ etapa: 1 })}
          />
        )}
        {etapa === 3 && (
          <StepResumo
            pet={pet}
            onNext={(v) => patch({ ...v, etapa: 4 })}
            onBack={() => patch({ etapa: 2 })}
          />
        )}
        {etapa === 4 && (
          <StepPartes
            pet={pet}
            onNext={(v) => patch({ ...v, etapa: 5 })}
            onBack={() => patch({ etapa: 3 })}
          />
        )}
        {etapa === 5 && (
          <StepJurisprudencia
            pet={pet}
            onNext={(v) => patch({ ...v, etapa: 6 })}
            onBack={() => patch({ etapa: 4 })}
          />
        )}
        {etapa === 6 && (
          <StepElaboracao
            pet={pet}
            onNext={async (v) => {
              if (canUse) await register(pet.id).catch(() => {});
              await patch({ ...v, etapa: 7, status: 'finalizada' });
            }}
            onBack={() => patch({ etapa: 5 })}
          />
        )}
        {etapa === 7 && (
          <StepFinal
            pet={pet}
            onEditJuris={() => patch({ etapa: 5 })}
            onSave={(v) => patch(v)}
          />
        )}
      </div>
    </div>
  );
}

// =============== STEP 1: FATOS ===============
function StepFatos({ pet, onNext }: { pet: Peticao; onNext: (v: Partial<Peticao>) => void }) {
  const [texto, setTexto] = useState(pet.fatos_texto ?? '');
  const { state, partial, start, pause, resume, stop } = useDictation((chunk) => {
    setTexto((prev) => (prev ? prev.trimEnd() + ' ' : '') + chunk);
  });

  const recording = state === 'recording';
  const paused = state === 'paused';
  const active = recording || paused;
  const displayed = recording && partial ? (texto ? texto.trimEnd() + ' ' + partial : partial) : texto;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display text-xl font-bold">Descreva os fatos</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Grave um áudio ou digite. Conte o que aconteceu com detalhes — quem, quando, onde e como.
        </p>
      </div>

      <div className="relative">
        <Textarea
          value={displayed}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Ex.: No dia 15/10, ao consultar meu CPF, descobri uma inscrição indevida em nome da empresa XYZ, no valor de R$ 1.850, sem nunca ter contratado o serviço…"
          className="min-h-[220px] text-base resize-none pr-4 pb-16"
          disabled={active}
        />
        {/* Controles de gravação */}
        <div className="absolute right-3 bottom-3 flex items-center gap-2">
          {!active && (
            <button
              type="button"
              onClick={start}
              className="w-11 h-11 rounded-full grid place-items-center shadow bg-gradient-to-br from-[#EFE039] to-[#D4B800] text-gray-900"
              aria-label="Gravar áudio"
            >
              <Mic className="w-5 h-5" />
            </button>
          )}
          {recording && (
            <>
              <button
                type="button"
                onClick={pause}
                className="w-11 h-11 rounded-full grid place-items-center shadow bg-gray-900 text-white"
                aria-label="Pausar gravação"
              >
                <Pause className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={stop}
                className="w-11 h-11 rounded-full grid place-items-center shadow bg-red-500 text-white animate-pulse"
                aria-label="Parar gravação"
              >
                <Square className="w-5 h-5" />
              </button>
            </>
          )}
          {paused && (
            <>
              <button
                type="button"
                onClick={resume}
                className="w-11 h-11 rounded-full grid place-items-center shadow bg-gradient-to-br from-[#EFE039] to-[#D4B800] text-gray-900"
                aria-label="Continuar gravação"
              >
                <Play className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={stop}
                className="w-11 h-11 rounded-full grid place-items-center shadow bg-red-500 text-white"
                aria-label="Parar gravação"
              >
                <Square className="w-5 h-5" />
              </button>
            </>
          )}
        </div>
      </div>
      {recording && (
        <p className="text-xs text-red-500 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" /> Gravando… pode pausar quando quiser
        </p>
      )}
      {paused && (
        <p className="text-xs text-muted-foreground flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-muted-foreground" /> Pausado — toque em ▶ para continuar
        </p>
      )}

      <Button
        onClick={() => {
          if (texto.trim().length < 30) {
            toast.error('Conte mais detalhes dos fatos (mín. 30 caracteres).');
            return;
          }
          onNext({ fatos_texto: texto });
        }}
        className="w-full h-12 rounded-xl font-bold bg-gray-900 text-white hover:bg-gray-800"
      >
        Analisar com IA
        <Sparkles className="w-4 h-4 ml-2" />
      </Button>
    </div>
  );
}

// =============== STEP 2: TRIAGEM (checklist Horus) ===============
function StepTriagem({
  pet,
  onNext,
  onBack,
}: {
  pet: Peticao;
  onNext: (v: Partial<Peticao>) => void;
  onBack: () => void;
}) {
  const CHECKS = [
    'Ouvindo os fatos com atenção',
    'Identificando as partes envolvidas',
    'Classificando a área do direito',
    'Levantando os pedidos',
    'Estruturando a triagem',
  ];
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    let cancel = false;
    const interval = setInterval(() => {
      setStep((s) => (s < CHECKS.length - 1 ? s + 1 : s));
    }, 900);

    (async () => {
      try {
        const { withOnlineGuard } = await import('@/lib/onlineGuard');
        const { data, error } = await withOnlineGuard(
          () => supabase.functions.invoke('peticao-triagem', {
            body: { fatos: pet.fatos_texto },
          }),
          { message: 'Sem internet — a triagem da petição precisa de conexão.' },
        );
        clearInterval(interval);
        if (cancel) return;
        if (error) throw error;
        if (!data || data.error) throw new Error(data?.error ?? 'Erro na triagem');
        setStep(CHECKS.length);
        setTimeout(() => {
          if (!cancel) {
            onNext({
              area_direito: data.area_direito ?? null,
              tags: Array.isArray(data.tags) ? data.tags : [],
              resumo: data.resumo ?? null,
              pedidos: Array.isArray(data.pedidos) ? data.pedidos : [],
              partes: {
                autor: data.partes_sugeridas?.autor ?? '',
                reu: data.partes_sugeridas?.reu ?? '',
                sub_area: data.sub_area ?? '',
              },
            });
          }
        }, 700);
      } catch (e: any) {
        clearInterval(interval);
        if (!cancel) setError(e.message ?? 'Erro na triagem');
      }
    })();

    return () => {
      cancel = true;
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center space-y-5">
      <motion.img
        src={horusOwl}
        alt="Horus analisando"
        className="w-28 h-28 object-contain"
        animate={{ y: [0, -6, 0] }}
        transition={{ repeat: Infinity, duration: 2 }}
      />
      <h2 className="font-display text-xl font-bold">Horus está analisando seu caso…</h2>

      <div className="w-full max-w-sm space-y-2 text-left">
        {CHECKS.map((c, i) => (
          <motion.div
            key={c}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: i <= step ? 1 : 0.4, x: 0 }}
            className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border"
          >
            {i < step ? (
              <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
            ) : i === step ? (
              <Loader2 className="w-5 h-5 animate-spin text-[#D4B800] shrink-0" />
            ) : (
              <div className="w-5 h-5 rounded-full border-2 border-muted-foreground/30 shrink-0" />
            )}
            <span className="text-sm">{c}</span>
          </motion.div>
        ))}
      </div>

      {error && (
        <div className="space-y-3 w-full max-w-sm">
          <p className="text-sm text-destructive">{error}</p>
          <Button variant="outline" onClick={onBack} className="w-full">
            Voltar
          </Button>
        </div>
      )}
    </div>
  );
}

// =============== STEP 3: RESUMO + TAGS (confirmar/corrigir) ===============
function StepResumo({
  pet,
  onNext,
  onBack,
}: {
  pet: Peticao;
  onNext: (v: Partial<Peticao>) => void;
  onBack: () => void;
}) {
  const [area, setArea] = useState(pet.area_direito ?? '');
  const [resumo, setResumo] = useState(pet.resumo ?? '');
  const [titulo, setTitulo] = useState(pet.titulo);
  const tags = pet.tags ?? [];
  const pedidos: string[] = Array.isArray(pet.pedidos) ? pet.pedidos : [];

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-xl font-bold">Confirme a triagem</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Corrija o que estiver errado antes de continuar.
        </p>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-semibold">Título da petição</label>
        <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} className="h-11" />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-semibold">Área do direito</label>
        <Input value={area} onChange={(e) => setArea(e.target.value)} className="h-11" />
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {tags.map((t) => (
              <Badge key={t} className="bg-[#EFE039] text-gray-900 hover:bg-[#EFE039]">
                {t}
              </Badge>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <label className="text-sm font-semibold">Resumo do caso</label>
        <Textarea
          value={resumo}
          onChange={(e) => setResumo(e.target.value)}
          className="min-h-[120px] text-base"
        />
      </div>

      {pedidos.length > 0 && (
        <div className="space-y-2">
          <label className="text-sm font-semibold">Pedidos identificados</label>
          <div className="space-y-1.5">
            {pedidos.map((p, i) => (
              <div
                key={i}
                className="p-3 rounded-lg bg-muted/50 border border-border text-sm"
              >
                {p}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-2 pt-2">
        <Button variant="outline" onClick={onBack} className="flex-1 h-12 rounded-xl">
          Voltar
        </Button>
        <Button
          onClick={() => onNext({ titulo, area_direito: area, resumo })}
          className="flex-[2] h-12 rounded-xl font-bold bg-gray-900 text-white hover:bg-gray-800"
        >
          Confirmar e continuar
        </Button>
      </div>
    </div>
  );
}

// =============== STEP 4: PARTES + DADOS SENSÍVEIS ===============
function StepPartes({
  pet,
  onNext,
  onBack,
}: {
  pet: Peticao;
  onNext: (v: Partial<Peticao>) => void;
  onBack: () => void;
}) {
  const [dados, setDados] = useState<Record<string, string>>(
    (pet.dados_sensiveis as any) ?? {},
  );
  const [openField, setOpenField] = useState<string | null>(null);
  const [tempValue, setTempValue] = useState('');

  const openSheet = (key: string) => {
    setTempValue(dados[key] ?? '');
    setOpenField(key);
  };
  const saveSheet = () => {
    if (!openField) return;
    setDados({ ...dados, [openField]: tempValue.trim() });
    setOpenField(null);
  };

  const mask = (val: string) => {
    if (!val) return '';
    if (val.length <= 4) return '•'.repeat(val.length);
    return val.slice(0, 2) + '•'.repeat(Math.max(3, val.length - 4)) + val.slice(-2);
  };

  const field = CAMPOS_SENSIVEIS.find((c) => c.key === openField);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-xl font-bold">Partes e qualificação</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Preencha os dados. Só ficam com você — a IA nunca vê esses valores em texto claro.
        </p>
      </div>

      <div className="space-y-2">
        {CAMPOS_SENSIVEIS.map((c) => {
          const val = dados[c.key] ?? '';
          const filled = val.length > 0;
          return (
            <button
              key={c.key}
              onClick={() => openSheet(c.key)}
              className="w-full flex items-center gap-3 p-3.5 rounded-xl bg-card border border-border hover:border-[#EFE039] transition text-left"
            >
              <div
                className={`w-9 h-9 rounded-lg grid place-items-center shrink-0 ${
                  filled ? 'bg-green-500/10 text-green-600' : 'bg-muted text-muted-foreground'
                }`}
              >
                {filled ? <CheckCircle2 className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{c.label}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {filled ? mask(val) : c.mask || 'Toque para preencher'}
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
            </button>
          );
        })}
      </div>

      <div className="flex gap-2 pt-2">
        <Button variant="outline" onClick={onBack} className="flex-1 h-12 rounded-xl">
          Voltar
        </Button>
        <Button
          onClick={() => onNext({ dados_sensiveis: dados })}
          className="flex-[2] h-12 rounded-xl font-bold bg-gray-900 text-white hover:bg-gray-800"
        >
          Continuar
        </Button>
      </div>

      <Sheet open={!!openField} onOpenChange={(o) => !o && setOpenField(null)}>
        <SheetContent side="bottom" className="rounded-t-3xl h-[80vh]">
          <SheetHeader>
            <SheetTitle>{field?.label}</SheetTitle>
          </SheetHeader>
          <div className="py-4 space-y-3">
            <p className="text-sm text-muted-foreground">
              Este valor será usado apenas no PDF final gerado no seu aparelho. A IA nunca recebe
              o valor em texto claro.
            </p>
            <Input
              value={tempValue}
              onChange={(e) => setTempValue(e.target.value)}
              placeholder={field?.mask || 'Digite aqui'}
              className="h-14 text-lg"
              autoFocus
            />
            <Button
              onClick={saveSheet}
              className="w-full h-12 rounded-xl bg-gray-900 text-white font-bold"
            >
              Salvar
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

// =============== STEP 5: JURISPRUDÊNCIA ===============
function StepJurisprudencia({
  pet,
  onNext,
  onBack,
}: {
  pet: Peticao;
  onNext: (v: Partial<Peticao>) => void;
  onBack: () => void;
}) {
  const [incluir, setIncluir] = useState<boolean>((pet.jurisprudencias as Juris[])?.length > 0);
  const [items, setItems] = useState<Juris[]>((pet.jurisprudencias as Juris[]) ?? []);
  const [loading, setLoading] = useState(false);
  const [refazendo, setRefazendo] = useState<number | null>(null);
  const [pontos, setPontos] = useState('');
  const [pontosOpen, setPontosOpen] = useState(false);

  const buscar = async (foco?: string) => {
    setLoading(true);
    try {
      const { withOnlineGuard } = await import('@/lib/onlineGuard');
      const { data, error } = await withOnlineGuard(
        () => supabase.functions.invoke('peticao-jurisprudencia-web', {
          body: {
            tema: pet.resumo,
            area_direito: pet.area_direito,
            fatos_resumo: pet.resumo ?? pet.fatos_texto,
            pontos_foco: foco,
            quantidade: 4,
          },
        }),
        { message: 'Sem internet — a busca de jurisprudência precisa de conexão.' },
      );
      if (error) throw error;
      const list: Juris[] = data?.jurisprudencias ?? [];
      if (!list.length) {
        toast.info('Nenhuma jurisprudência real encontrada no Corpus927 para este caso.');
        setItems([]);
      } else if (data?.usou_fallback) {
        toast.info('Corpus927 sem resultado — usei busca web (STF/STJ) como fallback.');
        setItems(list);
      } else {
        toast.success(`Corpus927 (Enfam/STJ) retornou ${list.length} jurisprudência(s) reais.`);
        setItems(list);
      }
    } catch (e: any) {
      toast.error(e.message ?? 'Erro ao buscar jurisprudência');
    } finally {
      setLoading(false);
    }
  };

  const remover = (i: number) => setItems((prev) => prev.filter((_, idx) => idx !== i));
  const buscarMais = async () => {
    setLoading(true);
    try {
      const { withOnlineGuard } = await import('@/lib/onlineGuard');
      const { data } = await withOnlineGuard(
        () => supabase.functions.invoke('peticao-jurisprudencia-web', {
          body: {
            tema: pet.resumo,
            area_direito: pet.area_direito,
            fatos_resumo: pet.resumo ?? pet.fatos_texto,
            quantidade: 4,
          },
        }),
        { message: 'Sem internet — não é possível buscar mais jurisprudências.' },
      );
      const novos: Juris[] = data?.jurisprudencias ?? [];
      const existentes = new Set(items.map((i) => i.link));
      const filtrados = novos.filter((n) => n.link && !existentes.has(n.link));
      if (!filtrados.length) toast.info('Nada novo por agora.');
      else setItems([...items, ...filtrados]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-xl font-bold">Jurisprudência</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Buscamos primeiro no <strong>Corpus927 (Enfam/STJ)</strong> — jurisprudências
          <strong> reais</strong>, com link oficial. Se não houver, caímos em busca web no STF/STJ.
        </p>
      </div>

      {!incluir ? (
        <div className="rounded-2xl border border-border p-5 space-y-3">
          <p className="text-sm">Deseja incluir jurisprudência real do STF/STJ na sua petição?</p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1 h-12 rounded-xl"
              onClick={() => onNext({ jurisprudencias: [] })}
            >
              Sem jurisprudência
            </Button>
            <Button
              onClick={() => {
                setIncluir(true);
                buscar();
              }}
              className="flex-1 h-12 rounded-xl font-bold bg-gray-900 text-white hover:bg-gray-800"
            >
              Buscar
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {loading && items.length === 0 && (
            <div className="rounded-xl bg-card border border-border p-6 text-center">
              <Loader2 className="w-6 h-6 animate-spin text-[#D4B800] mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                Agente pesquisador consultando o Corpus927 (Enfam/STJ)…
              </p>
            </div>
          )}

          {items.map((j, i) => (
            <div key={i} className="rounded-xl bg-card border border-border p-4 space-y-2">
              <div className="flex items-start gap-2">
                <Badge
                  className={`shrink-0 ${
                    j.tribunal === 'STF'
                      ? 'bg-blue-600 hover:bg-blue-600'
                      : 'bg-green-600 hover:bg-green-600'
                  } text-white`}
                >
                  {j.tribunal}
                </Badge>
                {j.tipo && (
                  <Badge variant="outline" className="text-xs">
                    {j.tipo} {j.numero ? `nº ${j.numero}` : ''}
                  </Badge>
                )}
              </div>
              <p className="font-semibold text-sm">{j.titulo || j.tese?.slice(0, 100)}</p>
              {j.tese && (
                <p className="text-xs text-muted-foreground line-clamp-3">{j.tese}</p>
              )}
              <div className="flex items-center justify-between pt-1">
                {j.link && (
                  <a
                    href={j.link}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-blue-600 hover:underline flex items-center gap-1 min-w-0"
                  >
                    <ExternalLink className="w-3 h-3 shrink-0" />
                    <span className="truncate">Fonte oficial</span>
                  </a>
                )}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => remover(i)}
                    className="w-8 h-8 grid place-items-center rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                    aria-label="Remover"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}

          {items.length > 0 && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={buscarMais}
                disabled={loading}
                className="flex-1 h-11 rounded-xl"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-1" />
                    Buscar mais
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => setPontosOpen(true)}
                className="flex-1 h-11 rounded-xl"
              >
                <RefreshCw className="w-4 h-4 mr-1" />
                Refazer c/ foco
              </Button>
            </div>
          )}
        </div>
      )}

      <div className="flex gap-2 pt-2">
        <Button variant="outline" onClick={onBack} className="flex-1 h-12 rounded-xl">
          Voltar
        </Button>
        <Button
          onClick={() => onNext({ jurisprudencias: items })}
          disabled={loading}
          className="flex-[2] h-12 rounded-xl font-bold bg-gray-900 text-white hover:bg-gray-800"
        >
          Continuar
        </Button>
      </div>

      <Sheet open={pontosOpen} onOpenChange={setPontosOpen}>
        <SheetContent side="bottom" className="rounded-t-3xl">
          <SheetHeader>
            <SheetTitle>Refazer busca com foco</SheetTitle>
          </SheetHeader>
          <div className="py-4 space-y-3">
            <p className="text-sm text-muted-foreground">
              Ex.: "foco em dano moral por inscrição indevida no SPC/Serasa"
            </p>
            <Textarea
              value={pontos}
              onChange={(e) => setPontos(e.target.value)}
              placeholder="Digite o foco…"
              className="min-h-[100px]"
            />
            <Button
              onClick={async () => {
                setPontosOpen(false);
                await buscar(pontos);
                setPontos('');
              }}
              className="w-full h-12 rounded-xl bg-gray-900 text-white font-bold"
            >
              Buscar com foco
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

// =============== STEP 6: ELABORAÇÃO (seção por seção) ===============
function StepElaboracao({
  pet,
  onNext,
  onBack,
}: {
  pet: Peticao;
  onNext: (v: Partial<Peticao>) => void;
  onBack: () => void;
}) {
  const [current, setCurrent] = useState(0);
  const [feitos, setFeitos] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [subFase, setSubFase] = useState<'redator' | 'revisor' | 'refinador' | 'ok'>('redator');
  const runningRef = useRef(false);

  useEffect(() => {
    if (runningRef.current) return;
    runningRef.current = true;
    let cancel = false;

    (async () => {
      let anteriores = '';
      const acc: Record<string, string> = {};
      for (let i = 0; i < SECOES.length; i++) {
        if (cancel) return;
        setCurrent(i);
        // Animação das 3 fases (cosmética — o backend roda os 3 agentes em série).
        setSubFase('redator');
        const fase2 = window.setTimeout(() => !cancel && setSubFase('revisor'), 4500);
        const fase3 = window.setTimeout(() => !cancel && setSubFase('refinador'), 9000);
        try {
          const { withOnlineGuard } = await import('@/lib/onlineGuard');
          const { data, error } = await withOnlineGuard(
            () => supabase.functions.invoke('peticao-elaborar', {
              body: {
                secao_id: SECOES[i].id,
                fatos: pet.fatos_texto,
                resumo: pet.resumo,
                area_direito: pet.area_direito,
                sub_area: (pet.partes as any)?.sub_area,
                pedidos: pet.pedidos,
                partes: pet.partes,
                jurisprudencias: pet.jurisprudencias,
                anteriores,
              },
            }),
            { message: 'Sem internet — a elaboração da petição precisa de conexão.' },
          );
          window.clearTimeout(fase2);
          window.clearTimeout(fase3);
          if (error) throw error;
          if (data?.error) throw new Error(data.error);
          const texto = (data?.texto ?? '') as string;
          acc[SECOES[i].id] = texto;
          anteriores += '\n\n' + texto;
          setFeitos({ ...acc });
          setSubFase('ok');
        } catch (e: any) {
          window.clearTimeout(fase2);
          window.clearTimeout(fase3);
          if (!cancel) setError(e.message ?? 'Erro ao gerar seção');
          return;
        }
      }
      if (cancel) return;
      setCurrent(SECOES.length);
      const peca = SECOES.map((s) => acc[s.id]).filter(Boolean).join('\n\n');
      const fontes = extractFontes(peca, pet.jurisprudencias as Juris[]);
      setTimeout(() => {
        if (!cancel) onNext({ peca_markdown: peca, fontes });
      }, 500);
    })();

    return () => {
      cancel = true;
    };
  }, []);

  const faseLabel =
    subFase === 'redator'
      ? '✍️ Redator escrevendo o rascunho…'
      : subFase === 'revisor'
        ? '🔍 Revisor apontando falhas…'
        : subFase === 'refinador'
          ? '✨ Refinador polindo a versão final…'
          : '';

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center space-y-5">
      <motion.img
        src={horusOwl}
        alt="Horus redigindo"
        className="w-28 h-28 object-contain"
        animate={{ rotate: [-3, 3, -3] }}
        transition={{ repeat: Infinity, duration: 3 }}
      />
      <div>
        <h2 className="font-display text-xl font-bold">Redigindo sua petição…</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Três agentes trabalhando em cada seção: <strong>redator</strong>, <strong>revisor</strong> e <strong>refinador</strong>.
        </p>
        {current < SECOES.length && faseLabel && (
          <p className="text-xs text-[#D4B800] mt-2 font-medium">{faseLabel}</p>
        )}
      </div>

      <div className="w-full max-w-sm space-y-2 text-left">
        {SECOES.map((s, i) => (
          <div
            key={s.id}
            className={`flex items-center gap-3 p-3 rounded-xl border transition ${
              i < current
                ? 'bg-green-500/5 border-green-500/30'
                : i === current
                  ? 'bg-[#EFE039]/10 border-[#EFE039]'
                  : 'bg-card border-border opacity-60'
            }`}
          >
            {i < current ? (
              <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
            ) : i === current ? (
              <Loader2 className="w-5 h-5 animate-spin text-[#D4B800] shrink-0" />
            ) : (
              <div className="w-5 h-5 rounded-full border-2 border-muted-foreground/30 shrink-0" />
            )}
            <span className="text-sm">{s.label}</span>
          </div>
        ))}
      </div>

      {error && (
        <div className="space-y-3 w-full max-w-sm">
          <p className="text-sm text-destructive">{error}</p>
          <Button variant="outline" onClick={onBack} className="w-full">
            Voltar
          </Button>
        </div>
      )}
    </div>
  );
}

// =============== STEP 7: PEÇA PRONTA ===============
function StepFinal({
  pet,
  onEditJuris,
  onSave,
}: {
  pet: Peticao;
  onEditJuris: () => void;
  onSave: (v: Partial<Peticao>) => void;
}) {
  const [fontesOpen, setFontesOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  const dados = (pet.dados_sensiveis as Record<string, string>) ?? {};
  const pecaPreview = useMemo(() => applyPlaceholders(pet.peca_markdown ?? '', dados, true), [
    pet.peca_markdown,
    dados,
  ]);
  const pecaFinal = useMemo(() => applyPlaceholders(pet.peca_markdown ?? '', dados, false), [
    pet.peca_markdown,
    dados,
  ]);

  const fontes: Array<{ label: string; url?: string }> = (pet.fontes as any) ?? [];

  const exportar = async () => {
    setExporting(true);
    try {
      await gerarPeticaoPDF({
        titulo: pet.titulo,
        areaDireito: pet.area_direito ?? undefined,
        peca: pecaFinal,
        fontes,
      });
    } catch (e: any) {
      toast.error(e.message ?? 'Erro ao gerar PDF');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl font-bold">Petição pronta</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Toque nos campos amarelos para preencher.
          </p>
        </div>
        <Badge className="bg-green-500 text-white">Finalizada</Badge>
      </div>

      <div className="rounded-2xl bg-card border border-border p-4 max-h-[55vh] overflow-y-auto text-sm leading-relaxed">
        <MarkdownRenderer md={pecaPreview} />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Button
          variant="outline"
          onClick={() => setFontesOpen(true)}
          className="h-12 rounded-xl"
        >
          <BookOpen className="w-4 h-4 mr-1" />
          Fontes usadas
        </Button>
        <Button variant="outline" onClick={onEditJuris} className="h-12 rounded-xl">
          <Pencil className="w-4 h-4 mr-1" />
          Editar jurisprudência
        </Button>
      </div>

      <Button
        onClick={exportar}
        disabled={exporting}
        className="w-full h-14 rounded-xl font-bold bg-gradient-to-br from-[#EFE039] to-[#D4B800] text-gray-900 hover:opacity-90"
      >
        {exporting ? (
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
        ) : (
          <Download className="w-5 h-5 mr-2" />
        )}
        Exportar PDF
      </Button>

      <Sheet open={fontesOpen} onOpenChange={setFontesOpen}>
        <SheetContent side="bottom" className="rounded-t-3xl h-[90vh]">
          <SheetHeader>
            <SheetTitle>Fontes usadas</SheetTitle>
          </SheetHeader>
          <div className="py-4 space-y-2 overflow-y-auto">
            {fontes.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">
                Nenhuma fonte externa citada.
              </p>
            )}
            {fontes.map((f, i) => (
              <div key={i} className="p-3 rounded-xl bg-card border border-border">
                <p className="text-sm font-semibold">{f.label}</p>
                {f.url && (
                  <a
                    href={f.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-blue-600 hover:underline flex items-center gap-1 mt-1"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span className="truncate">{f.url}</span>
                  </a>
                )}
              </div>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

// =============== Helpers ===============
function applyPlaceholders(md: string, dados: Record<string, string>, previewMask: boolean) {
  return md.replace(/\{\{([A-Z_]+)\}\}/g, (_, key) => {
    const value = dados[key];
    if (value && value.length > 0) return value;
    if (key === 'DATA_HOJE') return new Date().toLocaleDateString('pt-BR');
    if (previewMask) {
      // Placeholder amarelo visual — no preview mostramos como pill
      return `[[${key}]]`;
    }
    // No PDF, se não foi preenchido, deixa em branco marcado
    return `_____________`;
  });
}

function extractFontes(peca: string, juris: Juris[]): Array<{ label: string; url?: string }> {
  const out: Array<{ label: string; url?: string }> = [];
  const seen = new Set<string>();
  // Links markdown
  const re = /\[([^\]]+)\]\(([^)]+)\)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(peca)) !== null) {
    const url = m[2];
    if (url.startsWith('lei://') || url.startsWith('sumula://') || seen.has(url)) {
      if (!seen.has(url)) {
        seen.add(url);
        out.push({ label: m[1], url: url.startsWith('http') ? url : undefined });
      }
      continue;
    }
    seen.add(url);
    out.push({ label: m[1], url });
  }
  // Adiciona jurisprudências não citadas mas incluídas
  juris?.forEach((j) => {
    if (j.link && !seen.has(j.link)) {
      seen.add(j.link);
      out.push({
        label: `${j.tribunal} — ${j.titulo || j.tese?.slice(0, 60) || 'Jurisprudência'}`,
        url: j.link,
      });
    }
  });
  return out;
}

function MarkdownRenderer({ md }: { md: string }) {
  const blocks = md.split(/\n\n+/);
  return (
    <div className="space-y-3">
      {blocks.map((b, i) => {
        if (/^##\s+/.test(b)) {
          return (
            <h3 key={i} className="font-display font-bold text-base mt-4">
              {b.replace(/^##\s+/, '')}
            </h3>
          );
        }
        return (
          <p key={i} className="text-foreground/90 whitespace-pre-wrap">
            {renderInline(b)}
          </p>
        );
      })}
    </div>
  );
}

function renderInline(s: string): React.ReactNode {
  // [[PLACEHOLDER]] = pill amarelo
  // [text](url) = link azul
  const nodes: React.ReactNode[] = [];
  const re = /\[\[([A-Z_]+)\]\]|\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let key = 0;
  while ((m = re.exec(s)) !== null) {
    if (m.index > last) nodes.push(s.slice(last, m.index));
    if (m[1]) {
      nodes.push(
        <span
          key={key++}
          className="inline-block px-2 py-0.5 mx-0.5 rounded-md bg-[#EFE039]/70 text-gray-900 text-xs font-semibold border border-[#D4B800]"
        >
          {m[1].replace(/_/g, ' ').toLowerCase()}
        </span>,
      );
    } else if (m[2] !== undefined && m[3] !== undefined) {
      const url = m[3];
      if (url.startsWith('http')) {
        nodes.push(
          <a
            key={key++}
            href={url}
            target="_blank"
            rel="noreferrer"
            className="text-blue-600 hover:underline"
          >
            {m[2]}
          </a>,
        );
      } else {
        nodes.push(
          <span key={key++} className="text-blue-600 underline decoration-dotted">
            {m[2]}
          </span>,
        );
      }
    } else if (m[4]) {
      nodes.push(
        <strong key={key++}>{m[4]}</strong>,
      );
    }
    last = m.index + m[0].length;
  }
  if (last < s.length) nodes.push(s.slice(last));
  return <>{nodes}</>;
}
