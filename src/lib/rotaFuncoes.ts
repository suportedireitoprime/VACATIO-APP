// Traduz rotas do app em nomes de funções legíveis para painéis administrativos.

const RULES: { test: RegExp; label: string; grupo: string }[] = [
  { test: /^\/$/, label: 'Início', grupo: 'Navegação' },
  { test: /^\/auth|^\/reset-password/, label: 'Login / Cadastro', grupo: 'Conta' },
  { test: /^\/onboarding/, label: 'Onboarding', grupo: 'Conta' },
  { test: /^\/legislacao-estadual/, label: 'Leis Estaduais', grupo: 'Vade Mecum' },
  { test: /^\/legislacao\/[^/]+\/[^/]+\/[^/]+/, label: 'Leitura de Artigo', grupo: 'Vade Mecum' },
  { test: /^\/legislacao\/[^/]+\/[^/]+/, label: 'Leitura de Lei', grupo: 'Vade Mecum' },
  { test: /^\/legislacao/, label: 'Categorias de Legislação', grupo: 'Vade Mecum' },
  { test: /^\/normas/, label: 'Normas', grupo: 'Vade Mecum' },
  { test: /^\/praticar/, label: 'Praticar', grupo: 'Estudo' },
  { test: /^\/aprender/, label: 'Aprender', grupo: 'Estudo' },
  { test: /^\/resumos/, label: 'Resumos Jurídicos', grupo: 'Estudo' },
  { test: /^\/jurisprudencia/, label: 'Jurisprudência', grupo: 'Pesquisa' },
  { test: /^\/dicionario|^\/termo/, label: 'Dicionário Jurídico', grupo: 'Pesquisa' },
  { test: /^\/tematica-juridica/, label: 'Temática Jurídica', grupo: 'Pesquisa' },
  { test: /^\/biblioteca-offline|^\/modo-offline/, label: 'Modo Offline', grupo: 'Biblioteca' },
  { test: /^\/biblioteca|^\/bibliotecas/, label: 'Biblioteca', grupo: 'Biblioteca' },
  { test: /^\/noticias|^\/boletins|^\/blog|^\/opiniao|^\/novidades/, label: 'Notícias e Boletins', grupo: 'Conteúdo' },
  { test: /^\/radar/, label: 'Radar Legislativo', grupo: 'Conteúdo' },
  { test: /^\/assistente-horus|^\/ajustes\/horus/, label: 'Horus (WhatsApp)', grupo: 'IA' },
  { test: /^\/assistente/, label: 'Assistente IA', grupo: 'IA' },
  { test: /^\/narracao/, label: 'Narração', grupo: 'Vade Mecum' },
  { test: /^\/anotacoes|^\/pessoal\/anotacoes/, label: 'Anotações', grupo: 'Meu Espaço' },
  { test: /^\/pessoal\/grifos/, label: 'Grifos', grupo: 'Meu Espaço' },
  { test: /^\/pessoal\/artigos|^\/pessoal\/leis/, label: 'Artigos Favoritos', grupo: 'Meu Espaço' },
  { test: /^\/pessoal/, label: 'Meu Espaço', grupo: 'Meu Espaço' },
  { test: /^\/meu-espaco/, label: 'Meu Espaço', grupo: 'Meu Espaço' },
  { test: /^\/meus-lembretes|^\/lembretes/, label: 'Lembretes', grupo: 'Meu Espaço' },
  { test: /^\/ferramentas/, label: 'Ferramentas', grupo: 'Navegação' },
  { test: /^\/funcoes/, label: 'Funções', grupo: 'Navegação' },
  { test: /^\/planos|^\/assinatura/, label: 'Planos e Assinatura', grupo: 'Assinatura' },
  { test: /^\/perfil|^\/configuracoes|^\/ajustes/, label: 'Perfil e Ajustes', grupo: 'Conta' },
  { test: /^\/suporte/, label: 'Suporte', grupo: 'Conta' },
  { test: /^\/locais/, label: 'Locais Jurídicos', grupo: 'Conteúdo' },
  { test: /^\/admin/, label: 'Área Admin', grupo: 'Admin' },
];

export function rotaParaFuncao(route?: string | null): { label: string; grupo: string } {
  if (!route) return { label: 'Desconhecida', grupo: 'Outros' };
  const path = route.split('?')[0].replace(/\/+$/, '') || '/';
  const rule = RULES.find((r) => r.test.test(path));
  return rule ? { label: rule.label, grupo: rule.grupo } : { label: path, grupo: 'Outros' };
}

export const EVENTO_LABELS: Record<string, string> = {
  artigo_favoritado: 'Favoritou artigo',
  artigo_grifado: 'Grifou artigo',
  artigo_narrado: 'Narrou artigo',
  artigo_copiado: 'Copiou artigo',
  anotacao_criada: 'Criou anotação',
  chat_mensagem: 'Mensagem no chat jurídico',
  livro_aberto: 'Abriu livro',
  praticar_sessao: 'Sessão de prática',
};

export const FEATURE_LABELS: Record<string, string> = {
  grifo: 'Grifar artigo',
  narracao: 'Narração',
  anotacao: 'Anotações',
  praticar: 'Praticar',
  funcoes: 'Funções do artigo',
  jurisprudencia: 'Jurisprudência',
  videoaula: 'Videoaulas',
  termo_juridico: 'Termo jurídico',
  perguntar: 'Perguntar',
  grafico_conexoes: 'Gráfico de conexões',
  lembrete: 'Lembretes',
  explicacao: 'Explicação',
  exemplo: 'Exemplo',
  favorito: 'Favoritar artigo',
  biblioteca_ler: 'Leitura de livro',
  ia_juridica: 'Chat jurídico',
  chat_web: 'Pesquisa na web',
  chat_anexo: 'Anexos no chat',
};

export const formatarDuracao = (segundos: number) => {
  if (!segundos || segundos < 60) return `${Math.max(0, Math.round(segundos))}s`;
  const m = Math.floor(segundos / 60);
  if (m < 60) return `${m}min`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}min`;
};
