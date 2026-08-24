import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getPushInstallId } from "@/lib/nativePush";

const KEY = "vacatio:push-journey";
const MAX_MS = 5 * 60 * 1000; // 5 min de janela
const MAX_STEPS = 40;

type Session = { campaign_id: string; started_at: number; install_id?: string; step?: number };

function readSession(): Session | null {
  try {
    const raw = window.sessionStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Session;
    if (!parsed?.campaign_id) return null;
    if (Date.now() - parsed.started_at > MAX_MS) {
      window.sessionStorage.removeItem(KEY);
      return null;
    }
    if ((parsed.step ?? 0) >= MAX_STEPS) return null;
    return parsed;
  } catch { return null; }
}

function writeSession(s: Session) {
  try { window.sessionStorage.setItem(KEY, JSON.stringify(s)); } catch {}
}

/**
 * Registra em `push_open_journey` cada mudança de rota depois que o usuário
 * abre uma notificação push. A sessão fica ativa por até 5 minutos ou 40 telas.
 */
export function usePushJourneyTracker() {
  const location = useLocation();
  const lastRoute = useRef<string | null>(null);

  useEffect(() => {
    // Também aceita entrada via query ?pushCampaignId=xxx (deep-link web)
    try {
      const params = new URLSearchParams(location.search);
      const qcid = params.get("pushCampaignId");
      if (qcid) {
        writeSession({
          campaign_id: qcid,
          started_at: Date.now(),
          install_id: getPushInstallId(),
        });
        import('@/lib/appEvents').then(({ appEvents }) => appEvents.pushClick({ campaign_id: qcid })).catch(() => {});
      }
    } catch {}

    const session = readSession();
    if (!session) return;
    const route = `${location.pathname}${location.search || ""}`;
    if (lastRoute.current === route) return;
    lastRoute.current = route;

    const step = (session.step ?? 0) + 1;
    (async () => {
      const { data: auth } = await supabase.auth.getSession();
      const userId = auth.session?.user?.id ?? null;
      await supabase.from("push_open_journey").insert({
        campaign_id: session.campaign_id,
        user_id: userId,
        install_id: session.install_id ?? getPushInstallId(),
        step,
        route,
        title: typeof document !== "undefined" ? document.title.slice(0, 200) : null,
      });
      writeSession({ ...session, step });
    })().catch(() => {});
  }, [location.pathname, location.search]);
}
