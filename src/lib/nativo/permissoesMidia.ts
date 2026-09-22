import { Capacitor } from '@capacitor/core';

export type PermissaoMidia = {
  camera: boolean;
  microfone: boolean;
  /** Motivo legível quando algo faltou (para exibir na UI). */
  motivo?: string;
};

/**
 * Garante as permissões nativas de câmera e microfone ANTES de chamar
 * `navigator.mediaDevices.getUserMedia()` dentro da WebView.
 *
 * Android: a WebView só recebe o stream se o app já tiver CAMERA/RECORD_AUDIO
 * concedidos em runtime — pedimos via @capacitor/camera (câmera) e
 * @capacitor-community/speech-recognition (microfone, que mapeia RECORD_AUDIO).
 * iOS: WKWebView usa NSCameraUsageDescription/NSMicrophoneUsageDescription e
 * exibe o alerta do sistema no primeiro uso, então basta seguir adiante.
 */
export async function garantirPermissoesMidia(
  precisaCamera = true,
  precisaMicrofone = true,
): Promise<PermissaoMidia> {
  if (!Capacitor.isNativePlatform()) {
    // Navegador: o próprio getUserMedia dispara o prompt.
    return { camera: precisaCamera, microfone: precisaMicrofone };
  }

  const resultado: PermissaoMidia = { camera: !precisaCamera, microfone: !precisaMicrofone };

  if (precisaCamera) {
    try {
      const { Camera } = await import('@capacitor/camera');
      let estado = await Camera.checkPermissions();
      if (estado.camera !== 'granted') estado = await Camera.requestPermissions({ permissions: ['camera'] });
      resultado.camera = estado.camera === 'granted';
    } catch (e) {
      console.warn('[permissoesMidia] câmera:', e);
      // Plugin indisponível: deixamos o getUserMedia tentar.
      resultado.camera = true;
    }
  }

  if (precisaMicrofone) {
    try {
      const { SpeechRecognition } = await import('@capacitor-community/speech-recognition');
      const estado = await SpeechRecognition.checkPermissions();
      if (estado.speechRecognition === 'granted') {
        resultado.microfone = true;
      } else {
        const pedido = await SpeechRecognition.requestPermissions();
        resultado.microfone = pedido.speechRecognition === 'granted';
      }
    } catch (e) {
      console.warn('[permissoesMidia] microfone:', e);
      resultado.microfone = true;
    }
  }

  if (!resultado.camera && !resultado.microfone) {
    resultado.motivo =
      'Precisamos da câmera e do microfone. Abra Ajustes › Estudos Jurídicos e libere as duas permissões.';
  } else if (!resultado.camera) {
    resultado.motivo =
      'A câmera está bloqueada. Abra Ajustes › Estudos Jurídicos › Câmera e permita o acesso.';
  } else if (!resultado.microfone) {
    resultado.motivo =
      'O microfone está bloqueado. Abra Ajustes › Estudos Jurídicos › Microfone e permita o acesso.';
  }

  return resultado;
}
