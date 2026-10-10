---
name: robo-populador
description: >-
  Instruções para criar e adaptar robôs (scripts em lote) que populam massivamente o banco de dados do Supabase usando OmniRoute para geração de conteúdo (Mapas Mentais, Flashcards, Aulas, etc.).
---

# Robôs Populadores de Conteúdo em Lote

Esta skill define o padrão de como criar robôs geradores de conteúdo no Admin do VACATIO APP, focados em povoamento massivo de banco de dados por inteligência artificial (OmniRoute).

## 1. Localização e Padrão de Arquitetura

Sempre que precisar criar um novo gerador de conteúdo em lote (ex: Gerador de Mapas Mentais, Gerador de Aulas, Gerador de Flashcards):

1. **Evite scripts soltos no terminal**: Embora possíveis, a preferência da aplicação é integrar esses robôs na interface `AdminPopularConteudo.tsx` (ou em abas nela). Isso permite visualização em tempo real (painel verde de logs) e controle de interrupção (AbortController).
2. Se o processamento for pesado demais para o navegador, crie a lógica dividida em lotes (ex: 3 em 3, 5 em 5) usando `await Promise.all(...)`.

## 2. Estrutura Padrão de um Robô

Ao implementar a lógica na UI, siga as etapas abaixo rigorosamente:

### A. Buscas (Queries) com Filtro de Existentes
Para não gerar o que já existe:
```typescript
// 1. Busque o que precisa ser gerado (ex: todos artigos)
const { data: artigos } = await supabase.from('tabela_origem').select('id, texto');

// 2. Busque os itens já gerados
const { data: jaGerados } = await supabase.from('tabela_destino').select('referencia_id');
const setGerados = new Set(jaGerados.map(i => i.referencia_id));

// 3. Filtre o que precisa ser gerado
const paraGerar = artigos.filter(a => !setGerados.has(a.id));
```

### B. Processamento em Lotes (Batching)
A API do OmniRoute ou LLMs possui limites de rate (rate limits). Sempre faça em lote, não promessa disparada sem controle:
```typescript
const BATCH_SIZE = 3; // Padrão seguro para OmniRoute 'low' ou 'tiered'
for (let i = 0; i < paraGerar.length; i += BATCH_SIZE) {
  if (abortController.signal.aborted) break; // Suporte para botão "Parar"
  
  const lote = paraGerar.slice(i, i + BATCH_SIZE);
  
  const promises = lote.map(async (item) => {
    // 1. Prompt específico, forçando JSON
    const res = await generateOmniText({ prompt, systemPrompt: "Apenas JSON.", complexity: 'low' });
    
    // 2. Limpeza do markdown ```json
    let clean = res.replace(/```json/gi, '').replace(/```/g, '').trim();
    clean = clean.substring(clean.indexOf('{'), clean.lastIndexOf('}') + 1);
    const obj = JSON.parse(clean);
    
    // 3. Inserir no Supabase
    await supabase.from('tabela_destino').insert({ ...obj });
  });

  await Promise.all(promises); // Aguarda o lote
  await new Promise(r => setTimeout(r, 2000)); // Pausa entre lotes (Cooldown)
}
```

### C. Tratamento de Erros por Item
Nunca deixe que o erro de um item pare a execução do robô inteiro:
- Coloque o `try/catch` **dentro** da função do `lote.map(async (item) => { ... })`.
- Utilize `addLog()` para registrar o sucesso/falha individualmente, e não em `console.log`.

## 3. Integração na Tela de Popular Conteúdo

Para adicionar um novo robô:
1. Abra `src/pages/AdminPopularConteudo.tsx`.
2. Adicione uma nova *tab* na array `tabs`.
3. Implemente o state e a lógica do novo `startRobot[NovaEntidade]` (ex: `startRobotMapas()`).
4. Duplique e ajuste a interface de logs correspondente quando a *tab* estiver ativa.
