import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/vademecum/PageHeader";
import DesktopPageLayout from "@/components/layout/DesktopPageLayout";
import SessaoRunner from "@/components/praticar/SessaoRunner";
import { Artigo, shuffle } from "@/components/praticar/desafios/utils";
import { isLinhaDeArtigo } from "@/lib/praticarLeiEstrutura";
import type { LinhaLeiPraticar } from "@/lib/praticarLeiEstrutura";

export default function PraticarSessao() {
  const navigate = useNavigate();
  const { leiSlug } = useParams();
  const [params] = useSearchParams();
  const titulo = params.get("titulo");
  const bloco = params.get("bloco");
  const inicioParam = params.get("inicio");
  const fimParam = params.get("fim");
  const inicio = inicioParam ? Number(inicioParam) : null;
  const fim = fimParam ? Number(fimParam) : null;
  const artigoIdFoco = params.get("artigoId");

  const [loading, setLoading] = useState(true);
  const [artigos, setArtigos] = useState<Artigo[]>([]);
  const [leiNome, setLeiNome] = useState("");
  const [leiId, setLeiId] = useState<string | null>(null);

  useEffect(() => {
    if (!leiSlug) return;
    (async () => {
      setLoading(true);
      let lei = (await supabase.from("vade_mecum_leis").select("id, nome").eq("slug", leiSlug).maybeSingle()).data;
      if (!lei) lei = (await supabase.from("vade_mecum_leis").select("id, nome").eq("id", leiSlug).maybeSingle()).data;
      if (!lei) { setLoading(false); return; }
      setLeiNome(lei.nome);
      setLeiId(lei.id);

      let q = supabase
        .from("vade_mecum_artigos")
        .select("id, numero, texto, epigrafe, ordem")
        .eq("lei_id", lei.id)
        .not("texto", "is", null)
        .order("ordem", { ascending: true })
        .limit(5000);
      if (inicio !== null && Number.isFinite(inicio)) q = q.gte("ordem", inicio);
      if (fim !== null && Number.isFinite(fim)) q = q.lte("ordem", fim);
      if (titulo) q = q.eq("epigrafe", titulo);

      const { data } = await q;
      const artigosDaLei = ((data ?? []) as LinhaLeiPraticar[])
        .filter(isLinhaDeArtigo)
        .map((artigo) => ({
          id: artigo.id,
          numero: artigo.numero ?? "",
          texto: artigo.texto,
          epigrafe: artigo.epigrafe,
        }));
      setArtigos(shuffle(artigosDaLei as Artigo[]));
      setLoading(false);
    })();
  }, [leiSlug, titulo, inicioParam, fimParam]);

  const header = (
    <PageHeader
      title="Sessão"
      subtitle={bloco || titulo || leiNome || "Praticar"}
      onBack={() => navigate(`/praticar/${leiSlug ?? ""}`)}
    />
  );

  return (
    <DesktopPageLayout activeId="praticar" title="Sessão de prática" mobileHeader={header}>
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <SessaoRunner
          artigos={artigos}
          artigoIdFoco={artigoIdFoco}
          leiId={leiId}
          onSair={() => navigate(`/praticar/${leiSlug ?? ""}`)}
        />
      )}
    </DesktopPageLayout>
  );
}
