import express from 'express';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

// Carregar variáveis de ambiente
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_KEY || '';
const BUCKET_NAME = process.env.SUPABASE_STORAGE_BUCKET || 'aprender-leis-imagens';
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3333;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.warn('⚠️ AVISO: SUPABASE_URL ou SUPABASE_KEY não configurados no .env do MCP Server.');
}

// Inicializar cliente Supabase
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

/**
 * Cria e configura a instância do MCP Server com todas as ferramentas de Legal Design
 */
function buildMcpServer() {
  const server = new McpServer({
    name: 'vacatio-aprender-leis-mcp',
    version: '1.0.0',
  });

  // 1. TOOL: Listar Prompts Pendentes
  server.tool(
    'listar_prompts_pendentes',
    'Lista slides de aulas de legislação que possuem prompt formulado mas ainda não têm imagem gerada',
    {
      lei_id: z.string().optional().describe('Filtro opcional pelo ID da lei (ex: "codigo_penal", "cf88")'),
      limite: z.number().optional().default(10).describe('Quantidade máxima de itens a retornar (padrão: 10)'),
    },
    async ({ lei_id, limite }) => {
      try {
        let query = supabase
          .from('aprender_leis_imagens')
          .select('*')
          .eq('status', 'pending')
          .order('created_at', { ascending: true })
          .limit(limite || 10);

        if (lei_id) {
          query = query.eq('lei_id', lei_id);
        }

        const { data, error } = await query;

        if (error) {
          return {
            content: [{ type: 'text', text: `Erro ao consultar Supabase: ${error.message}` }],
            isError: true,
          };
        }

        if (!data || data.length === 0) {
          return {
            content: [{ type: 'text', text: 'Nenhum slide com imagem pendente encontrado no momento.' }],
          };
        }

        const resumo = data.map((item: any) => ({
          id: item.id,
          lei: item.lei_id,
          artigo: item.artigo_numero,
          dispositivo: item.dispositivo,
          slide: `Slide ${item.slide_ordem}: ${item.slide_titulo}`,
          dimensao: item.dimensao || '16:9',
          prompt: item.image_prompt,
        }));

        return {
          content: [
            {
              type: 'text',
              text: `Encontrados ${data.length} prompts pendentes para geração:\n\n${JSON.stringify(resumo, null, 2)}`,
            },
          ],
        };
      } catch (err: any) {
        return {
          content: [{ type: 'text', text: `Exceção ao listar prompts: ${err.message}` }],
          isError: true,
        };
      }
    }
  );

  // 2. TOOL: Obter Prompt Detalhado do Slide
  server.tool(
    'obter_prompt_slide',
    'Obtém o prompt de imagem completo e as instruções de estilo visual de um slide específico',
    {
      slide_id: z.string().describe('UUID do registro em aprender_leis_imagens'),
    },
    async ({ slide_id }) => {
      try {
        const { data, error } = await supabase
          .from('aprender_leis_imagens')
          .select('*')
          .eq('id', slide_id)
          .single();

        if (error || !data) {
          return {
            content: [{ type: 'text', text: `Slide não encontrado para o ID: ${slide_id}` }],
            isError: true,
          };
        }

        const instrucoesArtisticas = {
          id: data.id,
          artigo: data.artigo_numero,
          dispositivo: data.dispositivo,
          titulo: data.slide_titulo,
          dimensao_recomendada: data.dimensao || '16:9',
          prompt_principal: data.image_prompt,
          diretrizes_estilo: [
            'Proporção 16:9 widescreen para encaixar nos cards e slides do app',
            'Iluminação suave com tons de teal (#14b8a6), dourado e ardósia escuro',
            'Composição limpa, minimalista e moderna (Legal Design)',
            'Sem textos esquisitos ou caracteres ilegíveis gerados na imagem',
          ],
        };

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(instrucoesArtisticas, null, 2),
            },
          ],
        };
      } catch (err: any) {
        return {
          content: [{ type: 'text', text: `Exceção ao obter prompt: ${err.message}` }],
          isError: true,
        };
      }
    }
  );

  // 3. TOOL: Upload de Imagem Gerada (Base64 ou URL)
  server.tool(
    'upload_imagem_gerada',
    'Faz o upload da imagem gerada pelo Gemini Spark diretamente no Supabase Storage e atualiza o slide',
    {
      slide_id: z.string().describe('UUID do slide em aprender_leis_imagens'),
      imagem_base64: z.string().optional().describe('Conteúdo da imagem em base64 (sem o prefixo data:image/...)'),
      image_url_externa: z.string().optional().describe('URL pública temporária da imagem se já tiver sido gerada pelo modelo'),
      mime_type: z.string().optional().default('image/png').describe('Tipo MIME da imagem (padrão: image/png ou image/webp)'),
    },
    async ({ slide_id, imagem_base64, image_url_externa, mime_type }) => {
      try {
        // 1. Buscar o slide para pegar informações do caminho
        const { data: slide, error: errSlide } = await supabase
          .from('aprender_leis_imagens')
          .select('*')
          .eq('id', slide_id)
          .single();

        if (errSlide || !slide) {
          return {
            content: [{ type: 'text', text: `Slide não encontrado: ${slide_id}` }],
            isError: true,
          };
        }

        let publicUrl = '';
        let storagePath = '';

        // Cenário A: Recebeu base64
        if (imagem_base64) {
          const buffer = Buffer.from(imagem_base64.replace(/^data:image\/\w+;base64,/, ''), 'base64');
          const safeLei = (slide.lei_id || 'geral').replace(/[^a-zA-Z0-9_-]/g, '_');
          const safeArt = (slide.artigo_numero || 'artigo').replace(/[^a-zA-Z0-9_-]/g, '_');
          const ext = mime_type.includes('webp') ? 'webp' : 'png';
          storagePath = `${safeLei}/${safeArt}/slide_${slide.slide_ordem}_${Date.now()}.${ext}`;

          const { error: errUpload } = await supabase.storage
            .from(BUCKET_NAME)
            .upload(storagePath, buffer, {
              contentType: mime_type || 'image/png',
              upsert: true,
            });

          if (errUpload) {
            return {
              content: [{ type: 'text', text: `Erro no upload ao Storage: ${errUpload.message}` }],
              isError: true,
            };
          }

          const { data: urlData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(storagePath);
          publicUrl = urlData.publicUrl;
        } 
        // Cenário B: Recebeu URL direta
        else if (image_url_externa) {
          publicUrl = image_url_externa;
          storagePath = 'external_url';
        } else {
          return {
            content: [{ type: 'text', text: 'Você deve fornecer "imagem_base64" ou "image_url_externa".' }],
            isError: true,
          };
        }

        // 2. Atualizar o registro no banco
        const { error: errUpdate } = await supabase
          .from('aprender_leis_imagens')
          .update({
            image_url: publicUrl,
            storage_path: storagePath,
            status: 'ready',
            updated_at: new Date().toISOString(),
          })
          .eq('id', slide_id);

        if (errUpdate) {
          return {
            content: [{ type: 'text', text: `Imagem enviada ao Storage (${publicUrl}), mas erro ao atualizar banco: ${errUpdate.message}` }],
            isError: true,
          };
        }

        return {
          content: [
            {
              type: 'text',
              text: `✅ Imagem gerada e vinculada com sucesso!\n- Slide ID: ${slide_id}\n- Artigo: ${slide.artigo_numero} (${slide.dispositivo})\n- URL Pública: ${publicUrl}`,
            },
          ],
        };
      } catch (err: any) {
        return {
          content: [{ type: 'text', text: `Exceção ao fazer upload da imagem: ${err.message}` }],
          isError: true,
        };
      }
    }
  );

  // 4. TOOL: Salvar URL Manual da Imagem
  server.tool(
    'salvar_url_imagem',
    'Salva diretamente uma URL pública no slide de legislação',
    {
      slide_id: z.string().describe('UUID do slide em aprender_leis_imagens'),
      image_url: z.string().url().describe('URL completa e pública da imagem'),
    },
    async ({ slide_id, image_url }) => {
      try {
        const { error } = await supabase
          .from('aprender_leis_imagens')
          .update({
            image_url,
            status: 'ready',
            updated_at: new Date().toISOString(),
          })
          .eq('id', slide_id);

        if (error) {
          return {
            content: [{ type: 'text', text: `Erro ao salvar URL: ${error.message}` }],
            isError: true,
          };
        }

        return {
          content: [
            {
              type: 'text',
              text: `✅ URL salva com sucesso para o slide ${slide_id}: ${image_url}`,
            },
          ],
        };
      } catch (err: any) {
        return {
          content: [{ type: 'text', text: `Exceção: ${err.message}` }],
          isError: true,
        };
      }
    }
  );

  // 5. TOOL: Criar Novo Prompt de Imagem para Artigo
  server.tool(
    'criar_prompt_artigo',
    'Cria um novo registro de prompt de imagem para um slide de legislação no Supabase',
    {
      lei_id: z.string().describe('ID da lei (ex: "codigo_penal", "cf88", "clt")'),
      artigo_numero: z.string().describe('Número do artigo (ex: "Art. 1º", "Art. 5º")'),
      dispositivo: z.string().default('Caput').describe('Dispositivo legal (Caput, Inciso I, Parágrafo único)'),
      slide_ordem: z.number().default(1).describe('Ordem do slide (1, 2, 3...)'),
      slide_titulo: z.string().describe('Título didático do slide'),
      image_prompt: z.string().describe('Prompt artístico detalhado em inglês ou português'),
      dimensao: z.string().optional().default('16:9').describe('Proporção (16:9, 1:1)'),
    },
    async ({ lei_id, artigo_numero, dispositivo, slide_ordem, slide_titulo, image_prompt, dimensao }) => {
      try {
        const { data, error } = await supabase
          .from('aprender_leis_imagens')
          .insert({
            lei_id,
            artigo_numero,
            dispositivo,
            slide_ordem,
            slide_titulo,
            image_prompt,
            dimensao: dimensao || '16:9',
            status: 'pending',
          })
          .select()
          .single();

        if (error) {
          return {
            content: [{ type: 'text', text: `Erro ao criar prompt no Supabase: ${error.message}` }],
            isError: true,
          };
        }

        return {
          content: [
            {
              type: 'text',
              text: `✅ Novo prompt criado com sucesso!\nID: ${data.id}\nArtigo: ${artigo_numero} (${dispositivo})\nPrompt: ${image_prompt}`,
            },
          ],
        };
      } catch (err: any) {
        return {
          content: [{ type: 'text', text: `Exceção: ${err.message}` }],
          isError: true,
        };
      }
    }
  );

  return server;
}

