# Padrão visual das capas do Blog

> Fonte de verdade: `src/data/blogCoverStyle.json`
> Referência visual canônica: `src/assets/blog/o-contrato-social.webp`

Todas as novas capas do blog **devem** seguir este padrão. Não misture com fotos, aquarela, cenário 3D ou fundos coloridos.

## Regras rígidas

- **Fundo**: preto puro `#000000`. Nada de gradiente, nada de cenário.
- **Figura**: uma só, centralizada, meio-corpo/busto.
- **Adereço**: um único símbolo temático ao lado — **diferente em cada capa** (coluna, livro, balança, pena, martelo, pergaminho, algemas, cofre, engrenagem, urna, chave, tocha, coroa de louros…).
- **Estilo**: cartoon vetorial com contornos pretos grossos, sombreamento chapado em 2-3 tons.
- **Paleta base**: bege `#EFE0C4`, neutro quente `#C9A26A`, marrom escuro `#6B3F1D`, destaque `#F5E9CE`.
- **Acento de cor por tema**: cada tema tem uma cor obrigatória (ver `theme_accents` em `blogCoverStyle.json`) que **deve dominar** roupa, adereço e traços internos. Ex.: Direito Penal = vermelho sangue `#EF4444`; Constitucional = azul-royal; Tributário = verde-cofre; Trabalho = amarelo.
- **Iluminação**: frontal, chapada.
- **Texto**: nenhum. Exceção: um título curto em maiúsculas na capa de um livro/pergaminho.

## Regras anti-repetição (importantes)

- **NUNCA** reutilize a mesma composição, o mesmo sujeito ou o mesmo adereço em capas diferentes — mesmo dentro do mesmo tema. Se uma capa já usou "estudante + livro + coluna", a próxima precisa variar sujeito **e** adereço.
- Antes de gerar, olhe o que já existe em `src/assets/blog/` e escolha um combo novo.
- Se duas capas ficarem visualmente parecidas (mesmo tom, mesmo objeto), regere uma delas.

## Como gerar uma nova capa

Use `imagegen--generate_image` com o `prompt_template` de `blogCoverStyle.json`, substituindo:

- `{SUJEITO}`: quem aparece (varie rosto, idade, gênero, vestuário).
- `{ADORNO}`: o objeto ao lado, único por capa.
- `{ACCENT_HEX}` e `{ACCENT_NAME}`: pegue da entrada do tema em `theme_accents`.

Configuração recomendada:

- `model`: `standard`
- `width` / `height`: `1024 x 1024`
- `transparent_background`: `false`
- `target_path`: `src/assets/blog/<slug>.webp`

## Como usar no código

1. Salve a imagem em `src/assets/blog/<slug>.webp`.
2. Importe no topo de `src/data/blogPosts.ts`:
   ```ts
   import minhaCapa from '@/assets/blog/<slug>.webp';
   ```
3. Use como `imagem_url` do post.

## Exemplos canônicos

- `o-contrato-social.webp` — Rousseau, livro "CONTRATO SOCIAL", coluna jônica (Filosofia, violeta).
- `o-que-e-direito.webp` — estudante segurando livro "DIREITO" (Iniciantes, âmbar).

