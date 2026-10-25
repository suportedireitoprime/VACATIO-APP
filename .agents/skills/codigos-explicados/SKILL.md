---
name: codigos-explicados
description: >-
  Instruções completas para estruturar, gerar (via OmniRoute) e renderizar as abas do menu de alternância de cada artigo de lei no VACATIO APP: Artigo, Ideia, Explicação, Desdobramento, Exemplo Prático, Termos e Jurisprudência.
---

# SKILL: App Códigos Explicados (Artigo por Artigo)

## Para que serve

Produzir e renderizar, com excelência didática e visual refinado, um ambiente no VACATIO APP que explica qualquer código ou estatuto artigo por artigo, em formato vertical mobile-first e responsivo. Cada artigo conta com o texto oficial da lei e camadas de aprofundamento progressivo através do **Menu de Alternância** (as abas do artigo).

Use esta skill sempre que for:
1. Adicionar ou manter as abas no menu de alternância do artigo (`ArtigoBottomSheet.tsx`).
2. Criar prompts e rotinas de geração com IA via **OmniRoute** (`generateOmniText`).
3. Popular ou revisar os dados de artigos (manualmente ou em lote via robô).
4. Gerar arquivos de estudo em Markdown por artigo.

---

## O Menu de Alternância (As 7 Abas na Ordem Oficial)

Cada artigo abre com cabeçalho da lei/estatuto, distintivo do artigo, título e botões de ação. Logo abaixo fica o menu de alternância com as abas, na seguinte ordem obrigatória:

1. **Artigo** (Texto oficial da lei)
2. **Ideia** (A síntese mental essencial)
3. **Explicação** (A anatomia didática em 3 partes + pegadinha)
4. **Raio-X** (Análise cirúrgica trecho por trecho, palavra por palavra)
5. **Exemplo Prático** (Histórias reais com personagens e desfecho)
6. **Termos** (Glossário simples vs. técnico)
7. **Jurisprudência** (3 julgados de tribunais superiores com link real)
*(Aba adicional condicional: **Histórico**, exibida quando o artigo possui notas de alteração/redação/revogação).*

---

## Especificação de Cada Aba e Prompts para OmniRoute

### 1. Aba "Artigo"
- **O que vai dentro**: Apenas a caixa com o texto oficial da lei com o selo "Texto oficial da lei".
- **Origem**: Conferido no site do Planalto, com incisos, parágrafos e alíneas exatamente como estão na norma vigente, preservando anotações de redação e revogações.

---

### 2. Aba "Ideia"
- **O que vai dentro**: A ideia central do artigo em um cartão de alto destaque visual com gradiente na cor da lei/código.
- **Função pedagógica**: Uma ou duas frases diretas que respondem: *"O que este artigo decide, no fundo?"*. É a porta de entrada mental do estudante para o dispositivo.
- **Diretriz de estilo**: Direto ao ponto, sem preâmbulos, linguagem marcante e memorável.
- **Prompt OmniRoute (`mode === 'ideia'`)**:
```typescript
const sysIdeia = `Você é um jurista e professor que formula a ideia central de artigos de lei para estudantes e concurseiros.
Sua missão é entregar a PORTA DE ENTRADA MENTAL do artigo em 1 ou 2 frases curtas, profundas e diretas.

REGRAS:
- Responda em 1 a 2 frases no máximo (60 a 90 palavras).
- Responda à pergunta: "No fundo, o que este artigo decide ou garante?"
- Linguagem humana, acolhedora e impactante.
- NUNCA se apresente, nunca use saudações, nunca use preâmbulos como "Este artigo trata de" ou "Em suma".
- NUNCA use travessão (—). Use vírgula, dois-pontos ou parênteses.
- Destaque em **negrito** os 2 ou 3 conceitos-chave.`;
```

---

### 3. Aba "Explicação"
- **O que vai dentro**:
  - Abre sempre com a frase padrão: *"Esta é a explicação detalhada do artigo N do Código X."*
  - Exatamente 3 seções curtas e diretas:
    1. O que o artigo decide no mundo real.
    2. A distinção central que ele cria.
    3. O erro mais comum de quem estuda.
  - Caixa de fechamento: **Resumo do artigo**.
  - Cartão destacado: **Pegadinha de prova**, com a confusão clássica de exame e a forma correta de pensar.
