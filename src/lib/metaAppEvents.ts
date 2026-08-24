// Fase 4 — Meta App Events nativo.
// No app nativo não existe o Pixel (fbq), então os eventos vão direto para a
// Conversions API com `action_source: "app"`. O SDK nativo do Facebook cuida
// de instalação/sessões; aqui enviamos os eventos de produto.
import { Capacitor } from '@capacitor/core';
import { supabase } from '@/integrations/supabase/client';
import { newEventId } from './fbPixel';

const APP_ID = '1590734976033061';

let cachedUser: { id?: string; email?: string } | null = null;

export function setMetaAppUser(user: { id?: string; email?: string } | null) {
  cachedUser = user;
}

/** Envia um evento do app nativo para o Meta (Conversions API). */
export async function metaAppEvent(
  event: string,
  params: Record<string, unknown> = {},
): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await supabase.functions.invoke('meta-capi', {
      body: {
        event_name: event,
        event_id: newEventId(),
        action_source: 'app',
        app_data: {
          application_tracking_enabled: true,
          advertiser_tracking_enabled: true,
          extinfo: [
            Capacitor.getPlatform() === 'ios' ? 'i2' : 'a2',
            APP_ID,
          ],
        },
        custom_data: params,
        user: cachedUser ?? {},
      },
    });
  } catch {
    /* telemetria não pode quebrar UX */
  }
}
