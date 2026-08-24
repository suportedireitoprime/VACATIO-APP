import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Play, Clock, Sparkles, Scale, Newspaper, ArrowRight, CheckCircle2, Moon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import DesktopPageLayout from '@/components/layout/DesktopPageLayout';
import { PageHeader } from '@/components/vademecum/PageHeader';
import BoletimPlayer, { type BoletimScene } from '@/components/boletim/BoletimPlayer';
import { Skeleton } from '@/components/ui/skeleton';
import { pickAsset } from '@/lib/assetUrl';
import boletimJuridicoAsset from '@/assets/boletins/boletim-juridico.webp.asset.json';
import boletimJuridicoBundled from '@/assets/boletins/boletim-juridico.webp';
import boletimNoticiasAsset from '@/assets/boletins/boletim-noticias.webp.asset.json';
import boletimNoticiasBundled from '@/assets/boletins/boletim-noticias.webp';

const boletimJuridicoSrc = pickAsset(boletimJuridicoBundled, boletimJuridicoAsset.url);
const boletimNoticiasSrc = pickAsset(boletimNoticiasBundled, boletimNoticiasAsset.url);

// Cache aquecido — pré-carrega ambas as capas
if (typeof window !== 'undefined') {
  [boletimJuridicoSrc, boletimNoticiasSrc].forEach((src) => {
    const img = new Image();
    img.decoding = 'async';
    img.src = src;
  });
}

const COVERS = {
  juridico: {
    label: 'Jurídicos',
    short: 'Vídeo diário de direito',
    cover: boletimJuridicoSrc,
    icon: Scale,
    cta: 'Abrir Boletim Jurídico',
    descricao:
      'Um vídeo diário comentando as normas mais relevantes do dia. Você acompanha o que mudou no ordenamento com análise jurídica clara, direto no seu bolso.',
    bullets: [
      'Novas leis, decretos e medidas provisórias comentadas',
      'Roteiro narrado com contexto e impacto prático',
      'Publicação diária às 9h, pronto para o café da manhã',
    ],
    gradient:
      'radial-gradient(120% 90% at 50% 30%, #3a2a05 0%, #1a1305 45%, #080603 100%)',
    halo: 'radial-gradient(45% 40% at 50% 45%, rgba(255,200,80,0.35), transparent 70%)',
  },
  noticias: {
    label: 'Notícias',
    short: 'As manchetes que importam',
    cover: boletimNoticiasSrc,
    icon: Newspaper,
    cta: 'Abrir Boletim de Notícias',
    descricao:
      'As principais manchetes jurídicas e políticas do dia, resumidas em um único boletim para você ouvir antes de dormir e chegar amanhã já sabendo o que rolou.',
    bullets: [
      'Manchetes de STF, STJ, TSE e tribunais superiores',
      'Congresso, governo e decisões que impactam o direito',
      'Publicação diária às 21h, para ouvir antes de dormir',
    ],
    gradient:
      'radial-gradient(120% 90% at 50% 30%, #3a0f0a 0%, #1a0605 45%, #080303 100%)',
    halo: 'radial-gradient(45% 40% at 50% 45%, rgba(255,120,120,0.30), transparent 70%)',
  },
} as const;

type Boletim = {
  id: string;
  data_ref: string;
  titulo: string;
  subtitulo: string | null;
  status: string;
  duracao_s: number | null;
  roteiro_json: BoletimScene[];
  youtube_url: string | null;
  thumbnail_url: string | null;
  created_at: string;
};

type Props = { tipo?: 'juridico' | 'noticias' };

