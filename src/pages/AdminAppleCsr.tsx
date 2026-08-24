import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import forge from 'node-forge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Loader2, Download, KeyRound, FileText, Apple, ShieldCheck, CheckCircle2, Upload, Package, Smartphone } from 'lucide-react';
import { PageHeader } from '@/components/vademecum/PageHeader';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

/**
 * Gera localmente (no navegador) a chave privada RSA 2048 + CSR (PKCS#10)
 * no formato que a Apple aceita no portal developer.apple.com. Após gerar,
 * salva no Supabase (tabela apple_csr_storage) para que o admin possa
 * baixar novamente sempre que voltar à página, sem precisar gerar de novo.
 */
export default function AdminAppleCsr() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [commonName, setCommonName] = useState('Wesley Nunes');
  const [country, setCountry] = useState('BR');
  const [generating, setGenerating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [result, setResult] = useState<{ keyPem: string; csrPem: string } | null>(null);
  const [cerFile, setCerFile] = useState<File | null>(null);
  const [p12Password, setP12Password] = useState('');
  const [buildingP12, setBuildingP12] = useState(false);
  const [p12Base64, setP12Base64] = useState<string | null>(null);
  const [p12SavedAt, setP12SavedAt] = useState<string | null>(null);
  const [provisionFile, setProvisionFile] = useState<File | null>(null);
  const [provisionBase64, setProvisionBase64] = useState<string | null>(null);
  const [provisionSavedAt, setProvisionSavedAt] = useState<string | null>(null);
  const [savingProvision, setSavingProvision] = useState(false);

  // Carrega registro salvo (se existir) ao abrir a página
  useEffect(() => {
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setLoading(false); return; }
        const { data, error } = await supabase
          .from('apple_csr_storage')
          .select('email, common_name, country, key_pem, csr_pem, updated_at, p12_base64, p12_password, p12_updated_at, provisioning_profile_base64, provisioning_profile_updated_at')
          .eq('user_id', user.id)
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (error) throw error;
        if (data) {
          setEmail(data.email);
          setCommonName(data.common_name);
          setCountry(data.country);
          setResult({ keyPem: data.key_pem, csrPem: data.csr_pem });
          setSavedAt(data.updated_at);
          if (data.p12_base64) setP12Base64(data.p12_base64);
          if (data.p12_password) setP12Password(data.p12_password);
          if (data.p12_updated_at) setP12SavedAt(data.p12_updated_at);
          if (data.provisioning_profile_base64) setProvisionBase64(data.provisioning_profile_base64);
          if (data.provisioning_profile_updated_at) setProvisionSavedAt(data.provisioning_profile_updated_at);
        }
      } catch (e: any) {
        console.error('load apple csr', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const download = (filename: string, content: string) => {
    const blob = new Blob([content], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  };

  const handleGenerate = async () => {
    if (!email.trim() || !commonName.trim()) {
      toast.error('Informe email e nome (Common Name)');
      return;
    }
    setGenerating(true);
    try {
      const keys: forge.pki.rsa.KeyPair = await new Promise((resolve, reject) => {
        forge.pki.rsa.generateKeyPair({ bits: 2048, workers: -1 }, (err, kp) => {
          if (err) reject(err); else resolve(kp);
        });
      });
      const csr = forge.pki.createCertificationRequest();
      csr.publicKey = keys.publicKey;
      csr.setSubject([
        { name: 'emailAddress', value: email.trim() },
        { name: 'commonName', value: commonName.trim() },
        { name: 'countryName', value: country.trim() || 'BR' },
      ]);
      csr.sign(keys.privateKey, forge.md.sha256.create());
      if (!csr.verify()) throw new Error('CSR falhou na verificação interna');
      const keyPem = forge.pki.privateKeyToPem(keys.privateKey);
      const csrPem = forge.pki.certificationRequestToPem(csr);
      setResult({ keyPem, csrPem });

      // Salva no Supabase
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.warning('Chave gerada, mas não foi salva (usuário não autenticado).');
      } else {
        const { error } = await supabase.from('apple_csr_storage').upsert({
          user_id: user.id,
          email: email.trim(),
          common_name: commonName.trim(),
          country: country.trim() || 'BR',
          key_pem: keyPem,
          csr_pem: csrPem,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });
        if (error) {
          console.error(error);
          toast.error('Chave gerada, mas falhou ao salvar: ' + error.message);
        } else {
          setSavedAt(new Date().toISOString());
          toast.success('Chave e CSR gerados e salvos no Supabase.');
        }
      }
    } catch (e: any) {
      toast.error(e.message || 'Falha ao gerar');
    } finally {
      setGenerating(false);
    }
  };

  const handleBuildP12 = async () => {
    if (!result?.keyPem) { toast.error('Gere/carregue a chave primeiro'); return; }
    if (!cerFile) { toast.error('Envie o arquivo .cer baixado da Apple'); return; }
    if (p12Password.length < 4) { toast.error('Defina uma senha (mín. 4 caracteres) pro .p12'); return; }
    setBuildingP12(true);
    try {
      const buf = new Uint8Array(await cerFile.arrayBuffer());
      const asText = new TextDecoder('utf-8', { fatal: false }).decode(buf);

      // Detectar erro comum: usuário mandou o .key em vez do .cer
      if (/BEGIN (RSA |EC )?PRIVATE KEY/.test(asText)) {
        throw new Error('Você enviou a CHAVE PRIVADA (.key). Precisa enviar o .cer baixado em developer.apple.com após submeter o CSR.');
      }
      if (/BEGIN CERTIFICATE REQUEST/.test(asText)) {
        throw new Error('Você enviou o .certSigningRequest. Precisa enviar o .cer que a Apple gerou a partir dele.');
      }

      let cert;
      if (/BEGIN CERTIFICATE/.test(asText)) {
        // .cer em PEM
        cert = forge.pki.certificateFromPem(asText);
      } else {
        // .cer em DER (formato padrão da Apple)
        const binary = Array.from(buf).map((b) => String.fromCharCode(b)).join('');
        const asn1 = forge.asn1.fromDer(binary);
        cert = forge.pki.certificateFromAsn1(asn1);
      }
      const privateKey = forge.pki.privateKeyFromPem(result.keyPem);

      // Validar que o certificado corresponde à chave privada
      const certPubN = (cert.publicKey as forge.pki.rsa.PublicKey).n.toString(16);
      const keyPubN = (forge.pki.setRsaPublicKey((privateKey as forge.pki.rsa.PrivateKey).n, (privateKey as forge.pki.rsa.PrivateKey).e).n).toString(16);
      if (certPubN !== keyPubN) {
        throw new Error('Este .cer não foi gerado a partir da sua chave privada atual. Gere um novo CSR e reenvie na Apple, ou baixe o .cer correto.');
      }


      const p12Asn1 = forge.pkcs12.toPkcs12Asn1(privateKey, [cert], p12Password, {
        friendlyName: 'Apple Distribution',
        algorithm: '3des',
      });
      const p12Der = forge.asn1.toDer(p12Asn1).getBytes();
      // base64
      const b64 = forge.util.encode64(p12Der);
      setP12Base64(b64);

      // download binário
      const bytes = new Uint8Array(p12Der.length);
      for (let i = 0; i < p12Der.length; i++) bytes[i] = p12Der.charCodeAt(i) & 0xff;
      const blob = new Blob([bytes], { type: 'application/x-pkcs12' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'apple_distribution.p12';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);

      // Persistir no Supabase pra não sumir ao recarregar
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const nowIso = new Date().toISOString();
          const { error: upErr } = await supabase.from('apple_csr_storage')
            .update({ p12_base64: b64, p12_password: p12Password, p12_updated_at: nowIso })
            .eq('user_id', user.id);
          if (upErr) console.error(upErr);
          else setP12SavedAt(nowIso);
        }
      } catch (e) { console.error('persist p12', e); }

      toast.success('.p12 gerado e salvo!');
    } catch (e: any) {
      console.error(e);
      toast.error('Falha ao gerar .p12: ' + (e.message || e));
    } finally {
      setBuildingP12(false);
    }
  };

  const handleSaveProvision = async () => {
    if (!provisionFile) { toast.error('Envie o arquivo .mobileprovision'); return; }
    setSavingProvision(true);
    try {
      const buf = new Uint8Array(await provisionFile.arrayBuffer());
      const b64 = btoa(Array.from(buf).map((b) => String.fromCharCode(b)).join(''));
      setProvisionBase64(b64);

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const nowIso = new Date().toISOString();
        const { error: upErr } = await supabase.from('apple_csr_storage')
          .update({ provisioning_profile_base64: b64, provisioning_profile_updated_at: nowIso })
          .eq('user_id', user.id);
        if (upErr) {
          console.error(upErr);
          toast.error('Base64 gerado, mas falhou ao salvar no Supabase: ' + upErr.message);
        } else {
          setProvisionSavedAt(nowIso);
          toast.success('Provisioning profile salvo no Supabase!');
        }
      } else {
        toast.warning('Base64 gerado, mas não salvo (usuário não autenticado).');
      }
    } catch (e: any) {
      console.error(e);
      toast.error('Falha ao processar .mobileprovision: ' + (e.message || e));
    } finally {
      setSavingProvision(false);
    }
  };

  const copy = async (text: string, label: string) => {
    try { await navigator.clipboard.writeText(text); toast.success(label + ' copiado'); }
    catch { toast.error('Falha ao copiar'); }
  };

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        title="Apple CSR"
        subtitle="Chave + Certificate Signing Request para iOS Distribution"
        onBack={() => navigate('/admin-secrets')}
      />

      <div className="max-w-2xl mx-auto p-4 space-y-4 pb-24">
        <Card className="p-4 space-y-3 bg-primary/5 border-primary/20">
          <div className="flex items-start gap-3">
            <Apple className="w-6 h-6 text-primary shrink-0 mt-0.5" />
            <div className="text-sm text-muted-foreground space-y-2">
              <p>
                Gera automaticamente a <strong>chave privada RSA 2048</strong> (.key) e o
                <strong> pedido de assinatura</strong> (.certSigningRequest). A chave é
                salva no Supabase (só você vê) — ao voltar aqui, os arquivos já aparecem
                prontos pra baixar de novo.
              </p>
              <p className="text-xs">
                <strong>Como usar:</strong> baixe os dois arquivos → developer.apple.com →
                Certificates → "+" → Apple Distribution → envie o{' '}
                <code>.certSigningRequest</code> → baixe o <code>.cer</code>.
              </p>
            </div>
          </div>
        </Card>

        {savedAt && (
          <Card className="p-3 bg-green-500/10 border-green-500/30 flex items-center gap-2 text-sm">
            <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
            <span>
              Chave salva no Supabase em{' '}
              <strong>{new Date(savedAt).toLocaleString('pt-BR')}</strong>. Gerar novamente
              substitui a anterior.
            </span>
          </Card>
        )}

        <Card className="p-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email da conta Apple Developer</Label>
            <Input id="email" type="email" placeholder="voce@dominio.com"
              value={email} onChange={(e) => setEmail(e.target.value)} disabled={generating || loading} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cn">Common Name (nome do titular)</Label>
            <Input id="cn" placeholder="Wesley Nunes"
              value={commonName} onChange={(e) => setCommonName(e.target.value)} disabled={generating || loading} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="c">País (código ISO)</Label>
            <Input id="c" maxLength={2} placeholder="BR"
              value={country} onChange={(e) => setCountry(e.target.value.toUpperCase())} disabled={generating || loading} />
          </div>

          <Button onClick={handleGenerate} disabled={generating || loading} className="w-full" size="lg">
            {generating ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Gerando RSA 2048...</>
            ) : loading ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Carregando...</>
            ) : (
              <><ShieldCheck className="w-4 h-4 mr-2" />{result ? 'Gerar nova chave + CSR' : 'Gerar chave + CSR'}</>
            )}
          </Button>
        </Card>

        {result && (
          <Card className="p-4 space-y-3 border-primary/40">
            <div className="flex items-center gap-2 text-sm font-medium">
              <ShieldCheck className="w-4 h-4 text-primary" />
              Arquivos prontos — baixe os dois
            </div>
            <Button onClick={() => download('apple_distribution.key', result.keyPem)}
              variant="secondary" className="w-full justify-start">
              <KeyRound className="w-4 h-4 mr-2" />
              <span className="flex-1 text-left">apple_distribution.key</span>
              <Download className="w-4 h-4" />
            </Button>
            <Button onClick={() => download('apple_distribution.certSigningRequest', result.csrPem)}
              variant="secondary" className="w-full justify-start">
              <FileText className="w-4 h-4 mr-2" />
              <span className="flex-1 text-left">apple_distribution.certSigningRequest</span>
              <Download className="w-4 h-4" />
            </Button>
            <p className="text-xs text-muted-foreground">
              Envie o <strong>.certSigningRequest</strong> no site da Apple.
              Guarde o <strong>.key</strong> — ele é único e insubstituível pra esse certificado.
            </p>
          </Card>
        )}

        {result && (
          <Card className="p-4 space-y-4 border-primary/40">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Package className="w-4 h-4 text-primary" />
              Passo 2 — Gerar .p12 a partir do .cer da Apple
            </div>
            <p className="text-xs text-muted-foreground">
              Depois de baixar o <code>.cer</code> em developer.apple.com,
              envie-o aqui + defina uma senha. O <code>.p12</code> é montado no
              seu navegador com a chave privada salva.
            </p>

            {p12SavedAt && (
              <div className="flex items-center gap-2 text-xs bg-green-500/10 border border-green-500/30 rounded p-2">
                <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                <span>.p12 salvo em <strong>{new Date(p12SavedAt).toLocaleString('pt-BR')}</strong> — gere novamente só se quiser substituir.</span>
              </div>
            )}

            <div className="space-y-2">
              <Label>Certificado (.cer)</Label>
              <Input
                type="file"
                accept=".cer,application/x-x509-ca-cert,application/pkix-cert"
                onChange={(e) => setCerFile(e.target.files?.[0] ?? null)}
                disabled={buildingP12}
              />
              {cerFile && <p className="text-xs text-muted-foreground">{cerFile.name} ({cerFile.size} bytes)</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="p12pw">Senha do .p12 (defina uma nova)</Label>
              <Input
                id="p12pw"
                type="text"
                placeholder="ex: Vacatio@2026"
                value={p12Password}
                onChange={(e) => setP12Password(e.target.value)}
                disabled={buildingP12}
              />
            </div>

            <Button onClick={handleBuildP12} disabled={buildingP12 || !cerFile} className="w-full" size="lg">
              {buildingP12 ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Gerando .p12...</>
              ) : (
                <><Upload className="w-4 h-4 mr-2" />Gerar apple_distribution.p12</>
              )}
            </Button>

            {p12Base64 && (
              <div className="space-y-3 pt-2 border-t">
                <p className="text-sm font-medium flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  Pronto! Salve estes dois valores em /admin-secrets (aba Apple):
                </p>
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <code className="text-xs">APPLE_DISTRIBUTION_CERT_P12_BASE64</code>
                    <Button size="sm" variant="secondary" onClick={() => copy(p12Base64, 'Base64')}>
                      Copiar base64
                    </Button>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <code className="text-xs">APPLE_DISTRIBUTION_CERT_PASSWORD</code>
                    <Button size="sm" variant="secondary" onClick={() => copy(p12Password, 'Senha')}>
                      Copiar senha
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Tamanho do base64: {p12Base64.length.toLocaleString('pt-BR')} caracteres.
                </p>
              </div>
            )}
          </Card>
        )}

        {result && (
          <Card className="p-4 space-y-4 border-primary/40">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Smartphone className="w-4 h-4 text-primary" />
              Passo 3 — Provisioning Profile (.mobileprovision)
            </div>
            <p className="text-xs text-muted-foreground">
              Baixe o <code>.mobileprovision</code> em developer.apple.com → Profiles → "+" →
              App Store Connect, selecione o Bundle ID <code>br.com.vacatio.app</code> e o
              certificado que você criou. Envie o arquivo aqui.
            </p>

            {provisionSavedAt && (
              <div className="flex items-center gap-2 text-xs bg-green-500/10 border border-green-500/30 rounded p-2">
                <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                <span>Provisioning profile salvo em <strong>{new Date(provisionSavedAt).toLocaleString('pt-BR')}</strong> — envie novamente só se quiser substituir.</span>
              </div>
            )}

            <div className="space-y-2">
              <Label>Provisioning Profile (.mobileprovision)</Label>
              <Input
                type="file"
                accept=".mobileprovision"
                onChange={(e) => setProvisionFile(e.target.files?.[0] ?? null)}
                disabled={savingProvision}
              />
              {provisionFile && <p className="text-xs text-muted-foreground">{provisionFile.name} ({provisionFile.size} bytes)</p>}
            </div>

            <Button onClick={handleSaveProvision} disabled={savingProvision || !provisionFile} className="w-full" size="lg">
              {savingProvision ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Salvando...</>
              ) : (
                <><Upload className="w-4 h-4 mr-2" />Salvar Provisioning Profile</>
              )}
            </Button>

            {provisionBase64 && (
              <div className="space-y-3 pt-2 border-t">
                <p className="text-sm font-medium flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  Pronto! Salve este valor em /admin-secrets (aba Apple):
                </p>
                <div className="flex items-center justify-between gap-2">
                  <code className="text-xs">APPLE_PROVISIONING_PROFILE_BASE64</code>
                  <Button size="sm" variant="secondary" onClick={() => copy(provisionBase64, 'Base64')}>
                    Copiar base64
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Tamanho do base64: {provisionBase64.length.toLocaleString('pt-BR')} caracteres.
                </p>
              </div>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}
