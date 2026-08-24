import { useNavigate } from 'react-router-dom';
import DesktopPageLayout from '@/components/layout/DesktopPageLayout';
import { PageHeader } from '@/components/vademecum/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ExternalLink, FileText, Image as ImageIcon, Volume2, ShieldCheck } from 'lucide-react';
import { ACTIVE_MODELS, FUNCTIONS_USAGE, RATE_LIMITS, type ModelKind } from '@/config/aiModelsUsage';

const KIND_META: Record<ModelKind, { icon: any; color: string; label: string }> = {
  text: { icon: FileText, color: 'text-blue-500', label: 'Texto' },
  image: { icon: ImageIcon, color: 'text-purple-500', label: 'Imagem' },
  tts: { icon: Volume2, color: 'text-amber-500', label: 'Áudio' },
};

export default function AdminModelos() {
  const navigate = useNavigate();

  return (
    <DesktopPageLayout activeId="ferramentas" title="Modelos de Geração">
      <PageHeader title="Modelos de Geração" onBack={() => navigate(-1)} />

      <div className="max-w-5xl mx-auto p-4 space-y-6">
        {/* Política */}
        <Card className="border-primary/40">
          <CardHeader>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-primary" />
              <CardTitle className="text-base">Política de modelos</CardTitle>
            </div>
            <CardDescription>
              O app só usa modelos baratos do Gemini. Qualquer alteração precisa passar por
              <code className="mx-1 px-1 py-0.5 rounded bg-muted text-xs">supabase/functions/_shared/ai-models.ts</code>
              e por este painel.
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Cards dos modelos ativos */}
        <div className="grid gap-4 md:grid-cols-3">
          {(Object.entries(ACTIVE_MODELS) as [ModelKind, typeof ACTIVE_MODELS[ModelKind]][]).map(([kind, m]) => {
            const Icon = KIND_META[kind].icon;
            return (
              <Card key={kind}>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <Icon className={`w-5 h-5 ${KIND_META[kind].color}`} />
                    <Badge variant="outline">{KIND_META[kind].label}</Badge>
                  </div>
                  <CardTitle className="text-base mt-2">{m.label}</CardTitle>
                  <CardDescription className="text-xs">{m.category}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 text-xs">
                  <div>
                    <div className="text-muted-foreground">ID direto (Google API)</div>
                    <code className="block mt-0.5 px-2 py-1 rounded bg-muted break-all">{m.id}</code>
                  </div>
                  <div>
                    <div className="text-muted-foreground">ID Lovable AI Gateway</div>
                    <code className="block mt-0.5 px-2 py-1 rounded bg-muted break-all">{m.gateway}</code>
                  </div>
                  <a
                    href={m.docs}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-primary hover:underline pt-1"
                  >
                    Documentação <ExternalLink className="w-3 h-3" />
                  </a>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Uso por função */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Funções que usam IA</CardTitle>
            <CardDescription>
              {FUNCTIONS_USAGE.length} usos mapeados nas edge functions.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {FUNCTIONS_USAGE.map((u, i) => {
                const Icon = KIND_META[u.kind].icon;
                return (
                  <div key={i} className="flex items-start gap-3 p-3 text-sm">
                    <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${KIND_META[u.kind].color}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <code className="text-xs font-mono">{u.fn}</code>
                        <Badge variant="secondary" className="text-[10px]">
                          {ACTIVE_MODELS[u.kind].label}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">{u.purpose}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Limites de taxa */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Limites de taxa (plano atual)</CardTitle>
            <CardDescription>Referência do painel Google AI Studio.</CardDescription>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted text-xs">
                <tr>
                  <th className="text-left p-2">Modelo</th>
                  <th className="text-right p-2">RPM</th>
                  <th className="text-right p-2">TPM</th>
                  <th className="text-right p-2">RPD</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {RATE_LIMITS.map((r) => (
                  <tr key={r.model}>
                    <td className="p-2">{r.model}</td>
                    <td className="p-2 text-right font-mono text-xs">{r.rpm}</td>
                    <td className="p-2 text-right font-mono text-xs">{r.tpm}</td>
                    <td className="p-2 text-right font-mono text-xs">{r.rpd}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        {/* Como alterar */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Como trocar um modelo</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2 text-muted-foreground">
            <p>1. Edite <code className="px-1 rounded bg-muted text-xs">supabase/functions/_shared/ai-models.ts</code> com o novo id.</p>
            <p>2. Atualize <code className="px-1 rounded bg-muted text-xs">src/config/aiModelsUsage.ts</code> para refletir aqui.</p>
            <p>3. Só use ids listados no catálogo oficial do Gemini — nada de <code>pro</code>, <code>3.x</code> ou <code>flash</code> puro sem <code>-lite</code>.</p>
          </CardContent>
        </Card>

        <div className="pb-8">
          <Button variant="outline" onClick={() => navigate('/admin-funcoes')}>Voltar ao Admin</Button>
        </div>
      </div>
    </DesktopPageLayout>
  );
}