- **Prompt OmniRoute (`mode === 'explicacao'`)**:
```typescript
const sysExplicacao = `Você é uma professora de Direito de excelência que explica artigos de forma humana, clara e rigorosa.
Regras de estilo:
- Sem saudações nem apresentações. Entre direto na frase padrão.
- NUNCA use travessão.
- Use o delimitador "---SECAO---" para separar cada bloco.

ESTRUTURA OBRIGATÓRIA:
Frase de abertura: "Esta é a explicação detalhada do [Artigo/Lei]."
---SECAO---
## 1. O que este artigo decide
[Explicação direta do comando da norma]
---SECAO---
## 2. A distinção central
[A fronteira ou critério jurídico que o artigo cria]
---SECAO---
## 3. O erro mais comum
[Onde as pessoas costumam errar na interpretação]
---SECAO---
## Resumo do artigo
[Síntese em tópicos rápidos]
---SECAO---
## Pegadinha de prova
[A armadilha clássica de concurso/OAB e como acertar com segurança]`;
```

---

### 4. Aba "Raio-X" (Análise Trecho por Trecho)
- **O que vai dentro**: Um cartão individual para cada trecho do artigo (caput, cada inciso e cada parágrafo isoladamente; nunca em bloco).
- **Conteúdo de cada trecho**:
  1. **Título do trecho** (ex: "Caput", "Parágrafo único", "Inciso I").
  2. **Texto explicativo** em linguagem simples e completa.
  3. Caixa destacada **"Por que a lei fez assim?"**, explicando a intenção do legislador e o motivo da escolha daquela regra.
  4. Seção **"Palavra por palavra deste trecho"**: cartões para palavras-chave decisivas com:
     - *O que significa aqui*
     - *Por que a lei escolheu esta palavra*
     - *E se fosse outra?* (o que mudaria se fosse trocada).
- **Prompt OmniRoute (`mode === 'desdobramento'`)**:
```typescript
const sysDesdobramento = `Você é um jurista analítico especialista em hermenêutica legislativa.
Você deve destrinchar o artigo trecho por trecho (Caput, cada Parágrafo, cada Inciso).
NUNCA agrupe incisos ou parágrafos. Cada um tem seu próprio trecho.

Para CADA trecho, use o marcador:
---TRECHO---
## [Nome do Trecho: ex: Caput, Parágrafo único, Inciso I]
**Texto do trecho**: [reprodução exata daquele trecho]

### Explicação do trecho
[Explicação humana, didática e clara da regra deste trecho]

### Por que a lei fez assim?
[A justificativa e razão de ser da escolha do legislador]

### Palavra por palavra deste trecho
---PALAVRA---
**Palavra**: [termo decisivo]
- **O que significa aqui**: [significado no contexto]
- **Por que a lei escolheu esta palavra**: [razão técnica da escolha]
- **E se fosse outra?**: [efeito prático e perigo se fosse utilizado sinônimo inadequado]`;
```

---

### 5. Aba "Exemplo Prático"
- **O que vai dentro**: Casos concretos com personagens nomeados para cada trecho do artigo, ilustrando a regra na vida real.
- **Desfecho jurídico**: Caixa final de cada caso explicando a solução técnica baseada na lei.
- **Prompt OmniRoute (`mode === 'exemplo'`)**:
```typescript
const sysExemplo = `Você é um professor de Direito que cria casos práticos do cotidiano para fixação jurídica.
Crie histórias realistas com personagens com nome (ex: Dona Clara, Lucas, Mariana) aplicando a regra da lei.

Separe os exemplos com:
---EXEMPLO---
## Caso Prático: [Título Curto e Chamativo]
**Situação**: [Narrativa envolvente do fato concreto na vida real]

### Desfecho jurídico
[Aplicação exata do artigo demonstrando a consequência jurídica e a solução do caso]`;
```

---

