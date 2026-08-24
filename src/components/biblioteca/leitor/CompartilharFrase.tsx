import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Pencil, Download, Share2, Copy, RefreshCw, Check, Palette, BookOpen, FileText, Library } from 'lucide-react';
import html2canvas from 'html2canvas';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type Tema = { bg: string; fg: string; accent: string } | any;

interface Props {
  open: boolean;
  onClose: () => void;
  paginaMd: string;
  livroTitulo: string;
  autor?: string | null;
  capa?: string | null;
  capituloTitulo?: string;
  paginaNum?: number;
  livroTabela?: string;
  livroId?: string;
  tema?: Tema;
}

type Modo = 'menu' | 'ia' | 'manual' | 'prontas';
type Escopo = 'pagina' | 'livro';

// Padrões SVG (data URI) para estilos temáticos ---------------------------------
const patternDireito = `url("data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240' viewBox='0 0 240 240'>
    <g fill='none' stroke='%23FCD34D' stroke-opacity='0.10' stroke-width='1.2'>
      <circle cx='120' cy='60' r='36'/>
      <path d='M120 24 L120 96 M90 60 L150 60'/>
      <path d='M60 40 L60 100 M180 40 L180 100'/>
      <path d='M40 100 L80 100 M160 100 L200 100'/>
      <path d='M50 130 L70 100 L90 130 Z M150 130 L170 100 L190 130 Z' stroke-opacity='0.14'/>
      <path d='M120 150 L120 210'/>
      <text x='30' y='220' font-family='Georgia,serif' font-size='14' fill='%23FCD34D' fill-opacity='0.18'>LEX · IUS · IUSTITIA</text>
    </g>
  </svg>`,
)}")`;

const patternClassico = `url("data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' width='320' height='320' viewBox='0 0 320 320'>
    <g fill='none' stroke='%23F5C77E' stroke-opacity='0.12' stroke-width='1'>
      <path d='M20 40 L300 40 M20 280 L300 280'/>
      <path d='M40 20 L40 300 M280 20 L280 300'/>
      <circle cx='160' cy='160' r='120'/>
      <circle cx='160' cy='160' r='80'/>
      <circle cx='160' cy='160' r='40'/>
    </g>
  </svg>`,
)}")`;

// Estilos base (sem capa; a capa é adicionada dinamicamente se disponível) -----
type EstiloBase = {
  id: string;
  label: string;
  bg: string;
  bgOverlay?: string;
  fg: string;
  accent: string;
  usaCapa?: boolean;
};

