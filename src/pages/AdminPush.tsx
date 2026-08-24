import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/vademecum/PageHeader";

import { Send, Calendar, BarChart3, Stethoscope, History, LucideIcon } from "lucide-react";

type HubCard = {
  id: string;
  path: string;
  title: string;
  desc: string;
  icon: LucideIcon;
};

const CARDS: HubCard[] = [
  {
    id: "enviar",
    path: "/admin-push/enviar",
    title: "Enviar Push Manual",
    desc: "Compor e disparar uma notificação agora",
    icon: Send,
  },
  {
    id: "programadas",
    path: "/admin-push/programadas",
    title: "Notificações Programadas",
    desc: "Automações padrão (blog, boletim jurídico, radar) e agendadas",
    icon: Calendar,
  },
  {
    id: "dashboard",
    path: "/admin-push/dashboard",
    title: "Dashboard Detalhado",
    desc: "Envios do dia, aberturas por usuário, plataforma e conversão",
    icon: BarChart3,
  },
  {
    id: "historico",
    path: "/admin-push/historico",
    title: "Histórico Completo",
    desc: "Todas as campanhas já enviadas, canceladas ou falhas",
    icon: History,
  },
  {
    id: "diagnostico",
    path: "/admin-push/diagnostico",
    title: "Diagnóstico",
    desc: "Testar tokens, canais e permissões do dispositivo",
    icon: Stethoscope,
  },
];

export default function AdminPush() {
  const navigate = useNavigate();

  return (
    <div className="min-h-dvh bg-background pb-8">
      <PageHeader
        title="Admin Push"
        subtitle="Central de notificações push"
        onBack={() => navigate("/admin-funcoes")}
      />
      <div className="max-w-3xl mx-auto p-4">
        <p className="font-body text-[12px] text-muted-foreground mb-3 px-1">
          Toque em um card para abrir a seção.
        </p>
        <div className="grid grid-cols-2 gap-3">
          {CARDS.map((c) => {
            const Icon = c.icon;
            return (
              <button
                key={c.id}
                onPointerDown={() => navigate(c.path)}
                onClick={() => navigate(c.path)}
                className="text-left rounded-2xl border border-border/60 bg-secondary/30 p-4 min-h-[140px] flex flex-col gap-3 hover:bg-secondary/60 active:bg-secondary transition-colors"
              >
                <div className="w-12 h-12 rounded-2xl bg-background flex items-center justify-center text-primary shrink-0">
                  <Icon className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-body text-sm font-semibold text-foreground leading-tight">
                    {c.title}
                  </div>
                  <div className="font-body text-[11.5px] text-muted-foreground mt-1 line-clamp-2">
                    {c.desc}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

