import { useNavigate, useSearchParams } from 'react-router-dom';
import ProposicoesPanel from '@/components/radar/ProposicoesPanel';
import { PageHeader } from '@/components/vademecum/PageHeader';

const RadarProposicoes = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const dataInicial = searchParams.get('data') || undefined;

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-md">
        <PageHeader
          title="Projetos de Lei"
          subtitle="Proposições legislativas da Câmara"
          onBack={() => navigate(-1)}
        />
      </div>

      <div className="p-4">
        <ProposicoesPanel searchQuery="" dataInicial={dataInicial} />
      </div>
    </div>
  );
};

export default RadarProposicoes;