const ESTILOS_BASE: EstiloBase[] = [
  { id: 'noite', label: 'Noite', bg: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #312e81 100%)', fg: '#F8FAFC', accent: '#FCD34D' },
  { id: 'sepia', label: 'Sépia', bg: 'linear-gradient(135deg, #3E2A1F 0%, #6B4423 50%, #8B5A2B 100%)', fg: '#FBF5E9', accent: '#F5C77E' },
  { id: 'esmeralda', label: 'Esmeralda', bg: 'linear-gradient(135deg, #022c22 0%, #064e3b 50%, #065f46 100%)', fg: '#ECFDF5', accent: '#FBBF24' },
  { id: 'papel', label: 'Papel', bg: 'linear-gradient(135deg, #FBF3E0 0%, #F2E4C0 100%)', fg: '#3B2A1A', accent: '#8B5E34' },
  { id: 'rosa', label: 'Aurora', bg: 'linear-gradient(135deg, #4C1D95 0%, #831843 50%, #9F1239 100%)', fg: '#FDF2F8', accent: '#FCD34D' },
  { id: 'noir', label: 'Noir', bg: 'linear-gradient(180deg, #0a0a0a 0%, #171717 100%)', fg: '#F5F5F5', accent: '#EAB308' },
  { id: 'oceano', label: 'Oceano', bg: 'linear-gradient(160deg, #082f49 0%, #0c4a6e 50%, #155e75 100%)', fg: '#F0F9FF', accent: '#7DD3FC' },
  { id: 'terra', label: 'Terra', bg: 'linear-gradient(160deg, #1c1917 0%, #44403c 50%, #78716c 100%)', fg: '#FAFAF9', accent: '#F59E0B' },
  { id: 'direito', label: 'Direito', bg: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', bgOverlay: patternDireito, fg: '#F8FAFC', accent: '#FCD34D' },
  { id: 'classico', label: 'Clássico', bg: 'linear-gradient(135deg, #292524 0%, #1c1917 100%)', bgOverlay: patternClassico, fg: '#FEF3C7', accent: '#F59E0B' },
  { id: 'capa', label: 'Capa', bg: '#111827', fg: '#F9FAFB', accent: '#FCD34D', usaCapa: true },
  { id: 'capa-blur', label: 'Capa desfocada', bg: '#0a0a0a', fg: '#F9FAFB', accent: '#FCD34D', usaCapa: true },
];

function limparMarkdown(md: string): string {
  return String(md || '')
    .replace(/^#{1,6}\s+.+$/gm, ' ')
    .replace(/^>\s?/gm, '')
    .replace(/[*_`~]+/g, '')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

function extrairFrasesLocal(md: string): string[] {
  const txt = limparMarkdown(md);
  const frases = txt.split(/(?<=[.!?…])\s+(?=[A-ZÀ-Ú"“])/g)
    .map((s) => s.trim())
    .filter((s) => s.length >= 40 && s.length <= 240);
  return frases;
}

type FraseCache = { id: string; frase: string; motivo?: string; escopo?: string; pagina_num?: number | null };

export default function CompartilharFrase({
  open,
  onClose,
  paginaMd,
  livroTitulo,
  autor,
  capa,
  capituloTitulo,
  paginaNum,
  livroTabela,
  livroId,
}: Props) {
  const [modo, setModo] = useState<Modo>('menu');
  const [frase, setFrase] = useState('');
  const [loadingIA, setLoadingIA] = useState(false);
  const [motivoIA, setMotivoIA] = useState('');
  const [escopo, setEscopo] = useState<Escopo>('pagina');
  const [estilo, setEstilo] = useState<EstiloBase>(ESTILOS_BASE[0]);
  const [exportando, setExportando] = useState(false);
  const [frasesManuais, setFrasesManuais] = useState<string[]>([]);
  const [frasesProntas, setFrasesProntas] = useState<FraseCache[]>([]);
  const [loadingProntas, setLoadingProntas] = useState(false);
  const [gerandoLivro, setGerandoLivro] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      setModo('menu');
      setFrase('');
      setMotivoIA('');
      setEscopo('pagina');
    }
  }, [open]);

  // Precomputa frases manuais quando entra no modo
  useEffect(() => {
    if (modo === 'manual') {
      setFrasesManuais(extrairFrasesLocal(paginaMd));
    }
  }, [modo, paginaMd]);

  // Carrega frases já geradas do Supabase
  const carregarProntas = useCallback(async () => {
    if (!livroTabela || !livroId) return;
    setLoadingProntas(true);
    try {
      const { data } = await supabase.functions.invoke('biblioteca-enriquecer', {
        body: { action: 'frases_listar', livro_tabela: livroTabela, livro_id: livroId },
      });
      const list = ((data as any)?.frases || []) as FraseCache[];
      setFrasesProntas(list);
    } catch { /* ignore */ }
    finally { setLoadingProntas(false); }
  }, [livroTabela, livroId]);

  useEffect(() => {
    if (open && (modo === 'menu' || modo === 'prontas')) carregarProntas();
  }, [open, modo, carregarProntas]);

  const gerarComIA = useCallback(async () => {
    setLoadingIA(true);
    setMotivoIA('');
    try {
      const { data, error } = await supabase.functions.invoke('biblioteca-enriquecer', {
        body: {
          action: 'frase_marcante',
          pagina_md: paginaMd,
          livro_titulo: livroTitulo,
          capitulo_titulo: capituloTitulo,
          pagina_num: paginaNum,
          livro_tabela: livroTabela,
          livro_id: livroId,
          escopo,
        },
      });
      if (error) throw error;
      const f = String((data as any)?.frase || '').trim();
      if (!f) {
        toast.info(escopo === 'pagina'
          ? 'A IA não encontrou uma frase marcante nesta página.'
          : 'A IA não encontrou uma frase marcante no livro.');
        setFrase('');
      } else {
        setFrase(f);
        setMotivoIA(String((data as any)?.motivo || ''));
        // atualiza cache prontas em background
        carregarProntas();
      }
    } catch {
      toast.error('Não consegui gerar a frase. Tente de novo.');
    } finally {
      setLoadingIA(false);
    }
  }, [paginaMd, livroTitulo, capituloTitulo, paginaNum, livroTabela, livroId, escopo, carregarProntas]);

  // Auto-gera ao entrar em modo IA
  useEffect(() => {
    if (modo === 'ia' && !frase && !loadingIA) gerarComIA();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modo]);

  // Gera lote de frases do livro inteiro (curador)
  const gerarFrasesLivro = useCallback(async () => {
    if (!livroTabela || !livroId) {
      toast.info('Este livro ainda não foi processado em leitura nativa.');
      return;
    }
    setGerandoLivro(true);
    try {
      const { data, error } = await supabase.functions.invoke('biblioteca-enriquecer', {
        body: { action: 'frases_livro', livro_tabela: livroTabela, livro_id: livroId, livro_titulo: livroTitulo },
      });
      if (error) throw error;
      const n = ((data as any)?.frases || []).length;
      if (n) toast.success(`${n} frases marcantes geradas`);
      else toast.info('A IA não encontrou frases marcantes.');
      await carregarProntas();
    } catch {
      toast.error('Falha ao gerar frases do livro.');
    } finally {
      setGerandoLivro(false);
    }
  }, [livroTabela, livroId, livroTitulo, carregarProntas]);

  const exportarImagem = useCallback(async (): Promise<Blob | null> => {
    if (!cardRef.current) return null;
    setExportando(true);
    try {
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: null,
        scale: 2,
        useCORS: true,
        logging: false,
      });
      return await new Promise<Blob | null>((resolve) => canvas.toBlob((b) => resolve(b), 'image/png', 0.95));
    } finally {
      setExportando(false);
    }
  }, []);

  const baixar = useCallback(async () => {
    const blob = await exportarImagem();
    if (!blob) { toast.error('Falha ao gerar imagem'); return; }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `frase-${(livroTitulo || 'livro').toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40)}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    toast.success('Imagem baixada');
  }, [exportarImagem, livroTitulo]);

  const compartilhar = useCallback(async () => {
    const blob = await exportarImagem();
    if (!blob) { toast.error('Falha ao gerar imagem'); return; }
    const file = new File([blob], 'frase.png', { type: 'image/png' });
    const shareText = `“${frase}”\n\n— ${livroTitulo}${autor ? `, ${autor}` : ''}`;
    // @ts-ignore
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await (navigator as any).share({ files: [file], text: shareText, title: livroTitulo });
        return;
      } catch { /* usuário cancelou */ }
    }
    if ((navigator as any).share) {
      try { await (navigator as any).share({ text: shareText, title: livroTitulo }); return; } catch {}
    }
    await baixar();
  }, [exportarImagem, frase, livroTitulo, autor, baixar]);

  const copiarTexto = useCallback(async () => {
    if (!frase) return;
    const txt = `“${frase}”\n\n— ${livroTitulo}${autor ? `, ${autor}` : ''}`;
    try {
      await navigator.clipboard.writeText(txt);
      toast.success('Texto copiado');
    } catch {
      toast.error('Não consegui copiar');
    }
  }, [frase, livroTitulo, autor]);

  const fontSize = useMemo(() => {
    const len = frase.length || 60;
    if (len < 80) return 40;
    if (len < 140) return 34;
    if (len < 200) return 28;
    return 24;
  }, [frase]);

  // Estilos disponíveis (filtra os que exigem capa se ela não existir)
  const estilos = useMemo(
    () => ESTILOS_BASE.filter((e) => !e.usaCapa || !!capa),
    [capa],
  );

  const bgLayerStyle = useMemo(() => {
    if (estilo.usaCapa && capa) {
      const isBlur = estilo.id === 'capa-blur';
      return {
        position: 'absolute' as const,
        inset: 0,
        backgroundImage: `url(${capa})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        filter: isBlur ? 'blur(24px) brightness(0.55) saturate(1.1)' : 'brightness(0.5) saturate(1.05)',
        transform: isBlur ? 'scale(1.15)' : 'scale(1.02)',
      };
    }
    return null;
  }, [estilo, capa]);

  if (!open) return null;

  const escolherPronta = (f: FraseCache) => {
    setFrase(f.frase);
    setMotivoIA(f.motivo || '');
    setModo('ia');
  };

  return createPortal(
    <AnimatePresence>
      <motion.div
        key="compartilhar-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[1400] bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        key="compartilhar-sheet"
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 260 }}
        className="fixed inset-x-0 bottom-0 z-[1401] rounded-t-3xl overflow-hidden flex flex-col"
        style={{
          height: '92dvh',
          background: 'hsl(var(--background))',
          color: 'hsl(var(--foreground))',
          boxShadow: '0 -20px 60px -20px rgba(0,0,0,0.4)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'hsl(var(--border))' }}>
          <div className="flex items-center gap-2">
            <Share2 className="w-5 h-5" style={{ color: 'hsl(var(--primary))' }} />
            <h2 className="text-lg font-semibold">
              {modo === 'menu' ? 'Compartilhar' : modo === 'ia' ? 'Frase com IA' : modo === 'manual' ? 'Escolher frase' : 'Frases prontas'}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {modo !== 'menu' && (
              <button
                onClick={() => setModo('menu')}
                className="h-9 px-3 rounded-full text-sm active:scale-95"
                style={{ background: 'hsl(var(--muted))' }}
              >
                Início
              </button>
            )}
            <button
              onClick={onClose}
              aria-label="Fechar"
              className="w-9 h-9 rounded-full flex items-center justify-center active:scale-95"
              style={{ background: 'hsl(var(--muted))' }}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {modo === 'menu' && (
            <div className="p-5 space-y-3">
              <p className="text-sm opacity-70 mb-2">Como você quer criar a citação para postar?</p>

              <button
                onClick={() => setModo('ia')}
                className="w-full text-left p-4 rounded-2xl flex items-start gap-3 active:scale-[0.99] transition"
                style={{
                  background: 'linear-gradient(135deg, hsl(var(--primary) / 0.12), hsl(var(--primary) / 0.05))',
                  border: '1px solid hsl(var(--primary) / 0.3)',
                }}
              >
                <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))' }}>
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-semibold">Deixe a IA escolher</div>
                  <div className="text-sm opacity-70 mt-0.5">Você decide: uma frase desta página ou uma frase do livro inteiro.</div>
                </div>
              </button>

              <button
                onClick={() => setModo('prontas')}
                className="w-full text-left p-4 rounded-2xl flex items-start gap-3 active:scale-[0.99] transition"
                style={{ background: 'hsl(var(--muted))', border: '1px solid hsl(var(--border))' }}
              >
                <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'hsl(var(--foreground))', color: 'hsl(var(--background))' }}>
                  <Library className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <div className="font-semibold flex items-center gap-2">
                    Frases prontas do livro
                    {frasesProntas.length > 0 && (
                      <span className="text-[11px] px-1.5 py-0.5 rounded-full" style={{ background: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))' }}>
                        {frasesProntas.length}
                      </span>
                    )}
                  </div>
                  <div className="text-sm opacity-70 mt-0.5">Curadoria já gerada — escolha e compartilhe na hora.</div>
                </div>
              </button>

              <button
                onClick={() => setModo('manual')}
                className="w-full text-left p-4 rounded-2xl flex items-start gap-3 active:scale-[0.99] transition"
                style={{ background: 'hsl(var(--muted))', border: '1px solid hsl(var(--border))' }}
              >
                <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'hsl(var(--foreground))', color: 'hsl(var(--background))' }}>
                  <Pencil className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-semibold">Escolher frase manualmente</div>
                  <div className="text-sm opacity-70 mt-0.5">Toque em uma frase da página para selecioná-la.</div>
                </div>
              </button>
            </div>
          )}

          {modo === 'prontas' && (
            <div className="p-5 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm opacity-70">Frases já curadas para este livro.</p>
                <button
                  onClick={gerarFrasesLivro}
                  disabled={gerandoLivro || !livroTabela}
                  className="px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
                  style={{ background: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))' }}
                >
                  <Sparkles className={`w-3.5 h-3.5 ${gerandoLivro ? 'animate-pulse' : ''}`} />
                  {gerandoLivro ? 'Gerando…' : 'Gerar novas'}
                </button>
              </div>

              {loadingProntas && (
                <div className="text-sm opacity-60 py-6 text-center">Carregando…</div>
              )}

              {!loadingProntas && frasesProntas.length === 0 && (
                <div className="p-5 rounded-2xl text-sm opacity-80 text-center" style={{ background: 'hsl(var(--muted))' }}>
                  Ainda não há frases prontas para este livro. Toque em <strong>Gerar novas</strong> para a IA fazer uma curadoria.
                </div>
              )}

              <div className="space-y-2">
                {frasesProntas.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => escolherPronta(f)}
                    className="w-full text-left p-4 rounded-xl active:scale-[0.99] transition"
                    style={{ background: 'hsl(var(--muted))', border: '1px solid hsl(var(--border))' }}
                  >
                    <div className="text-[15px] leading-snug" style={{ fontFamily: 'Georgia, serif' }}>“{f.frase}”</div>
                    {f.motivo && (
                      <div className="text-[11px] opacity-60 mt-1.5">✨ {f.motivo}</div>
                    )}
                    <div className="text-[10px] opacity-50 mt-1 uppercase tracking-wide">
                      {f.escopo === 'livro' ? 'do livro inteiro' : f.pagina_num ? `pág. ${f.pagina_num}` : 'trecho'}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {(modo === 'ia' || modo === 'manual') && (
            <div className="p-5 space-y-4">
              {modo === 'ia' && (
                <div className="flex items-center gap-1 p-1 rounded-full" style={{ background: 'hsl(var(--muted))' }}>
                  {(['pagina', 'livro'] as Escopo[]).map((e) => {
                    const ativo = escopo === e;
                    const Icon = e === 'pagina' ? FileText : BookOpen;
                    return (
                      <button
                        key={e}
                        onClick={() => { setEscopo(e); setFrase(''); setMotivoIA(''); }}
                        className="flex-1 py-2 px-3 rounded-full text-sm font-medium flex items-center justify-center gap-1.5 transition"
                        style={{
                          background: ativo ? 'hsl(var(--primary))' : 'transparent',
                          color: ativo ? 'hsl(var(--primary-foreground))' : 'hsl(var(--foreground))',
                        }}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        {e === 'pagina' ? 'Desta página' : 'Do livro inteiro'}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Preview do card */}
              <div className="flex justify-center">
                <div
                  ref={cardRef}
                  className="relative overflow-hidden"
                  style={{
                    width: 360,
                    height: 640,
                    background: estilo.bg,
                    color: estilo.fg,
                    borderRadius: 24,
                    padding: 32,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    fontFamily: 'Georgia, serif',
                    isolation: 'isolate',
                  }}
                >
                  {/* Camada de capa (se aplicável) */}
                  {bgLayerStyle && <div style={bgLayerStyle} />}
                  {/* Overlay padrão temático */}
                  {estilo.bgOverlay && (
                    <div style={{ position: 'absolute', inset: 0, backgroundImage: estilo.bgOverlay, backgroundSize: '240px 240px', opacity: 1 }} />
                  )}
                  {/* Vinheta para estilos com capa */}
                  {estilo.usaCapa && (
                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.55) 60%, rgba(0,0,0,0.85) 100%)' }} />
                  )}

                  {/* Conteúdo (acima das camadas) */}
                  <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
                    <div style={{ fontSize: 120, lineHeight: 0.8, opacity: 0.35, color: estilo.accent, fontFamily: 'Georgia, serif' }}>
                      “
                    </div>
                    <div style={{
                      fontSize,
                      lineHeight: 1.35,
                      fontWeight: 500,
                      textAlign: 'left',
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      paddingBlock: 8,
                      textShadow: estilo.usaCapa ? '0 2px 12px rgba(0,0,0,0.6)' : undefined,
                    }}>
                      {frase || (loadingIA ? 'Escolhendo a melhor frase…' : 'Sua frase aparecerá aqui')}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 12 }}>
                      {capa && (
                        <img
                          src={capa}
                          alt=""
                          crossOrigin="anonymous"
                          style={{ width: 56, height: 78, objectFit: 'cover', borderRadius: 6, boxShadow: '0 4px 12px rgba(0,0,0,0.35)' }}
                        />
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 16, fontWeight: 700, color: estilo.accent }}>{livroTitulo}</div>
                        {autor && <div style={{ fontSize: 13, opacity: 0.85 }}>{autor}</div>}
                        <div style={{ fontSize: 11, opacity: 0.55, marginTop: 4, fontFamily: 'system-ui, sans-serif' }}>
                          via app de leitura
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Estilos */}
              <div>
                <div className="flex items-center gap-2 mb-2 text-sm opacity-80">
                  <Palette className="w-4 h-4" /> Estilo
                </div>
                <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 -mx-1 px-1">
                  {estilos.map((e) => (
                    <button
                      key={e.id}
                      onClick={() => setEstilo(e)}
                      className="flex-shrink-0 rounded-xl relative overflow-hidden"
                      style={{
                        width: 56, height: 72,
                        background: e.bg,
                        backgroundImage: e.usaCapa && capa ? `url(${capa})` : e.bgOverlay || undefined,
                        backgroundSize: e.usaCapa ? 'cover' : '56px 72px',
                        backgroundPosition: 'center',
                        border: estilo.id === e.id ? '2px solid hsl(var(--primary))' : '2px solid transparent',
                      }}
                      aria-label={e.label}
                      title={e.label}
                    >
                      {estilo.id === e.id && (
                        <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                          <Check className="w-3 h-3 text-primary-foreground" />
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {modo === 'ia' && (
                <div className="space-y-2">
                  <button
                    onClick={gerarComIA}
                    disabled={loadingIA}
                    className="w-full py-3 rounded-xl font-medium flex items-center justify-center gap-2 active:scale-[0.99]"
                    style={{ background: 'hsl(var(--muted))', color: 'hsl(var(--foreground))', border: '1px solid hsl(var(--border))' }}
                  >
                    <RefreshCw className={`w-4 h-4 ${loadingIA ? 'animate-spin' : ''}`} />
                    {loadingIA ? 'Escolhendo…' : 'Gerar outra frase'}
                  </button>
                  {motivoIA && (
                    <p className="text-xs opacity-60 text-center px-4">✨ {motivoIA}</p>
                  )}
                </div>
              )}

              {modo === 'manual' && (
                <div>
                  <div className="text-sm opacity-80 mb-2">Toque em uma frase para escolher:</div>
                  <div
                    className="max-h-64 overflow-y-auto p-3 rounded-xl text-[15px] leading-relaxed"
                    style={{ background: 'hsl(var(--muted))', border: '1px solid hsl(var(--border))' }}
                  >
                    {frasesManuais.length === 0 && (
                      <div className="opacity-60 text-sm">Não achei frases suficientes nesta página.</div>
                    )}
                    {frasesManuais.map((f, i) => {
                      const selecionada = f === frase;
                      return (
                        <span
                          key={i}
                          onClick={() => setFrase(f)}
                          className="cursor-pointer transition"
                          style={{
                            background: selecionada ? 'hsl(var(--primary) / 0.25)' : 'transparent',
                            borderRadius: 4,
                            padding: '2px 3px',
                            boxShadow: selecionada ? 'inset 0 -2px 0 hsl(var(--primary))' : 'none',
                          }}
                        >
                          {f}{' '}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Ações */}
              <div className="grid grid-cols-3 gap-2 pt-2">
                <button
                  onClick={copiarTexto}
                  disabled={!frase}
                  className="py-3 rounded-xl flex flex-col items-center gap-1 text-xs disabled:opacity-40 active:scale-95"
                  style={{ background: 'hsl(var(--muted))', border: '1px solid hsl(var(--border))' }}
                >
                  <Copy className="w-5 h-5" /> Copiar
                </button>
                <button
                  onClick={baixar}
                  disabled={!frase || exportando}
                  className="py-3 rounded-xl flex flex-col items-center gap-1 text-xs disabled:opacity-40 active:scale-95"
                  style={{ background: 'hsl(var(--muted))', border: '1px solid hsl(var(--border))' }}
                >
                  <Download className="w-5 h-5" /> Baixar
                </button>
                <button
                  onClick={compartilhar}
                  disabled={!frase || exportando}
                  className="py-3 rounded-xl flex flex-col items-center gap-1 text-xs disabled:opacity-40 active:scale-95 font-medium"
                  style={{ background: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))' }}
                >
                  <Share2 className="w-5 h-5" /> Compartilhar
                </button>
              </div>
              <p className="text-[11px] opacity-60 text-center pb-2">
                No celular, "Compartilhar" abre WhatsApp, Instagram Stories, etc.
              </p>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>,
    document.body,
  );
}
