import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, MessageCircle, UserPlus, Sparkles } from 'lucide-react';
import { PageHeader } from '@/components/vademecum/PageHeader';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import HorusOnboardingOverlay from '@/components/horus/onboarding/HorusOnboardingOverlay';
import CadastroOnboardingOverlay from '@/components/onboarding/CadastroOnboardingOverlay';
import { toast } from 'sonner';

export default function AdminTriagem() {
  const navigate = useNavigate();
  const [previewVersion, setPreviewVersion] = useState<string | null>(null);
  const [previewHorus, setPreviewHorus] = useState(false);

  const resetFirstSeen = () => {
    try {
      localStorage.removeItem('intro:firstSeen');
      localStorage.removeItem('triagem:firstSeen');
    } catch {}
    toast.success('Reset feito. A triagem vai aparecer de novo.');
  };

  return (
    <div className="min-h-dvh bg-background pb-[calc(5.5rem+var(--sai-bottom))] lg:pb-0">
      <PageHeader title="Triagem" onBack={() => navigate('/admin-funcoes')} />
      <div className="max-w-5xl mx-auto p-4 pb-24">
        <Tabs defaultValue="cadastro" className="w-full">
          <TabsList className="grid grid-cols-2 w-full mb-4">
            <TabsTrigger value="cadastro" className="gap-2">
              <UserPlus className="w-4 h-4" /> Cadastro
            </TabsTrigger>
            <TabsTrigger value="horus" className="gap-2">
              <MessageCircle className="w-4 h-4" /> Horus
            </TabsTrigger>
          </TabsList>

          <TabsContent value="cadastro" className="space-y-4">
            <div className="rounded-2xl border border-border bg-card p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-bold text-lg flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-primary" />
                    Triagem Minimalista Oficial
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Triagem em modo escuro, com narrativa das leis em 10 passos, funções do aplicativo, dor principal, momento do estudante e perfil.
                  </p>
                </div>
                <button
                  onClick={resetFirstSeen}
                  className="h-10 px-3 rounded-lg border border-border text-xs font-semibold hover:bg-muted"
                >
                  Resetar "primeira vez"
                </button>
              </div>

              <div className="mt-6 flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => setPreviewVersion('C')}
                  className="h-12 px-6 rounded-xl bg-primary text-primary-foreground font-semibold flex items-center justify-center gap-2 active:scale-95 shadow-md"
                >
                  <Play className="w-4 h-4" /> Preview da Triagem
                </button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="horus" className="space-y-4">
            <div className="rounded-2xl border border-border bg-card p-5">
              <h2 className="font-bold text-lg">Triagem do Horus</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Apresentação em Remotion mostrada na primeira abertura do Assistente Horus.
              </p>
              <button
                onClick={() => setPreviewHorus(true)}
                className="mt-4 h-12 px-5 rounded-xl bg-primary text-primary-foreground font-semibold flex items-center gap-2 active:scale-95"
              >
                <Play className="w-5 h-5" /> Preview ao vivo
              </button>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {previewVersion && (
        <CadastroOnboardingOverlay
          open
          previewMode
          forceVersion={previewVersion}
          onFinished={() => setPreviewVersion(null)}
        />
      )}
      {previewHorus && (
        <HorusOnboardingOverlay
          open
          previewMode
          initialName="Preview"
          onFinished={() => setPreviewHorus(false)}
        />
      )}
    </div>
  );
}
