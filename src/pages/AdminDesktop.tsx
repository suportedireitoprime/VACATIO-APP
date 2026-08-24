import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/vademecum/PageHeader";
import {
  Download,
  Loader2,
  Play,
  ExternalLink,
  Monitor,
  Apple,
  Terminal,
  KeyRound,
  Package,
  RefreshCw,
  HardDrive,
  ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

// Ajuste aqui se o repositório mudar de dono ou nome no GitHub.
const GH_OWNER = "wesleynunesdev";
const GH_REPO = "vade-mecum-comentado";
const GH_WORKFLOW = "build-desktop.yml";

interface ReleaseAsset {
  name: string;
  browser_download_url: string;
  size: number;
}
interface Release {
  tag_name: string;
  name: string;
  html_url: string;
  published_at: string;
  assets: ReleaseAsset[];
}

function fmtSize(bytes: number) {
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(1)} MB`;
}

function assetIcon(name: string) {
  const n = name.toLowerCase();
  if (n.endsWith(".exe")) return <Monitor className="w-5 h-5" />;
  if (n.endsWith(".dmg")) return <Apple className="w-5 h-5" />;
  if (n.endsWith(".appimage") || n.endsWith(".deb"))
    return <Terminal className="w-5 h-5" />;
  return <Package className="w-5 h-5" />;
}

function assetLabel(name: string) {
  const n = name.toLowerCase();
  if (n.endsWith(".exe")) return "Windows (instalador)";
  if (n.endsWith(".dmg")) return "macOS (.dmg)";
  if (n.endsWith(".appimage")) return "Linux (AppImage)";
  if (n.endsWith(".deb")) return "Linux (Debian/Ubuntu)";
  return name;
}

export default function AdminDesktop() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [release, setRelease] = useState<Release | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchRelease = async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch(
        `https://api.github.com/repos/${GH_OWNER}/${GH_REPO}/releases/latest`,
        { headers: { Accept: "application/vnd.github+json" } },
      );
      if (r.status === 404) {
        setRelease(null);
        setError("Nenhuma release publicada ainda.");
      } else if (!r.ok) {
        setError(`GitHub respondeu ${r.status}`);
      } else {
        setRelease(await r.json());
      }
    } catch (e: any) {
      setError(e?.message ?? "Erro ao consultar GitHub");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRelease();
  }, []);

  const actionsUrl = `https://github.com/${GH_OWNER}/${GH_REPO}/actions/workflows/${GH_WORKFLOW}`;
  const releasesUrl = `https://github.com/${GH_OWNER}/${GH_REPO}/releases`;

  return (
    <div className="min-h-dvh bg-background text-foreground pb-24">
      <PageHeader
        title="App para computador"
        subtitle="Gerar Windows / macOS / Linux via GitHub Actions"
        onBack={() => navigate('/admin-funcoes')}
        rightAction={
          <Button variant="ghost" size="icon" onClick={fetchRelease} aria-label="Recarregar">
            <RefreshCw className="w-5 h-5" />
          </Button>
        }
      />

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-4">
        {/* Baixar última versão */}
        <Card className="p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-amber-400/15 flex items-center justify-center">
              <Download className="w-5 h-5 text-amber-400" />
            </div>
            <div className="flex-1">
              <h2 className="font-semibold">Baixar última versão</h2>
              <p className="text-xs text-muted-foreground">
                Instaladores publicados como GitHub Release
              </p>
            </div>
            {release && (
              <Badge variant="secondary" className="font-mono">
                {release.tag_name}
              </Badge>
            )}
          </div>

          {loading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
              <Loader2 className="w-4 h-4 animate-spin" /> Consultando GitHub…
            </div>
          )}

          {!loading && error && (
            <div className="rounded-lg bg-secondary/50 p-4 text-sm text-muted-foreground">
              {error}
              <div className="mt-3">
                <a
                  href={releasesUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-amber-400 text-xs inline-flex items-center gap-1"
                >
                  Abrir página de releases <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          )}

          {!loading && release && (
            <div className="grid sm:grid-cols-2 gap-2">
              {release.assets
                .filter((a) =>
                  /\.(exe|dmg|AppImage|deb)$/i.test(a.name),
                )
                .map((a) => (
                  <a
                    key={a.name}
                    href={a.browser_download_url}
                    className="flex items-center gap-3 p-3 rounded-xl border border-border hover:border-amber-400/50 hover:bg-secondary/40 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center text-foreground/80">
                      {assetIcon(a.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">
                        {assetLabel(a.name)}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {a.name} · {fmtSize(a.size)}
                      </div>
                    </div>
                    <Download className="w-4 h-4 text-muted-foreground" />
                  </a>
                ))}
            </div>
          )}
        </Card>

        {/* Como gerar nova versão */}
        <Card className="p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-blue-400/15 flex items-center justify-center">
              <Play className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h2 className="font-semibold">Gerar nova versão</h2>
              <p className="text-xs text-muted-foreground">
                Duas formas de disparar o build no GitHub Actions
              </p>
            </div>
          </div>

          <div className="space-y-3 text-sm">
            <div className="rounded-lg bg-secondary/40 p-3">
              <div className="font-medium mb-1">1 — Manual (a qualquer momento)</div>
              <p className="text-muted-foreground text-xs mb-2">
                Abre Actions no GitHub e clica em "Run workflow". Pode escolher
                as plataformas ("all", "windows", "macos,linux"…).
              </p>
              <Button asChild size="sm" variant="secondary">
                <a href={actionsUrl} target="_blank" rel="noreferrer">
                  Abrir Actions <ExternalLink className="w-3.5 h-3.5 ml-1" />
                </a>
              </Button>
            </div>

            <div className="rounded-lg bg-secondary/40 p-3">
              <div className="font-medium mb-1">
                2 — Automático por tag <code className="text-amber-400">v*</code>
              </div>
              <p className="text-muted-foreground text-xs mb-2">
                Sempre que você criar uma tag <code>v1.2.0</code>, o workflow
                roda e publica os instaladores como Release nova.
              </p>
              <pre className="text-[11px] bg-background rounded p-2 overflow-x-auto">
{`git tag v1.0.0
git push origin v1.0.0`}
              </pre>
            </div>
          </div>
        </Card>

        {/* Assinatura de código */}
        <Card className="p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-purple-400/15 flex items-center justify-center">
              <KeyRound className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h2 className="font-semibold">Assinatura de código (opcional)</h2>
              <p className="text-xs text-muted-foreground">
                Sem certificado, Windows/macOS mostram aviso de "editor
                desconhecido". Funciona igual, mas o aviso some quando você
                assinar.
              </p>
            </div>
          </div>
          <div className="text-xs text-muted-foreground space-y-1">
            <p>Secrets do repositório para assinar automaticamente:</p>
            <ul className="list-disc pl-5 space-y-0.5">
              <li>
                <code>CSC_LINK</code> e <code>CSC_KEY_PASSWORD</code> — .p12 do
                certificado (Windows/macOS)
              </li>
              <li>
                <code>APPLE_ID</code>, <code>APPLE_APP_SPECIFIC_PASSWORD</code>,{" "}
                <code>APPLE_TEAM_ID</code> — notarização macOS
              </li>
            </ul>
          </div>
        </Card>

        {/* Modo 100% offline */}
        <Card className="p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-400/15 flex items-center justify-center">
              <HardDrive className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="font-semibold">Modo 100% offline (nativo)</h2>
              <p className="text-xs text-muted-foreground">
                Todo o conteúdo de leitura vai embutido no instalador
              </p>
            </div>
          </div>
          <div className="text-xs text-muted-foreground space-y-2">
            <p>Cada build desktop empacota estes bancos dentro do <code>.exe/.dmg/.AppImage</code>:</p>
            <ul className="list-disc pl-5 space-y-0.5">
              <li>Vade Mecum completo (13k+ artigos)</li>
              <li>Resumos jurídicos (4k+ temas)</li>
              <li>Biblioteca: Clássicos, OAB, Estudos, Português, Liderança, Fora da Toga, Pesquisa Científica</li>
              <li>Temática Jurídica (filmes/séries/documentários)</li>
              <li>Snapshot do Blog e Notícias no momento da build</li>
            </ul>
            <p className="pt-1">
              Só depende de internet: <strong>Horus (IA)</strong>, <strong>vídeo/áudio dos boletins</strong> e{" "}
              <strong>login</strong>.
            </p>
          </div>
        </Card>

        {/* Aviso do SmartScreen / antivírus */}
        <Card className="p-5 border-orange-400/30">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-orange-400/15 flex items-center justify-center">
              <ShieldAlert className="w-5 h-5 text-orange-400" />
            </div>
            <div>
              <h2 className="font-semibold">Windows SmartScreen / Antivírus</h2>
              <p className="text-xs text-muted-foreground">
                Por que aparece "editor desconhecido" e como reduzimos o falso positivo
              </p>
            </div>
          </div>
          <div className="text-xs text-muted-foreground space-y-2">
            <p>
              Sem certificado <strong>EV Code Signing</strong> (~R$ 2 mil/ano),
              o Windows exibe o aviso do SmartScreen para qualquer app novo até
              ele acumular reputação. O que já implementamos para minimizar:
            </p>
            <ul className="list-disc pl-5 space-y-0.5">
              <li>
                Metadados completos no <code>.exe</code>: <code>publisherName</code>,{" "}
                <code>fileDescription</code>, <code>legalTrademarks</code>,
                <code>copyright</code>
              </li>
              <li>
                Execução como usuário comum (<code>asInvoker</code>) — não pede
                senha de admin
              </li>
              <li>
                Instalador multi-etapa (NSIS) com aceite de EULA em pt-BR
              </li>
              <li>
                Registro em <code>HKCU\Software\Vacatio\VadeMecum</code> — apps
                legítimos gravam isso
              </li>
              <li>Pacote monolítico (sem <code>differentialPackage</code>)</li>
            </ul>
            <p className="pt-2">
              <strong>Para zerar o aviso:</strong> comprar um cert EV
              (Sectigo / DigiCert / SSL.com) e adicionar{" "}
              <code>CSC_LINK</code> + <code>CSC_KEY_PASSWORD</code> nos secrets
              do GitHub — o workflow já suporta.
            </p>
            <p>
              <strong>macOS:</strong> mesma lógica — sem Apple Developer ID
              (US$ 99/ano) o Gatekeeper mostra "app não verificado" na primeira
              abertura. Clicar com botão direito → Abrir libera.
            </p>
          </div>
        </Card>

        {/* Custo Actions */}
        <Card className="p-4 border-amber-400/30 bg-amber-400/5">
          <p className="text-xs text-amber-200/90">
            <strong>Custo Actions:</strong> jobs macOS consomem 10× minutos do
            plano gratuito. Se quiser economizar, dispare manualmente com{" "}
            <code>platforms = windows,linux</code>.
          </p>
        </Card>
      </main>
    </div>
  );
}
