// ═══════════════════════════════════════════════════════════════════════════════
// VACATIO Vade Mecum — Google Apps Script para Geração de Pastas e Google Planilhas
// Pasta Raiz: AUDIO AULAS MUSSE
// Link: https://drive.google.com/drive/folders/1rsvR4YxmtssBSBf-Ymc3Diwo9P61egfA?usp=sharing
// ═══════════════════════════════════════════════════════════════════════════════
//
// COMO UTILIZAR NO GOOGLE DRIVE:
// 1. Acesse https://script.google.com → clique em "Novo projeto"
// 2. Apague o código padrão e cole todo este arquivo
// 3. Clique no ícone de Salvar (Disquete)
// 4. Selecione a função "gerarEstruturaEPlanilhasNoDrive" no topo e clique em "Executar"
// 5. Na primeira vez, o Google pedirá autorização para acessar seu Google Drive e Sheets
// 6. Pronto! O script criará automaticamente:
//    - Pasta "Códigos" (com subpastas: Código Penal, CPC, Código Civil, CLT, etc.)
//    - Pasta "Estatutos" (com subpastas: Estatuto da OAB, ECA, etc.)
//    - Pasta "Constituição" (com subpasta: Constituição Federal de 1988)
//    - E dentro de cada subpasta, uma GOOGLE PLANILHA nativa com:
//      * Coluna A: Número do Artigo (ex: Art. 1º)
//      * Coluna B: Texto do Artigo
//      * Coluna C: Prompt de Guia completo do VACATIO Vade Mecum!
// ═══════════════════════════════════════════════════════════════════════════════

const PASTA_ROOT_ID = '1rsvR4YxmtssBSBf-Ymc3Diwo9P61egfA'; // AUDIO AULAS MUSSE

const SUPABASE_URL = 'https://tlpxubeagmxapkysgobk.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRscHh1YmVhZ214YXBreXNnb2JrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE0OTMzOTYsImV4cCI6MjEwNzA2OTM5Nn0.3qKySrhlG6Kw1ZQYEaK4cELtzG2JlIi_CNHH4FV2ELo';

const PROMPT_TEMPLATE = `Você é o locutor e professor oficial do aplicativo VACATIO Vade Mecum.

DIRETRIZES E REGRAS MANDATÓRIAS:
1. Inicie sempre com uma saudação calorosa, inspiradora e profissional a todos os estudantes e operadores do Direito.
2. Diga com clareza e entusiasmo: "Olá! Seja muito bem-vindo a mais uma áudio-aula exclusiva do VACATIO Vade Mecum."
3. ATENÇÃO ABSOLUTA: NÃO cite em hipótese alguma o nome de apresentadores individuais (nunca invente nem mencione nomes pessoais de locutores). Você representa a voz institucional do VACATIO Vade Mecum.
4. Apresente o conteúdo com a frase: "Hoje vamos analisar detalhadamente o {NUMERO_ARTIGO} da lei {NOME_LEI}."
5. Faça a leitura pontual, solene e precisa do texto oficial do artigo:
"{TEXTO_ARTIGO}"
6. Em seguida, desenvolva uma explicação didática e fluida:
   - Qual a finalidade principal e o bem jurídico tutelado por esta norma;
   - Impactos práticos nas decisões judiciais, no cotidiano da advocacia e em provas de concursos públicos;
   - Um exemplo prático da vida real para fixação imediata do conteúdo pelo ouvinte.
7. Encerre com uma mensagem motivacional e convide o estudante a continuar aprofundando seus estudos no VACATIO Vade Mecum.`;

