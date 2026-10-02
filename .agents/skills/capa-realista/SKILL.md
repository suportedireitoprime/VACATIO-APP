---
name: capa-realista
description: >-
  Use this skill to generate highly realistic, cinematic cover images for legislation in the VACATIO APP, matching the original CLT cover style.
---

# Design de Capas Realistas para Legislação

Siga estas instruções rigorosamente para manter a consistência visual das capas realistas de leis no aplicativo VACATIO.

## 1. Princípios Visuais da Capa Realista
- **Estilo:** Cinematic, ultra-realistic, highly detailed photography, dramatic lighting, 8k resolution. O visual deve lembrar cenas realistas de filmes.
- **Tamanho e Posição:** O personagem deve estar **obrigatoriamente do LADO DIREITO**. A cabeça e o corpo devem estar bem enquadrados, em perfil ou meio perfil. O lado esquerdo deve ser espaço vazio escuro/sombreado.
- **Sem Texto:** A capa NUNCA pode ter palavras, letras ou qualquer tipo de texto.
- **Cores:** Tons escuros e dramáticos, acompanhados da cor específica da lei (conforme a paleta do painel) ditando a iluminação e os reflexos/background.

## 2. Padrão de Prompt (Base)
Ao utilizar a API de geração de imagens, utilize a seguinte estrutura de prompt:

> "A highly realistic, cinematic photography of [SUJEITO, ex: a construction worker looking to the side, a judge in a courtroom], representing [NOME DA LEI]. DO NOT INCLUDE ANY WORDS, LETTERS, OR TEXT. NO TEXT ALLOWED. The character standing entirely on the RIGHT SIDE of the frame, looking towards the left. THE CHARACTER MUST BE PROMINENT. Ensure the FULL HEAD is completely visible. The entire left side must be dark, empty space for UI text. Cinematic lighting, photorealistic, 8k resolution. Dark dramatic tones with [COR DA LEI, ex: teal/dark green, burgundy] lighting accents and background glow. ABSOLUTELY NO TEXT, NO LOGOS, NO WRITING."

*A cor da lei pode ser conferida no arquivo `src/lib/leiTheme.ts`.*

## 3. Integração na Interface
Após gerar a imagem `.jpg` ou `.webp` na pasta `src/assets/lei-cover-[id].webp`, você deve registrar a nova capa:
1. Em `src/lib/coverLoader.ts`: Faça o import (`import [id] from '@/assets/lei-cover-[id].webp'`) e adicione no objeto `COVERS`.
2. Em `src/lib/leiTheme.ts`: Mapeie a lei no objeto `COVER_MAP` para usar `COVERS.[id]`.
