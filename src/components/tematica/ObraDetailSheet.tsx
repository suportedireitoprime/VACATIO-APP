import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown,
  Star,
  ExternalLink,
  Play,
  Clock,
  Calendar,
  Heart,
  Bookmark,
  MessageCircle,
  ThumbsUp,
  Share2,
  Send,
  Trash2,
  Sparkles,
  Loader2,
  Film,
} from "lucide-react";
import { useEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import ReactMarkdown from "react-markdown";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export interface Obra {
  id: string;
  tmdb_id: number;
  tipo: "movie" | "tv";
  titulo: string;
  titulo_original: string | null;
  sinopse: string | null;
  ano: number | null;
  nota: number | null;
  duracao_min: number | null;
  poster_url: string | null;
  backdrop_url: string | null;
  trailer_youtube_id: string | null;
  generos: string[] | null;
  categorias_juridicas: string[] | null;
  elenco: Array<{ nome: string; personagem: string; foto: string | null }> | null;
  providers: {
    link?: string | null;
    flatrate?: Array<{ id: number; nome: string; logo: string | null }>;
    rent?: Array<{ id: number; nome: string; logo: string | null }>;
    buy?: Array<{ id: number; nome: string; logo: string | null }>;
    free?: Array<{ id: number; nome: string; logo: string | null }>;
    ads?: Array<{ id: number; nome: string; logo: string | null }>;
  } | null;
  homepage: string | null;
  porque_assistir?: string | null;
}

interface Comentario {
  id: string;
  user_id: string;
  texto: string;
  elogio: boolean;
  created_at: string;
  autor_nome?: string | null;
  autor_avatar?: string | null;
}

interface Props {
  obra: Obra | null;
  open: boolean;
  onClose: () => void;
}

import { registrarEventoTematica } from "@/lib/tematicaMetricas";
import { useEscapeKey } from '@/hooks/useEscapeKey';

async function abrirLink(url: string, obraId?: string) {
  if (obraId) registrarEventoTematica(obraId, "click_provider");
  try {
    const cap = (window as any).Capacitor;
    if (cap?.isNativePlatform?.()) {
      const { Browser } = await import("@capacitor/browser");
      await Browser.open({ url });
      return;
    }
  } catch {}
  window.open(url, "_blank", "noopener,noreferrer");
}

export default function ObraDetailSheet({ obra, open, onClose }: Props) {
  useEscapeKey(open, onClose);
  const [userId, setUserId] = useState<string | null>(null);
  const [favorito, setFavorito] = useState(false);
  const [naLista, setNaLista] = useState(false);
  const [showComentarios, setShowComentarios] = useState(false);
  const [comentarios, setComentarios] = useState<Comentario[]>([]);
  const [novoTexto, setNovoTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [totalComentarios, setTotalComentarios] = useState(0);
  const [totalElogios, setTotalElogios] = useState(0);
  const [tab, setTab] = useState<"sinopse" | "streaming">("sinopse");
  const [porque, setPorque] = useState<string | null>(null);
  const [porqueLoading, setPorqueLoading] = useState(false);
  const [porqueErro, setPorqueErro] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      if (obra?.id) registrarEventoTematica(obra.id, "view");
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [open, obra?.id]);

  // Carrega estado (favorito, watchlist, contagens) ao abrir
  useEffect(() => {
    if (!open || !obra) return;

    (async () => {
      if (userId) {
        const [fav, wl] = await Promise.all([
          supabase.from("tematica_favoritos").select("obra_id").eq("user_id", userId).eq("obra_id", obra.id).maybeSingle(),
          supabase.from("tematica_watchlist").select("obra_id").eq("user_id", userId).eq("obra_id", obra.id).maybeSingle(),
        ]);
        setFavorito(!!fav.data);
        setNaLista(!!wl.data);
      }
      const { data: coms } = await supabase
        .from("tematica_comentarios")
        .select("id,elogio")
        .eq("obra_id", obra.id);
      setTotalComentarios(coms?.filter((c: any) => !c.elogio).length ?? 0);
      setTotalElogios(coms?.filter((c: any) => c.elogio).length ?? 0);
    })();
  }, [open, obra, userId]);

  // Reset da aba e "por que assistir" ao trocar de obra
  useEffect(() => {
    setTab("sinopse");
    setPorque(obra?.porque_assistir ?? null);
    setPorqueErro(null);
  }, [obra?.id]);

  const gerarPorqueAssistir = useCallback(
    async (force = false) => {
      if (!obra) return;
      if (porqueLoading) return;
      if (porque && !force) return;
      setPorqueLoading(true);
      setPorqueErro(null);
      try {
        const { data, error } = await supabase.functions.invoke("tematica-porque-assistir", {
          body: { obra_id: obra.id, force },
        });
        if (error) throw error;
        if (data?.porque_assistir) setPorque(data.porque_assistir);
        else setPorqueErro("Não foi possível gerar agora.");
      } catch (e: any) {
        setPorqueErro(e?.message ?? "Erro ao gerar explicação.");
      } finally {
        setPorqueLoading(false);
      }
    },
    [obra, porque, porqueLoading],
  );

  // Auto-carrega ao abrir a aba sinopse
  useEffect(() => {
    if (open && obra && tab === "sinopse" && !porque && !porqueLoading && !porqueErro) {
      gerarPorqueAssistir(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, obra?.id, tab]);

  const requireAuth = useCallback(() => {
    if (!userId) {
      toast.error("Faça login para usar esta função");
      return false;
    }
    return true;
  }, [userId]);

  const toggleFavorito = async () => {
    if (!obra || !requireAuth()) return;
    if (favorito) {
      await supabase.from("tematica_favoritos").delete().eq("user_id", userId!).eq("obra_id", obra.id);
      setFavorito(false);
      toast("Removido dos favoritos");
    } else {
      await supabase.from("tematica_favoritos").insert({ user_id: userId!, obra_id: obra.id });
      setFavorito(true);
      toast.success("Adicionado aos favoritos");
    }
  };

  const toggleWatchlist = async () => {
    if (!obra || !requireAuth()) return;
    if (naLista) {
      await supabase.from("tematica_watchlist").delete().eq("user_id", userId!).eq("obra_id", obra.id);
      setNaLista(false);
      toast("Removido da lista");
    } else {
      await supabase.from("tematica_watchlist").insert({ user_id: userId!, obra_id: obra.id });
      setNaLista(true);
      toast.success("Salvo para assistir depois");
    }
  };

  const elogiar = async () => {
    if (!obra || !requireAuth()) return;
    await supabase.from("tematica_comentarios").insert({
      user_id: userId!,
      obra_id: obra.id,
      texto: "👏 Recomenda!",
      elogio: true,
    });
    setTotalElogios((t) => t + 1);
    toast.success("Elogio registrado");
  };

  const compartilhar = async () => {
    if (!obra) return;
    const url = obra.homepage || `https://www.themoviedb.org/${obra.tipo}/${obra.tmdb_id}`;
    const texto = `${obra.titulo}${obra.ano ? ` (${obra.ano})` : ""} — recomendação da Temática Jurídica`;
    try {
      if (navigator.share) {
        await navigator.share({ title: obra.titulo, text: texto, url });
        return;
      }
    } catch {}
    try {
      await navigator.clipboard.writeText(`${texto}\n${url}`);
      toast.success("Link copiado");
    } catch {
      toast.error("Não foi possível compartilhar");
    }
  };

  const carregarComentarios = async () => {
    if (!obra) return;
    const { data } = await supabase
      .from("tematica_comentarios")
      .select("id,user_id,texto,elogio,created_at")
      .eq("obra_id", obra.id)
      .eq("elogio", false)
      .order("created_at", { ascending: false })
      .limit(100);
    const list = (data ?? []) as Comentario[];
    // Busca nomes
    const ids = Array.from(new Set(list.map((c) => c.user_id)));
    if (ids.length) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id,display_name,avatar_url")
        .in("id", ids);
      const map = new Map((profs ?? []).map((p: any) => [p.id, p]));
      list.forEach((c) => {
        const p = map.get(c.user_id);
        c.autor_nome = p?.display_name ?? "Usuário";
        c.autor_avatar = p?.avatar_url ?? null;
      });
    }
    setComentarios(list);
  };

  const abrirComentarios = async () => {
    setShowComentarios(true);
    await carregarComentarios();
  };

  const enviarComentario = async () => {
    if (!obra || !requireAuth() || !novoTexto.trim()) return;
    setEnviando(true);
    const { error } = await supabase.from("tematica_comentarios").insert({
      user_id: userId!,
      obra_id: obra.id,
      texto: novoTexto.trim(),
      elogio: false,
    });
    setEnviando(false);
    if (error) {
      toast.error("Erro ao enviar");
      return;
    }
    setNovoTexto("");
    setTotalComentarios((t) => t + 1);
    await carregarComentarios();
  };

  const apagarComentario = async (id: string) => {
    await supabase.from("tematica_comentarios").delete().eq("id", id);
    setComentarios((prev) => prev.filter((c) => c.id !== id));
    setTotalComentarios((t) => Math.max(0, t - 1));
  };

  const flatrate = obra?.providers?.flatrate ?? [];
  const rent = obra?.providers?.rent ?? [];
  const buy = obra?.providers?.buy ?? [];
  const free = obra?.providers?.free ?? [];
  const providerLink = obra?.providers?.link ?? null;

  if (typeof document === "undefined") return null;

  const sheet = (
    <AnimatePresence>
      {open && obra && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-md"
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 260, damping: 30 }}
            className="fixed inset-x-0 bottom-0 z-[201] h-[92vh] bg-background rounded-t-3xl overflow-hidden flex flex-col shadow-2xl mx-auto max-w-3xl"
          >
            {/* Backdrop hero */}
            <div className="relative w-full h-56 sm:h-72 shrink-0">
              {obra.backdrop_url ? (
                <img src={obra.backdrop_url} alt="" className="w-full h-full object-cover" />
              ) : obra.poster_url ? (
                <img src={obra.poster_url} alt="" className="w-full h-full object-cover object-top" />
              ) : (
                <div
                  className="w-full h-full flex items-center justify-center"
                  style={{ background: "linear-gradient(135deg, hsl(0 55% 22%), hsl(355 65% 14%))" }}
                >
                  <Film className="w-16 h-16 text-red-200/50" strokeWidth={1.5} />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-background" />
              <button
                onClick={onClose}
                aria-label="Fechar"
                className="absolute top-3 left-3 w-10 h-10 rounded-full bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center text-white hover:bg-white/30 transition"
              >
                <ChevronDown className="w-5 h-5" strokeWidth={2.2} />
              </button>
              <div className="absolute top-3 right-3 px-2.5 py-1 rounded-md bg-white/20 backdrop-blur-md border border-white/30 text-white text-[11px] font-semibold uppercase tracking-wide">
                {obra.tipo === "movie" ? "Filme" : "Série"}
              </div>
            </div>

            {/* Conteúdo rolável */}
            <div className="flex-1 overflow-y-auto -mt-16 relative">
              <div className="px-5 pb-10">
                <div className="flex gap-4 items-end">
                  {obra.poster_url && (
                    <img
                      src={obra.poster_url}
                      alt={obra.titulo}
                      className="w-24 sm:w-28 aspect-[2/3] rounded-xl object-cover shadow-xl border border-border/50 shrink-0"
                    />
                  )}
                  <div className="flex-1 pb-1 min-w-0">
                    <h2 className="font-display text-xl sm:text-2xl font-bold text-foreground leading-tight">
                      {obra.titulo}
                    </h2>
                    {obra.titulo_original && obra.titulo_original !== obra.titulo && (
                      <p className="text-xs text-muted-foreground italic mt-0.5">{obra.titulo_original}</p>
                    )}
                    <div className="flex flex-wrap items-center gap-2 mt-2 text-[13px] text-muted-foreground">
                      {obra.nota ? (
                        <span className="flex items-center gap-1 text-amber-500 font-semibold">
                          <Star className="w-4 h-4 fill-amber-500" strokeWidth={0} />
                          {obra.nota.toFixed(1)}
                        </span>
                      ) : null}
                      {obra.ano ? (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" strokeWidth={1.8} />
                          {obra.ano}
                        </span>
                      ) : null}
                      {obra.duracao_min ? (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" strokeWidth={1.8} />
                          {obra.duracao_min} min
                        </span>
                      ) : null}
                      {totalElogios > 0 && (
                        <span className="flex items-center gap-1 text-primary font-semibold">
                          <ThumbsUp className="w-3.5 h-3.5 fill-primary" strokeWidth={0} />
                          {totalElogios}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {(obra.categorias_juridicas ?? []).length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {(obra.categorias_juridicas ?? []).map((cat) => (
                      <span
                        key={cat}
                        className="px-3 py-1.5 rounded-full bg-primary/10 text-primary text-[13px] font-medium"
                      >
                        {cat}
                      </span>
                    ))}
                  </div>
                )}

                {(obra.generos ?? []).length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {(obra.generos ?? []).map((g) => (
                      <span key={g} className="px-2.5 py-1 rounded-full bg-muted text-muted-foreground text-[12px]">
                        {g}
                      </span>
                    ))}
                  </div>
                )}

                {/* Ações rápidas — botões temáticos (grid 5 col, uma linha) */}
                <div className="mt-5 grid grid-cols-5 gap-1.5 sm:gap-2">
                  <ActionPill
                    icon={<Heart className={cn("w-4 h-4 shrink-0", favorito && "fill-current")} strokeWidth={favorito ? 0 : 2} />}
                    label="Favoritar"
                    active={favorito}
                    onClick={toggleFavorito}
                    tone="rose"
                  />
                  <ActionPill
                    icon={<Bookmark className={cn("w-4 h-4 shrink-0", naLista && "fill-current")} strokeWidth={naLista ? 0 : 2} />}
                    label="Salvar"
                    active={naLista}
                    onClick={toggleWatchlist}
                    tone="amber"
                  />
                  <ActionPill
                    icon={<MessageCircle className="w-4 h-4 shrink-0" strokeWidth={2} />}
                    label={totalComentarios > 0 ? `${totalComentarios}` : "Comentar"}
                    onClick={abrirComentarios}
                    tone="red"
                  />
                  <ActionPill
                    icon={<ThumbsUp className="w-4 h-4 shrink-0" strokeWidth={2} />}
                    label={totalElogios > 0 ? `${totalElogios}` : "Elogiar"}
                    onClick={elogiar}
                    tone="crimson"
                  />
                  <ActionPill
                    icon={<Share2 className="w-4 h-4 shrink-0" strokeWidth={2} />}
                    label="Enviar"
                    onClick={compartilhar}
                    tone="neutral"
                  />
                </div>


                {/* Abas: Sinopse vs Onde assistir */}
                <div className="mt-4 sticky top-0 z-[1] -mx-5 px-5 bg-background/95 backdrop-blur-md">
                  <div className="flex gap-1 p-1 rounded-2xl bg-muted/60 border border-border">
                    <TabButton active={tab === "sinopse"} onClick={() => setTab("sinopse")}>
                      Sinopse
                    </TabButton>
                    <TabButton active={tab === "streaming"} onClick={() => setTab("streaming")}>
                      Onde assistir
                    </TabButton>
                  </div>
                </div>


                {tab === "sinopse" ? (
                  <>
                    {obra.sinopse && (
                      <section className="mt-5">
                        <h3 className="font-display font-bold text-lg text-foreground mb-2">Sinopse</h3>
                        <p className="text-[15.5px] sm:text-base text-foreground/85 leading-[1.7] whitespace-pre-line">
                          {obra.sinopse}
                        </p>
                      </section>
                    )}

                    <section className="mt-6">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
                          <Sparkles className="w-4 h-4 text-primary" strokeWidth={2} />
                        </div>
                        <h3 className="font-display font-bold text-base text-foreground">
                          Por que um estudante de Direito deveria assistir?
                        </h3>
                      </div>

                      {porqueLoading && !porque && (
                        <div className="rounded-xl bg-muted/50 border border-border p-4 flex items-center gap-3">
                          <Loader2 className="w-4 h-4 animate-spin text-primary" />
                          <p className="text-sm text-muted-foreground">
                            Analisando a obra e conectando com o Direito brasileiro...
                          </p>
                        </div>
                      )}

                      {porque && (
                        <div className="rounded-2xl bg-card/60 border border-border p-4 prose prose-sm prose-invert max-w-none dark:prose-invert prose-headings:font-display prose-headings:text-foreground prose-headings:text-[15px] prose-headings:mb-2 prose-headings:mt-3 prose-p:text-[15px] prose-p:leading-[1.7] prose-p:text-foreground/90 prose-li:text-[15px] prose-li:leading-[1.7] prose-li:text-foreground/90 prose-strong:text-foreground">
                          <ReactMarkdown>{porque}</ReactMarkdown>
                          <div className="mt-3 flex items-center justify-between not-prose">
                            <span className="text-[11px] text-muted-foreground">Gerado por IA · pode conter imprecisões</span>
                            <button
                              onClick={() => gerarPorqueAssistir(true)}
                              disabled={porqueLoading}
                              className="text-xs font-medium text-primary hover:underline disabled:opacity-50"
                            >
                              {porqueLoading ? "Gerando..." : "Regerar"}
                            </button>
                          </div>
                        </div>
                      )}

                      {porqueErro && !porqueLoading && (
                        <button
                          onClick={() => gerarPorqueAssistir(true)}
                          className="w-full rounded-xl bg-muted/50 border border-border p-4 text-sm text-muted-foreground hover:border-primary/50 transition"
                        >
                          {porqueErro} · Tocar para tentar de novo
                        </button>
                      )}
                    </section>

                    {obra.trailer_youtube_id && (
                      <section className="mt-6">
                        <h3 className="font-display font-bold text-base text-foreground mb-3">Trailer</h3>
                        <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-black">
                          <iframe
                            src={`https://www.youtube.com/embed/${obra.trailer_youtube_id}`}
                            title={`Trailer de ${obra.titulo}`}
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                            className="absolute inset-0 w-full h-full"
                          />
                        </div>
                      </section>
                    )}

                    {(obra.elenco ?? []).length > 0 && (
                      <section className="mt-6">
                        <h3 className="font-display font-bold text-base text-foreground mb-3">Elenco</h3>
                        <div className="flex gap-3 overflow-x-auto -mx-5 px-5 pb-2 scrollbar-none">
                          {(obra.elenco ?? []).map((c, i) => (
                            <div key={i} className="w-24 shrink-0 text-center">
                              <div className="w-24 h-24 rounded-full overflow-hidden bg-muted mx-auto">
                                {c.foto ? (
                                  <img src={c.foto} alt={c.nome} className="w-full h-full object-cover" loading="lazy" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">
                                    {c.nome.split(" ").slice(0, 2).map((n) => n[0]).join("")}
                                  </div>
                                )}
                              </div>
                              <p className="text-[12px] font-semibold text-foreground mt-2 leading-tight line-clamp-2">
                                {c.nome}
                              </p>
                              <p className="text-[11px] text-muted-foreground leading-tight line-clamp-2 mt-0.5">{c.personagem}</p>
                            </div>
                          ))}
                        </div>
                      </section>
                    )}
                  </>
                ) : (
                  <>
                    {(flatrate.length > 0 || rent.length > 0 || buy.length > 0 || free.length > 0) ? (
                      <section className="mt-5">
                        {flatrate.length > 0 && (
                          <ProviderBlock
                            label="Streaming"
                            items={flatrate}
                            titulo={obra.titulo}
                            fallback={providerLink}
                          />
                        )}
                        {free.length > 0 && (
                          <ProviderBlock
                            label="Grátis"
                            items={free}
                            titulo={obra.titulo}
                            fallback={providerLink}
                          />
                        )}
                        {rent.length > 0 && (
                          <ProviderBlock
                            label="Alugar"
                            items={rent}
                            titulo={obra.titulo}
                            fallback={providerLink}
                          />
                        )}
                        {buy.length > 0 && (
                          <ProviderBlock
                            label="Comprar"
                            items={buy}
                            titulo={obra.titulo}
                            fallback={providerLink}
                          />
                        )}
                        <p className="text-[10px] text-muted-foreground mt-3">
                          Tocamos direto no serviço quando possível; caso contrário abrimos a busca do provedor. Dados: TMDB/JustWatch.
                        </p>
                      </section>
                    ) : (
                      <section className="mt-5 rounded-xl bg-muted/50 border border-border p-4">
                        <p className="text-xs text-muted-foreground">
                          Sem informação de streaming no Brasil no momento.
                        </p>
                      </section>
                    )}

                    {obra.homepage && (
                      <button
                        onClick={() => abrirLink(obra.homepage!, obra.id)}
                        className="mt-4 w-full flex items-center justify-center gap-2 h-11 rounded-xl bg-card border border-border hover:border-primary/50 text-sm font-medium text-foreground transition"
                      >
                        <ExternalLink className="w-4 h-4" />
                        Site oficial
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>




            {/* Sheet de comentários */}
            <AnimatePresence>
              {showComentarios && (
                <>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 z-10 bg-black/50"
                    onClick={() => setShowComentarios(false)}
                  />
                  <motion.div
                    initial={{ y: "100%" }}
                    animate={{ y: 0 }}
                    exit={{ y: "100%" }}
                    transition={{ type: "spring", stiffness: 280, damping: 32 }}
                    className="absolute inset-x-0 bottom-0 z-20 h-[75%] bg-background rounded-t-3xl flex flex-col shadow-2xl"
                  >
                    <div className="flex items-center justify-between px-5 py-3 border-b border-border">
                      <h3 className="font-display font-bold">Comentários</h3>
                      <button
                        onClick={() => setShowComentarios(false)}
                        className="w-8 h-8 rounded-full hover:bg-muted flex items-center justify-center"
                      >
                        <ChevronDown className="w-5 h-5" />
                      </button>
                    </div>
                    <div className="flex-1 overflow-y-auto px-5 py-3 space-y-3">
                      {comentarios.length === 0 ? (
                        <div className="py-16 text-center text-muted-foreground text-sm">
                          Nenhum comentário ainda. Seja o primeiro!
                        </div>
                      ) : (
                        comentarios.map((c) => (
                          <div key={c.id} className="flex gap-3">
                            <div className="w-9 h-9 rounded-full bg-muted overflow-hidden shrink-0">
                              {c.autor_avatar ? (
                                <img src={c.autor_avatar} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-xs font-semibold text-muted-foreground">
                                  {c.autor_nome?.[0]?.toUpperCase() ?? "?"}
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="text-xs font-semibold text-foreground">{c.autor_nome}</p>
                                <span className="text-[10px] text-muted-foreground">
                                  {new Date(c.created_at).toLocaleDateString("pt-BR")}
                                </span>
                                {c.user_id === userId && (
                                  <button
                                    onClick={() => apagarComentario(c.id)}
                                    className="ml-auto text-muted-foreground hover:text-destructive"
                                    aria-label="Apagar"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" strokeWidth={1.8} />
                                  </button>
                                )}
                              </div>
                              <p className="text-sm text-foreground/90 mt-0.5 whitespace-pre-line">{c.texto}</p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                    <div className="border-t border-border p-3 pb-[max(var(--sai-bottom,env(safe-area-inset-bottom,0px)),12px)] flex items-end gap-2">
                      <textarea
                        value={novoTexto}
                        onChange={(e) => setNovoTexto(e.target.value)}
                        placeholder={userId ? "Escreva um comentário..." : "Faça login para comentar"}
                        disabled={!userId || enviando}
                        rows={1}
                        className="flex-1 resize-none rounded-2xl bg-muted px-4 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 max-h-24"
                      />
                      <button
                        onClick={enviarComentario}
                        disabled={!novoTexto.trim() || enviando || !userId}
                        className="w-10 h-10 shrink-0 rounded-full bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-40 transition"
                        aria-label="Enviar"
                      >
                        <Send className="w-4 h-4" strokeWidth={2} />
                      </button>
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  return createPortal(sheet, document.body);
}

function ActionPill({
  icon,
  label,
  onClick,
  active,
  tone = "red",
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
  tone?: "red" | "rose" | "amber" | "crimson" | "neutral";
}) {
  const tones: Record<string, { base: string; activeCls: string }> = {
    red: {
      base: "bg-red-950/40 border-red-500/25 text-red-100 hover:bg-red-900/60 hover:border-red-400/50",
      activeCls: "bg-red-500/90 border-red-400 text-white shadow-[0_6px_18px_-6px_rgba(239,68,68,0.7)]",
    },
    rose: {
      base: "bg-rose-950/40 border-rose-500/25 text-rose-100 hover:bg-rose-900/60 hover:border-rose-400/50",
      activeCls: "bg-rose-500/90 border-rose-400 text-white shadow-[0_6px_18px_-6px_rgba(244,63,94,0.7)]",
    },
    amber: {
      base: "bg-amber-950/40 border-amber-500/25 text-amber-100 hover:bg-amber-900/60 hover:border-amber-400/50",
      activeCls: "bg-amber-500/90 border-amber-400 text-black shadow-[0_6px_18px_-6px_rgba(245,158,11,0.7)]",
    },
    crimson: {
      base: "bg-red-950/40 border-red-500/25 text-red-100 hover:bg-red-900/60 hover:border-red-400/50",
      activeCls: "bg-red-600/90 border-red-400 text-white shadow-[0_6px_18px_-6px_rgba(220,38,38,0.7)]",
    },
    neutral: {
      base: "bg-white/5 border-white/15 text-foreground/85 hover:bg-white/10 hover:border-white/30",
      activeCls: "bg-white/20 border-white/40 text-foreground",
    },
  };
  const t = tones[tone] ?? tones.red;
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-center justify-center gap-1 h-16 px-1 rounded-2xl border font-semibold whitespace-nowrap transition-all active:scale-95 backdrop-blur-sm",
        "text-[10px] sm:text-xs leading-none",
        active ? t.activeCls : t.base,
      )}
    >
      {icon}
      <span className="truncate max-w-full">{label}</span>
    </button>
  );
}


function ProviderBlock({
  label,
  items,
  titulo,
  fallback,
}: {
  label: string;
  items: Array<{ id: number; nome: string; logo: string | null }>;
  titulo: string;
  fallback: string | null;
}) {
  return (
    <div className="mb-3">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">{label}</p>
      <div className="flex items-center gap-2 flex-wrap">
        {items.map((p) => (
          <button
            key={p.id}
            onClick={() => {
              // Prioridade: link JustWatch da obra (leva direto pra página do título,
              // que já tem o botão "Assistir agora" abrindo o app do provedor no título certo).
              // Só cai pra busca do provedor se não houver link JW.
              const url = fallback || providerDeepLink(p.id, p.nome, titulo);
              if (url) abrirLink(url);
            }}
            className="flex items-center gap-2 h-12 pl-2 pr-3.5 rounded-xl bg-card border border-border hover:border-primary/50 transition min-h-[44px]"
          >
            {p.logo ? (
              <img src={p.logo} alt={p.nome} className="w-8 h-8 rounded-md object-cover" />
            ) : (
              <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center">
                <Play className="w-3.5 h-3.5 text-muted-foreground" strokeWidth={2} />
              </div>
            )}
            <span className="text-sm font-medium text-foreground">{p.nome}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex-1 h-10 rounded-xl text-sm font-semibold transition-all",
        active
          ? "bg-background text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

/**
 * Retorna URL de busca direto no serviço de streaming (Brasil).
 * Baseado no ID e nome do provedor do TMDB.
 * Se não houver mapping, retorna null (aí usamos o JustWatch como fallback).
 */
function providerDeepLink(id: number, nome: string, titulo: string): string | null {
  const q = encodeURIComponent(titulo);
  const key = nome.toLowerCase();

  // Mapa por ID do TMDB (mais confiável)
  const byId: Record<number, string> = {
    8: `https://www.netflix.com/search?q=${q}`, // Netflix
    9: `https://www.primevideo.com/-/pt/search/ref=atv_nb_sr?phrase=${q}`, // Amazon Prime Video
    119: `https://www.primevideo.com/-/pt/search/ref=atv_nb_sr?phrase=${q}`, // Amazon Video (aluguel)
    10: `https://www.amazon.com.br/s?k=${q}&i=instant-video`, // Amazon Video (compra)
    1899: `https://www.max.com/br/pt/search?q=${q}`, // Max
    384: `https://www.max.com/br/pt/search?q=${q}`, // HBO Max legado
    337: `https://www.disneyplus.com/pt-br/search?q=${q}`, // Disney+
    350: `https://tv.apple.com/br/search?term=${q}`, // Apple TV+
    2: `https://tv.apple.com/br/search?term=${q}`, // Apple TV Store
    531: `https://www.paramountplus.com/br/search/?query=${q}`, // Paramount+
    386: `https://tv.nowonline.com.br/busca?q=${q}`, // Peacock (placeholder)
    167: `https://globoplay.globo.com/busca/?q=${q}`, // Globoplay
    283: `https://www.crunchyroll.com/pt-br/search?q=${q}`, // Crunchyroll
    3: `https://play.google.com/store/search?q=${q}&c=movies`, // Google Play Movies
    192: `https://www.youtube.com/results?search_query=${q}`, // YouTube
    188: `https://www.youtube.com/results?search_query=${q}+filme`, // YouTube premium
    11: `https://mubi.com/pt/br/search/films?query=${q}`, // MUBI
    227: `https://www.telecineplay.com.br/busca?q=${q}`, // Telecine
    619: `https://star.disneyplus.com/pt-br/search?q=${q}`, // Star+
  };
  if (byId[id]) return byId[id];

  // Fallback por nome
  if (key.includes("netflix")) return `https://www.netflix.com/search?q=${q}`;
  if (key.includes("prime video") || key.includes("primevideo"))
    return `https://www.primevideo.com/-/pt/search/ref=atv_nb_sr?phrase=${q}`;
  if (key.includes("amazon")) return `https://www.amazon.com.br/s?k=${q}&i=instant-video`;
  if (key.includes("hbo") || key === "max" || key.includes(" max"))
    return `https://www.max.com/br/pt/search?q=${q}`;
  if (key.includes("disney")) return `https://www.disneyplus.com/pt-br/search?q=${q}`;
  if (key.includes("apple tv")) return `https://tv.apple.com/br/search?term=${q}`;
  if (key.includes("paramount")) return `https://www.paramountplus.com/br/search/?query=${q}`;
  if (key.includes("globoplay")) return `https://globoplay.globo.com/busca/?q=${q}`;
  if (key.includes("crunchyroll")) return `https://www.crunchyroll.com/pt-br/search?q=${q}`;
  if (key.includes("google play")) return `https://play.google.com/store/search?q=${q}&c=movies`;
  if (key.includes("youtube")) return `https://www.youtube.com/results?search_query=${q}`;
  if (key.includes("mubi")) return `https://mubi.com/pt/br/search/films?query=${q}`;
  if (key.includes("telecine")) return `https://www.telecineplay.com.br/busca?q=${q}`;
  if (key.includes("looke")) return `https://www.looke.com.br/busca?q=${q}`;
  return null;
}