// Leis principais organizadas por categorias
const LEIS_CONFIG = [
  // Códigos
  { slug: 'cp', categoria: 'Códigos', nome: 'Código Penal' },
  { slug: 'cpc', categoria: 'Códigos', nome: 'Código de Processo Civil' },
  { slug: 'cc', categoria: 'Códigos', nome: 'Código Civil' },
  { slug: 'clt', categoria: 'Códigos', nome: 'Consolidação das Leis do Trabalho (CLT)' },
  { slug: 'cpp', categoria: 'Códigos', nome: 'Código de Processo Penal' },
  { slug: 'cdc', categoria: 'Códigos', nome: 'Código de Defesa do Consumidor' },
  { slug: 'ctn', categoria: 'Códigos', nome: 'Código Tributário Nacional' },
  { slug: 'ctb', categoria: 'Códigos', nome: 'Código de Trânsito Brasileiro' },
  // Estatutos
  { slug: 'oab', categoria: 'Estatutos', nome: 'Estatuto da OAB' },
  { slug: 'eca', categoria: 'Estatutos', nome: 'Estatuto da Criança e do Adolescente' },
  { slug: 'epd', categoria: 'Estatutos', nome: 'Estatuto da Pessoa com Deficiência' },
  { slug: 'idoso', categoria: 'Estatutos', nome: 'Estatuto do Idoso' },
  // Constituição
  { slug: 'cf', categoria: 'Constituição', nome: 'Constituição Federal de 1988' }
];

function isArtigoReal(numero) {
  if (!numero) return false;
  var str = String(numero).trim();
  if (!str) return false;
  var upper = str.toUpperCase();
  if (/^(PARTE|LIVRO|T[ÍI]TULO|CAP[ÍI]TULO|SE[ÇC][ÃA]O|SUBSE[ÇC][ÃA]O|DISPOSI[ÇC]|PREÂMBULO|PREAMBULO)/i.test(upper)) {
    return false;
  }
  if (/\b(?:art(?:igo)?\.?\s*)?(\d+)/i.test(str)) return true;
  if (/art(?:igo)?\.?\s*[úu]nico/i.test(str)) return true;
  return false;
}

function formatArtigoLabel(numero) {
  if (!numero) return '';
  var str = String(numero).trim();
  if (/art(?:igo)?\.?\s*[úu]nico/i.test(str)) return 'Art. Único';
  var match = str.match(/(?:art(?:igo)?\.?\s*)?(\d+)(?:[º°o]|\.º)?(?:-([a-zA-Z]))?/i);
  if (match) {
    var numInt = Number(match[1]);
    var sufixo = match[2] ? '-' + match[2].toUpperCase() : '';
    if (numInt >= 1 && numInt <= 9) return 'Art. ' + numInt + 'º' + sufixo;
    return 'Art. ' + numInt + sufixo;
  }
  if (str.indexOf('Art.') === 0) return str;
  return 'Art. ' + str;
}

function getOrCreateSubfolder(parentFolder, folderName) {
  var folders = parentFolder.getFoldersByName(folderName);
  if (folders.hasNext()) {
    return folders.next();
  }
  return parentFolder.createFolder(folderName);
}

function fetchArtigosFromSupabase(leiId, leiSlug) {
  var allArtigos = [];
  var from = 0;
  var chunkSize = 1000;

  while (true) {
    var url = SUPABASE_URL + '/rest/v1/vade_mecum_artigos?select=numero,texto,ordem&lei_id=eq.' + encodeURIComponent(leiId) + '&order=ordem.asc&offset=' + from + '&limit=' + chunkSize;
    var options = {
      method: 'get',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': 'Bearer ' + SUPABASE_KEY
      },
      muteHttpExceptions: true
    };

    var res = UrlFetchApp.fetch(url, options);
    if (res.getResponseCode() !== 200) {
      // Fallback para leiSlug
      if (from === 0 && leiSlug) {
        var urlSlug = SUPABASE_URL + '/rest/v1/vade_mecum_artigos?select=numero,texto,ordem&lei_id=eq.' + encodeURIComponent(leiSlug) + '&order=ordem.asc&offset=' + from + '&limit=' + chunkSize;
        res = UrlFetchApp.fetch(urlSlug, options);
      }
    }

    if (res.getResponseCode() !== 200) break;
    var data = JSON.parse(res.getContentText());
    if (!data || data.length === 0) break;

    allArtigos = allArtigos.concat(data);
    if (data.length < chunkSize) break;
    from += chunkSize;
  }

  return allArtigos;
}

