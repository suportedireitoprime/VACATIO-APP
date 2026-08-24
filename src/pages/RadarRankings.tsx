import { useNavigate } from 'react-router-dom';
import RankingPanel from '@/components/radar/RankingPanel';
import { PageHeader } from '@/components/vademecum/PageHeader';

const RadarRankings = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-md">
        <PageHeader
          title="Rankings"
          subtitle="Desempenho dos deputados federais"
          onBack={() => navigate(-1)}
        />
      </div>
      <div className="p-4">
        <RankingPanel />
      </div>
    </div>
  );
};

export default RadarRankings;
