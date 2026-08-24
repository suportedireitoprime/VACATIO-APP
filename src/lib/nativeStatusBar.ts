// Native StatusBar theming — NO-OP.
//
// O plugin @capacitor/status-bar foi REMOVIDO porque, em seu <init>, invoca
// Window.setStatusBarColor / setNavigationBarColor — APIs descontinuadas no
// Android 15 (SDK 35) que o Play Console reporta como bloqueio de release.
// A MainActivity nativa liga edge-to-edge com androidx.activity.EdgeToEdge.enable()
// e propaga insets como CSS variables (--sai-top/right/bottom/left).
// O estilo da status bar é herdado do tema Material (texto claro sobre o
// fundo escuro do app).

type StatusBarStyle = 'wine' | 'ivory' | 'premium';

/** No-op mantido pra compatibilidade com chamadas existentes. */
export async function setNativeStatusBar(_style: StatusBarStyle = 'wine') {
  return;
}