function fetchLeisFromSupabase() {
  var url = SUPABASE_URL + '/rest/v1/vade_mecum_leis?select=id,slug,nome,categoria&limit=1000';
  var options = {
    method: 'get',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': 'Bearer ' + SUPABASE_KEY
    },
    muteHttpExceptions: true
  };
  var res = UrlFetchApp.fetch(url, options);
  if (res.getResponseCode() === 200) {
    return JSON.parse(res.getContentText());
  }
  return [];
}

/**
 * Função principal a ser executada no Google Apps Script.
 */
function gerarEstruturaEPlanilhasNoDrive() {
  Logger.log('Iniciando criação de estrutura de pastas e Google Planilhas...');
  
  var pastaRaiz = DriveApp.getFolderById(PASTA_ROOT_ID);
  Logger.log('Pasta Raiz acessada: ' + pastaRaiz.getName());

  var leisDb = fetchLeisFromSupabase();

  for (var i = 0; i < LEIS_CONFIG.length; i++) {
    var item = LEIS_CONFIG[i];
    Logger.log('\n--- Processando [' + item.categoria + '] -> ' + item.nome + ' ---');

    // 1. Cria ou obtém a pasta da categoria (ex: "Códigos", "Estatutos")
    var pastaCategoria = getOrCreateSubfolder(pastaRaiz, item.categoria);

    // 2. Cria ou obtém a subpasta da Lei (ex: "Código Penal")
    var pastaLei = getOrCreateSubfolder(pastaCategoria, item.nome);

    // 3. Localiza no banco de dados do Supabase
    var leiDb = leisDb.filter(function(l) {
      return l.slug === item.slug || (l.nome && l.nome.toLowerCase().indexOf(item.nome.toLowerCase()) >= 0);
    })[0];

    if (!leiDb) {
      Logger.log('Aviso: Lei não encontrada no Supabase: ' + item.nome);
      continue;
    }

    // 4. Busca todos os artigos reais
    var artigosRaw = fetchArtigosFromSupabase(leiDb.id, leiDb.slug);
    var artigosReais = artigosRaw.filter(function(a) {
      return a.texto && a.texto.trim() && isArtigoReal(a.numero);
    });

    Logger.log('Encontrados ' + artigosReais.length + ' artigos reais.');

    // 5. Cria a Google Planilha (Google Sheets) dentro da pasta da lei
    var nomePlanilha = item.nome + ' - Áudio Aulas';
    
    // Verifica se a planilha já existe na pasta
    var planilhasExistentes = pastaLei.getFilesByName(nomePlanilha);
    var spreadsheet;
    if (planilhasExistentes.hasNext()) {
      var file = planilhasExistentes.next();
      spreadsheet = SpreadsheetApp.openById(file.getId());
      Logger.log('Planilha já existente atualizada: ' + spreadsheet.getUrl());
    } else {
      spreadsheet = SpreadsheetApp.create(nomePlanilha);
      // Move a planilha recém-criada para a pasta da lei
      var fileNovo = DriveApp.getFileById(spreadsheet.getId());
      fileNovo.moveTo(pastaLei);
      Logger.log('Nova Google Planilha criada: ' + spreadsheet.getUrl());
    }

    var sheet = spreadsheet.getActiveSheet();
    sheet.clear();

    // 6. Preenche o cabeçalho e todas as linhas
    var linhas = [];
    linhas.push(['Número do Artigo', 'Texto do Artigo', 'Prompt de Guia']);

    for (var j = 0; j < artigosReais.length; j++) {
      var art = artigosReais[j];
      var numLabel = formatArtigoLabel(art.numero);
      var prompt = PROMPT_TEMPLATE
        .replace(/\{NUMERO_ARTIGO\}/g, numLabel)
        .replace(/\{NOME_LEI\}/g, item.nome)
        .replace(/\{TEXTO_ARTIGO\}/g, String(art.texto || '').trim());

      linhas.push([numLabel, art.texto, prompt]);
    }

    // Gravação em lote no Google Sheets (ultra rápido)
    sheet.getRange(1, 1, linhas.length, 3).setValues(linhas);

    // Formatação do cabeçalho
    sheet.getRange(1, 1, 1, 3)
      .setBackground('#0284c7')
      .setFontColor('#ffffff')
      .setFontWeight('bold');
    sheet.setFrozenRows(1);
    sheet.autoResizeColumns(1, 1);

    Logger.log('Concluído com sucesso: ' + item.nome);
  }

  Logger.log('\n════════════════════════════════════════════════════════════════');
  Logger.log('TODAS AS PASTAS E GOOGLE PLANILHAS FORAM CRIADAS COM SUCESSO!');
  Logger.log('Acesse sua pasta no Google Drive: ' + pastaRaiz.getUrl());
  Logger.log('════════════════════════════════════════════════════════════════');
}

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * FUNÇÃO DE CRON JOB AUTOMÁTICO (EXECUTA A CADA 10 MINUTOS NA NUVEM DO GOOGLE)
 * ══════════════════════════════════════════════════════════════════════════════
 * Varre a pasta de áudios narrados do Código de Processo Penal (CPP),
 * faz o upload para o Supabase Storage e vincula ao artigo no banco de dados.
 */
