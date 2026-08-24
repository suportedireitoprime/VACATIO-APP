import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, BellRing, Trash2, Loader2, Bell, BellOff } from "lucide-react";
import { PageHeader } from "@/components/vademecum/PageHeader";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Aviso = {
  id: string;
  titulo: string;
  mensagem: string | null;
  avisar_em: string;
  recorrencia: string;
  ativo: boolean;
};

const RECS = [
  { id: "unica",   label: "Única" },
  { id: "diaria",  label: "Diária" },
  { id: "semanal", label: "Semanal" },
  { id: "mensal",  label: "Mensal" },
];

const AvisosPage = () => {
  const navigate = useNavigate();
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [novo, setNovo] = useState({ titulo: "", mensagem: "", data: "", hora: "", recorrencia: "unica" });

  const load = async () => {
    const { data } = await supabase.from("avisos").select("*").order("avisar_em", { ascending: true });
    setAvisos((data || []) as any);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const criar = async () => {
    if (!novo.titulo.trim() || !novo.data) { toast.error("Preencha título e data"); return; }
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) { toast.error("Faça login"); return; }
    const iso = new Date(`${novo.data}T${novo.hora || "09:00"}:00`).toISOString();
    const { error } = await supabase.from("avisos").insert({
      user_id: userData.user.id,
      titulo: novo.titulo,
      mensagem: novo.mensagem || null,
      avisar_em: iso,
      recorrencia: novo.recorrencia,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Aviso criado");
    setModalOpen(false);
    setNovo({ titulo: "", mensagem: "", data: "", hora: "", recorrencia: "unica" });
    load();
  };

  const toggle = async (a: Aviso) => {
    await supabase.from("avisos").update({ ativo: !a.ativo }).eq("id", a.id);
    setAvisos((prev) => prev.map((x) => x.id === a.id ? { ...x, ativo: !x.ativo } : x));
  };

  const excluir = async (id: string) => {
    if (!confirm("Excluir este aviso?")) return;
    await supabase.from("avisos").delete().eq("id", id);
    setAvisos((prev) => prev.filter((x) => x.id !== id));
  };

  return (
    <div className="min-h-dvh bg-background text-foreground pb-24">
      <PageHeader
        title="Meus avisos"
        onBack={() => navigate(-1)}
        leading={
          <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center">
            <BellRing className="w-5 h-5 text-primary" />
          </div>
        }
      />


      <div className="max-w-2xl mx-auto px-4 py-4">
        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
        ) : avisos.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <BellRing className="w-12 h-12 mx-auto text-muted-foreground/40" />
            <p className="text-muted-foreground">Nenhum aviso agendado.</p>
            <p className="text-xs text-muted-foreground">Crie lembretes para provas, tarefas e prazos.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {avisos.map((a) => {
              const d = new Date(a.avisar_em);
              return (
                <motion.div key={a.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="p-3 rounded-xl bg-card border border-border flex items-start gap-3">
                  <button onClick={() => toggle(a)} className="pt-1">
                    {a.ativo ? <Bell className="w-5 h-5 text-primary" /> : <BellOff className="w-5 h-5 text-muted-foreground" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold ${!a.ativo ? "line-through text-muted-foreground" : ""}`}>{a.titulo}</p>
                    {a.mensagem && <p className="text-xs text-muted-foreground mt-0.5">{a.mensagem}</p>}
                    <div className="flex items-center gap-2 mt-1.5 text-[11px] text-muted-foreground">
                      <span>{d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })} · {d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>
                      <span className="px-1.5 py-0.5 rounded bg-secondary uppercase font-semibold">{a.recorrencia}</span>
                    </div>
                  </div>
                  <button onClick={() => excluir(a.id)} className="w-8 h-8 rounded-full hover:bg-destructive/20 hover:text-destructive flex items-center justify-center text-muted-foreground shrink-0">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      <button onClick={() => setModalOpen(true)} aria-label="Novo aviso" className="fixed right-5 bottom-24 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-2xl shadow-primary/40 flex items-center justify-center z-40">
        <Plus className="w-6 h-6" />
      </button>

      {modalOpen && (
        <div className="fixed inset-0 z-[90] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center" onClick={() => setModalOpen(false)}>
          <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} onClick={(e) => e.stopPropagation()} className="w-full sm:max-w-md bg-card rounded-t-3xl sm:rounded-2xl border border-border p-5 space-y-3 pb-[calc(1.25rem+var(--sai-bottom,env(safe-area-inset-bottom,0px)))]">
            <h2 className="font-display text-lg font-bold">Novo aviso</h2>
            <input value={novo.titulo} onChange={(e) => setNovo({ ...novo, titulo: e.target.value })} placeholder="Título" className="w-full h-11 rounded-lg bg-secondary border border-border px-3 text-sm" />
            <textarea value={novo.mensagem} onChange={(e) => setNovo({ ...novo, mensagem: e.target.value })} placeholder="Mensagem (opcional)" className="w-full rounded-lg bg-secondary border border-border px-3 py-2 text-sm min-h-[70px]" />
            <div className="grid grid-cols-2 gap-2">
              <input type="date" value={novo.data} onChange={(e) => setNovo({ ...novo, data: e.target.value })} className="h-11 rounded-lg bg-secondary border border-border px-3 text-sm" />
              <input type="time" value={novo.hora} onChange={(e) => setNovo({ ...novo, hora: e.target.value })} className="h-11 rounded-lg bg-secondary border border-border px-3 text-sm" />
            </div>
            <div className="flex flex-wrap gap-2">
              {RECS.map((r) => (
                <button key={r.id} onClick={() => setNovo({ ...novo, recorrencia: r.id })} className={`px-3 py-1.5 rounded-full text-xs font-semibold ${novo.recorrencia === r.id ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>{r.label}</button>
              ))}
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={() => setModalOpen(false)} className="flex-1 h-11 rounded-lg bg-secondary text-foreground font-semibold text-sm">Cancelar</button>
              <button onClick={criar} className="flex-1 h-11 rounded-lg bg-primary text-primary-foreground font-semibold text-sm">Criar</button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default AvisosPage;
