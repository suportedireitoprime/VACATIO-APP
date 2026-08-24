import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { geminiFetch } from "../_shared/geminiFetch.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

async function generateHeroImage(apiKey: string, tag: string, customPrompt: string): Promise<Uint8Array | null> {
  const basePrompt = customPrompt?.trim() || `
Personagem principal: ${tag}. Uma pessoa carismática, sofisticada, no contexto jurídico brasileiro (Vade Mecum / OAB).
Ilustração estilizada semi-realista, corpo inteiro ou 3/4, olhando levemente para o espectador com expressão confiante e acolhedora.
Segurando um livro grosso de leis (encadernação bordô/dourada) ou martelo de juiz. Roupa formal (terno, blazer, toga leve).

Composição:
- Personagem centralizado ou levemente à direita, ocupando 60-75% do frame vertical.
- Fundo: gradiente âmbar/dourado saturado (amarelo mostarda #E5B84B → dourado escuro #8B6914), sem cenário arquitetônico complexo.
- Iluminação quente, glow dourado suave nas bordas do personagem.
- Elementos decorativos flutuantes muito sutis (símbolo §, pequena balança dourada) atrás do personagem, quase invisíveis, apenas para dar profundidade.
- Detalhes finos: textura de papel envelhecido no fundo, brilho metálico nos elementos dourados.

Paleta OBRIGATÓRIA: âmbar #E5B84B, dourado escuro #8B6914, bordô profundo #4A0E1F para acentos, off-white cremoso #F5E6C8 apenas em pequenos highlights.
NÃO USAR: azul, verde, roxo, cinza puro, branco puro no fundo.

Estilo: ilustração digital de alta qualidade, pinceladas visíveis mas refinadas, semelhante a covers editoriais premium de revistas jurídicas modernas.
Aspecto: retrato vertical 3:4 ou quadrado, personagem alinhado ao rodapé do frame.
`;

  const strict = `${basePrompt}

CRITICAL BACKGROUND RULE — READ TWICE:
The background MUST be a warm AMBER/GOLD gradient (from #E5B84B mustard yellow to #8B6914 dark gold). Never white, cream-only, blue, green, purple, or gray. The character must feel integrated with a saturated golden atmosphere.
The character must be RENDERED CLEANLY with sharp edges so it can be placed over a yellow app header without visual artifacts.
This is the primary acceptance criterion.`;

  const res = await geminiFetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: strict }] }],
        generationConfig: {
          responseModalities: ["IMAGE"],
          imageConfig: { aspectRatio: "3:4" },
        },
      }),
    },
  );
  if (!res.ok) {
    console.warn("Hero gen failed", res.status, await res.text());
    return null;
  }
  const data = await res.json();
  const parts = data.candidates?.[0]?.content?.parts ?? [];
  const img = parts.find((p: any) => p.inlineData?.data)?.inlineData?.data;
  if (!img) return null;
  return Uint8Array.from(atob(img), (c) => c.charCodeAt(0));
}

