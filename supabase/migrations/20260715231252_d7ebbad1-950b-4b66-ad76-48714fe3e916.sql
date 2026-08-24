UPDATE public.blog_edicao_config SET estilo_capa_prompt = 'Flat vector editorial illustration in the exact visual style of a "OAB na Risca" blog cover. STRICT STYLE RULES:
- Pure solid black background (#000000), no gradient, no texture.
- One central historical/classical figure related to the subject (philosopher, jurist, writer, magistrate), portrait framing from chest up or waist up, facing slightly to the side, calm expression.
- Character holds a book with a visible bound spine (title on book may be shown but must be short and legible, otherwise leave blank).
- Beside the figure, one or two symbolic law/philosophy objects: classical column, scales of justice, quill and inkwell, candle, stack of leather-bound old books, laurel wreath.
- Flat coloring, clean bold ink outlines, subtle cross-hatching only where needed for shadow — NO painterly rendering, NO photorealism, NO chiaroscuro, NO 3D shading.
- Palette limited to: cream / tan / warm sepia / muted olive / burgundy / soft gold — muted historical tones on the black background. No neon, no blue, no purple.
- Composition: 1:1 square, subject centered or slightly left, symbolic objects to the right.
- NO text, NO title, NO logo, NO caption, NO watermark visible anywhere in the artwork.
- Timeless, elegant, feels like the cover of a classic law/philosophy book reprinted for a modern law blog.'
WHERE id = (SELECT id FROM public.blog_edicao_config LIMIT 1);