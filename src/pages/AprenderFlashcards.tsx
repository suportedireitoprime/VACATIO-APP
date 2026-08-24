import { useNavigate } from 'react-router-dom';
import { Layers } from 'lucide-react';
import DesktopPageLayout from '@/components/layout/DesktopPageLayout';
import { PageHeader } from '@/components/vademecum/PageHeader';
import AprenderBottomNav from '@/components/aprender/AprenderBottomNav';
import AreaEscolhaLista from '@/components/aprender/AreaEscolhaLista';
import { useAprenderAreasResumo } from '@/hooks/useAprenderAreasResumo';

const AprenderFlashcards = () => {
  const navigate = useNavigate();
  const { areas, loading } = useAprenderAreasResumo();

  const mobileHeader = (
    <PageHeader title="Flashcards" subtitle="Revisão espaçada" onBack={() => navigate('/aprender')} />
  );

  return (
    <DesktopPageLayout
      activeId="aprender"
      title="Flashcards"
      subtitle="Revisão espaçada"
      mobileHeader={mobileHeader}
    >
      <div className="mx-auto w-full max-w-3xl px-4 py-6 pb-32 sm:px-6 lg:px-0 lg:py-0">
        <p className="mb-4 text-sm text-muted-foreground">
          Escolha uma área para revisar os flashcards das aulas publicadas.
        </p>
        <AreaEscolhaLista
          areas={areas}
          loading={loading}
          tab="flashcards"
          Icon={Layers}
          accent="#C7B3FF"
          emptyText="Nenhuma área com aulas publicadas ainda."
          subtitle={(a) => `${a.totalAulas} aula${a.totalAulas === 1 ? '' : 's'} • ${a.pct}% concluído`}
        />
      </div>
      <AprenderBottomNav />
    </DesktopPageLayout>
  );
};

export default AprenderFlashcards;
