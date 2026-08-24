import { useNavigate } from 'react-router-dom';
import VotacoesPanel from '@/components/radar/VotacoesPanel';
import { PageHeader } from '@/components/vademecum/PageHeader';

const RadarVotacoes = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-md">
        <PageHeader
          title="Votações"
          subtitle="Votações recentes do plenário"
          onBack={() => navigate(-1)}
        />
      </div>
      <div className="p-4">
        <VotacoesPanel />
      </div>
    </div>
  );
};

export default RadarVotacoes;
