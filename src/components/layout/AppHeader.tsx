import { ReactNode, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { springSnap, tapPress } from "@/lib/motion";

interface AppHeaderProps {
  title?: ReactNode;
  /** Optional left action; defaults to a back button (navigate(-1)). */
  left?: ReactNode;
  /** Optional right action(s). */
  right?: ReactNode;
  /** Hide the default back button (when `left` is not provided). */
  hideBack?: boolean;
  /** Called instead of navigate(-1) when the default back button is tapped. */
  onBack?: () => void;
  /** Label next to the back chevron ("Voltar" by default; pass "" to hide). */
  backLabel?: string;
  /** Add a subtle top-only large title (iOS-style). Rendered by the page below the bar. */
  className?: string;
  /** Element that owns the scroll — defaults to window. */
  scrollTargetRef?: React.RefObject<HTMLElement>;
  /** Show a translucent blurred background (default true). */
  translucent?: boolean;
}

/**
 * iOS-style navigation bar. 44px content height + top safe-area.
 * Border-bottom fades in only after the user scrolls.
 */
export function AppHeader({
  title,
  left,
  right,
  hideBack = false,
  onBack,
  backLabel = "Voltar",
  className,
  scrollTargetRef,
  translucent = true,
}: AppHeaderProps) {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const el: any = scrollTargetRef?.current ?? window;
    const getY = () =>
      scrollTargetRef?.current ? scrollTargetRef.current.scrollTop : window.scrollY;
    const handler = () => setScrolled(getY() > 4);
    handler();
    el.addEventListener("scroll", handler, { passive: true });
    return () => el.removeEventListener("scroll", handler);
  }, [scrollTargetRef]);

  const handleBack = () => {
    if (onBack) onBack();
    else navigate(-1);
  };

  return (
    <header
      className={cn(
        "sticky top-0 z-40 w-full",
        translucent
          ? "bg-background/75 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60"
          : "bg-background",
        "transition-[border-color,box-shadow] duration-200",
        scrolled
          ? "border-b border-border/60"
          : "border-b border-transparent",
        className,
      )}
      style={{ paddingTop: "var(--sai-top,env(safe-area-inset-top,0px))" }}
    >
      <div className="relative h-11 flex items-center px-2">
        {/* Left slot */}
        <div className="flex items-center min-w-[44px] h-11">
          {left ?? (!hideBack && (
            <motion.button
              type="button"
              onClick={handleBack}
              whileTap={tapPress}
              transition={springSnap}
              aria-label="Voltar"
              className="h-11 min-w-[44px] px-1.5 -ml-1 flex items-center gap-0.5 text-primary active:opacity-60"
            >
              <ChevronLeft className="w-[26px] h-[26px] -mr-1" strokeWidth={2.25} />
              {backLabel ? (
                <span className="text-[17px] leading-none font-normal">
                  {backLabel}
                </span>
              ) : null}
            </motion.button>
          ))}
        </div>

        {/* Centered title */}
        <div className="absolute left-0 right-0 flex justify-center pointer-events-none px-16">
          {typeof title === "string" ? (
            <h1 className="text-[17px] font-semibold text-foreground truncate max-w-full">
              {title}
            </h1>
          ) : (
            title
          )}
        </div>

        {/* Right slot */}
        <div className="ml-auto flex items-center min-h-11 gap-1">
          {right}
        </div>
      </div>
    </header>
  );
}

export default AppHeader;
