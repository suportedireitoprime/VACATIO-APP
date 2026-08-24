import { useNavigate } from 'react-router-dom';
import { Route } from 'lucide-react';
import DesktopPageLayout from '@/components/layout/DesktopPageLayout';
import { PageHeader } from '@/components/vademecum/PageHeader';
import AprenderBottomNav from '@/components/aprender/AprenderBottomNav';
import AreaEscolhaLista from '@/components/aprender/AreaEscolhaLista';
import { useAprenderAreasResumo } from '@/hooks/useAprenderAreasResumo';

const AprenderTrilhas = () => {
  const navigate = useNavigate();
  const { areas, loading } = useAprenderAreasResumo();

  const emAndamento = areas.filter((a) => a.pct > 0 && a.pct < 100);

  const mobileHeader = (
    <PageHeader title="Trilhas" subtitle="Roteiros guiados de estudo" onBack={() => navigate('/aprender')} />
  );

  return (
    <DesktopPageLayout
      activeId="aprender"
      title="Trilhas"
      subtitle="Roteiros guiados de estudo"
      mobileHeader={mobileHeader}
    >
      <div className="mx-auto w-full max-w-3xl px-4 py-6 pb-32 sm:px-6 lg:px-0 lg:py-0">
        {emAndamento.length > 0 && (
          <>
            <h2 className="mb-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Continuar de onde parou
            </h2>
            <div className="mb-6">
              <AreaEscolhaLista
                areas={emAndamento}
                loading={false}
                tab="teoria"
                Icon={Route}
                accent="#7DD3FC"
                emptyText=""
                subtitle={(a) => `${a.concluidas}/${a.totalAulas} aulas concluídas`}
              />
            </div>
          </>
        )}

        <h2 className="mb-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          Todas as trilhas
        </h2>
        <AreaEscolhaLista
          areas={areas}
          loading={loading}
          tab="teoria"
          Icon={Route}
          accent="#7DD3FC"
          emptyText="Nenhuma trilha publicada ainda."
          subtitle={(a) => `${a.totalAulas} aula${a.totalAulas === 1 ? '' : 's'} • ${a.pct}% concluído`}
        />
      </div>
      <AprenderBottomNav />
    </DesktopPageLayout>
  );
};

export default AprenderTrilhas;
