// Web Push via Firebase Cloud Messaging.
// Registra o token FCM Web em device_tokens (platform='web').

import { initializeApp, getApps } from "firebase/app";
import { getMessaging, getToken, onMessage, isSupported } from "firebase/messaging";
import { supabase } from "@/integrations/supabase/client";
import { firebaseWebConfig, firebaseVapidKey } from "./firebaseConfig";

const cfg = firebaseWebConfig;
const vapidKey = firebaseVapidKey;
import { LEIS_SUPABASE_URL as _LU, LEIS_SUPABASE_ANON_KEY as _LK } from "@/lib/legislacaoBackend";
const anonKey = _LK;
const supabaseUrl = _LU;

export function isWebPushConfigured() {
  return Boolean(cfg.apiKey && cfg.projectId && cfg.appId && cfg.messagingSenderId && vapidKey);
}

async function registerSw() {
  const swCfg = { ...cfg, trackUrl: `${supabaseUrl}/functions/v1/push-track`, anonKey };
  const p = btoa(JSON.stringify(swCfg));
  return await navigator.serviceWorker.register(`/firebase-messaging-sw.js?p=${p}`, {
    scope: "/firebase-cloud-messaging-push-scope",
  });
}

export async function enableWebPush(): Promise<{ token?: string; error?: string }> {
  try {
    if (!isWebPushConfigured()) return { error: "Firebase Web não configurado" };
    if (!(await isSupported())) return { error: "Navegador não suporta Web Push" };
    if (!("Notification" in window)) return { error: "Notificações não suportadas" };

    const perm = Notification.permission === "granted"
      ? "granted"
      : await Notification.requestPermission();
    if (perm !== "granted") return { error: "Permissão negada" };

    const swReg = await registerSw();
    if (!getApps().length) initializeApp(cfg);
    const messaging = getMessaging();
    const token = await getToken(messaging, { vapidKey, serviceWorkerRegistration: swReg });
    if (!token) return { error: "Não foi possível obter token" };

    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("device_tokens").upsert(
        { token, platform: "web", user_id: user.id },
        { onConflict: "token" },
      );
    }

    onMessage(messaging, (payload) => {
      // Foreground: usa Notification API para exibir
      const n = payload.notification;
      if (n?.title && Notification.permission === "granted") {
        const notif = new Notification(n.title, {
          body: n.body ?? "",
          icon: n.icon ?? "/icons/icon-192.png",
        });
        notif.onclick = () => {
          const url = (payload.data as any)?.url || "/";
          window.focus();
          window.location.href = url;
        };
      }
    });

    return { token };
  } catch (e) {
    console.error("enableWebPush", e);
    return { error: String((e as Error).message) };
  }
}

// Chame na landing / App após navegar para registrar "opened" e "converted".
// Se ?_pc=<campaign_id> estiver na URL, registra converted.
export function trackPushLandingIfAny() {
  try {
    const p = new URLSearchParams(window.location.search);
    const cid = p.get("_pc");
    if (!cid) return;
    fetch(`${supabaseUrl}/functions/v1/push-track`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: anonKey },
      body: JSON.stringify({ campaign_id: cid, event_type: "converted" }),
    }).catch(() => {});
    // limpa query param
    p.delete("_pc");
    const clean = window.location.pathname + (p.toString() ? "?" + p.toString() : "") + window.location.hash;
    window.history.replaceState({}, "", clean);
  } catch {}
}