const CONFIG_SYNC = {
  DRIVE_FOLDER_ID: '1VFY7Ic2dv9hGzVX8aZboLijh0kaKlMF4', // Pasta CPP enviada pelo usuário
  LEI_ID: '246e8691-ebe2-478d-991d-f3930635151a',
  LEI_SLUG: 'cpp',
  LEI_NOME: 'Código de Processo Penal',
  SUPABASE_URL: 'https://tlpxubeagmxapkysgobk.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRscHh1YmVhZ214YXBreXNnb2JrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE0OTMzOTYsImV4cCI6MjEwNzA2OTM5Nn0.3qKySrhlG6Kw1ZQYEaK4cELtzG2JlIi_CNHH4FV2ELo',
};

function sincronizarAudioAulasCPPComSupabase() {
  Logger.log('=== Iniciando sincronização periódica de áudios do CPP para o Supabase ===');
  
  const pasta = DriveApp.getFolderById(CONFIG_SYNC.DRIVE_FOLDER_ID);
  const arquivos = pasta.getFiles();
  
  // Buscar artigos do CPP no Supabase
  const urlArtigos = CONFIG_SYNC.SUPABASE_URL + '/rest/v1/vade_mecum_artigos?lei_id=eq.' + CONFIG_SYNC.LEI_ID + '&select=id,numero,narracao_url';
  const resArtigos = UrlFetchApp.fetch(urlArtigos, {
    headers: {
      'apikey': CONFIG_SYNC.SUPABASE_ANON_KEY,
      'Authorization': 'Bearer ' + CONFIG_SYNC.SUPABASE_ANON_KEY
    }
  });
  
  const artigos = JSON.parse(resArtigos.getContentText());
  Logger.log('Total de artigos cadastrados no banco: ' + artigos.length);
  
  let novosSincronizados = 0;
  
  while (arquivos.hasNext()) {
    const file = arquivos.next();
    const nome = file.getName();
    
    // Verificar se é arquivo de áudio
    if (!/\.(mp3|wav|m4a|ogg)$/i.test(nome)) continue;
    
    // Extrair número do artigo pelo nome do arquivo
    // ex: art_1.mp3, CPP_Art_57.mp3, art_3_a.wav
    const match = nome.match(/(?:art(?:igo)?|_art)?[\s_.-]*(\d+)(?:[º°o]|\.º)?(?:[\s_.-]*([a-zA-Z]))?/i);
    if (!match) continue;
    
    const numInt = match[1];
    const sufixo = match[2] ? '-' + match[2].toUpperCase() : '';
    const key = numInt + (sufixo ? sufixo.toLowerCase() : '');
    
    // Localizar artigo correspondente pendente
    const artigoAlvo = artigos.find(function(a) {
      if (a.narracao_url && a.narracao_url.trim().length > 0) return false; // Já tem áudio
      const numClean = String(a.numero).trim().toLowerCase().replace(/[º°o\.]/g, '');
      return numClean === key || numClean === numInt;
    });
    
    if (artigoAlvo) {
      Logger.log('Encontrado novo áudio para o Art. ' + artigoAlvo.numero + ': ' + nome);
      
      const blob = file.getBlob();
      const ext = nome.toLowerCase().indexOf('.wav') > -1 ? 'wav' : 'mp3';
      const storagePath = 'vademecum/' + CONFIG_SYNC.LEI_SLUG + '/art_' + key + '_' + new Date().getTime() + '.' + ext;
      
      // Upload para o Supabase Storage (bucket 'narracoes')
      const uploadUrl = CONFIG_SYNC.SUPABASE_URL + '/storage/v1/object/narracoes/' + storagePath;
      const upRes = UrlFetchApp.fetch(uploadUrl, {
        method: 'post',
        headers: {
          'apikey': CONFIG_SYNC.SUPABASE_ANON_KEY,
          'Authorization': 'Bearer ' + CONFIG_SYNC.SUPABASE_ANON_KEY,
          'Content-Type': ext === 'wav' ? 'audio/wav' : 'audio/mpeg',
          'x-upsert': 'true'
        },
        payload: blob.getBytes()
      });
      
      if (upRes.getResponseCode() === 200 || upRes.getResponseCode() === 201) {
        const publicAudioUrl = CONFIG_SYNC.SUPABASE_URL + '/storage/v1/object/public/narracoes/' + storagePath;
        
        // Atualizar tabela vade_mecum_artigos
        UrlFetchApp.fetch(CONFIG_SYNC.SUPABASE_URL + '/rest/v1/vade_mecum_artigos?id=eq.' + artigoAlvo.id, {
          method: 'patch',
          headers: {
            'apikey': CONFIG_SYNC.SUPABASE_ANON_KEY,
            'Authorization': 'Bearer ' + CONFIG_SYNC.SUPABASE_ANON_KEY,
            'Content-Type': 'application/json'
          },
          payload: JSON.stringify({ narracao_url: publicAudioUrl })
        });
        
        // Upsert na tabela narracoes_artigos
        UrlFetchApp.fetch(CONFIG_SYNC.SUPABASE_URL + '/rest/v1/narracoes_artigos', {
          method: 'post',
          headers: {
            'apikey': CONFIG_SYNC.SUPABASE_ANON_KEY,
            'Authorization': 'Bearer ' + CONFIG_SYNC.SUPABASE_ANON_KEY,
            'Content-Type': 'application/json',
            'Prefer': 'resolution=merge-duplicates'
          },
          payload: JSON.stringify({
            tabela_nome: CONFIG_SYNC.LEI_SLUG,
            artigo_numero: artigoAlvo.numero,
            lei_nome: CONFIG_SYNC.LEI_NOME,
            audio_url: publicAudioUrl
          })
        });
        
        novosSincronizados++;
        Logger.log('-> Sucesso! Artigo ' + artigoAlvo.numero + ' atualizado no banco e Storage!');
      }
    }
  }
  
  Logger.log('Sincronização concluída. Novos áudios vinculados neste ciclo: ' + novosSincronizados);
  
  // Verificar se todos os artigos foram concluídos para remover o gatilho automático
  const pendentesRestantes = artigos.filter(function(a) {
    return !a.narracao_url || a.narracao_url.trim().length === 0;
  }).length - novosSincronizados;
  
  if (pendentesRestantes <= 0) {
    Logger.log('🎉 TODOS OS ARTIGOS DO CPP FORAM CONCLUÍDOS! Desativando gatilho do cron...');
    removerGatilhoCron();
  }
}

/**
 * Cria o cron job para rodar a cada 10 minutos na nuvem do Google
 */
function ativarCronJob10Minutos() {
  removerGatilhoCron(); // Evita gatilhos duplicados
  ScriptApp.newTrigger('sincronizarAudioAulasCPPComSupabase')
    .timeBased()
    .everyMinutes(10)
    .create();
  Logger.log('✅ Cron job ativado com sucesso! Executará a cada 10 minutos na nuvem.');
}

/**
 * Remove o cron job
 */
function removerGatilhoCron() {
  const triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'sincronizarAudioAulasCPPComSupabase') {
      ScriptApp.deleteTrigger(triggers[i]);
      Logger.log('Gatilho removido.');
    }
  }
}

