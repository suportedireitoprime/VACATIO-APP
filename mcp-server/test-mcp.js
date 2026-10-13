/**
 * Script de teste de conectividade e validação do servidor MCP
 * Execute com: node test-mcp.js
 */

const BASE_URL = process.env.MCP_URL || 'http://localhost:3333';

async function testarServidor() {
  console.log(`\n🔍 Testando Servidor MCP em: ${BASE_URL}...\n`);

  try {
    // 1. Health check
    const resHealth = await fetch(`${BASE_URL}/health`);
    const healthJson = await resHealth.json();
    console.log('✅ 1. Health Check OK:', healthJson);

    // 2. Consulta REST de prompts pendentes
    const resPrompts = await fetch(`${BASE_URL}/api/prompts/pendentes`);
    const promptsJson = await resPrompts.json();
    console.log(`✅ 2. API de Prompts Pendentes OK: Total = ${promptsJson.total}`);

    console.log('\n🎉 Servidor MCP operacional e pronto para o Google Gemini Spark!\n');
  } catch (err) {
    console.error('❌ Falha ao conectar no servidor MCP:', err.message);
    console.log('💡 Dica: Certifique-se de que o servidor está rodando com: npm run start dentro da pasta mcp-server.');
  }
}

testarServidor();
