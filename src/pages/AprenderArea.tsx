import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import DesktopPageLayout from '@/components/layout/DesktopPageLayout';
import { PageHeader } from '@/components/vademecum/PageHeader';
import AreaHeroPanel from '@/components/aprender/AreaHeroPanel';
import TemaRow from '@/components/aprender/TemaRow';
import TemaAulasSheet from '@/components/aprender/TemaAulasSheet';
import TemaTabs, { TemaTabId } from '@/components/aprender/TemaTabs';
import FlashcardsTab from '@/components/aprender/tema/FlashcardsTab';
import QuestoesTab, { Questao } from '@/components/aprender/tema/QuestoesTab';
import ProgressoTab from '@/components/aprender/tema/ProgressoTab';
import {
  AprenderAreaData,
  ModuloRow,
  getCachedAprenderArea,
  hydrateAprenderAreaCache,
  loadAprenderArea,
} from '@/lib/aprenderAreaLoader';

type Flashcard = {
  id: string;
  frente: string;
  verso: string;
  explicacao?: string;
  exemplo?: string;
  dica?: string;
};

const AprenderArea = () => {
  const navigate = useNavigate();
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();

  const initial = slug ? getCachedAprenderArea(slug, user?.id ?? null) : undefined;
  const [data, setData] = useState<AprenderAreaData | null>(initial ?? null);
  const [loading, setLoading] = useState(!initial);
  const [temaAberto, setTemaAberto] = useState<{ modulo: ModuloRow; numero: number } | null>(null);

  // Abas da área
  const [searchParams] = useSearchParams();
  const tabInicial = (['teoria', 'flashcards', 'questoes', 'progresso'] as const).includes(
    searchParams.get('tab') as TemaTabId,
  )
    ? (searchParams.get('tab') as TemaTabId)
    : 'teoria';
  const [tab, setTab] = useState<TemaTabId>(tabInicial);
  const [loadingPraticas, setLoadingPraticas] = useState(false);
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [questoes, setQuestoes] = useState<Questao[]>([]);
  const [respostas, setRespostas] = useState<Record<string, { acertou: boolean; escolha: string }>>({});

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    const uid = user?.id ?? null;
    const hit = getCachedAprenderArea(slug, uid);
    if (hit) {
      setData(hit);
      setLoading(false);
      // Ainda dispara loadAprenderArea para revalidação em background
      loadAprenderArea(slug, uid).then((d) => {
        if (!cancelled) setData(d);
      });
      return;
    }
    // Sem cache em memória: tenta IndexedDB antes de mostrar loading
    (async () => {
      const persisted = await hydrateAprenderAreaCache(slug, uid);
      if (cancelled) return;
      if (persisted) {
        setData(persisted);
        setLoading(false);
      } else {
        setLoading(true);
      }
      const fresh = await loadAprenderArea(slug, uid);
      if (cancelled) return;
      setData(fresh);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [slug, user?.id]);

  const area = data?.area ?? null;
  const modulos = data?.modulos ?? [];
  const aulas = data?.aulas ?? [];
  const aulasPreparo = data?.aulasPreparo ?? {};
  const progresso = data?.progresso ?? {};

  const aulaIds = useMemo(() => aulas.map((a) => a.id), [aulas]);

  const stats = useMemo(() => {
    const totalAulas = aulas.length;
    const concluidas = aulas.filter((a) => progresso[a.id]?.concluida).length;
    const emPreparoTotal = Object.values(aulasPreparo).reduce((s, n) => s + n, 0);
    const disponiveis = Math.max(0, totalAulas - concluidas);
    const somaPct = aulas.reduce((s, a) => s + (progresso[a.id]?.concluida ? 100 : progresso[a.id]?.pct || 0), 0);
    const progressoPct = totalAulas ? somaPct / totalAulas : 0;
    return { totalAulas, concluidas, disponiveis, emPreparo: emPreparoTotal, progressoPct };
  }, [aulas, progresso, aulasPreparo]);

  const modulosVisiveis = useMemo(
    () => modulos.filter((m) => aulas.some((a) => a.modulo_id === m.id) || (aulasPreparo[m.id] ?? 0) > 0),
    [modulos, aulas, aulasPreparo],
  );

  // Carrega flashcards + questões de todas as aulas da área quando abre aba de prática
  useEffect(() => {
    if (tab !== 'flashcards' && tab !== 'questoes' && tab !== 'progresso') return;
    if (aulaIds.length === 0) {
      setFlashcards([]);
      setQuestoes([]);
      return;
    }
    let cancelled = false;
    setLoadingPraticas(true);
    (async () => {
      const { data: blocos, error } = await supabase
        .from('aprender_blocos')
        .select('id, tipo, payload, resposta_correta, aula_id, ordem')
        .in('aula_id', aulaIds)
        .in('tipo', ['flashcard', 'pergunta']);
      if (cancelled) return;
      if (error) {
        console.warn('[AprenderArea] erro carregando blocos', error);
        setLoadingPraticas(false);
        return;
      }
      const fc: Flashcard[] = [];
      const qs: Questao[] = [];
      (blocos ?? []).forEach((b: any) => {
        const p = b.payload || {};
        if (b.tipo === 'flashcard' && (p.frente || p.pergunta)) {
          fc.push({
            id: b.id,
            frente: p.frente || p.pergunta || '',
            verso: p.verso || p.resposta || '',
            explicacao: p.explicacao,
            exemplo: p.exemplo,
            dica: p.dica,
          });
        } else if (b.tipo === 'pergunta' && Array.isArray(p.opcoes) && p.enunciado) {
          const idCorreto = b.resposta_correta?.id_correta || b.resposta_correta?.correta || '';
          if (!idCorreto) return;
          qs.push({
            id: b.id,
            enunciado: p.enunciado,
            opcoes: p.opcoes.map((o: any) => ({ id: String(o.id), texto: o.texto })),
            id_correto: String(idCorreto),
            explicacao: b.resposta_correta?.explicacao,
          });
        }
      });
      setFlashcards(fc);
      setQuestoes(qs);
      setLoadingPraticas(false);
    })();
    return () => { cancelled = true; };
  }, [tab, aulaIds]);

  // Carrega respostas persistidas do usuário para os blocos da área
  useEffect(() => {
    if ((tab !== 'questoes' && tab !== 'progresso') || !user || questoes.length === 0) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('aprender_tema_respostas')
        .select('bloco_id, acertou, escolha')
        .eq('user_id', user.id)
        .in('bloco_id', questoes.map((q) => q.id));
      if (cancelled) return;
      const map: Record<string, { acertou: boolean; escolha: string }> = {};
      (data ?? []).forEach((r: any) => {
        map[r.bloco_id] = { acertou: !!r.acertou, escolha: r.escolha || '' };
      });
      setRespostas(map);
    })();
    return () => { cancelled = true; };
  }, [tab, user, questoes.length]);

  const resumoRespostas = useMemo(() => {
    const respondidasIds = Object.keys(respostas).filter((id) => questoes.some((q) => q.id === id));
    const acertos = respondidasIds.filter((id) => respostas[id]?.acertou).length;
    return { respondidas: respondidasIds.length, acertos };
  }, [respostas, questoes]);

  const mobileHeader = <PageHeader title={area?.nome ?? 'Aprender'} onBack={() => navigate('/aprender')} />;
  const temaAulas = temaAberto ? aulas.filter((a) => a.modulo_id === temaAberto.modulo.id) : [];

  return (
    <DesktopPageLayout
      activeId="aprender"
      title={area?.nome ?? 'Aprender'}
      subtitle={area?.descricao ?? 'Trilhas de estudo'}
      mobileHeader={mobileHeader}
    >
      <div className="mx-auto w-full max-w-3xl lg:px-0 pb-8">
        {loading && !data ? (
          <div className="space-y-4 px-4 py-5 sm:px-6">
            <div className="h-44 rounded-2xl bg-muted animate-pulse" />
            {[...Array(4)].map((_, i) => <div key={i} className="h-20 rounded-2xl bg-muted animate-pulse" />)}
          </div>
        ) : !area ? (
          <div className="mx-4 my-6 rounded-2xl border border-border bg-card p-8 text-center text-muted-foreground">
            Área não encontrada.
          </div>
        ) : (
          <>
            <AreaHeroPanel
              slug={slug}
              nome={area.nome}
              totalTemas={modulosVisiveis.length}
              totalAulas={stats.totalAulas}
              concluidas={stats.concluidas}
              disponiveis={stats.disponiveis}
              emPreparo={stats.emPreparo}
              progressoPct={stats.progressoPct}
            />

            {/* Abas de alternância logo abaixo do painel */}
            <div className="sticky top-0 z-30 border-b border-border bg-background">
              <TemaTabs value={tab} onChange={setTab} />
            </div>

            {tab === 'teoria' && (
              <>
                <h2 className="mb-3 mt-6 px-4 text-[11px] font-bold uppercase tracking-wider text-muted-foreground sm:px-6">
                  Temas
                </h2>

                {modulosVisiveis.length === 0 ? (
                  <div className="mx-4 rounded-2xl border border-border bg-card p-8 text-center text-muted-foreground sm:mx-6">
                    Nenhum tema publicado ainda nesta área.
                  </div>
                ) : (
                  <ul className="space-y-2.5 px-4 pb-6 sm:px-6">
                    {modulosVisiveis.map((m, i) => {
                      const list = aulas.filter((a) => a.modulo_id === m.id);
                      const total = list.length;
                      const somaPct = list.reduce(
                        (s, a) => s + (progresso[a.id]?.concluida ? 100 : progresso[a.id]?.pct || 0),
                        0,
                      );
                      const pct = total ? somaPct / total : 0;
                      return (
                        <li key={m.id}>
                          <TemaRow
                            numero={i + 1}
                            titulo={m.titulo}
                            totalAulas={total}
                            emPreparo={aulasPreparo[m.id] ?? 0}
                            pct={pct}
                            onClick={() => setTemaAberto({ modulo: m, numero: i + 1 })}
                          />
                        </li>
                      );
                    })}
                  </ul>
                )}
              </>
            )}
            {tab === 'flashcards' && (
              <div className="px-4 py-5 sm:px-6">
                <FlashcardsTab flashcards={flashcards} loading={loadingPraticas} />
              </div>
            )}
            {tab === 'questoes' && (
              <div className="px-4 py-5 sm:px-6">
                <QuestoesTab
                  temaId={area.id}
                  questoes={questoes}
                  loading={loadingPraticas}
                  respostas={respostas}
                  disablePersist
                  onRespondida={(bloco_id, acertou, escolha) =>
                    setRespostas((prev) => ({ ...prev, [bloco_id]: { acertou, escolha } }))
                  }
                  onIrProgresso={() => setTab('progresso')}
                />
              </div>
            )}
            {tab === 'progresso' && (
              <div className="px-4 py-5 sm:px-6">
                <ProgressoTab
                  totalQuestoes={questoes.length}
                  totalFlashcards={flashcards.length}
                  respondidas={resumoRespostas.respondidas}
                  acertos={resumoRespostas.acertos}
                  onResetar={() => setRespostas({})}
                />
              </div>
            )}
          </>
        )}
      </div>


      {temaAberto && (
        <TemaAulasSheet
          open={!!temaAberto}
          onOpenChange={(v) => !v && setTemaAberto(null)}
          numero={temaAberto.numero}
          titulo={temaAberto.modulo.titulo}
          aulas={temaAulas}
          progresso={progresso}
        />
      )}
    </DesktopPageLayout>
  );
};

export default AprenderArea;
