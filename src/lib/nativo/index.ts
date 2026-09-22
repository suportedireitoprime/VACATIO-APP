// Camada nativa do app: cada helper usa o plugin Capacitor no APK/IPA e
// mantém o comportamento web no preview/PWA.
export { baixarBlob, baixarUrl, baixarDataUrl, blobParaBase64 } from './baixarArquivo';
export { compartilhar } from './compartilhar';
export { copiar, copiarTexto } from './copiar';
export { confirmar, avisar } from './dialogos';
export { abrirLink } from './abrirLink';
export { useOnline, estaOnline, conectado, iniciarMonitorRede } from './rede';
export { escolherFoto, temSeletorNativo, type FotoEscolhida } from './foto';
export { garantirPermissoesMidia, type PermissaoMidia } from './permissoesMidia';
export { manterTelaAcesa, liberarTela, telaAcesa } from './telaAcordada';
export { menuAcoes, type AcaoNativa, type MenuAcoesOpts } from './menuAcoes';
export { haptic } from '@/lib/nativeHaptics';