async function assertAdmin(supabase: any, authHeader: string | null): Promise<{ ok: boolean; userId?: string; error?: string }> {
  if (!authHeader) return { ok: false, error: "missing auth" };
  const token = authHeader.replace(/^Bearer\s+/i, "");
  const { data: userData, error } = await supabase.auth.getUser(token);
  if (error || !userData?.user) return { ok: false, error: "invalid token" };
  const userId = userData.user.id;
  const { data: isAdmin } = await supabase.rpc("is_admin_user", { _user_id: userId });
  if (!isAdmin) return { ok: false, error: "not admin" };
  return { ok: true, userId };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const url = new URL(req.url);
  const action = url.pathname.split("/").pop() || "";

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const auth = req.headers.get("Authorization");
  const admin = await assertAdmin(supabase, auth);
  if (!admin.ok) return json({ error: admin.error || "forbidden" }, 403);

  const body = await req.json().catch(() => ({} as any));

  try {
    if (action === "generate") {
      const tag: string = String(body?.tag || "").trim();
      if (!tag) return json({ error: "tag obrigatória" }, 400);
      const customPrompt: string = String(body?.custom_prompt || "");

      const geminiKey = Deno.env.get("GEMINI_API_KEY") || "";
      if (!geminiKey) return json({ error: "GEMINI_API_KEY ausente" }, 500);

      const bytes = await generateHeroImage(geminiKey, tag, customPrompt);
      if (!bytes) return json({ error: "geração falhou" }, 500);

      const path = `pending/${slugify(tag)}-${Date.now()}.png`;
      const { error: upErr } = await supabase.storage
        .from("hero-home")
        .upload(path, bytes, { contentType: "image/png", upsert: true });
      if (upErr) throw upErr;
      const { data: signed } = await supabase.storage
        .from("hero-home")
        .createSignedUrl(path, 60 * 60 * 24);
      return json({
        ok: true,
        storage_path: path,
        imagem_url: signed?.signedUrl || "",
        prompt_used: customPrompt || `[template padrão] ${tag}`,
      });
    }

    if (action === "approve") {
      const pendingPath: string = String(body?.storage_path || "");
      const tag: string = String(body?.tag || "").trim();
      const promptUsed: string = String(body?.prompt_used || "");
      const animationPreset: string = String(body?.animation_preset || "ken-burns");
      if (!pendingPath || !tag) return json({ error: "dados incompletos" }, 400);

      // Move from pending/ to active/
      const activePath = pendingPath.replace(/^pending\//, `active/${new Date().getFullYear()}/`);
      const { error: mvErr } = await supabase.storage
        .from("hero-home")
        .move(pendingPath, activePath);
      if (mvErr) throw mvErr;
      const { data: signed } = await supabase.storage
        .from("hero-home")
        .createSignedUrl(activePath, 60 * 60 * 24 * 365);

      // Next ordem
      const { data: maxRow } = await supabase
        .from("hero_home_images")
        .select("ordem")
        .order("ordem", { ascending: false })
        .limit(1);
      const nextOrdem = (maxRow?.[0]?.ordem ?? -1) + 1;

      const { data: inserted, error: insErr } = await supabase
        .from("hero_home_images")
        .insert({
          tag,
          prompt_used: promptUsed,
          storage_path: activePath,
          imagem_url: signed?.signedUrl || "",
          animation_preset: animationPreset,
          ordem: nextOrdem,
          ativo: true,
          created_by: admin.userId,
        })
        .select()
        .single();
      if (insErr) throw insErr;
      return json({ ok: true, image: inserted });
    }

    if (action === "discard") {
      const pendingPath: string = String(body?.storage_path || "");
      if (!pendingPath) return json({ error: "storage_path obrigatório" }, 400);
      await supabase.storage.from("hero-home").remove([pendingPath]).catch(() => {});
      return json({ ok: true });
    }

    if (action === "delete") {
      const id: string = String(body?.id || "");
      if (!id) return json({ error: "id obrigatório" }, 400);
      const { data: row } = await supabase
        .from("hero_home_images")
        .select("storage_path")
        .eq("id", id)
        .single();
      if (row?.storage_path) {
        await supabase.storage.from("hero-home").remove([row.storage_path]).catch(() => {});
      }
      await supabase.from("hero_home_images").delete().eq("id", id);
      return json({ ok: true });
    }

    if (action === "refresh-url") {
      const id: string = String(body?.id || "");
      if (!id) return json({ error: "id obrigatório" }, 400);
      const { data: row } = await supabase
        .from("hero_home_images")
        .select("storage_path")
        .eq("id", id)
        .single();
      if (!row?.storage_path) return json({ error: "não encontrado" }, 404);
      const { data: signed } = await supabase.storage
        .from("hero-home")
        .createSignedUrl(row.storage_path, 60 * 60 * 24 * 365);
      if (signed?.signedUrl) {
        await supabase.from("hero_home_images").update({ imagem_url: signed.signedUrl }).eq("id", id);
      }
      return json({ ok: true, imagem_url: signed?.signedUrl || "" });
    }

    return json({ error: "ação desconhecida" }, 404);
  } catch (e: any) {
    console.error(e);
    return json({ error: e?.message || "erro interno" }, 500);
  }
});
