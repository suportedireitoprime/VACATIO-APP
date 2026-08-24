import { useEffect, useState } from "react";
import { Scale } from "lucide-react";
import { denyConsent, getConsent, grantConsent } from "@/lib/analytics";

/**
 * Banner de consentimento LGPD alinhado ao design system Vacatio.
 * Compacto, responsivo e desativado no app nativo.
 */
export function ConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const isNative =
      !!(window as any).Capacitor?.isNativePlatform?.() ||
      (window as any).__IS_NATIVE_APP__ === true;
    if (isNative) return;
    if (getConsent() === null) {
      const t = setTimeout(() => setVisible(true), 1200);
      return () => clearTimeout(t);
    }
  }, []);

  if (!visible) return null;

  const accept = () => { grantConsent(); setVisible(false); };
  const reject = () => { denyConsent(); setVisible(false); };

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Aviso de privacidade e cookies"
      className="fixed inset-x-0 bottom-0 z-[9999] px-2 pb-[max(0.5rem,var(--sai-bottom,env(safe-area-inset-bottom,0px)))] sm:px-3 sm:pb-4 sm:text-right pointer-events-none animate-in fade-in slide-in-from-bottom-3 duration-500"
    >
      <div
        className="pointer-events-auto mx-auto sm:ml-auto sm:mr-0 w-full max-w-[min(100%,20rem)] overflow-hidden rounded-xl border border-primary/20 shadow-[0_12px_40px_-12px_rgba(0,0,0,0.7)]"
        style={{
          background:
            "linear-gradient(155deg, hsl(0 0% 8%) 0%, hsl(0 0% 5%) 60%, hsl(0 0% 3%) 100%)",
        }}
      >
        {/* Faixa dourada superior */}
        <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-primary to-transparent" />

        <div className="p-3">
          <div className="flex items-start gap-2.5 text-left">
            <div
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-primary/35"
              style={{ background: "radial-gradient(circle at 30% 30%, hsl(51 100% 50% / 0.22), transparent 70%)" }}
              aria-hidden
            >
              <Scale className="h-3.5 w-3.5 text-primary" strokeWidth={2.2} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-serif font-semibold tracking-tight text-primary-foreground/95 leading-tight"
                 style={{ color: "hsl(45 15% 92%)" }}>
                Sua privacidade, nosso compromisso.
              </p>
              <p className="mt-1 text-[11px] leading-relaxed text-white/60">
                Dados anônimos (Google Analytics) para melhorar o Vacatio. Nada vinculado à sua identidade sem permissão.
              </p>
            </div>
          </div>

          <div className="mt-2.5 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={reject}
              className="px-2 py-1.5 text-[11px] font-medium rounded-md border border-white/15 text-white/70 hover:text-white hover:bg-white/5 active:scale-[0.97] transition-all"
            >
              Recusar
            </button>
            <button
              type="button"
              onClick={accept}
              className="relative overflow-hidden px-3 py-1.5 text-[11px] font-bold rounded-md text-black active:scale-[0.97] transition-all shadow-[0_6px_18px_-6px_hsl(51_100%_50%/0.6)] hover:shadow-[0_8px_22px_-5px_hsl(51_100%_50%/0.8)] group"
              style={{
                background:
                  "linear-gradient(135deg, hsl(51 100% 62%) 0%, hsl(51 100% 50%) 55%, hsl(45 95% 45%) 100%)",
              }}
            >
              <span className="relative z-10 flex items-center gap-1">
                <Scale className="h-3 w-3" strokeWidth={2.5} />
                Aceitar
              </span>
              {/* brilho passando */}
              <span
                aria-hidden
                className="absolute inset-y-0 -left-1/3 w-1/3 skew-x-[-20deg] bg-white/40 blur-sm opacity-0 group-hover:opacity-100 group-hover:translate-x-[400%] transition-all duration-700 ease-out"
              />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