### 6. Aba "Termos"
- **O que vai dentro**: Glossário jurídico do artigo, dividido por trecho, com duas camadas para cada termo:
  1. **Definição simples**: linguagem cotidiana, como explicar a um leigo.
  2. **Definição técnica**: linguagem jurídica precisa para provas e petições.
- **Prompt OmniRoute (`mode === 'termos'`)**:
```typescript
const sysTermos = `Você é um glossarista jurídico. Identifique todos os termos jurídicos e técnicos presentes no artigo.
Separe cada termo com:
---TERMO---
## [Termo Jurídico]
- **Definição simples**: [Em palavras cotidianas, acessíveis para qualquer pessoa]
- **Definição técnica**: [Rigor doutrinário e jurisprudencial exato]`;
```

---

### 7. Aba "Jurisprudência"
- **O que vai dentro**: Cartões com **até 3 julgados reais e verificados** de tribunais superiores (STF e STJ) ou súmulas diretamente ligadas ao artigo.
- **Regra de integridade**: A meta é 3 julgados. Se houver apenas 2 ou 1 tema de repercussão geral/recurso repetitivo relevante, apresente os que existem. NUNCA invente número de processo ou ementa.
- **Campos de cada julgado**:
  - **Tribunal, Processo e Ano**: ex: "STF - RE 1.234.567 (Tema 999) - 2021" ou "STJ - Súmula 642 - 2020".
  - **O caso concreto / Situação**: O que estava em disputa.
  - **O que foi decidido (Tese)**: O entendimento fixado pelo tribunal.
  - **Por que importa para este artigo**: Como o julgado delimita ou aplica o artigo.
  - **Link oficial**: Link clicável verificado (portal do STF, STJ, DJe ou busca oficial).
- **Prompt OmniRoute (`mode === 'jurisprudencia'`)**:
```typescript
const sysJurisprudencia = `Você é um pesquisador sênior de jurisprudência dos Tribunais Superiores (STF e STJ).
Sua missão é apresentar até 3 precedentes judiciais REAIS, HISTÓRICOS ou SÚMULAS vinculados diretamente ao artigo legal informado.

REGRAS:
- Apenas julgados reais e verificáveis do STF ou STJ (Súmulas, Temas de Repercussão Geral, Recursos Repetitivos, ADIs, REsps marcantes).
- NUNCA invente números de processos. Se houver súmula do tribunal sobre o artigo, cite-a.
- NUNCA use travessão.

Separe cada julgado com:
---JULGADO---
## [Tribunal] - [Processo / Súmula / Tema] ([Ano])
- **O Caso**: [Resumo em linguagem simples do conflito que chegou ao tribunal]
- **A Decisão**: [A tese jurídica fixada pelo tribunal]
- **Por que importa para o artigo**: [Como esse precedente orienta a aplicação prática deste artigo]
- **Fonte oficial**: [URL oficial do STF/STJ/DJe ou termo de consulta exato]`;
```

---

## Integração Técnica no VACATIO APP

1. **Cliente de IA**: Uso de `generateOmniText({ prompt, systemPrompt, complexity: 'low' })` em `src/lib/omniRouteClient.ts` com gateway configurado para o modelo `antigravity/gemini-3.8-flash-tiered`.
2. **Camadas de Cache**:
   - **Local Instantâneo**: `getLocalAiCache` e `setLocalAiCache` em `src/lib/aiCacheLocal.ts` via localStorage (`ai_cache:v1:tabela|numero|tipo`).
   - **Nuvem Supabase**: Tabela `artigo_ai_cache` com campos `tabela_codigo`, `numero_artigo`, `tipo`, `conteudo`.
   - **Fallback Pré-alimentado**: Se a rede falhar ou para artigos fundamentais (como ECA Arts. 1º a 3º), os dados pré-gerados residem no bundle (`src/data/artigosExplicadosData.ts`), garantindo renderização instantânea offline.
3. **Padrão Visual**:
   - Modo escuro (#121212 / #1c1c1c), bordas sutis com opacidade, tipografia escalável com controles de fonte (`fontSize`), suporte a haptics nativos e animações com `framer-motion`.
