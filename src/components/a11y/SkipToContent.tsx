/**
 * Skip-to-content link visible only on keyboard focus.
 * WCAG 2.4.1 (Bypass Blocks) — permite pular a navegação/header
 * e ir direto ao conteúdo principal com Tab.
 * Também é anunciado pelo TalkBack quando o app roda no WebView.
 */
export function SkipToContent({ targetId = "main-content" }: { targetId?: string }) {
  return (
    <a
      href={`#${targetId}`}
      className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[9999] focus:px-4 focus:py-2 focus:rounded-md focus:bg-primary focus:text-primary-foreground focus:shadow-lg focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-ring"
    >
      Pular para o conteúdo
    </a>
  );
}
