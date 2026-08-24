-- 1) Create design_imagens_prompts table (reusable image style presets for the whole app)
CREATE TABLE public.design_imagens_prompts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug text NOT NULL UNIQUE,
  nome text NOT NULL,
  descricao text,
  prompt_base text NOT NULL,
  exemplos jsonb NOT NULL DEFAULT '[]'::jsonb,
  paleta jsonb NOT NULL DEFAULT '[]'::jsonb,
  categoria_alvo text,
  is_default boolean NOT NULL DEFAULT false,
  ativo boolean NOT NULL DEFAULT true,
  preview_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.design_imagens_prompts TO authenticated;
GRANT ALL ON public.design_imagens_prompts TO service_role;

ALTER TABLE public.design_imagens_prompts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth read design prompts" ON public.design_imagens_prompts
  FOR SELECT USING (true);
CREATE POLICY "auth write design prompts" ON public.design_imagens_prompts
  FOR ALL USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.update_design_prompts_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_design_prompts_updated_at
  BEFORE UPDATE ON public.design_imagens_prompts
  FOR EACH ROW EXECUTE FUNCTION public.update_design_prompts_updated_at();

-- 2) Seed the two presets
INSERT INTO public.design_imagens_prompts (slug, nome, descricao, prompt_base, exemplos, paleta, categoria_alvo, is_default, preview_url)
VALUES
(
  'filosofia-bustos-classicos',
  'Filósofos — Capa Clássica',
  'Estilo de capa de livro clássico de Direito/Filosofia (Beccaria, Rousseau). Figura em três-quartos com pilha de objetos simbólicos à direita, fundo preto sólido, paleta creme/sepia/borgonha. Ideal para posts de Filosofia do Direito.',
  E'Flat vector editorial illustration in the style of a classic "OAB na Risca" law-blog cover.\n\nASPECT & FRAMING — NON-NEGOTIABLE:\n- HORIZONTAL / LANDSCAPE aspect ratio 16:9.\n- The main figure and symbolic objects MUST FILL THE FRAME edge-to-edge, reaching top and bottom of the image with only a small (max 4%) black margin.\n- Figure taking ~65% of horizontal width, standing tall top to bottom, with symbolic props stacked to the right also reaching top-to-bottom.\n\nBACKGROUND — NON-NEGOTIABLE:\n- Entire background MUST be pure solid black (#000000), edge-to-edge, no gradient, no texture, no vignette.\n- ZERO tolerance for white, cream, tan, beige, ivory, parchment, off-white, light gray, or ANY light tone at the outer 8% frame border.\n\nFIGURE:\n- ONE central historical/classical figure connected to the subject. Waist-up or three-quarter body, calm expression, occupying LEFT-CENTER, reaching TOP-TO-BOTTOM.\n- Holds a leather-bound book with visible spine.\n- Next to figure on the RIGHT, a rich stack of symbolic law/philosophy objects reaching top-to-bottom: classical column, scales of justice, quill and inkwell, candle, laurel wreath, stack of old leather-bound books with titles on spines.\n\nSTYLE:\n- Flat vector look. Bold clean ink outlines. Subtle cross-hatching only for shadow depth.\n- NO painterly rendering, NO photorealism, NO chiaroscuro glow, NO 3D shading, NO watercolor, NO sculpture/bust look.\n- Palette LIMITED to: cream / tan / warm sepia / muted olive / burgundy / soft gold — ONLY on the figure and objects, NEVER as background.\n- NO neon, NO blue, NO purple, NO green.\n\nCOMPOSITION:\n- 16:9 landscape. Figure left/center, symbolic objects right, both spanning full height.\n- NO text, NO title, NO caption, NO logo, NO watermark.',
  '[
    {"subject":"Foucault","palette":"sepia/burgundy"},
    {"subject":"Rawls","palette":"cream/olive"},
    {"subject":"Maquiavel","palette":"burgundy/gold"},
    {"subject":"Hobbes","palette":"sepia/olive"},
    {"subject":"Rousseau","palette":"warm sepia"}
  ]'::jsonb,
  '["#000000","#f5e6c8","#8b6f4e","#7a1f2b","#c9a961"]'::jsonb,
  'Filosofia',
  false,
  NULL
),
(
  'flat-vetorial-juridico',
  'Ilustração Flat Vetorial Jurídica',
  'Ilustração vetorial plana (flat design) com personagens estilizados em cenário jurídico (mesa, arcos, janelas com sombras em blocos). Alterna paletas por cena (borgonha/dourado, verde-oliva, azul-noite, terracota, etc.). Estilo editorial moderno para posts de STF, Curiosidades, Clássicos e outros.',
  E'Flat vector illustration, editorial style. Simple stylized characters with soft features and clean geometric shapes.\n\nCOMPOSITION:\n- Horizontal 3:2 format, legal/judicial setting (courtroom, law office, library, classical building, university).\n- Central subject with symbolic legal props: golden balance scale, thick leather law books, gavel, arched window with warm light, wooden panels, columns.\n- Window light casts angular geometric BLOCK shadows on the walls and floor (very characteristic of the style).\n\nSTYLE:\n- Flat vector look. Solid color fills. No gradients, no photorealism, no painterly rendering.\n- Shadows rendered as flat geometric blocks (not soft/blurred).\n- Clean minimalist composition with breathing room.\n- Palette contained to 4-6 harmonious colors (VARIES per subject: see the paleta hint below).\n- Characters with round soft faces, simple hair shapes, slightly stylized proportions.\n\nCONSTRAINTS:\n- NO text, NO title, NO caption, NO logo, NO watermark, NO signatures.\n- Background fills the frame (no black borders, no letterboxing).',
  '[
    {"subject":"Deusa Thêmis com balança e espada","palette":"burgundy wine + antique gold + cream","preview_url":"/__l5e/assets-v1/2182f3cb-8c0a-4810-a0cb-946527575ccf/cover-2.jpg"},
    {"subject":"Coruja da sabedoria sobre livros","palette":"olive green + mustard + cream","preview_url":"/__l5e/assets-v1/8afd4ecc-c7d1-4c91-b311-d8a379cf5f2a/cover-3.jpg"},
    {"subject":"Advogado conversando com cliente","palette":"warm brown + mustard yellow + cream","preview_url":"/__l5e/assets-v1/b818f38c-a362-464c-925f-b8111bc2bae0/cover-4.jpg"},
    {"subject":"Estudante de Direito à noite","palette":"deep navy + warm amber + cream","preview_url":"/__l5e/assets-v1/20e5a100-d505-489d-8177-5499d7fc0668/cover-5.jpg"},
    {"subject":"Fachada de faculdade de Direito","palette":"terracotta + cream + peach","preview_url":"/__l5e/assets-v1/c18ad5e8-5d6e-4c29-80b3-ce627ffcc470/cover-6.jpg"},
    {"subject":"Juiz batendo martelo","palette":"burgundy wine + antique gold","preview_url":"/__l5e/assets-v1/89a43777-73dc-471e-8f36-4ded1cc2c703/cover-7.jpg"},
    {"subject":"Biblioteca jurídica com escada","palette":"forest green + walnut brown + gold","preview_url":"/__l5e/assets-v1/143a16ef-b5d9-4692-94ab-7bde1de34aee/cover-8.jpg"},
    {"subject":"Advogada argumentando em tribunal","palette":"deep purple + antique gold","preview_url":"/__l5e/assets-v1/d0a285b4-2d70-41e4-aba1-bf4fff9da31c/cover-9.jpg"},
    {"subject":"Aperto de mão entre advogados","palette":"petrol teal + cream + ochre","preview_url":"/__l5e/assets-v1/b514c16d-7152-4906-8d5d-10324c15296f/cover-10.jpg"}
  ]'::jsonb,
  '["#7a1f2b","#c9a961","#4a6741","#c17f3f","#2c3e50","#f5e6c8"]'::jsonb,
  NULL,
  true,
  '/__l5e/assets-v1/2182f3cb-8c0a-4810-a0cb-946527575ccf/cover-2.jpg'
);

-- 3) Helper: return the best prompt_base for a given blog categoria
CREATE OR REPLACE FUNCTION public.get_design_prompt_for_categoria(_categoria text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT prompt_base FROM public.design_imagens_prompts
  WHERE ativo = true AND (categoria_alvo = _categoria OR (categoria_alvo IS NULL AND is_default = true))
  ORDER BY (categoria_alvo = _categoria) DESC NULLS LAST, is_default DESC
  LIMIT 1
$$;

GRANT EXECUTE ON FUNCTION public.get_design_prompt_for_categoria(text) TO authenticated, anon, service_role;