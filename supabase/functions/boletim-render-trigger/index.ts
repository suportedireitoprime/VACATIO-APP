// Dispara o workflow render-boletim.yml no GitHub para gerar o MP4.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const GITHUB_TOKEN = Deno.env.get("GITHUB_API_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { boletim_id, repo, ref } = await req.json();
    if (!boletim_id) throw new Error("boletim_id obrigatório");

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
    let repoFinal = repo;
    if (!repoFinal) {
      const { data } = await supabase.from("boletim_config").select("github_repo, github_ref").limit(1).maybeSingle();
      repoFinal = data?.github_repo;
      if (!ref && data?.github_ref) ref = data.github_ref;
    }
    if (!repoFinal) throw new Error("Configure github_repo em Admin → Boletins");

    const branch = ref || "main";
    const ghHeaders = {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    };

    // 1) Pré-checa se o workflow existe no repo/branch. Se não, devolve mensagem clara.
    const check = await fetch(
      `https://api.github.com/repos/${repoFinal}/contents/.github/workflows/render-boletim.yml?ref=${encodeURIComponent(branch)}`,
      { headers: ghHeaders },
    );
    if (check.status === 404) {
      return new Response(JSON.stringify({
        error: "Workflow render-boletim.yml não encontrado no repositório",
        hint: `Faça o push do arquivo .github/workflows/render-boletim.yml para o branch '${branch}' do repo '${repoFinal}' (Lovable → GitHub sync). Depois tente novamente.`,
        repo: repoFinal,
        ref: branch,
      }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (!check.ok && check.status !== 200) {
      const t = await check.text();
      return new Response(JSON.stringify({
        error: `Falha ao acessar repositório (${check.status})`,
        hint: check.status === 401 || check.status === 403
          ? "Verifique se o GITHUB_API_KEY tem acesso ao repositório (scope 'repo' + 'workflow')."
          : "Verifique se o nome do repositório está no formato usuario/repo e se o token tem acesso.",
        details: t,
      }), { status: check.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // 2) Dispara o workflow
    const url = `https://api.github.com/repos/${repoFinal}/actions/workflows/render-boletim.yml/dispatches`;
    const res = await fetch(url, {
      method: "POST",
      headers: { ...ghHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({ ref: branch, inputs: { boletim_id } }),
    });
    if (!res.ok) {
      const t = await res.text();
      return new Response(JSON.stringify({
        error: `GitHub ${res.status}`,
        hint: res.status === 422
          ? "O workflow existe mas o branch/inputs são inválidos. Confirme que o arquivo está no branch informado e possui workflow_dispatch com input 'boletim_id'."
          : undefined,
        details: t,
      }), { status: res.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    await supabase.from("boletins_juridicos").update({ status: "renderizando" }).eq("id", boletim_id);

    return new Response(JSON.stringify({ ok: true, repo: repoFinal, ref: ref || "main" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});