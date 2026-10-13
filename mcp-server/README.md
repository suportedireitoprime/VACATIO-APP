# 🏛️ VACATIO APP — Servidor MCP para Google Gemini Spark
## Automação de Geração de Imagens & Legal Design via Model Context Protocol

Este servidor implementa o padrão aberto **Model Context Protocol (MCP)** para permitir que o **Google Gemini Spark** (ou qualquer cliente compatível, como Claude Desktop, Cursor ou Gemini CLI) se conecte diretamente ao **Supabase** do VACATIO APP, leia prompts de imagens das aulas de legislação, gere as ilustrações e faça o upload automático no **Supabase Storage**.

---

### 📦 Instalação

Dentro da pasta `mcp-server`:

```bash
cd mcp-server
npm install
```

As variáveis de ambiente já foram configuradas no arquivo `.env`.

---

### 🚀 Como Iniciar o Servidor

#### Modo HTTP / SSE (Recomendado para Google Gemini Spark)
O Gemini Spark conecta através de conexões de rede seguras via Server-Sent Events (SSE):

```bash
npm run start
```
O servidor iniciará na porta `3333` com as rotas:
- **SSE Endpoint:** `http://localhost:3333/sse`
- **Messages Endpoint:** `http://localhost:3333/messages`
- **Health Check:** `http://localhost:3333/health`

---

### 🌐 Conectando com o Google Gemini Spark

Como o **Gemini Spark** roda em servidores do Google na nuvem, ele precisa de uma URL pública acessível pela internet para alcançar o endpoint `/sse`.

#### Passo 1: Expor o Servidor Local via Túnel
Você pode usar qualquer ferramenta de túnel gratuita:

```bash
# Opção A: Localtunnel (sem cadastro)
npx localtunnel --port 3333

# Opção B: Cloudflare Tunnel (recomendado, estável)
cloudflared tunnel --url http://localhost:3333

# Opção C: Ngrok
ngrok http 3333
```

Copie a URL pública gerada (exemplo: `https://vacatio-mcp.loca.lt`).

#### Passo 2: Configurar no Gemini Spark
1. No painel de configuração do seu Agente no **Gemini Spark**, vá em **Tools / Integrações / MCP Servers**.
2. Adicione um novo servidor:
   - **Nome:** `VACATIO Aprender Leis Imagens`
   - **URL:** `https://sua-url-publica.com/sse`
3. Salve a configuração. O Gemini Spark agora tem acesso às 5 ferramentas do VACATIO APP!

---

### 🛠️ Ferramentas Disponíveis no MCP

1. **`listar_prompts_pendentes`**:
   - Retorna os slides aguardando imagem gerada.
2. **`obter_prompt_slide`**:
   - Retorna o prompt detalhado e diretrizes artísticas (proporção 16:9, cores).
3. **`upload_imagem_gerada`**:
   - Recebe a imagem gerada (base64 ou URL), salva no Storage do Supabase e atualiza o slide.
4. **`salvar_url_imagem`**:
   - Permite vincular uma URL pública existente a um slide.
5. **`criar_prompt_artigo`**:
   - Permite ao Spark criar novos prompts no banco.

---

### 🤖 Exemplo de Prompt de Instrução para o Gemini Spark

Cole esta instrução no seu agente do Gemini Spark:

> *"Atue como o Designer Visual do VACATIO APP. Use a ferramenta `listar_prompts_pendentes` para encontrar slides sem imagens. Para cada slide encontrado, leia o prompt detalhado com `obter_prompt_slide`, gere uma ilustração no estilo indicado (16:9 widescreen, clean legal design, fundo escuro) e envie a imagem usando a ferramenta `upload_imagem_gerada`."*
