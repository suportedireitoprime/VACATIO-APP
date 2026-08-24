import { useNavigate } from 'react-router-dom';
import DeputadosPanel from '@/components/radar/DeputadosPanel';
import { PageHeader } from '@/components/vademecum/PageHeader';

const RadarDeputados = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-md">
        <PageHeader
          title="Deputados Federais"
          subtitle="513 deputados em exercício"
          onBack={() => navigate(-1)}
        />
      </div>
      <div className="p-4">
        <DeputadosPanel searchQuery="" />
      </div>
    </div>
  );
};

export default RadarDeputados;
