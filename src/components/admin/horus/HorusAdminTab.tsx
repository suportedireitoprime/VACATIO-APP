import { useEffect, useState } from 'react';
import { toDataURL } from 'qrcode';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw, QrCode, Users, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

function getQrCandidate(p: any): string | null {
  return (
    p?.qr?.base64 || p?.qr?.Qrcode || p?.qr?.QRCode || p?.qr?.Code ||
    p?.qr?.qrcode?.base64 || p?.qr?.qrcode?.Qrcode || p?.qr?.qrcode?.Code ||
    p?.qr?.qrcode?.code || p?.qr?.qrcode || p?.qr?.code ||
    p?.base64 || p?.Qrcode || p?.QRCode || p?.Code ||
    p?.qrcode?.base64 || p?.qrcode?.Qrcode || p?.qrcode?.Code ||
    p?.qrcode?.code || p?.qrcode || p?.code || null
  );
}

async function toQrImage(raw: string) {
  const value = raw.trim();
  if (value.startsWith('data:image/')) return value;
  const cleanBase64 = value.split('|')[0].replace(/\s/g, '');
  const looksLikeImageBase64 = cleanBase64.length > 300 && /^[A-Za-z0-9+/=\s]+$/.test(cleanBase64);
  if (looksLikeImageBase64) return `data:image/png;base64,${cleanBase64}`;
  return toDataURL(value, { width: 288, margin: 1 });
}

async function readQrFromResponse(data: any) {
  const raw = getQrCandidate(data);
  if (typeof raw === 'string' && raw.trim()) return toQrImage(raw);
  return null;
}

export function HorusAdminTab() {
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [qr, setQr] = useState<string | null>(null);
  const [qrStatus, setQrStatus] = useState<string | null>(null);
  const [working, setWorking] = useState(false);

  async function loadStatus() {
    setLoading(true);
    const { data, error } = await supabase.functions.invoke('horus-admin', { body: { action: 'status' } });
    if (error) toast.error('Erro ao carregar status');
    setStatus(data);
    setLoading(false);
  }
  useEffect(() => { loadStatus(); }, []);

  async function callAction(action: string) {
    setWorking(true);
    const { data, error } = await supabase.functions.invoke('horus-admin', { body: { action } });
    setWorking(false);
    if (error || data?.error) { toast.error(data?.error || 'Falhou'); return; }
    toast.success('OK');
    loadStatus();
  }

  async function generateQrCode() {
    setWorking(true); setQr(null); setQrStatus('Conectando instância do WhatsApp...');
    const started = await supabase.functions.invoke('horus-admin', { body: { action: 'connect' } });
    if (started.error || started.data?.error) {
      setWorking(false); setQrStatus(null);
      toast.error(started.data?.error || 'Falhou ao iniciar conexão'); return;
    }
    const firstQr = await readQrFromResponse(started.data);
    if (firstQr) { setQr(firstQr); setQrStatus('Escaneie no WhatsApp → Aparelhos conectados'); setWorking(false); await loadStatus(); return; }
    setQrStatus('Aguardando QR Code...');
    for (let i = 1; i <= 10; i++) {
      if (i > 1) await wait(3000);
      const { data } = await supabase.functions.invoke('horus-admin', { body: { action: 'qr_status' } });
      const image = await readQrFromResponse(data);
      if (image) { setQr(image); setQrStatus('Escaneie no WhatsApp → Aparelhos conectados'); setWorking(false); await loadStatus(); return; }
    }
    setWorking(false);
    setQrStatus('QR ainda não disponível. Tente novamente.');
  }

  const state = status?.state?.instance?.state || status?.state?.state || 'unknown';

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-card p-4 space-y-2">
        <div className="flex items-center justify-between">
          <p className="font-display text-sm">Instância</p>
          <button onClick={loadStatus} className="p-2 text-muted-foreground"><RefreshCw className="w-4 h-4" /></button>
        </div>
        <p className="font-mono text-xs text-muted-foreground">{status?.instance}</p>
        <p className="font-body text-xs">
          Estado: <span className={`font-semibold ${state === 'open' ? 'text-green-500' : 'text-amber-500'}`}>{state}</span>
          {' · '}Existe: {status?.exists ? 'sim' : 'não'}
        </p>
        <p className="font-body text-[10px] text-muted-foreground break-all">Webhook: {status?.webhook_url}</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-border bg-card p-4 flex items-center gap-3">
          <Users className="w-5 h-5 text-primary" />
          <div>
            <p className="font-display text-lg">{status?.users_count ?? 0}</p>
            <p className="font-body text-xs text-muted-foreground">vinculados</p>
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4 flex items-center gap-3">
          <MessageSquare className="w-5 h-5 text-primary" />
          <div>
            <p className="font-display text-lg">{status?.messages_count ?? 0}</p>
            <p className="font-body text-xs text-muted-foreground">mensagens</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2">
        {!status?.exists && <Button onClick={() => callAction('create')} disabled={working}>Criar instância</Button>}
        {state === 'open' ? (
          <div className="rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm font-medium text-green-500">
            WhatsApp conectado ao Horus.
          </div>
        ) : (
          <Button variant="outline" onClick={generateQrCode} disabled={working}>
            {working ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <QrCode className="w-4 h-4 mr-2" />}
            {working ? 'Gerando QR Code...' : 'Gerar QR Code'}
          </Button>
        )}
        <Button variant="ghost" onClick={() => callAction('set_webhook')} disabled={working}>
          Reconfigurar webhook
        </Button>
      </div>

      {(qr || qrStatus) && (
        <div className="rounded-2xl border border-border bg-card p-4 text-center">
          <p className="font-body text-xs text-muted-foreground mb-3">{qrStatus}</p>
          {qr ? (
            <img src={qr} alt="QR Code Horus" className="mx-auto w-64 h-64 rounded-lg bg-background p-2" />
          ) : (
            <div className="mx-auto flex h-64 w-64 items-center justify-center rounded-lg border border-border bg-muted/30">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}