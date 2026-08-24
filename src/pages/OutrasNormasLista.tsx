import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronRight, Loader2, Search, Info } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/vademecum/PageHeader';
import LeiOrdinariaDetail from '@/components/vademecum/LeiOrdinariaDetail';
import { supabase } from '@/integrations/supabase/client';
import type { LeiOrdinaria } from '@/services/legislacaoService';
import { getListSnapshot, setListSnapshot } from '@/services/offlineDb';
import { withOnlineGuard } from '@/lib/onlineGuard';
import brasaoImgAsset from '@/assets/brasao-republica.webp';
import coverLei from '@/assets/norma-cover-lei.jpg';
import coverLC from '@/assets/norma-cover-lc.jpg';
import coverDecreto from '@/assets/norma-cover-decreto.webp';
import coverMP from '@/assets/norma-cover-mp.jpg';

type SlugKey = 'leis' | 'leis-complementares' | 'decretos' | 'medidas-provisorias';

interface Meta {
  tipo: string;
  titulo: string;
  subtitulo: string;
  descricao: string;
  cover: string;
}

const META: Record<SlugKey, Meta> = {
  'leis': {
    tipo: 'Lei',
    titulo: 'Leis Ordinárias',
    subtitulo: 'Publicadas no DOU',
    descricao: 'Leis ordinárias federais publicadas no Diário Oficial da União.',
    cover: coverLei,
  },
  'leis-complementares': {
    tipo: 'Lei Complementar',
    titulo: 'Leis Complementares',
    subtitulo: 'Complementares à Constituição',
    descricao: 'Normas que complementam a Constituição Federal, exigindo maioria absoluta.',
    cover: coverLC,
  },
  'decretos': {
    tipo: 'Decreto',
    titulo: 'Decretos',
    subtitulo: 'Regulamentos do Executivo',
    descricao: 'Decretos do Poder Executivo publicados no Diário Oficial da União.',
    cover: coverDecreto,
  },
  'medidas-provisorias': {
    tipo: 'Medida Provisória',
    titulo: 'Medidas Provisórias',
    subtitulo: 'Editadas pelo Presidente',
    descricao: 'Atos com força de lei editados pelo Presidente da República, com vigência temporária.',
    cover: coverMP,
  },
};

interface ResenhaRow {
  id: string;
  tipo_ato: string;
  numero_ato: string;
  ementa: string | null;
  url: string | null;
  texto_completo: string | null;
  explicacao: string | null;
  data_publicacao: string | null;
  data_dou: string | null;
}

function cleanText(t: string | null): string | null {
  if (!t) return null;
  return t
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/\u00A0/g, ' ')
    .replace(/\r/g, '')
    .trim();
}

function formatData(iso?: string | null) {
  if (!iso) return '';
  const s = iso.slice(0, 10);
  const [y, m, d] = s.split('-');
  if (!y || !m || !d) return s;
  return `${d}/${m}/${y}`;
}

