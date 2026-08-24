import { useState, useRef, useCallback } from 'react';
import { pickAsset } from '@/lib/assetUrl';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Loader2, ImageIcon, ChevronLeft, ChevronRight, Image, Type } from 'lucide-react';
import { PageHeader } from '@/components/vademecum/PageHeader';
import { motion } from 'framer-motion';
import { LEIS_CATALOG } from '@/data/leisCatalog';
import { fetchArtigosLei } from '@/services/legislacaoService';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import html2canvas from 'html2canvas';
import logoImgAsset from '@/assets/logo-vacatio-v2.png.asset.json';
import logoImgBundled from '@/assets/bundled/logo-vacatio-v2.webp';
const logoImg = pickAsset(logoImgBundled, logoImgAsset.url);

// ─── Background Images (for text-only mode) ───
import bgDarkPillarsAsset from '@/assets/carousel-bg/bg-dark-pillars.webp';
const bgDarkPillars = bgDarkPillarsAsset;
import bgDarkJusticeAsset from '@/assets/carousel-bg/bg-dark-justice.webp';
const bgDarkJustice = bgDarkJusticeAsset;
import bgDarkGavelAsset from '@/assets/carousel-bg/bg-dark-gavel.webp';
const bgDarkGavel = bgDarkGavelAsset;
import bgDarkColumnsAsset from '@/assets/carousel-bg/bg-dark-columns.webp';
const bgDarkColumns = bgDarkColumnsAsset;
import bgDarkBookAsset from '@/assets/carousel-bg/bg-dark-book.webp';
const bgDarkBook = bgDarkBookAsset;
import bgDarkLaurelAsset from '@/assets/carousel-bg/bg-dark-laurel.webp';
const bgDarkLaurel = bgDarkLaurelAsset;
import bgDarkScrollAsset from '@/assets/carousel-bg/bg-dark-scroll.webp';
const bgDarkScroll = bgDarkScrollAsset;
import bgLightPillarsAsset from '@/assets/carousel-bg/bg-light-pillars.webp';
const bgLightPillars = bgLightPillarsAsset;
import bgLightJusticeAsset from '@/assets/carousel-bg/bg-light-justice.webp';
const bgLightJustice = bgLightJusticeAsset;
import bgLightCourthouseAsset from '@/assets/carousel-bg/bg-light-courthouse.webp';
const bgLightCourthouse = bgLightCourthouseAsset;

// ─── Types ───

interface SlideFeature { icone: string; label: string; desc: string; }
interface SlidePasso { titulo: string; desc: string; }

interface SlideData {
  tipo: 'hero' | 'problema' | 'solucao' | 'features' | 'detalhes' | 'passos' | 'cta';
  bg: 'light' | 'dark' | 'gradient';
  tag: string;
  titulo?: string;
  subtitulo?: string;
  texto?: string;
  citacao?: string;
  itens?: string[];
  features?: SlideFeature[];
  passos?: SlidePasso[];
  texto_engajamento?: string;
  cta_texto?: string;
  imagem_prompt?: string;
  imagem_url?: string;
}

interface CarrosselData {
  titulo_viral: string;
  slides: SlideData[];
}

// ─── Background Mapping (text-only mode) ───

const BG_MAP: Record<string, string> = {
  hero: bgDarkPillars, problema: bgDarkColumns, solucao: bgDarkScroll,
  features: bgLightPillars, detalhes: bgDarkLaurel, passos: bgLightJustice, cta: bgDarkJustice,
};
const BG_ALT: Record<string, string> = {
  hero: bgDarkGavel, problema: bgDarkBook, solucao: bgDarkLaurel,
  features: bgLightCourthouse, detalhes: bgDarkScroll, passos: bgLightPillars, cta: bgDarkColumns,
};

// ─── Real Instagram dimensions (4:5) ───
const SLIDE_W = 1080;
const SLIDE_H = 1350;

const TIPOS_CONTEUDO = [
  { value: 'curiosidade', label: 'Curiosidade', desc: '"Você sabia que..." — fatos surpreendentes' },
  { value: 'explicacao', label: 'Explicação', desc: 'Didática com exemplos do dia-a-dia' },
  { value: 'resumo_prova', label: 'Resumo pra Prova', desc: 'Pontos-chave para OAB e concursos' },
  { value: 'dica_pratica', label: 'Dica Prática', desc: 'Aplicação na prática profissional' },
  { value: 'comparacao', label: 'Comparação', desc: 'Antes vs Depois / Artigo X vs Artigo Y' },
];

