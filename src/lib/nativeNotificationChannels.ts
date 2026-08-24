/**
 * Configura canais de push com sons personalizados por perfil do usuário.
 *
 * Android: cria um canal para cada perfil (estudante, concurseiro, advogado).
 * O `sound` deve ser o nome do arquivo em `android/app/src/main/res/raw/`
 * SEM extensão (ex.: oab_estudante.mp3 -> "oab_estudante").
 *
 * iOS: canais não existem — o som é escolhido no payload APNs
 * (`aps.sound: "oab_estudante.caf"`).
 */
import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";

export type PerfilUsuario = "estudante" | "concurseiro" | "advogado";

export const DEFAULT_PUSH_CHANNEL_ID = "vacatio-alertas-v2";

export const CANAIS_POR_PERFIL: Record<PerfilUsuario, { id: string; sound: string }> = {
  estudante: { id: "oab-estudante", sound: "oab_estudante" },
  concurseiro: { id: "oab-concurseiro", sound: "oab_concurseiro" },
  advogado: { id: "oab-advogado", sound: "oab_advogado" },
};

export async function configurarCanaisDeNotificacao() {
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== "android") return;

  try {
    await PushNotifications.createChannel({
      id: DEFAULT_PUSH_CHANNEL_ID,
      name: "Vacatio · Alertas",
      description: "Alertas principais do app.",
      importance: 5,
      visibility: 1,
      vibration: true,
      lights: true,
    });
  } catch (err) {
    console.warn(`[canais] Falha ao criar ${DEFAULT_PUSH_CHANNEL_ID}`, err);
  }

  for (const perfil of Object.keys(CANAIS_POR_PERFIL) as PerfilUsuario[]) {
    const cfg = CANAIS_POR_PERFIL[perfil];
    try {
      await PushNotifications.createChannel({
        id: cfg.id,
        name: `OAB · ${perfil.charAt(0).toUpperCase() + perfil.slice(1)}`,
        description: `Notificações personalizadas para ${perfil}.`,
        importance: 5, // HIGH
        visibility: 1,
        sound: cfg.sound,
        vibration: true,
        lights: true,
      });
    } catch (err) {
      console.warn(`[canais] Falha ao criar ${cfg.id}`, err);
    }
  }
}

/**
 * Nome do arquivo de som para incluir no payload APNs (iOS).
 * Ex.: `{ aps: { sound: soundParaIOS("estudante") } }`
 */
export function soundParaIOS(perfil: PerfilUsuario) {
  return `${CANAIS_POR_PERFIL[perfil].sound}.caf`;
}

/**
 * ID do canal a usar no payload FCM (Android).
 * Ex.: `{ android: { notification: { channel_id: canalParaAndroid("estudante") } } }`
 */
export function canalParaAndroid(perfil: PerfilUsuario) {
  return CANAIS_POR_PERFIL[perfil].id;
}