export default function BoletinsJuridicos({ tipo = 'juridico' }: Props) {
  const navigate = useNavigate();
  const { id } = useParams();
  const [items, setItems] = useState<Boletim[]>([]);
  const [loading, setLoading] = useState(true);
  const [ativo, setAtivo] = useState<Boletim | null>(null);
  const [view, setView] = useState<'cover' | 'lista'>(id ? 'lista' : 'cover');

  const isNoticias = tipo === 'noticias';
  const titulo = isNoticias ? 'Boletins de Notícias' : 'Boletins Jurídicos';
  const subtitulo = isNoticias ? 'As manchetes que importam, todo dia' : 'Seu vídeo diário de direito';

  useEffect(() => {
    (async () => {
      const SNAPSHOT_KEY = `boletins:snapshot:v1:${tipo}`;
      // 1) Hidrata do snapshot local (funciona offline).
      try {
        const raw = localStorage.getItem(SNAPSHOT_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as { savedAt: number; items: Boletim[] };
          if (parsed?.items?.length) {
            setItems(parsed.items);
            setLoading(false);
            if (id) {
              const found = parsed.items.find((b) => b.id === id);
              if (found) setAtivo(found);
            }
          }
        }
      } catch { /* ignore */ }
      // 2) Offline: para por aqui.
      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        setLoading(false);
        return;
      }
      const { data } = await supabase
        .from('boletins_juridicos')
        .select('id,data_ref,titulo,subtitulo,status,duracao_s,roteiro_json,youtube_url,thumbnail_url,created_at')
        .in('status', ['pronto', 'sem_leis'])
        .eq('tipo', tipo)
        .order('data_ref', { ascending: false })
        .limit(30);
      setItems((data || []) as any);
      setLoading(false);
      // 3) Persiste snapshot para próximas aberturas offline.
      try {
        if (data && data.length) {
          localStorage.setItem(SNAPSHOT_KEY, JSON.stringify({ savedAt: Date.now(), items: data }));
        }
      } catch { /* quota */ }
      if (id) {
        const found = (data || []).find((b: any) => b.id === id);
        if (found) setAtivo(found as any);
      }
    })();
  }, [id, tipo]);

  const header = (
    <PageHeader
      title={titulo}
      subtitle={subtitulo}
      onBack={() => (view === 'lista' ? setView('cover') : navigate('/ferramentas'))}
    />
  );

  return (
    <DesktopPageLayout activeId="ferramentas" title={titulo} subtitle={subtitulo} mobileHeader={header}>
      <div className="px-4 sm:px-6 py-4 lg:px-0 space-y-4">
        {/* Toggle Jurídico / Notícias — estilo Radares */}
        <div className="relative grid grid-cols-2 bg-secondary/60 rounded-full p-1 border border-border">
          <motion.div
            layout
            transition={{ type: 'spring', stiffness: 400, damping: 32 }}
            className="absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-full bg-primary shadow-md"
            style={{ left: !isNoticias ? 4 : 'calc(50% + 0px)' }}
          />
          {(['juridico', 'noticias'] as const).map((key) => {
            const c = COVERS[key];
            const Icon = c.icon;
            const active = (key === 'juridico') === !isNoticias;
            return (
              <button
                key={key}
                onClick={() => navigate(key === 'juridico' ? '/boletins' : '/boletins-noticias')}
                className={`relative z-[1] flex items-center justify-center gap-2 py-2 rounded-full text-sm font-semibold transition-colors ${
                  active ? 'text-primary-foreground' : 'text-foreground/70'
                }`}
              >
                <Icon className="w-4 h-4" strokeWidth={2} />
                <span className="truncate">{c.label}</span>
              </button>
            );
          })}
        </div>

        {view === 'cover' && (<>
        {/* Capa — mesmo estilo Radares */}
        {(() => {
          const c = COVERS[isNoticias ? 'noticias' : 'juridico'];
          const Icon = c.icon;
          return (
            <motion.div
              key={isNoticias ? 'n' : 'j'}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className="relative rounded-2xl overflow-hidden border border-border shadow-2xl shadow-black/40 aspect-[16/10]"
              style={{ background: c.gradient }}
            >
              <div className="pointer-events-none absolute inset-0" style={{ background: c.halo }} />
              <img
                src={c.cover}
                alt={titulo}
                width={1280}
                height={1280}
                loading="eager"
                decoding="async"
                className="absolute inset-0 m-auto w-[78%] h-[92%] object-contain drop-shadow-[0_20px_40px_rgba(0,0,0,0.6)]"
              />
              <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-black/50 to-transparent" />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-4">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-wide">
                  <Icon className="w-3.5 h-3.5" />
                  {c.short}
                </div>
                <h2 className="mt-2 font-display text-2xl sm:text-3xl font-bold text-white leading-[1.15] tracking-tight drop-shadow-lg">
                  {titulo}
                </h2>
              </div>
            </motion.div>
          );
        })()}

        {/* Descrição + bullets + CTA — padrão Radares */}
        {(() => {
          const c = COVERS[isNoticias ? 'noticias' : 'juridico'];
          const scrollToList = () => {
            document.getElementById('boletins-lista')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          };
          return (
            <>
              <p className="font-body text-base text-foreground/80 leading-relaxed">
                {c.descricao}
              </p>
              <ul className="space-y-3">
                {c.bullets.map((b) => (
                  <li key={b} className="flex items-start gap-3 p-3 rounded-xl bg-secondary/40 border border-border">
                    <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                    <span className="font-body text-sm text-foreground">{b}</span>
                  </li>
                ))}
              </ul>
              <button
                onClick={() => { setView('lista'); window.scrollTo({ top: 0, behavior: 'auto' }); }}
                className="btn-attention-shine w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-primary text-primary-foreground font-semibold text-base shadow-lg shadow-primary/30 hover:brightness-110 transition"
              >
                <span className="relative z-[2]">{c.cta}</span>
                <ArrowRight className="w-5 h-5 relative z-[2]" />
              </button>
            </>
          );
        })()}
        </>)}

        {view === 'lista' && (<>


        {loading && (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-28 rounded-2xl" />
            ))}
          </div>
        )}

        {!loading && items.length === 0 && (
          <div className="text-center py-16 opacity-70">
            <Sparkles className="w-10 h-10 mx-auto mb-3 text-primary" />
            <p className="font-display font-bold text-lg">Sem boletins ainda</p>
            <p className="text-sm text-muted-foreground mt-1">{isNoticias ? 'O próximo chega às 21h.' : 'O primeiro chega às 9h da manhã.'}</p>
          </div>
        )}

        {items.map((b, i) => {
          const semLeis = b.status === 'sem_leis';
          if (semLeis) {
            return (
              <motion.div
                key={b.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="w-full relative overflow-hidden rounded-2xl bg-card/40 border border-dashed border-border text-left opacity-60"
              >
                <div className="flex items-stretch gap-0">
                  <div className="relative w-32 shrink-0 aspect-square bg-muted/30">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-12 h-12 rounded-full bg-muted/40 flex items-center justify-center">
                        <Moon className="w-5 h-5 text-muted-foreground" />
                      </div>
                    </div>
                  </div>
                  <div className="flex-1 p-4 min-w-0">
                    <p className="text-[11px] uppercase tracking-widest text-muted-foreground font-bold mb-1">
                      {new Date(b.data_ref + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })}
                    </p>
                    <p className="font-display font-bold text-base leading-tight line-clamp-2 text-muted-foreground">{b.titulo}</p>
                    <p className="text-xs text-muted-foreground/80 mt-1 line-clamp-2 italic">
                      {b.subtitulo || 'Nenhuma lei nova publicada neste dia'}
                    </p>
                  </div>
                </div>
              </motion.div>
            );
          }
          const cover = b.thumbnail_url || b.roteiro_json?.find((s: any) => s.kind === 'norma')?.imagem_url || b.roteiro_json?.[0]?.imagem_url;
          const cor = (b.roteiro_json?.find((s: any) => s.kind === 'norma') as any)?.cor_hex || '#3B82F6';
          return (
            <motion.button
              key={b.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => setAtivo(b)}
              className="w-full relative overflow-hidden rounded-2xl bg-card border border-border text-left group"
            >
              <div className="flex items-stretch gap-0">
                <div className="relative w-32 shrink-0 aspect-square">
                  {cover && <img src={cover} alt="" className="absolute inset-0 w-full h-full object-cover" />}
                  <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${cor}55, transparent 60%)` }} />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center group-hover:scale-110 transition">
                      <Play className="w-5 h-5 text-black ml-0.5" fill="black" />
                    </div>
                  </div>
                </div>
                <div className="flex-1 p-4 min-w-0">
                  <p className="text-[11px] uppercase tracking-widest text-primary font-bold mb-1">
                    {new Date(b.data_ref + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })}
                  </p>
                  <p className="font-display font-bold text-base leading-tight line-clamp-2">{b.titulo}</p>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{b.subtitulo}</p>
                  {b.duracao_s ? (
                    <div className="flex items-center gap-1 mt-2 text-[11px] text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      {Math.floor(b.duracao_s / 60)}m {b.duracao_s % 60}s
                    </div>
                  ) : null}
                </div>
              </div>
            </motion.button>
          );
        })}
        </>)}
      </div>


      {ativo && <BoletimPlayer boletimId={ativo.id} scenes={ativo.roteiro_json || []} youtubeUrl={ativo.youtube_url || undefined} onClose={() => setAtivo(null)} />}
    </DesktopPageLayout>
  );
}