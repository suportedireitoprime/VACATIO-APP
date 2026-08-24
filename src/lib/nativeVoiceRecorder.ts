import { Capacitor } from '@capacitor/core';

/**
 * Wrapper de gravação de áudio nativa (capacitor-voice-recorder).
 * Retorna um base64 (mime audio/aac no Android, audio/m4a no iOS).
 *
 * Uso típico:
 *   await voiceRecorder.requestPermission();
 *   await voiceRecorder.start();
 *   const { base64, mimeType, duration } = await voiceRecorder.stop();
 */
async function loadModule() {
  const mod: any = await import('capacitor-voice-recorder');
  return mod.VoiceRecorder as any;
}

export const voiceRecorder = {
  isAvailable: () => Capacitor.isNativePlatform(),

  async hasPermission(): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) return false;
    try {
      const VR = await loadModule();
      const res = await VR.hasAudioRecordingPermission();
      return !!res?.value;
    } catch { return false; }
  },

  async requestPermission(): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) return false;
    try {
      const VR = await loadModule();
      const res = await VR.requestAudioRecordingPermission();
      return !!res?.value;
    } catch { return false; }
  },

  async start(): Promise<{ ok: boolean; reason?: string }> {
    if (!Capacitor.isNativePlatform()) return { ok: false, reason: 'not_native' };
    try {
      const granted = (await this.hasPermission()) || (await this.requestPermission());
      if (!granted) return { ok: false, reason: 'permission_denied' };
      const VR = await loadModule();
      await VR.startRecording();
      return { ok: true };
    } catch (e: any) {
      return { ok: false, reason: e?.message ?? 'unknown' };
    }
  },

  async stop(): Promise<{ ok: boolean; base64?: string; mimeType?: string; duration?: number; reason?: string }> {
    if (!Capacitor.isNativePlatform()) return { ok: false, reason: 'not_native' };
    try {
      const VR = await loadModule();
      const res = await VR.stopRecording();
      const v = res?.value ?? res;
      return {
        ok: true,
        base64: v?.recordDataBase64,
        mimeType: v?.mimeType,
        duration: v?.msDuration,
      };
    } catch (e: any) {
      return { ok: false, reason: e?.message ?? 'unknown' };
    }
  },

  async pause() {
    if (!Capacitor.isNativePlatform()) return;
    try { const VR = await loadModule(); await VR.pauseRecording(); } catch {}
  },

  async resume() {
    if (!Capacitor.isNativePlatform()) return;
    try { const VR = await loadModule(); await VR.resumeRecording(); } catch {}
  },
};