// ─── Design tokens ───
const WINE = 'hsl(340, 55%, 12%)';
const GOLD = '#B8860B';

function getBgImage(tipo: string, index: number): string {
  if (index % 2 === 1 && BG_ALT[tipo]) return BG_ALT[tipo];
  return BG_MAP[tipo] || bgDarkPillars;
}

function isDark(tipo: string): boolean {
  return ['hero', 'problema', 'solucao', 'detalhes', 'cta'].includes(tipo);
}

// ─── Slide Renderer (1080×1350 real pixels) ───

function SlideRenderer({ slide, index, useImages }: { slide: SlideData; index: number; useImages: boolean }) {
  const dark = isDark(slide.tipo);
  const effectiveDark = (useImages && slide.imagem_url) ? true : dark;
  const textColor = effectiveDark ? '#fff' : '#2d0a12';
  const subColor = effectiveDark ? 'rgba(255,255,255,0.75)' : '#5a3040';
  
  const hasBgImage = useImages && slide.imagem_url;
  const staticBg = getBgImage(slide.tipo, index);

  const overlayColor = effectiveDark
    ? 'rgba(20, 5, 10, 0.6)'
    : 'rgba(255, 252, 245, 0.65)';

  const baseStyle: React.CSSProperties = {
    width: SLIDE_W, height: SLIDE_H,
    backgroundImage: hasBgImage ? `url(${slide.imagem_url})` : `url(${staticBg})`,
    backgroundSize: 'cover', backgroundPosition: 'center',
    display: 'flex', flexDirection: 'column',
    position: 'relative', overflow: 'hidden', boxSizing: 'border-box',
    fontFamily: "'Inter', 'Segoe UI', Arial, sans-serif",
  };

  const overlayStyle: React.CSSProperties = {
    position: 'absolute', inset: 0, background: overlayColor,
  };

  const contentStyle: React.CSSProperties = {
    position: 'relative', zIndex: 1, flex: 1, display: 'flex', flexDirection: 'column',
  };

  const headingFont: React.CSSProperties = {
    fontFamily: "'Merriweather', 'Georgia', serif",
    fontWeight: 700, lineHeight: 1.2, letterSpacing: -0.5,
    color: textColor, margin: 0,
    textShadow: effectiveDark ? '0 2px 12px rgba(0,0,0,0.5)' : 'none',
  };

  const bodyFont: React.CSSProperties = {
    fontFamily: "'Inter', 'Segoe UI', Arial, sans-serif",
    fontWeight: 400, lineHeight: 1.55, color: subColor, margin: 0,
    textShadow: effectiveDark ? '0 1px 6px rgba(0,0,0,0.4)' : 'none',
  };

  const Logo = () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 32 }}>
      <img src={logoImg} alt="" style={{ width: 64, height: 64, borderRadius: '50%', border: '3px solid rgba(184,134,11,0.4)' }} crossOrigin="anonymous" />
      <div>
        <div style={{ fontSize: 26, fontWeight: 700, color: textColor, textShadow: effectiveDark ? '0 1px 6px rgba(0,0,0,0.3)' : 'none' }}>Vacatio</div>
        <div style={{ fontSize: 18, color: effectiveDark ? 'rgba(255,255,255,0.5)' : GOLD }}>Vade Mecum Jurídico Profissional</div>
      </div>
    </div>
  );

  const Tag = () => (
    <span style={{ display: 'inline-block', fontSize: 22, fontWeight: 700, letterSpacing: 5, color: GOLD, textTransform: 'uppercase', marginBottom: 24, textShadow: effectiveDark ? '0 1px 4px rgba(0,0,0,0.3)' : 'none' }}>
      {slide.tag}
    </span>
  );

  const BottomBar = () => (
    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 72, background: 'rgba(20,5,10,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2 }}>
      <span style={{ color: '#d4c9a8', fontSize: 22, letterSpacing: 3 }}>@vacatio.app</span>
    </div>
  );

  if (slide.tipo === 'hero') {
    return (
      <div style={baseStyle}>
        <div style={overlayStyle} />
        <div style={{ ...contentStyle, justifyContent: 'center', padding: '100px 90px 120px' }}>
          <Logo />
          <Tag />
          <h1 style={{ ...headingFont, fontSize: 64 }}>{slide.titulo}</h1>
          {slide.subtitulo && <p style={{ ...bodyFont, fontSize: 32, marginTop: 24 }}>{slide.subtitulo}</p>}
        </div>
        <BottomBar />
      </div>
    );
  }

  if (slide.tipo === 'problema') {
    return (
      <div style={baseStyle}>
        <div style={overlayStyle} />
        <div style={{ ...contentStyle, padding: '90px 90px 120px' }}>
          <Tag />
          <h2 style={{ ...headingFont, fontSize: 48, marginBottom: 40 }}>{slide.titulo}</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {slide.itens?.map((item, i) => (
              <div key={i} style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
                <span style={{ color: GOLD, fontSize: 30, marginTop: 2, flexShrink: 0 }}>⚠</span>
                <p style={{ ...bodyFont, fontSize: 28 }}>{item}</p>
              </div>
            ))}
          </div>
        </div>
        <BottomBar />
      </div>
    );
  }

  if (slide.tipo === 'solucao') {
    return (
      <div style={baseStyle}>
        <div style={overlayStyle} />
        <div style={{ ...contentStyle, padding: '90px 90px 120px' }}>
          <Tag />
          <h2 style={{ ...headingFont, fontSize: 48, marginBottom: 30 }}>{slide.titulo}</h2>
          {slide.texto && <p style={{ ...bodyFont, fontSize: 30, marginBottom: 36 }}>{slide.texto}</p>}
          {slide.citacao && (
            <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 16, padding: 36, borderLeft: `6px solid ${GOLD}` }}>
              <p style={{ fontSize: 26, color: 'rgba(255,255,255,0.9)', fontStyle: 'italic', lineHeight: 1.55, fontFamily: "'Merriweather', serif", margin: 0 }}>
                "{slide.citacao}"
              </p>
            </div>
          )}
        </div>
        <BottomBar />
      </div>
    );
  }

  if (slide.tipo === 'features') {
    const cardBg = effectiveDark ? 'rgba(0,0,0,0.25)' : 'rgba(45,10,18,0.06)';
    const labelColor = effectiveDark ? '#fff' : '#2d0a12';
    const descColor = effectiveDark ? 'rgba(255,255,255,0.7)' : '#6a5060';
    return (
      <div style={baseStyle}>
        <div style={overlayStyle} />
        <div style={{ ...contentStyle, padding: '90px 80px 120px' }}>
          <Tag />
          <h2 style={{ ...headingFont, fontSize: 44, marginBottom: 36 }}>{slide.titulo}</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {slide.features?.slice(0, 3).map((f, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 24, background: cardBg, borderRadius: 16, padding: '24px 28px' }}>
                <span style={{ fontSize: 40, flexShrink: 0 }}>{f.icone}</span>
                <div>
                  <span style={{ fontSize: 28, fontWeight: 700, color: labelColor, display: 'block', marginBottom: 4 }}>{f.label}</span>
                  <span style={{ fontSize: 24, color: descColor }}>{f.desc}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
        <BottomBar />
      </div>
    );
  }

  if (slide.tipo === 'detalhes') {
    return (
      <div style={baseStyle}>
        <div style={overlayStyle} />
        <div style={{ ...contentStyle, padding: '90px 90px 120px' }}>
          <Tag />
          <h2 style={{ ...headingFont, fontSize: 48, marginBottom: 30 }}>{slide.titulo}</h2>
          {slide.texto && <p style={{ ...bodyFont, fontSize: 30, marginBottom: 30 }}>{slide.texto}</p>}
          {slide.itens?.map((item, i) => (
            <div key={i} style={{ display: 'flex', gap: 20, alignItems: 'flex-start', marginBottom: 16 }}>
              <span style={{ color: GOLD, fontSize: 28, marginTop: 2, flexShrink: 0 }}>●</span>
              <p style={{ ...bodyFont, fontSize: 28 }}>{item}</p>
            </div>
          ))}
        </div>
        <BottomBar />
      </div>
    );
  }

  if (slide.tipo === 'passos') {
    const labelColor = effectiveDark ? '#fff' : '#2d0a12';
    const descColor = effectiveDark ? 'rgba(255,255,255,0.7)' : '#6a5060';
    return (
      <div style={baseStyle}>
        <div style={overlayStyle} />
        <div style={{ ...contentStyle, padding: '90px 80px 120px' }}>
          <Tag />
          <h2 style={{ ...headingFont, fontSize: 44, marginBottom: 36 }}>{slide.titulo}</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {slide.passos?.map((p, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 28 }}>
                <span style={{ fontFamily: "'Merriweather', serif", fontSize: 48, fontWeight: 300, color: GOLD, minWidth: 64, textShadow: effectiveDark ? '0 1px 6px rgba(0,0,0,0.3)' : 'none' }}>
                  {String(i + 1).padStart(2, '0')}
                </span>
                <div>
                  <span style={{ fontSize: 28, fontWeight: 700, color: labelColor, display: 'block', marginBottom: 4 }}>{p.titulo}</span>
                  <span style={{ fontSize: 24, color: descColor }}>{p.desc}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
        <BottomBar />
      </div>
    );
  }

  if (slide.tipo === 'cta') {
    return (
      <div style={baseStyle}>
        <div style={overlayStyle} />
        <div style={{ ...contentStyle, justifyContent: 'center', alignItems: 'center', textAlign: 'center', padding: '100px 90px 120px' }}>
          <Logo />
          <Tag />
          <h2 style={{ ...headingFont, fontSize: 48, color: '#fff', marginBottom: 48 }}>{slide.texto_engajamento}</h2>
          <div style={{ display: 'inline-flex', padding: '24px 60px', background: GOLD, color: '#fff', fontWeight: 700, fontSize: 32, borderRadius: 48 }}>
            {slide.cta_texto || 'Salve para revisar!'}
          </div>
        </div>
        <BottomBar />
      </div>
    );
  }

  // Fallback
  return (
    <div style={baseStyle}>
      <div style={overlayStyle} />
      <div style={{ ...contentStyle, padding: '90px 90px 120px' }}>
        <Tag />
        {slide.titulo && <h2 style={{ ...headingFont, fontSize: 48 }}>{slide.titulo}</h2>}
        {slide.texto && <p style={{ ...bodyFont, fontSize: 30, marginTop: 20 }}>{slide.texto}</p>}
      </div>
      <BottomBar />
    </div>
  );
}

// ─── Page Component ───

const GeradorPost = () => {
  const navigate = useNavigate();
  const [selectedLei, setSelectedLei] = useState('');
  const [artigos, setArtigos] = useState<{ numero: string; caput: string }[]>([]);
  const [selectedArtigo, setSelectedArtigo] = useState('');
  const [tipoConteudo, setTipoConteudo] = useState('curiosidade');
  const [formato, setFormato] = useState<'texto' | 'imagens'>('texto');
  const [loading, setLoading] = useState(false);
  const [loadingArtigos, setLoadingArtigos] = useState(false);
  const [loadingImagens, setLoadingImagens] = useState(false);
  const [imagensProgresso, setImagensProgresso] = useState('');
  const [carrossel, setCarrossel] = useState<CarrosselData | null>(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const slidesRef = useRef<(HTMLDivElement | null)[]>([]);

  const lei = LEIS_CATALOG.find(l => l.tabela_nome === selectedLei);

  const handleLeiChange = useCallback(async (tabela: string) => {
    setSelectedLei(tabela);
    setSelectedArtigo('');
    setCarrossel(null);
    setLoadingArtigos(true);
    try {
      const data = await fetchArtigosLei('', tabela);
      setArtigos(data.slice(0, 500).map(a => ({ numero: a.numero, caput: a.caput })));
    } catch { setArtigos([]); }
    setLoadingArtigos(false);
  }, []);

  const generateSlideImages = async (slides: SlideData[]): Promise<SlideData[]> => {
    const updated = [...slides];
    for (let i = 0; i < updated.length; i++) {
      const slide = updated[i];
      if (!slide.imagem_prompt) continue;
      setImagensProgresso(`Gerando imagem ${i + 1} de ${updated.length}...`);
      try {
        const { data, error } = await supabase.functions.invoke('gerar-imagem-slide', {
          body: { prompt: slide.imagem_prompt },
        });
        if (!error && data?.imageUrl) {
          updated[i] = { ...slide, imagem_url: data.imageUrl };
        }
      } catch (e) {
        console.error(`Erro ao gerar imagem slide ${i + 1}:`, e);
      }
    }
    setImagensProgresso('');
    return updated;
  };

  const handleGerar = async () => {
    if (!selectedLei || !selectedArtigo) return;
    setLoading(true);
    setCarrossel(null);
    try {
      const artigo = artigos.find(a => a.numero === selectedArtigo);
      const comImagens = formato === 'imagens';
      const { data, error } = await supabase.functions.invoke('assistente-juridica', {
        body: {
          mode: 'carrossel_post',
          tabelaNome: selectedLei,
          artigoNumero: selectedArtigo,
          artigoTexto: artigo?.caput || selectedArtigo,
          leiNome: lei?.nome || '',
          tipoConteudo,
          comImagens,
        },
      });
      if (error) throw error;
      const reply = data?.reply;
      if (!reply) throw new Error('Sem resposta');
      let parsed: CarrosselData = typeof reply === 'string' ? JSON.parse(reply.replace(/^```json\s*/i, '').replace(/\s*```$/i, '')) : reply;
      
      if (comImagens) {
        setLoading(false);
        setLoadingImagens(true);
        parsed = { ...parsed, slides: await generateSlideImages(parsed.slides) };
        setLoadingImagens(false);
      }
      
      setCarrossel(parsed);
      setCurrentSlide(0);
    } catch (e) {
      console.error('Erro ao gerar carrossel:', e);
    }
    setLoading(false);
    setLoadingImagens(false);
  };

  const downloadSlide = async (index: number) => {
    const el = slidesRef.current[index];
    if (!el) return;
    // Already at 1080×1350, export at scale 1
    const canvas = await html2canvas(el, { scale: 1, useCORS: true, backgroundColor: null });
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `slide-${index + 1}.png`;
      a.click();
      URL.revokeObjectURL(url);
    }, 'image/png');
  };

  const downloadAll = async () => {
    if (!carrossel) return;
    for (let i = 0; i < carrossel.slides.length; i++) {
      await downloadSlide(i);
      await new Promise(r => setTimeout(r, 500));
    }
  };

  const previewScale = 280 / SLIDE_W;
  const isGenerating = loading || loadingImagens;

  return (
    <div className="min-h-dvh bg-background pb-20">
      <link href="https://fonts.googleapis.com/css2?family=Merriweather:wght@400;700&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />

      {/* Header */}
      <PageHeader
        title="Gerador de Post"
        subtitle="Crie carrosséis profissionais para Instagram"
        onBack={() => navigate(-1)}
        leading={
          <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center">
            <ImageIcon className="w-5 h-5 text-primary" />
          </div>
        }
      />


      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-4 space-y-5">
        {/* Formato do carrossel */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Formato</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setFormato('texto')}
              className={`flex items-center gap-2 p-3 rounded-lg border transition-colors ${
                formato === 'texto'
                  ? 'border-primary bg-primary/10 text-foreground'
                  : 'border-border text-muted-foreground hover:bg-accent/50'
              }`}
              style={formato === 'texto' ? { borderColor: WINE } : {}}
            >
              <Type className="w-4 h-4" />
              <div className="text-left">
                <span className="text-sm font-medium block">Só Texto</span>
                <span className="text-xs opacity-70">Fundos estáticos</span>
              </div>
            </button>
            <button
              onClick={() => setFormato('imagens')}
              className={`flex items-center gap-2 p-3 rounded-lg border transition-colors ${
                formato === 'imagens'
                  ? 'border-primary bg-primary/10 text-foreground'
                  : 'border-border text-muted-foreground hover:bg-accent/50'
              }`}
              style={formato === 'imagens' ? { borderColor: WINE } : {}}
            >
              <Image className="w-4 h-4" />
              <div className="text-left">
                <span className="text-sm font-medium block">Com Imagens</span>
                <span className="text-xs opacity-70">IA gera fundos</span>
              </div>
            </button>
          </div>
        </div>

        {/* Seletor de lei */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Selecione a lei</label>
          <Select value={selectedLei} onValueChange={handleLeiChange}>
            <SelectTrigger><SelectValue placeholder="Escolha uma lei..." /></SelectTrigger>
            <SelectContent className="max-h-60">
              {LEIS_CATALOG.map(l => (
                <SelectItem key={l.tabela_nome} value={l.tabela_nome}>{l.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Seletor de artigo */}
        {selectedLei && (
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Selecione o artigo</label>
            {loadingArtigos ? (
              <div className="flex items-center gap-2 text-muted-foreground text-sm py-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Carregando artigos...
              </div>
            ) : (
              <Select value={selectedArtigo} onValueChange={setSelectedArtigo}>
                <SelectTrigger><SelectValue placeholder="Escolha um artigo..." /></SelectTrigger>
                <SelectContent className="max-h-60">
                  {artigos.map(a => (
                    <SelectItem key={a.numero} value={a.numero}>
                      {a.numero} — {a.caput.slice(0, 80)}{a.caput.length > 80 ? '...' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        )}

        {/* Tipo de conteúdo */}
        <div className="space-y-3">
          <label className="text-sm font-medium text-foreground">Tipo de conteúdo</label>
          <RadioGroup value={tipoConteudo} onValueChange={setTipoConteudo} className="grid grid-cols-1 gap-2">
            {TIPOS_CONTEUDO.map(t => (
              <div key={t.value} className="flex items-start gap-3 rounded-lg border border-border p-3 cursor-pointer hover:bg-accent/50 transition-colors">
                <RadioGroupItem value={t.value} id={t.value} className="mt-0.5" />
                <Label htmlFor={t.value} className="cursor-pointer flex-1">
                  <span className="text-sm font-medium block">{t.label}</span>
                  <span className="text-xs text-muted-foreground">{t.desc}</span>
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>

        {/* Botão gerar */}
        <Button
          onClick={handleGerar}
          disabled={!selectedLei || !selectedArtigo || isGenerating}
          className="w-full text-white"
          style={{ background: WINE }}
        >
          {loading ? (
            <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Gerando conteúdo...</>
          ) : loadingImagens ? (
            <><Loader2 className="w-4 h-4 animate-spin mr-2" /> {imagensProgresso || 'Gerando imagens...'}</>
          ) : (
            formato === 'imagens' ? 'Gerar Carrossel com Imagens' : 'Gerar Carrossel'
          )}
        </Button>

        {formato === 'imagens' && !isGenerating && !carrossel && (
          <p className="text-xs text-muted-foreground text-center">
            ⚡ Com imagens demora mais (~30s por slide). Cada slide terá um fundo único gerado por IA.
          </p>
        )}

        {/* Preview dos slides */}
        {carrossel && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-foreground">
                Slide {currentSlide + 1} de {carrossel.slides.length}
              </p>
              <Button variant="outline" size="sm" onClick={downloadAll}>
                <Download className="w-4 h-4 mr-1" /> Baixar Todos
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentSlide(Math.max(0, currentSlide - 1))}
                disabled={currentSlide === 0}
                className="p-2 rounded-full bg-card border border-border disabled:opacity-30"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              <div
                className="flex-1 overflow-hidden rounded-xl border border-border bg-card"
                style={{ aspectRatio: `${SLIDE_W}/${SLIDE_H}`, position: 'relative' }}
              >
                {carrossel.slides.map((slide, i) => (
                  <div
                    key={i}
                    className={i === currentSlide ? 'block' : 'hidden'}
                    style={{
                      position: 'absolute', top: 0, left: 0, width: SLIDE_W, height: SLIDE_H,
                      transform: `scale(${previewScale})`, transformOrigin: 'top left',
                    }}
                  >
                    <SlideRenderer slide={slide} index={i} useImages={formato === 'imagens'} />
                  </div>
                ))}
              </div>

              <button
                onClick={() => setCurrentSlide(Math.min(carrossel.slides.length - 1, currentSlide + 1))}
                disabled={currentSlide === carrossel.slides.length - 1}
                className="p-2 rounded-full bg-card border border-border disabled:opacity-30"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            <Button variant="outline" size="sm" onClick={() => downloadSlide(currentSlide)} className="w-full">
              <Download className="w-4 h-4 mr-1" /> Baixar Slide {currentSlide + 1}
            </Button>

            <div className="flex justify-center gap-1.5">
              {carrossel.slides.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentSlide(i)}
                  className={`w-2 h-2 rounded-full transition-colors ${i === currentSlide ? 'bg-primary' : 'bg-muted'}`}
                  style={i === currentSlide ? { background: WINE } : {}}
                />
              ))}
            </div>
          </motion.div>
        )}
      </div>

      {/* Hidden full-size slides for export */}
      {carrossel && (
        <div className="fixed" style={{ left: '-9999px', top: 0 }}>
          {carrossel.slides.map((slide, i) => (
            <div
              key={`export-${i}`}
              ref={(el) => { slidesRef.current[i] = el; }}
              style={{ width: SLIDE_W, height: SLIDE_H }}
            >
              <SlideRenderer slide={slide} index={i} useImages={formato === 'imagens'} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default GeradorPost;
