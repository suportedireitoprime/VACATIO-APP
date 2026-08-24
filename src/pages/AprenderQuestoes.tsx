import { useNavigate } from 'react-router-dom';
import { HelpCircle } from 'lucide-react';
import DesktopPageLayout from '@/components/layout/DesktopPageLayout';
import { PageHeader } from '@/components/vademecum/PageHeader';
import AprenderBottomNav from '@/components/aprender/AprenderBottomNav';
import AreaEscolhaLista from '@/components/aprender/AreaEscolhaLista';
import { useAprenderAreasResumo } from '@/hooks/useAprenderAreasResumo';

const AprenderQuestoes = () => {
  const navigate = useNavigate();
  const { areas, loading } = useAprenderAreasResumo();

  const mobileHeader = (
    <PageHeader title="Questões" subtitle="Prática comentada" onBack={() => navigate('/aprender')} />
  );

  return (
    <DesktopPageLayout
      activeId="aprender"
      title="Questões"
      subtitle="Prática comentada"
      mobileHeader={mobileHeader}
    >
      <div className="mx-auto w-full max-w-3xl px-4 py-6 pb-32 sm:px-6 lg:px-0 lg:py-0">
        <p className="mb-4 text-sm text-muted-foreground">
          Escolha uma área para praticar as questões comentadas das aulas.
        </p>
        <AreaEscolhaLista
          areas={areas}
          loading={loading}
          tab="questoes"
          Icon={HelpCircle}
          accent="#F9A8A8"
          emptyText="Nenhuma área com aulas publicadas ainda."
          subtitle={(a) => `${a.totalAulas} aula${a.totalAulas === 1 ? '' : 's'} • ${a.pct}% concluído`}
        />
      </div>
      <AprenderBottomNav />
    </DesktopPageLayout>
  );
};

export default AprenderQuestoes;
