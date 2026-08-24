# Gemini 2.5 Flash-Lite — Referência oficial

> Fonte canônica: https://ai.google.dev/gemini-api/docs/models/gemini-2.5-flash-lite?hl=pt-br
> Última sincronização: 2026-07-19

Este documento é a **fonte de verdade** para o modelo de texto/multimodal usado
no app. Qualquer chamada Gemini para texto DEVE usar `gemini-2.5-flash-lite`.
Não use `gemini-2.5-flash`, `gemini-2.5-pro`, `gemini-3-*` ou variantes preview.

## Resumo

Modelo multimodal mais econômico do Google, com o desempenho mais rápido para
tarefas leves e de alta frequência. Ideal para classificação de alto volume,
extração de dados simples e aplicativos de latência extremamente baixa em que
orçamento e velocidade são as principais restrições.

## Especificações

| Propriedade | Descrição |
| --- | --- |
| Código do modelo | `gemini-2.5-flash-lite` |
| Entradas suportadas | Texto, imagem, vídeo, áudio, PDF |
| Saída | Texto |
| Limite de token de entrada | 1.048.576 |
| Limite de token de saída | 65.536 |
| Versão estável | `gemini-2.5-flash-lite` |
| Última atualização | Julho de 2025 |
| Limite de conhecimento | Janeiro de 2025 |

## Recursos suportados

- ✅ Cache de contexto
- ✅ Execução de código
- ✅ Pesquisa de arquivos (File Search)
- ✅ Function calling (chamadas de função)
- ✅ Grounding com Google Search e Google Maps
- ✅ Respostas estruturadas (JSON schema)
- ✅ Raciocínio (thinking)
- ✅ URL context
- ✅ Batch API, Flex e Priority inference
- ❌ Geração de áudio (TTS) — usar `gemini-2.5-flash-preview-tts`
- ❌ Geração de imagem — usar `gemini-2.5-flash-image`
- ❌ Live API

## Como é usado neste app

- Todas as Edge Functions importam o ID pelo módulo central:
  `supabase/functions/_shared/ai-models.ts` → `MODELS.text` /
  `MODELS.textGateway`.
- Não codifique strings como `"gemini-2.5-flash"` diretamente — sempre importe
  do módulo acima. Isso garante que exista uma única fonte a mudar caso o
  Google publique um novo estável.
- TTS e geração de imagem têm modelos próprios (também em `MODELS`).