export default function OutrasNormasLista() {
  const navigate = useNavigate();
  const { slug } = useParams<{ slug: string }>();
  const meta = META[slug as SlugKey];

  const [items, setItems] = useState<ResenhaRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [detail, setDetail] = useState<LeiOrdinaria | null>(null);

  useEffect(() => {
    if (!meta) return;
    let mounted = true;
    (async () => {
      setLoading(true);
      // 1) Hidrata do snapshot local (funciona offline).
      const snapKey = `outras-normas:${meta.tipo}`;
      const cached = await getListSnapshot<ResenhaRow>(snapKey);
      if (mounted && cached && cached.length) {
        setItems(cached);
        setLoading(false);
      }
      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        if (mounted && !cached) setLoading(false);
        return;
      }
      // 2) Revalida online.
      const { data, error } = await supabase
        .from('resenha_diaria' as any)
        .select('id,tipo_ato,numero_ato,ementa,url,data_publicacao,data_dou,texto_completo,explicacao')
        .eq('tipo_ato', meta.tipo)
        .order('data_dou', { ascending: false })
        .limit(500);
      if (mounted) {
        if (error && !cached) toast.error('Falha ao carregar normas');
        const list = (data as unknown as ResenhaRow[]) || [];
        if (list.length) {
          setItems(list);
          setListSnapshot(snapKey, list).catch(() => {});
        }
        setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [meta]);

  const filtered = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return items;
    return items.filter((i) =>
      (i.numero_ato || '').toLowerCase().includes(q) ||
      (i.ementa || '').toLowerCase().includes(q)
    );
  }, [items, busca]);

  const openDetail = async (item: ResenhaRow) => {
    const texto = cleanText(item.texto_completo);
    let explicacao = item.explicacao;
    const buildLei = (t: string | null, e: string | null): LeiOrdinaria => ({
      id: item.id,
      numero_lei: item.numero_ato,
      ementa: item.ementa || '',
      ano: parseInt(item.data_publicacao?.slice(0, 4) || String(new Date().getFullYear())),
      data_publicacao: item.data_publicacao ?? null,
      texto_completo: t,
      url: item.url ?? null,
      ordem: 0,
      explicacao: e,
    });
    setDetail(buildLei(texto ?? null, explicacao ?? null));
    if (!texto) {
      try {
        await withOnlineGuard(
          () => supabase.functions.invoke('popular-texto-resenha', { body: { id: item.id, force: true } }),
          { message: 'Sem internet — o texto completo desta norma será carregado quando você reconectar.' },
        );
        const { data } = await supabase
          .from('resenha_diaria' as any)
          .select('texto_completo,explicacao')
          .eq('id', item.id)
          .maybeSingle();
        const novo = cleanText((data as any)?.texto_completo);
        if (novo) {
          explicacao = (data as any)?.explicacao ?? explicacao;
          setDetail(buildLei(novo, explicacao ?? null));
        }
      } catch { /* silencioso */ }
    }
  };

  if (!meta) {
    return (
      <div className="min-h-dvh bg-background flex flex-col">
        <PageHeader title="Não encontrado" onBack={() => navigate(-1)} />
        <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
          Categoria inválida.
        </div>
      </div>
    );
  }

  if (detail) {
    return (
      <div className="min-h-dvh bg-background">
        <LeiOrdinariaDetail lei={detail} onBack={() => setDetail(null)} />
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-background pb-24">
      <PageHeader
        title={meta.titulo}
        subtitle={meta.subtitulo}
        onBack={() => navigate(-1)}
      />

      {/* Cover */}
      <div className="relative w-full h-44 md:h-56 overflow-hidden">
        <img
          src={meta.cover}
          alt={meta.titulo}
          className="absolute inset-0 w-full h-full object-cover"
          width={1600}
          height={900}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-background/10" />
        <div className="relative h-full flex flex-col justify-end px-5 pb-4">
          <div className="flex items-center gap-3">
            <img src={brasaoImgAsset} alt="" className="w-10 h-10 opacity-90" />
            <div>
              <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground tracking-tight">
                {meta.titulo}
              </h1>
              <p className="text-xs md:text-sm text-muted-foreground max-w-md">
                {meta.descricao}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="px-4 pt-4">
        <div className="relative">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder={`Buscar em ${meta.titulo.toLowerCase()}...`}
            className="w-full h-11 pl-9 pr-3 rounded-full bg-secondary/60 border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>
        <div className="flex items-center gap-2 mt-3 px-1">
          <Badge className="bg-primary/15 text-primary border border-primary/20 text-xs">
            {filtered.length} {filtered.length === 1 ? 'ato' : 'atos'}
          </Badge>
          <span className="text-[11px] text-muted-foreground">
            Fonte: Diário Oficial da União
          </span>
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-4 py-4 space-y-2.5">
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        )}
        {!loading && filtered.length === 0 && (
          <div className="text-center py-16 space-y-3">
            <Info className="w-8 h-8 mx-auto text-muted-foreground" />
            <p className="text-muted-foreground text-sm font-body">
              Nenhum ato encontrado.
            </p>
          </div>
        )}
        {!loading && filtered.map((item, i) => (
          <motion.button
            key={item.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(i * 0.02, 0.3) }}
            onClick={() => openDetail(item)}
            className="w-full text-left border border-border rounded-2xl px-4 py-4 bg-card hover:border-primary/30 transition-colors flex gap-3 items-start min-h-[100px]"
          >
            <img src={brasaoImgAsset} alt="" className="w-9 h-9 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0 flex flex-col gap-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className="bg-primary/15 text-primary border-primary/20 border text-[11px] px-2 py-0.5 font-semibold">
                  {item.tipo_ato}
                </Badge>
                {item.data_dou && (
                  <span className="text-[11px] text-muted-foreground font-body">
                    {formatData(item.data_dou)}
                  </span>
                )}
              </div>
              <h3 className="font-display text-[15px] leading-snug text-foreground font-semibold break-words">
                {item.numero_ato}
              </h3>
              {item.ementa && item.ementa !== item.numero_ato && (
                <p className="text-muted-foreground text-[13px] font-body leading-relaxed line-clamp-3 break-words">
                  {item.ementa}
                </p>
              )}
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-1" />
          </motion.button>
        ))}
      </main>
    </div>
  );
}