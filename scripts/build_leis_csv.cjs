const fs = require('fs');
const path = require('path');

// Utility: darken/lighten a hex color by amount (-1..1)
function shade(hex, amt) {
  const h = hex.replace('#', '');
  const num = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
  let r = (num >> 16) & 0xff;
  let g = (num >> 8) & 0xff;
  let b = num & 0xff;
  const t = amt < 0 ? 0 : 255;
  const p = Math.abs(amt);
  r = Math.round((t - r) * p + r);
  g = Math.round((t - g) * p + g);
  b = Math.round((t - b) * p + b);
  return '#' + (((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase());
}

// Map color to a friendly human name in Portuguese
function getNomePaleta(hex) {
  const h = hex.toUpperCase();
  const map = {
    '#059669': 'Verde Esmeralda',
    '#10B981': 'Verde Jade',
    '#0D9488': 'Verde Petróleo (Teal)',
    '#14B8A6': 'Turquesa Oceânica',
    '#16A34A': 'Verde Floresta',
    '#15803D': 'Verde Musgo Profundo',
    '#166534': 'Verde Amazônia',
    '#065F46': 'Verde Fazenda / Tesouro',
    '#047857': 'Verde Malaquita',
    '#65A30D': 'Verde Lima Agrário',
    '#DC2626': 'Vermelho Escarlate',
    '#EF4444': 'Vermelho Rubi',
    '#B91C1C': 'Vermelho Bordô',
    '#991B1B': 'Vermelho Carmesim Militar',
    '#7F1D1D': 'Vinho Profundo',
    '#9F1239': 'Bordô Granata',
    '#BE123C': 'Carmim Escuro',
    '#E11D48': 'Rosa Magenta / Carmesim',
    '#F43F5E': 'Rosa Coral Protetor',
    '#2563EB': 'Azul Royal Clássico',
    '#1D4ED8': 'Azul Cobalto Judiciário',
    '#1E40AF': 'Azul Marinho Institucional',
    '#1E3A8A': 'Azul Meia-Noite',
    '#0284C7': 'Azul Céu Cerúleo',
    '#0369A1': 'Azul Petróleo / Aço',
    '#3B82F6': 'Azul Safira Processual',
    '#0EA5E9': 'Azul Ciano Trânsito',
    '#0891B2': 'Ciano Tecnológico / Águas',
    '#0E7490': 'Azul Oceano Profundo',
    '#06B6D4': 'Ciano Claro / Turquesa',
    '#2DD4BF': 'Menta Suave',
    '#FACC15': 'Ouro Constitucional',
    '#F59E0B': 'Âmbar Dourado',
    '#D97706': 'Âmbar Imperial',
    '#B45309': 'Bronze Histórico',
    '#92400E': 'Cobre Envelhecido',
    '#78350F': 'Mogno Imperial 1824',
    '#EA580C': 'Laranja Queimado',
    '#F97316': 'Laranja Mandarina',
    '#CA8A04': 'Mostarda Nobre',
    '#A16207': 'Ocre Mercantil',
    '#8B5CF6': 'Violeta Real',
    '#7C3AED': 'Púrpura Tecnológica',
    '#6D28D9': 'Índigo Violeta',
    '#4C1D95': 'Púrpura Profundo',
    '#4F46E5': 'Índigo Noturno',
    '#4338CA': 'Índigo Parquet',
    '#6366F1': 'Índigo Lavanda',
    '#A855F7': 'Orquídea / Museus',
    '#D946EF': 'Fúcsia Jovem',
    '#475569': 'Ardósia / Cinza Titânio',
    '#64748B': 'Cinza Metrópole',
    '#78716C': 'Cinza Granito / Mineral',
  };
  return map[h] || 'Tonalidade ' + h;
}

// Detailed subject suggestions for the realistic photo cover
function getSujeitoSugerido(item) {
  const id = item.id;
  const tipo = item.tipo;
  const nome = item.nome.toLowerCase();

  // Constituições
  if (id === 'cf88') return 'Estátua da Justiça (Themis) esculpida em mármore escuro com venda e balança dourada, ao lado da bandeira do Brasil desfocada com iluminação dourada e verde';
  if (id === 'cf1969') return 'Ministros civis e militares de terno solene na década de 1960 assinando emenda institucional com iluminação âmbar retrô';
  if (id === 'cf1967') return 'Congresso Nacional ao entardecer com silhueta de jurista de perfil em estilo histórico dos anos 60';
  if (id === 'cf1946') return 'Cidadãos e parlamentares em plenário celebrando a redemocratização do pós-guerra em iluminação sépia dramática';
  if (id === 'cf1937') return 'Estátua imponente com traços arquitetônicos do Estado Novo / Art Déco em tom sépia bronze';
  if (id === 'cf1934') return 'Primeira mulher deputada brasileira (Bertha Lutz) em tribuna parlamentar da década de 30 com iluminação nobre de época';
  if (id === 'cf1891') return 'Marechal Deodoro da Fonseca e juristas republicanos fundadores em gabinete presidencial em tom ocre e bronze';
  if (id === 'cf1824') return 'Imperador Dom Pedro I de perfil em trajes solenes imperiais assinando a primeira Carta Magna sob luz de velas e ouro';

  // Códigos Principais
  if (id === 'cp') return 'Juiz criminal togado de perfil em tribunal com martelo da justiça de madeira nobre e iluminação vermelha escarlate';
  if (id === 'cpm') return 'Oficial comandante das Forças Armadas com condecorações em conselho de guerra militar sob iluminação rubi sóbria';
  if (id === 'cc') return 'Advogado civilista sênior assinando contrato solene com caneta tinteiro em mesa de mogno com iluminação azul safira';
  if (id === 'cpc') return 'Magistrado no plenário do tribunal segurando autos de processo civil em iluminação azul cobalto e aço';
  if (id === 'cpp') return 'Delegado de polícia criminalista em cena pericial noturna com distintivo e iluminação âmbar/laranja dramática';
  if (id === 'cppm') return 'Oficial do Ministério Público Militar com farda de gala e códigos em tribunal castrense sob luz carmesim';
  if (id === 'clt') return 'Operário industrial e engenheiro com capacete de segurança de perfil em fábrica moderna sob iluminação teal/verde petróleo';
  if (id === 'cdc') return 'Consumidor confiante e analista do PROCON avaliando contrato e produto tecnológico sob iluminação rosa carmesim';
  if (id === 'ctn') return 'Auditor-fiscal da Receita Federal analisando balanços e registros tributários em gabinete sob iluminação âmbar dourada';
  if (id === 'ctb') return 'Policial rodoviário federal de perfil ao lado de viatura e rodovia moderna ao anoitecer com feixes de luz ciano/azul';
  if (id === 'ce') return 'Mesário e eleitor brasileiro diante de urna eletrônica oficial e cabine de votação com iluminação verde esmeralda';
  if (id === 'cflor') return 'Guarda florestal do IBAMA observando copa de floresta tropical densa sob iluminação verde exuberante e névoa matinal';
  if (id === 'ccom') return 'Comerciante e capitão mercante do século XIX em porto com navios cargueiros e documentos mercantis em tom sépia ocre';
  if (id === 'cba') return 'Comandante de avião comercial de perfil em cabine de comando (cockpit) sobrevoando nuvens em iluminação azul cerúleo';
  if (id === 'cagua') return 'Engenheiro de recursos hídricos inspecionando grande vertedouro de hidrelétrica sob luz azul oceano e gotas d’água';
  if (id === 'cmin') return 'Geólogo e engenheiro de minas com capacete de segurança segurando amostra de minério sob iluminação cinza granito e âmbar';
  if (id === 'ctel') return 'Técnico de telecomunicações diante de antena parabólica e torre de satélite conectando redes sob luz violeta neon';

  // Estatutos
  if (id === 'eca') return 'Criança sorridente protegida por mãos de adulto acolhedor em parque ensolarado com iluminação rosa coral protetora';
  if (id === 'ei') return 'Senhor idoso de olhar sereno e experiente vestindo terno elegante em biblioteca acolhedora sob luz violeta suave';
  if (id === 'epd') return 'Atleta paralímpica cadeirante em postura altiva e triunfante com iluminação turquesa/ciano de alta definição';
  if (id === 'eir') return 'Jovem líder negro brasileiro com olhar determinado e confiante em ambiente acadêmico sob iluminação âmbar dourada';
  if (id === 'ec') return 'Arquiteta e urbanista observando maquete de cidade moderna sustentável e plano diretor sob luz verde esmeralda';
  if (id === 'ed') return 'Mãos de policial recolhendo e desarmando arma de fogo em ato solene de pacificação social com luz rubi e sombra';
  if (id === 'eoab') return 'Advogada elegante em plenário da OAB segurando carteira vermelha profissional sob iluminação azul nobre';
  if (id === 'et') return 'Torcedor vibrando com bandeira no estádio de futebol iluminado por holofotes ao entardecer sob luz verde e dourada';
  if (id === 'ej') return 'Jovem universitário com mochila e livros olhando para o horizonte com postura de liderança sob iluminação fúcsia moderna';
  if (id === 'em') return 'Oficial do Exército em uniforme militar impecável prestando continência solene com iluminação de crepúsculo cinza-ardósia';
  if (id === 'eind') return 'Líder indígena com cocar tradicional e pinturas de grafismo olhando com dignidade em floresta sob luz dourada e terra';
  if (id === 'eterra') return 'Produtor rural e agricultor familiar contemplando vasta plantação sustentável ao nascer do sol em tons de verde e sol';
  if (id === 'emig') return 'Família de imigrantes com passaportes e malas chegando a aeroporto moderno com olhar de esperança sob luz ciano suave';
  if (id === 'eref') return 'Refugiado acolhido com dignidade por oficial humanitário da ONU/ACNUR sob iluminação violeta e âmbar acolhedora';
  if (id === 'emet') return 'Planejador urbano observando trens e vias expressas de grande metrópole iluminada à noite com tons de azul e cinza';
  if (id === 'emus') return 'Restaurador e curador de arte com luvas brancas examinando pintura em galeria de museu clássico sob luz orquídea';
  if (id === 'eme') return 'Empreendedora dona de pequena empresa conferindo inventário e tablet com energia sob iluminação laranja vibrante';
  if (id === 'epc') return 'Médico oncologista acolhendo paciente com esperança e compaixão em hospital moderno sob luz rosa carmesim';

  // Leis Especiais - Penais
  if (id === 'lep') return 'Agente penitenciário de prontidão em corredor de penitenciária de segurança máxima sob luz carmesim dramática';
  if (id === 'lmp') return 'Mulher forte e resiliente com expressão de superação e proteção acolhida por rede de apoio sob iluminação rosa magenta';
  if (id === 'ld') return 'Perito forense e cão farejador da Polícia Federal inspecionando contêiner portuário com iluminação vermelha bordô';
  if (id === 'loc') return 'Equipe tática da polícia civil em operação contra o crime organizado com distintivos sob iluminação dramática rubi e sombra';
  if (id === 'laa') return 'Juiz togado de semblante rigoroso erguendo a Constituição contra abusos e excessos sob luz bordô institucional';
  if (id === 'lit') return 'Policial cibernético com fones de ouvido profissionais monitorando áudio e frequências sob iluminação violeta neon';
  if (id === 'lch') return 'Promotor de justiça em tribunal do júri discursando com veemência em caso de crime hediondo sob iluminação carmesim';
  if (id === 'ltort') return 'Perito médico-legista documentando laudo com rigor científico e ético contra tortura sob luz vermelha profunda';
  if (id === 'lcp') return 'Juiz togado julgando audiência no Juizado Especial Criminal sob luz bordô clássica';
  if (id === 'lei-pacote-anticrime') return 'Magistrado exercendo a função de Juiz das Garantias em sala de audiência de custódia moderna sob luz rubi dramática';
  if (id === 'lei-identificacao-criminal') return 'Perito papiloscopista coletando amostra de DNA e impressão digital em scanner biométrico moderno sob luz azulada';
  if (id === 'lei-prisao-temporaria') return 'Investigador de polícia em sala de interrogatório analisando prazos do inquérito sob luz âmbar e vermelha';
  if (id === 'lei-escuta-protegida') return 'Psicóloga infantil acolhendo criança em sala lúdica de depoimento especial sob iluminação acolhedora e respeitosa';
  if (id === 'lei-sinase') return 'Educador social dialogando com adolescente em programa de medida socioeducativa sob iluminação violeta e azul';
  if (id === 'lpt') return 'Oficial de proteção e testemunha protegida com capuz em local seguro com luz cinematográfica de mistério e segurança';

  // Leis Administrativas e Anticorrupção
  if (id === 'l8112') return 'Servidora pública federal em gabinete moderno assinando termo de posse com o brasão da República sob luz azul clássica';
  if (id === 'lia') return 'Promotor de justiça anticorrupção examinando dossiê de desvio de verbas públicas sob iluminação azul cobalto e prata';
  if (id === 'nll') return 'Engenheiro civil com capacete de proteção e prancheta digital vistoriando grande obra pública sob iluminação azul petróleo';
  if (id === 'lai') return 'Jornalista investigativo acessando dados públicos transparentes em laptop moderno sob iluminação azul ciano límpido';
  if (id === 'lap') return 'Cidadão brasileiro segurando documento em frente a monumento público histórico sob iluminação violeta nobre';
  if (id === 'lace') return 'Oficial de compliance corporativo em sala de diretoria corporativa aplicando políticas de integridade sob luz carmesim';
  if (id === 'lcon') return 'Operador ferroviário e engenheiro de concessões diante de via expressa de alta tecnologia sob iluminação azul celeste';
  if (id === 'lppp') return 'Representante do setor público e investidor privado assinando contrato de PPP sob luz azul corporativa';
  if (id === 'lotcu') return 'Ministro do Tribunal de Contas da União em plenário solene julgando contas da República sob luz azul meia-noite';
  if (id === 'ces') return 'Servidor público federal com postura exemplar e crachá em atendimento cortês ao cidadão sob iluminação cinza ardósia';
  if (id === 'lpaf') return 'Colegiado da administração pública federal reunido em audiência de julgamento administrativo sob luz azul institucional';
  if (id === 'lei-governo-digital') return 'Cidadão utilizando aplicativo de serviços públicos gov.br no smartphone com holograma de desburocratização em azul ciano';
  if (id === 'lei-oscip') return 'Coordenador de organização da sociedade civil realizando projeto comunitário de impacto sob luz índigo e dourada';
  if (id === 'loman') return 'Desembargador com toga preta de magistrado caminhando em corredor solene de tribunal sob iluminação clássica';
  if (id === 'lomp') return 'Procurador-Geral de Justiça no púlpito ministerial defendendo a ordem jurídica sob iluminação índigo profundo';
  if (id === 'lei-defensoria') return 'Defensora pública em atendimento humanizado a cidadão hipossuficiente sob iluminação azul celeste acolhedora';

  // Constitucionais & Garantias
  if (id === 'lms') return 'Advogado impetrando Mandado de Segurança com liminar perante juiz federal sob iluminação azul índigo solene';
  if (id === 'lacp') return 'Membros do Ministério Público e ambientalistas ajuizando ação civil pública sob luz violeta e esmeralda';
  if (id === 'lje') return 'Conciliador de justiça promovendo acordo amigável entre duas partes em sala de conciliação sob luz verde jade';
  if (id === 'lhd') return 'Cidadão requisitando retificação de seus dados cadastrais em repartição com iluminação violeta límpida';
  if (id === 'lmi') return 'Plenário do Supremo Tribunal Federal em sessão plenária julgando Mandado de Injunção sob iluminação majestosa';
  if (id === 'lindb') return 'Professor jurista em biblioteca clássica rodeado por compêndios de hermenêutica e normas sob luz índigo nobre';
  if (id === 'lei-adpf') return 'Ministro relator do STF de perfil lendo voto de Arguição de Descumprimento de Preceito Fundamental sob luz azul solene';
  if (id === 'lei-adi-adc') return 'Toga dos ministros do STF em bancada plenária com o brasão da República ao fundo sob luz azul cobalto';
  if (id === 'lei-crimes-responsabilidade') return 'Presidente do Senado conduzindo sessão de julgamento de autoridade pública com martelo em tom carmesim e ouro';
  if (id === 'lei-desapropriacao') return 'Topógrafo e engenheiro público delimitando área de interesse social com teodolito sob luz âmbar e sol';

  // Financeiras, Empresariais & Tributárias
  if (id === 'lrf') return 'Secretário do Tesouro e analistas de orçamento público acompanhando metas fiscais sob iluminação verde esmeralda nobre';
  if (id === 'lrt') return 'Especialistas tributários analisando a nova sistemática do IVA dual (IBS e CBS) sob iluminação verde esmeralda e dourada';
  if (id === 'llav') return 'Analistas de inteligência financeira do COAF rastreando fluxos de capitais em sala de dados sob iluminação púrpura';
  if (id === 'lcsf') return 'Auditor do Banco Central inspecionando instituição financeira e operações cambiais sob luz bronze e âmbar';
  if (id === 'lf') return 'Administrador judicial em mesa de conferência com credores mediando recuperação empresarial sob luz ocre dourada';
  if (id === 'lsa') return 'Assembleia geral de acionistas em arranha-céu na Faria Lima com painéis financeiros sob iluminação ocre corporativa';
  if (id === 'lpi') return 'Inventor e advogada de patentes analisando protótipo inovador com certificado do INPI sob luz mostarda brilhante';
  if (id === 'lda') return 'Escritor e artista em estúdio criativo protegendo manuscrito autoral com carimbo de copyright sob luz âmbar nobre';
  if (id === 'lcade') return 'Conselheiros do CADE em plenário julgando concentração de mercado e fusão empresarial sob luz azul cobalto';
  if (id === 'lle') return 'Jovem empresário abrindo as portas de seu novo comércio sem burocracia com alvará sob iluminação mostarda acolhedora';
  if (id === 'lmls') return 'Fundadores de startup de inteligência artificial em aceleradora inovadora sob iluminação laranja vibrante';
  if (id === 'lei-crimes-tributario') return 'Delegado de repressão a crimes fiscais e auditor da receita em operação contra sonegação sob luz bronze dramática';
  if (id === 'lei-execucao-fiscal') return 'Procurador da Fazenda Nacional emitindo Certidão de Dívida Ativa com chancela digital sob luz verde esmeralda';
  if (id === 'lei-superendividamento') return 'Conciliador financeiro auxiliando família a repactuar dívidas e garantir o mínimo existencial sob luz laranja suave';

  // Digital & Tecnologia
  if (id === 'lgpd') return 'Especialista em segurança da informação (DPO) diante de servidores criptografados e proteção de dados sob luz azul ciano';
  if (id === 'mci') return 'Cabos submarinos de fibra ótica e roteadores iluminados com engenheiro de redes sob iluminação ciano profundo';
  if (id === 'lci') return 'Perito em crimes cibernéticos analisando código de ataque hacker e invasão de dispositivo em laboratório sob luz ciano/neon';

  // Ambiental
  if (id === 'lca') return 'Bióloga e policial ambiental resgatando animal silvestre em reserva protegida sob iluminação verde esmeralda florestal';
  if (id === 'lei-meio-ambiente') return 'Conselho Nacional do Meio Ambiente e guardas florestais protegendo nascente de rio sob luz verde densa';
  if (id === 'lei-recursos-hidricos') return 'Especialista em hidrologia coletando água pura de bacia hidrográfica sob luz azul oceano límpida';
  if (id === 'lei-residuos-solidos') return 'Cooperativa de catadores de materiais recicláveis em esteira de triagem moderna e sustentável sob luz verde ecológica';

  // Civil, Família & Social
  if (id === 'la') return 'Árbitro internacional de terno nobre mediando disputa complexa em câmara de arbitragem sob iluminação mostarda nobre';
  if (id === 'li') return 'Inquilino e proprietário assinando contrato de locação com entrega amigável de chaves sob iluminação laranja suave';
  if (id === 'lrp') return 'Oficial de cartório com certidão de nascimento lavrada em livro secular encadernado em couro sob luz cinza e âmbar';
  if (id === 'ldb') return 'Professora dedicada em sala de aula de escola pública moderna incentivando alunos com livros sob luz azul celeste';
  if (id === 'lsus') return 'Médica do SUS atendendo cidadão com estetoscópio e empatia em posto de saúde sob luz verde petróleo suave';
  if (id === 'lbio') return 'Cientista geneticista de jaleco branco manipulando pipeta em laboratório de biotecnologia sob luz verde esmeralda';
  if (id === 'lalp') return 'Juiz de vara de família em audiência com mediação parental protegendo os filhos sob luz rosa carmesim protetora';
  if (id === 'lalim') return 'Mãe com seu bebê sendo amparada por defensora pública em pedido de alimentos sob luz rosa acolhedora';
  if (id === 'lei-henry-borel') return 'Símbolo protetor acolhendo criança em segurança com rede de amparo e conselho tutelar sob luz rosa magenta';
  if (id === 'lei-mediacao') return 'Mediadora experiente promovendo diálogo sereno entre duas partes em conflito sob luz azul índigo harmoniosa';
  if (id === 'lpsu') return 'Topógrafo e engenheiro urbanista planejando loteamento habitacional regularizado sob iluminação verde limão e sol';
  if (id === 'lei-greve') return 'Trabalhadores em assembleia pacífica exercendo direito constitucional de greve sob luz escarlate e sombra';
  if (id === 'lei-juizados-fazenda') return 'Cidadão em audiência célere no Juizado da Fazenda Pública sob luz verde esmeralda';
  if (id === 'lei-juizados-federais') return 'Segurado do INSS obtendo benefício previdenciário no Juizado Especial Federal sob luz verde petróleo';

  // Eleitoral & Político
  if (id === 'lpp') return 'Militantes e dirigentes partidários em convenção política democrática sob iluminação índigo vibrante';
  if (id === 'lele') return 'Juiz eleitoral fiscalizando propaganda e diplomação de candidatos sob luz índigo e verde esmeralda';
  if (id === 'lfl') return 'Magistrado eleitoral indeferindo registro de candidato com ficha suja em plenário sob luz verde esmeralda firme';
  if (id === 'line') return 'Tribunal Regional Eleitoral julgando impugnação de candidatura sob iluminação violeta solene';
  if (id === 'lrac') return 'Grupo diverso de cidadãos unidos celebrando a dignidade humana contra o preconceito racial sob luz âmbar e sol';

  // Previdenciário
  if (id === 'lbps') return 'Trabalhador aposentado contemplando o futuro com dignidade ao lado de sua família sob iluminação verde petróleo e sol';
  if (id === 'lcss') return 'Auditor da seguridade social fiscalizando arrecadação previdenciária sob luz turquesa oceânica';
  if (id === 'lpc') return 'Gestor de fundos de previdência complementar prevendo rendimentos de aposentadoria sob luz menta e turquesa';
  if (id === 'loas') return 'Assistente social do CRAS entregando cartão do BPC a cidadão vulnerável sob iluminação verde petróleo esperançosa';

  // OAB & Advocacia
  if (id === 'ced2015') return 'Balança da justiça e código de ética sobre mesa de advogado com beca preta em iluminação rubi nobre';
  if (id === 'ced1995') return 'Advogado histórico dos anos 90 em tribuna defendendo a ética profissional com livros de época sob luz vermelha clássica';
  if (id === 'reg_oab') return 'Conselho Pleno da OAB Nacional reunido em plenário com o brasão da advocacia sob luz verde esmeralda institucional';
  if (id === 'prov205') return 'Advogado jovem moderno gravando conteúdo jurídico ético com iluminação de estúdio profissional e smartphone sob luz âmbar';
  if (id === 'prov188') return 'Advogado criminalista e detetive particular analisando evidências e documentos de defesa sob luz âmbar e sombra';
  if (id === 'prov112') return 'Sócios de escritório de advocacia elegante assinando contrato de sociedade unipessoal sob luz âmbar corporativa';
  if (id === 'prov144') return 'Bacharel em direito concentrado preenchendo o gabarito do Exame de Ordem da OAB sob iluminação âmbar acadêmica';
  if (id === 'res02') return 'Conselheiro federal da OAB proclamando aprovação unânime de resolução normativa sob luz violeta solene';
  if (id === 'res01') return 'Mesa diretora do Conselho Federal da OAB em sessão solene com o bastão da presidência sob luz violeta e ouro';

  // Fallback
  return `Profissional do direito togado de perfil representando ${item.nome} em cena dramática cinematográfica com iluminação correspondente`;
}

// Generate the CSV
function generate() {
  const content = fs.readFileSync(path.join(__dirname, '..', 'src', 'data', 'leisCatalog.ts'), 'utf8');
  const lines = content.split('\n');
  const items = [];
  let inCatalog = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes('export const LEIS_CATALOG: LeiCatalogItem[] = [')) {
      inCatalog = true;
      continue;
    }
    if (inCatalog && line.includes('];')) {
      inCatalog = false;
      break;
    }
    if (inCatalog && line.trim().startsWith('{ id:')) {
      const raw = line.trim();
      const id = (raw.match(/id:\s*'([^']+)'/) || [])[1];
      const nome = (raw.match(/nome:\s*'([^']+)'/) || [])[1];
      const sigla = (raw.match(/sigla:\s*'([^']+)'/) || [])[1];
      const descricao = (raw.match(/descricao:\s*'([^']+)'/) || [])[1];
      const tipo = (raw.match(/tipo:\s*'([^']+)'/) || [])[1];
      const tabela_nome = (raw.match(/tabela_nome:\s*'([^']+)'/) || [])[1];
      const iconColor = (raw.match(/iconColor:\s*'([^']+)'/) || [])[1];
      if (id && nome) {
        items.push({ id, nome, sigla, descricao, tipo, tabela_nome, iconColor });
      }
    }
  }

  // Dynamically load all available covers in src/assets/
  const coversInAssets = fs.readdirSync(path.join(__dirname, '..', 'src', 'assets'))
    .filter(f => f.startsWith('lei-cover-') && f.endsWith('.webp') && f !== 'lei-cover-default.webp')
    .map(f => f.replace(/^lei-cover-/, '').replace(/\.webp$/, ''));

  const existingColorMap = {
    cf88: '#059669',
    cp:   '#DC2626',
    cpm:  '#DC2626',
    cc:   '#2563EB',
    cpc:  '#0284C7',
    cpp:  '#EA580C',
    clt:  '#0D9488',
    cdc:  '#E11D48',
    eca:  '#4F46E5',
    ctn:  '#D97706',
    ce:   '#16A34A',
  };

  const rows = [];
  rows.push([
    'id',
    'sigla',
    'nome',
    'tipo',
    'tabela_nome',
    'cor_primaria_hex',
    'cor_secundaria_hex',
    'cor_sombra_hex',
    'cor_accent_luz_hex',
    'nome_paleta',
    'status_capa',
    'arquivo_capa_atual',
    'personagem_sujeito_sugerido'
  ]);

  const newColorMapEntries = {};

  for (const item of items) {
    const id = item.id;
    // Primary color
    let primary = existingColorMap[id] || item.iconColor || '#2563EB';
    primary = primary.toUpperCase();

    // Special fine-tuning for maximum elegance
    if (id === 'cf88') primary = '#059669'; // Emerald 600
    if (id === 'ctb') primary = '#0EA5E9'; // Sky 500
    if (id === 'lgpd') primary = '#0891B2'; // Cyan 600
    if (id === 'eoab') primary = '#1D4ED8'; // Blue 700
    if (id === 'lrf' || id === 'lrt') primary = '#065F46'; // Emerald 800

    newColorMapEntries[id] = primary;

    const secondary = shade(primary, -0.2);
    const shadow = shade(primary, -0.4);
    const accent = shade(primary, 0.35);
    const nomePaleta = getNomePaleta(primary);

    // Cover check
    let statusCapa = 'Pendente (Usa Capa Padrão)';
    let arquivoCapa = 'lei-cover-default.webp';

    if (coversInAssets.includes(id)) {
      statusCapa = 'Capa Oficial Personalizada';
      arquivoCapa = `lei-cover-${id}.webp`;
    } else if (id === 'cf1969' || id === 'cf1967' || id === 'cf1946' || id === 'cf1937' || id === 'cf1934' || id === 'cf1891' || id === 'cf1824') {
      statusCapa = 'Capa Compartilhada (CF/88)';
      arquivoCapa = 'lei-cover-cf88.webp';
    } else if (id === 'cpm') {
      statusCapa = 'Capa Compartilhada (CP)';
      arquivoCapa = 'lei-cover-cp.webp';
    } else if (id === 'cppm') {
      statusCapa = 'Capa Compartilhada (CPP)';
      arquivoCapa = 'lei-cover-cpp.webp';
    } else if (id === 'em') {
      statusCapa = 'Capa Compartilhada (CP)';
      arquivoCapa = 'lei-cover-cp.webp';
    } else if (id === 'eind' || id === 'eref') {
      statusCapa = 'Capa Compartilhada (EIR)';
      arquivoCapa = 'lei-cover-eir.webp';
    } else if (id === 'ej') {
      statusCapa = 'Capa Compartilhada (ECA)';
      arquivoCapa = 'lei-cover-eca.webp';
    } else if (id === 'emet' || id === 'eterra') {
      statusCapa = 'Capa Compartilhada (EC)';
      arquivoCapa = 'lei-cover-ec.webp';
    } else if (id === 'epc') {
      statusCapa = 'Capa Compartilhada (EPD)';
      arquivoCapa = 'lei-cover-epd.webp';
    } else if (id === 'et') {
      statusCapa = 'Capa Compartilhada (CE)';
      arquivoCapa = 'lei-cover-ce.webp';
    } else if (id === 'l8112') {
      statusCapa = 'Capa Compartilhada (EOAB)';
      arquivoCapa = 'lei-cover-eoab.webp';
    }

    const sujeito = getSujeitoSugerido(item);

    rows.push([
      id,
      item.sigla,
      item.nome,
      item.tipo,
      item.tabela_nome,
      primary,
      secondary,
      shadow,
      accent,
      nomePaleta,
      statusCapa,
      arquivoCapa,
      sujeito
    ]);
  }

  // Escape CSV fields
  const csvContent = '\uFEFF' + rows.map(row => 
    row.map(val => {
      const s = String(val == null ? '' : val);
      if (s.includes(';') || s.includes('\"') || s.includes('\n') || s.includes(',')) {
        return '\"' + s.replace(/\"/g, '\"\"') + '\"';
      }
      return s;
    }).join(';')
  ).join('\r\n');

  // Save in src/data/
  const p1 = path.join(__dirname, '..', 'src', 'data', 'leis_cores_painel.csv');
  fs.writeFileSync(p1, csvContent, 'utf8');
  console.log(`Saved ${p1}`);

  // Save in public/
  const p2 = path.join(__dirname, '..', 'public', 'leis_cores_painel.csv');
  fs.writeFileSync(p2, csvContent, 'utf8');
  console.log(`Saved ${p2}`);

  // Save in root
  const p3 = path.join(__dirname, '..', 'leis_cores_painel.csv');
  fs.writeFileSync(p3, csvContent, 'utf8');
  console.log(`Saved ${p3}`);

  // Save the full color map to a json file to inspect
  fs.writeFileSync(path.join(__dirname, '..', 'src', 'data', 'leiColorMapComplete.json'), JSON.stringify(newColorMapEntries, null, 2), 'utf8');
  console.log('Saved leiColorMapComplete.json');

  return { total: items.length };
}

generate();
