---
name: design-capas-leis
description: >-
  Use this skill to generate and implement cover images for legislation (leis, códigos, estatutos) in the VACATIO APP. It ensures the correct minimalist vector style, color palette, right-side alignment, zero text, padding logic, and UI integration.
---

# Design de Capas para Legislação

Siga estas instruções rigorosamente para manter a consistência visual das capas de leis no aplicativo VACATIO.

## 1. Princípios Visuais da Capa
- **Estilo:** Minimalist premium modern illustration, highly detailed vector style, flat design.
- **Tamanho e Posição:** O personagem/símbolo deve ser GRANDE, PROEMINENTE e preencher a altura do frame (zoom in). Deve estar **obrigatoriamente do LADO DIREITO**. A cabeça e o corpo não podem ser cortados. O lado esquerdo deve ser espaço vazio (fundo contínuo).
- **Sem Texto:** A capa NUNCA pode ter palavras, letras ou qualquer tipo de texto. 
- **Cores:** Tons neutros, acompanhados de "accents" e traços da cor específica da lei.

## 2. Padrão de Prompt (Base)
Ao utilizar a API de geração de imagens (modelo `gemini-2.5-flash-image`), utilize a seguinte estrutura de prompt:

> "A minimalist premium modern illustration of [SUJEITO, ex: someone being arrested, a lawyer looking at documents, blindfolded Lady Justice], representing [NOME DA LEI]. DO NOT INCLUDE ANY WORDS, LETTERS, OR TEXT. NO TEXT ALLOWED. The character standing entirely on the RIGHT SIDE of the frame. THE CHARACTER MUST BE LARGE, PROMINENT, AND FILL THE HEIGHT OF THE FRAME. ZOOM IN ON THE CHARACTER. Ensure the FULL BODY and HEAD are completely visible, do not crop the heads. The left side is empty space. Clean, sleek, highly detailed vector style, flat design. Neutral tones with [COR DA LEI, ex: dark red/burgundy, golden/amber, dark blue] accents and background features, with [COR] traces. ABSOLUTELY NO TEXT, NO LOGOS, NO WRITING."

*A cor da lei pode ser conferida no arquivo `src/lib/leiTheme.ts`.*

## 3. Fluxo de Geração e Preenchimento (Padding)
As imagens geradas pela IA costumam ser quadradas (1:1). Como a UI na tela `CategoriaLegislacao` utiliza um `ShapeGrid` animado atrás e um corte diagonal na esquerda, a imagem deve ser "esticada" para a esquerda com a cor do fundo.

Utilize um script `.cjs` (Node.js) para fazer a requisição via API e, em seguida, fazer o padding automático utilizando a biblioteca `jimp`:

```javascript
// Exemplo do trecho de Padding via Jimp (após salvar a imagem na pasta assets):
const Jimp = require('jimp');
const img = await Jimp.read(destPath);
const width = img.bitmap.width;
const height = img.bitmap.height;
// Dobrar a largura
const newWidth = width * 2;
// Obter a cor de fundo original (canto superior esquerdo)
const bgColor = img.getPixelColor(0, 0);

const newImg = new Jimp(newWidth, height, bgColor); 
// Colar a imagem original na extremidade direita
newImg.composite(img, width, 0);
await newImg.writeAsync(destPath); // Salvar sobrepondo a imagem gerada
```

## 4. Integração na Interface
Após gerar a imagem `.jpg` na pasta `src/assets/lei-cover-[id].jpg`, você deve registrar a nova capa:
1. Em `src/lib/coverLoader.ts`: Faça o import (`import [id] from '@/assets/lei-cover-[id].jpg'`) e adicione no objeto `COVERS`.
2. Em `src/lib/leiTheme.ts`: Mapeie a lei no objeto `COVER_MAP` para usar `COVERS.[id]`.

## 5. Fundo Animado (UI)
Na tela `CategoriaLegislacao.tsx`, certifique-se de que o fundo animado (`ShapeGrid`) seja renderizado **sobre** a parte escura da capa, atrás do texto, usando a propriedade CSS `mix-blend-screen opacity-80` sobre um contêiner posicionado abaixo do painel esquerdo. O layout implementado já trata isso, garanta apenas que futuras edições não o desconfigurem.
