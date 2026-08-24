import { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/vademecum/PageHeader";
import { LucideIcon, WifiOff } from "lucide-react";

interface Props {
  title: string;
  count?: number;
  icon: LucideIcon;
  accentClass?: string; // ex.: "bg-primary/15 text-primary"
  children: ReactNode;
  isOffline?: boolean;
  emptyState?: ReactNode;
  loading?: boolean;
}

export default function PessoalListLayout({
  title,
  count,
  icon: Icon,
  accentClass = "bg-primary/15 text-primary",
  children,
  isOffline,
  emptyState,
  loading,
}: Props) {
  const navigate = useNavigate();
  return (
    <div className="min-h-dvh bg-background text-foreground pb-[calc(6rem+env(safe-area-inset-bottom,0px))]">
      <PageHeader
        title={title}
        subtitle={typeof count === "number" ? `${count} ${count === 1 ? "item" : "itens"}` : undefined}
        onBack={() => navigate(-1)}
        leading={
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${accentClass}`}>
            <Icon className="w-5 h-5" />
          </div>
        }
        rightAction={
          isOffline ? (
            <div className="h-9 px-3 rounded-full bg-amber-500/15 text-amber-500 text-[11px] font-semibold inline-flex items-center gap-1">
              <WifiOff className="w-3.5 h-3.5" /> Offline
            </div>
          ) : undefined
        }
      />
      <div className="max-w-2xl mx-auto px-4 pt-4">
        {loading && !children ? (
          <div className="space-y-3">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-20 rounded-2xl bg-secondary/40 animate-pulse" />
            ))}
          </div>
        ) : (
          children ?? emptyState
        )}
      </div>
    </div>
  );
}
