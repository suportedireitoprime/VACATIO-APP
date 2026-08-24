import { useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";
import { LocalNotifications } from "@capacitor/local-notifications";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, RefreshCw, Send } from "lucide-react";

type Diag = {
  platform: string;
  isNative: boolean;
  pushPerm?: string;
  localPerm?: string;
  channels?: Array<{ id: string; importance?: number; name?: string; sound?: string }>;
  hasDefaultChannel?: boolean;
  tokens?: Array<{ token: string; platform: string; updated_at: string }>;
  userEmail?: string | null;
};

export default function PushDiagnosticoTab() {
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [diag, setDiag] = useState<Diag | null>(null);

  async function run() {
    setLoading(true);
    try {
      const isNative = Capacitor.isNativePlatform();
      const platform = Capacitor.getPlatform();
      const d: Diag = { platform, isNative };

      if (isNative) {
        try { d.pushPerm = (await PushNotifications.checkPermissions()).receive; } catch (e) { d.pushPerm = `err:${e}`; }
        try { d.localPerm = (await LocalNotifications.checkPermissions()).display; } catch (e) { d.localPerm = `err:${e}`; }
        try {
          const r = await PushNotifications.listChannels();
          d.channels = (r.channels ?? []).map((c: any) => ({ id: c.id, importance: c.importance, name: c.name, sound: c.sound }));
          d.hasDefaultChannel = d.channels.some((c) => c.id === "vacatio-alertas-v2" && (c.importance ?? 0) >= 4);
        } catch (e) { d.channels = []; }
      }

      const { data: userRes } = await supabase.auth.getUser();
      d.userEmail = userRes.user?.email ?? null;
      if (userRes.user) {
        const { data: toks } = await supabase
          .from("device_tokens")
          .select("token, platform, updated_at")
          .eq("user_id", userRes.user.id)
          .order("updated_at", { ascending: false });
        d.tokens = (toks ?? []) as any;
      }
      setDiag(d);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { run(); }, []);

  async function sendToMe() {
    if (!diag?.tokens?.length) { toast.error("Sem token para este usuário"); return; }
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-push", {
        body: {
          title: "Teste diagnóstico",
          body: `Enviado às ${new Date().toLocaleTimeString()}`,
          tokens: diag.tokens.map((t) => t.token),
        },
      });
      if (error) throw error;
      toast.success(`Enviado: ${data?.sent ?? 0} / ${data?.total ?? 0}`);
    } catch (e: any) {
      toast.error(e?.message ?? "Falha ao enviar");
    } finally {
      setSending(false);
    }
  }

  function status(ok: boolean | undefined, okLabel: string, badLabel: string) {
    if (ok === undefined) return <Badge variant="secondary">n/d</Badge>;
    return ok ? <Badge className="bg-emerald-600">{okLabel}</Badge> : <Badge variant="destructive">{badLabel}</Badge>;
  }

  return (
    <div className="space-y-3">
      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="font-semibold text-sm">Diagnóstico do aparelho</div>
          <Button size="sm" variant="ghost" onClick={run} disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          </Button>
        </div>

        {!diag ? <div className="text-xs text-muted-foreground">Carregando…</div> : (
          <div className="text-sm space-y-2">
            <Row label="Plataforma"><Badge>{diag.platform}</Badge> {status(diag.isNative, "nativo", "web")}</Row>
            <Row label="Usuário logado">{diag.userEmail ?? <span className="text-destructive">nenhum</span>}</Row>
            {diag.isNative && (
              <>
                <Row label="Permissão push">{status(diag.pushPerm === "granted", diag.pushPerm ?? "-", diag.pushPerm ?? "-")}</Row>
                <Row label="Permissão local notif">{status(diag.localPerm === "granted", diag.localPerm ?? "-", diag.localPerm ?? "-")}</Row>
                <Row label="Canal vacatio-alertas-v2 (importância ≥ 4)">
                  {status(diag.hasDefaultChannel, "ok", "faltando ou baixo")}
                </Row>
                {diag.channels && diag.channels.length > 0 && (
                  <details className="text-xs">
                    <summary className="cursor-pointer text-muted-foreground">Ver todos canais ({diag.channels.length})</summary>
                    <ul className="mt-1 space-y-1">
                      {diag.channels.map((c) => (
                        <li key={c.id} className="font-mono">
                          {c.id} · imp={c.importance ?? "?"} · sound={c.sound ?? "-"}
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
              </>
            )}
            <Row label="Tokens do usuário">{diag.tokens?.length ?? 0}</Row>
            {diag.tokens?.length ? (
              <details className="text-xs">
                <summary className="cursor-pointer text-muted-foreground">Ver tokens</summary>
                <ul className="mt-1 space-y-1">
                  {diag.tokens.map((t) => (
                    <li key={t.token} className="font-mono truncate">[{t.platform}] {t.token.slice(0, 24)}… · {new Date(t.updated_at).toLocaleString()}</li>
                  ))}
                </ul>
              </details>
            ) : null}
          </div>
        )}
      </Card>

      <Card className="p-4 space-y-2">
        <div className="text-sm font-semibold">Enviar teste só para este usuário</div>
        <p className="text-xs text-muted-foreground">
          Dispara um push direto para {diag?.tokens?.length ?? 0} token(s) vinculado(s) à sua conta. Feche o app após clicar para testar o banner em background.
        </p>
        <Button onClick={sendToMe} disabled={sending || !diag?.tokens?.length}>
          {sending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
          Enviar push de teste
        </Button>
      </Card>

      <Card className="p-4 space-y-2 text-xs text-muted-foreground">
        <div className="font-semibold text-foreground text-sm">Checklist se não chegar</div>
        <ul className="list-disc pl-4 space-y-1">
          <li>APK instalado precisa ser o mais recente (rebuild via GitHub Actions após mudanças em <code>capacitor.config.ts</code> ou <code>nativePush.ts</code>).</li>
          <li>Permissão de notificação deve estar "granted" acima.</li>
          <li>Canal <code>vacatio-alertas-v2</code> deve existir com importância ≥ 4 (Alta).</li>
          <li>Modo "Não perturbe" ou economia de bateria pode suprimir o banner.</li>
          <li>Após envio, veja <code>push_events</code> — se houver <code>sent</code> mas nenhum <code>delivered</code>, o problema é do lado do aparelho (permissão/canal/DND).</li>
        </ul>
      </Card>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="flex items-center gap-2 flex-wrap justify-end">{children}</span>
    </div>
  );
}