import { AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export default function FeatureUnavailable({ name = 'Este recurso' }: { name?: string }) {
  const navigate = useNavigate();
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center p-6 text-center bg-background text-foreground">
      <AlertCircle className="w-12 h-12 text-muted-foreground mb-4" />
      <h1 className="text-xl font-semibold mb-2">{name} está temporariamente indisponível</h1>
      <p className="text-sm text-muted-foreground max-w-sm mb-6">
        Este módulo ainda está sendo reconstruído após o remix do projeto. Ele voltará em breve.
      </p>
      <Button onClick={() => navigate('/')}>Voltar ao início</Button>
    </div>
  );
}