// Iniciar servidor em modo Stdio ou HTTP/SSE conforme os argumentos
async function main() {
  const isStdio = process.argv.includes('--stdio');

  if (isStdio) {
    // Modo Stdio (para Claude Desktop, Cursor, Gemini CLI local)
    const server = buildMcpServer();
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error('🚀 Servidor MCP VACATIO Aprender Leis iniciado via STDIO.');
  } else {
    // Modo HTTP / SSE (para Google Gemini Spark e conexões pela rede)
    const app = express();
    app.use(express.json({ limit: '50mb' }));

    // Habilitar CORS para permitir requisições de agentes externos
    app.use((_req, res, next) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      next();
    });

    const server = buildMcpServer();
    let sseTransport: SSEServerTransport | null = null;

    // Endpoint de Verificação de Saúde
    app.get('/health', (_req, res) => {
      res.json({
        status: 'ok',
        service: 'vacatio-aprender-leis-mcp',
        timestamp: new Date().toISOString(),
        supabaseConfigured: Boolean(SUPABASE_URL && SUPABASE_KEY),
      });
    });

    // Endpoint SSE para Google Gemini Spark
    app.get('/sse', async (req, res) => {
      console.log('📡 Nova conexão SSE estabelecida a partir de:', req.ip);
      sseTransport = new SSEServerTransport('/messages', res);
      await server.connect(sseTransport);
    });

    // Endpoint POST para mensagens do cliente MCP
    app.post('/messages', async (req, res) => {
      if (sseTransport) {
        await sseTransport.handlePostMessage(req, res, req.body);
      } else {
        res.status(400).json({ error: 'Nenhuma conexão SSE ativa no momento.' });
      }
    });

    // Endpoint REST complementar para visualização rápida no navegador
    app.get('/api/prompts/pendentes', async (_req, res) => {
      const { data, error } = await supabase
        .from('aprender_leis_imagens')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: true });

      if (error) {
        return res.status(500).json({ error: error.message });
      }
      res.json({ total: data?.length || 0, prompts: data || [] });
    });

    app.listen(PORT, () => {
      console.log(`====================================================`);
      console.log(`🏛️  VACATIO APP — Servidor MCP para Gemini Spark`);
      console.log(`📡 URL SSE: http://localhost:${PORT}/sse`);
      console.log(`🩺 Health:  http://localhost:${PORT}/health`);
      console.log(`📋 Status:  Pronto para conexões do Google Gemini Spark`);
      console.log(`====================================================`);
    });
  }
}

main().catch((err) => {
  console.error('❌ Falha fatal ao iniciar servidor MCP:', err);
  process.exit(1);
});
