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

async function generateText(apiKey: string, hint: string): Promise<string | null> {
  const prompt = `Gere UMA curiosidade jurídica breve, surpreendente e correta, em português do Brasil.
${hint ? `Tema/pista: ${hint}` : "Tema livre: leis brasileiras, história do Direito, curiosidades sobre a CF/88, Código Civil, Penal, OAB."}
Regras:
- Máximo 240 caracteres.
- Tom leve, direto, sem sensacionalismo.
- Sem emojis.
- Sem introduções ("Você sabia...", "Curiosidade:"). Vá direto ao fato.
- Não invente artigos ou números que não existam.
Responda APENAS com o texto puro da curiosidade.`;

  const res = await geminiFetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.95, maxOutputTokens: 220 },
      }),
    },
  );
  if (!res.ok) return null;
  const data = await res.json();
  const txt = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  return txt || null;
}

async function generateHollowImage(apiKey: string, texto: string, cor: string): Promise<Uint8Array | null> {
  const prompt = `Crie uma ilustração LINE-ART completamente VAZADA (apenas contornos, sem preenchimento) representando visualmente esta curiosidade jurídica:

"${texto}"

Requisitos técnicos INEGOCIÁVEIS:
- Fundo TOTALMENTE PRETO PURO (#000000). Nada de gradiente, nada de textura, nada de elementos no fundo.
- Toda a arte deve ser feita APENAS com traços/linhas na cor ${cor} (ou variações claras da mesma cor).
- Zero preenchimento sólido. As formas são compostas somente por linhas finas a médias.
- Estilo: pictograma editorial / ícone monoline elegante, quase como um watermark decorativo.
- Composição centralizada, ocupando 55-70% do frame, com bastante respiro nas bordas.
- Um único símbolo/cena principal (livro, balança, coluna, pergaminho, martelo, § etc.) representando a ideia — nada de textos ou letras.
- Aspecto 4:3, imagem limpa pronta para ser usada como marca-d'água sobre um card escuro.

Retorne apenas a imagem.`;

  const res = await geminiFetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          responseModalities: ["IMAGE"],
          imageConfig: { aspectRatio: "4:3" },
        },
      }),
    },
  );
  if (!res.ok) {
    console.warn("hollow image gen failed", res.status, await res.text());
    return null;
  }
  const data = await res.json();
  const parts = data.candidates?.[0]?.content?.parts ?? [];
  const img = parts.find((p: any) => p.inlineData?.data)?.inlineData?.data;
  if (!img) return null;
  return Uint8Array.from(atob(img), (c) => c.charCodeAt(0));
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
  const geminiKey = Deno.env.get("GEMINI_API_KEY") || "";
  if (!geminiKey) return json({ error: "GEMINI_API_KEY ausente" }, 500);

  try {
    if (action === "generate-text") {
      const hint = String(body?.hint || "");
      const texto = await generateText(geminiKey, hint);
      if (!texto) return json({ error: "falhou" }, 500);
      return json({ ok: true, texto });
    }

    if (action === "generate-image") {
      const texto: string = String(body?.texto || "").trim();
      const cor: string = String(body?.cor || "#FACC15");
      if (!texto) return json({ error: "texto obrigatório" }, 400);

      const bytes = await generateHollowImage(geminiKey, texto, cor);
      if (!bytes) return json({ error: "geração de imagem falhou" }, 500);

      const path = `${new Date().getFullYear()}/${slugify(texto.slice(0, 40)) || "curiosidade"}-${Date.now()}.png`;
      const { error: upErr } = await supabase.storage
        .from("home-curiosidades")
        .upload(path, bytes, { contentType: "image/png", upsert: true });
      if (upErr) throw upErr;
      const { data: signed } = await supabase.storage
        .from("home-curiosidades")
        .createSignedUrl(path, 60 * 60 * 24 * 365);
      return json({
        ok: true,
        storage_path: path,
        imagem_url: signed?.signedUrl || "",
      });
    }

    if (action === "create") {
      const texto: string = String(body?.texto || "").trim();
      const cor: string = String(body?.cor || "#FACC15");
      const imagem_url: string = String(body?.imagem_url || "");
      const imagem_path: string = String(body?.imagem_path || "");
      const prompt_imagem: string = String(body?.prompt_imagem || "");
      if (!texto) return json({ error: "texto obrigatório" }, 400);

      const { data: maxRow } = await supabase
        .from("home_curiosidades")
        .select("ordem")
        .order("ordem", { ascending: false })
        .limit(1);
      const nextOrdem = (maxRow?.[0]?.ordem ?? -1) + 1;

      const { data: inserted, error: insErr } = await supabase
        .from("home_curiosidades")
        .insert({
          texto, cor, imagem_url, imagem_path, prompt_imagem,
          ordem: nextOrdem, ativo: true, created_by: admin.userId,
        })
        .select()
        .single();
      if (insErr) throw insErr;
      return json({ ok: true, curiosidade: inserted });
    }

    if (action === "delete") {
      const id: string = String(body?.id || "");
      if (!id) return json({ error: "id obrigatório" }, 400);
      const { data: row } = await supabase
        .from("home_curiosidades")
        .select("imagem_path")
        .eq("id", id)
        .single();
      if (row?.imagem_path) {
        await supabase.storage.from("home-curiosidades").remove([row.imagem_path]).catch(() => {});
      }
      await supabase.from("home_curiosidades").delete().eq("id", id);
      return json({ ok: true });
    }

    if (action === "refresh-url") {
      const id: string = String(body?.id || "");
      if (!id) return json({ error: "id obrigatório" }, 400);
      const { data: row } = await supabase
        .from("home_curiosidades")
        .select("imagem_path")
        .eq("id", id)
        .single();
      if (!row?.imagem_path) return json({ error: "sem imagem" }, 404);
      const { data: signed } = await supabase.storage
        .from("home-curiosidades")
        .createSignedUrl(row.imagem_path, 60 * 60 * 24 * 365);
      if (signed?.signedUrl) {
        await supabase.from("home_curiosidades")
          .update({ imagem_url: signed.signedUrl })
          .eq("id", id);
      }
      return json({ ok: true, imagem_url: signed?.signedUrl || "" });
    }

    return json({ error: "ação desconhecida" }, 404);
  } catch (e: any) {
    console.error(e);
    return json({ error: e?.message || "erro interno" }, 500);
  }
});
