import { useNavigate } from "react-router-dom";
import { ChevronRight, Activity, Users, Cpu } from "lucide-react";
import { PageHeader } from "@/components/vademecum/PageHeader";

type Item = { id: string; label: string; desc: string; icon: any; route: string };

const ITEMS: Item[] = [
  { id: "admin-monitor",           label: "Monitoramento",   desc: "Status e saúde do sistema",          icon: Activity, route: "/admin-monitor" },
  { id: "admin-monitor-usuarios",  label: "Usuários Online", desc: "Monitoramento em tempo real",        icon: Users,    route: "/admin-monitor-usuarios" },
  { id: "admin-monitor-apis",      label: "APIs",            desc: "Funções que usam IA: custo, manual vs automático", icon: Cpu, route: "/admin-monitor-apis" },
];

export default function AdminMonitoramento() {
  const navigate = useNavigate();
  return (
    <div className="min-h-dvh bg-background pb-8">
      <PageHeader title="Monitoramento" onBack={() => navigate("/admin-funcoes")} />
      <div className="p-4">
        <p className="font-body text-[12px] text-muted-foreground mb-3 px-1">
          Saúde do sistema, usuários e uso das APIs de IA.
        </p>
        <div className="rounded-2xl border border-border/60 bg-secondary/30 divide-y divide-border/50 overflow-hidden">
          {ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => navigate(item.route)}
                className="w-full flex items-center gap-4 px-4 py-5 min-h-[84px] text-left hover:bg-secondary/60 active:bg-secondary transition-colors"
              >
                <div className="w-14 h-14 rounded-2xl bg-background flex items-center justify-center text-primary shrink-0">
                  <Icon className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-body text-base font-semibold text-foreground truncate">{item.label}</div>
                  <div className="font-body text-[12px] text-muted-foreground truncate mt-0.5">{item.desc}</div>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
