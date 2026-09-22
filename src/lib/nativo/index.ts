// Camada nativa do app: cada helper usa o plugin Capacitor no APK/IPA e
// mantém o comportamento web no preview/PWA.
export { baixarBlob, baixarUrl, baixarDataUrl, blobParaBase64 } from './baixarArquivo';
export { compartilhar } from './compartilhar';
export { copiar, copiarTexto } from './copiar';
export { confirmar, avisar } from './dialogos';
export { abrirLink } from './abrirLink';
export { useOnline, estaOnline, conectado, iniciarMonitorRede } from './rede';
export { haptic } from '@/lib/nativeHaptics';
export { escolherFoto, temSeletorNativo, type FotoEscolhida } from './foto';
export { garantirPermissoesMidia, type PermissaoMidia } from './permissoesMidia';


// Tela acesa durante estudo/áudio
export { manterTelaAcesa, liberarTela, telaAcesa } from './telaAcordada';
// Menu de ações nativo
export { menuAcoes, type AcaoNativa, type MenuAcoesOpts } from './menuAcoes';
// Badge no ícone
export { definirBadge, limparBadge, aumentarBadge } from './badge';
// Atalhos do ícone (long-press / Quick Actions)
export { registrarAtalhos, limparAtalhos, ATALHOS, type AtalhoApp } from './atalhos';
// Proteção de tela (anti-screenshot)
export { protegerTela, desprotegerTela, useProtecaoTela } from './protecaoTela';
// OCR nativo (ML Kit)
export { escanearTexto, lerTextoDaImagem, temOcrNativo, type LeituraOcr } from './ocr';
// Áudio offline
export {
  baixarAudioOffline,
  removerAudioOffline,
  limparAudiosOffline,
  listarAudiosOffline,
  estaBaixado,
  uriLocal,
  fonteDeAudio,
  tamanhoTotalOffline,
  formatarBytes,
  suportaAudioOffline,
  assinarAudioOffline,
  type AudioOffline,
} from './audioOffline';
// Sincronização em background
export { iniciarSyncBackground, sincronizarAgora } from './backgroundSync';
// Picture-in-Picture
export { autoPip, entrarEmPip, pipSuportado } from './pip';
// Ações e badge nas notificações
export {
  registrarAcoesNotificacao,
  TIPO_LEMBRETE,
  TIPO_FLASHCARD,
  TIPO_AUDIO,
} from './notificacaoAcoes';
// Widget de tela inicial
export { atualizarWidget, lerConteudoWidget, type ConteudoWidget } from './widget';
export { atualizarWidgetDoDia } from './widgetFeed';
