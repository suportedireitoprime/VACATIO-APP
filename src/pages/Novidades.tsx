import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  Scale,
  Landmark,
  FileText,
  Calendar,
  ExternalLink,
  ChevronRight,
  ChevronLeft,
  Search,
  RefreshCw,
  Clock,
  ArrowRight,
  Shield,
  BookOpen,
  Share2,
  CheckCircle2,
  AlertCircle,
  FileCheck,
  User,
  Building,
  Flame,
  ArrowUpRight,
  X,
  SlidersHorizontal,
  Info,
} from 'lucide-react';
import { PageHeader } from '@/components/vademecum/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { getResenhaCache, setResenhaCache, prefetchResenha, type ResenhaItem } from '@/services/atualizacaoService';
import LeiOrdinariaDetail from '@/components/vademecum/LeiOrdinariaDetail';
import type { LeiOrdinaria } from '@/services/legislacaoService';
import {
  getProposicoesEmTramitacao,
  fetchHistoricoTramitacao,
  type ProposicaoTramitando,
  type TramitacaoPasso,
} from '@/services/radarTramitacaoService';

// ─────────────────────────────────────────────────────────────────────────────
// TIPOS E MODELOS DE DADOS
// ─────────────────────────────────────────────────────────────────────────────

export interface NovaLeiCardItem {
  id: string;
  tipoAto: 'Emenda Constitucional' | 'Lei' | 'Lei Complementar' | 'Decreto' | 'Medida Provisória' | string;
  numeroAto: string;
  ano: number | string;
  tituloCurto: string;
  ementa: string;
  dataPublicacao: string;
  dataDou?: string;
  url?: string;
  textoCompleto?: string | null;
  explicacao?: string | null;
  isCurated?: boolean;
  destaqueBadge?: string;
}

export interface AlteracaoImpactanteItem {
  id: string;
  codigoId: string; // 'cp', 'cc', 'cf88', 'clt', 'cpc', 'cpp', 'cdc', 'eca'
  codigoNome: string;
  codigoSigla: string;
  codigoCor: string;
  artigoNumero: string;
  artigoRotulo: string;
  tema: string;
  oQueMudou: string;
  impactoPratico: string;
  leiModificadora: string;
  anoModificacao: number;
  rotaLeitura: string;
  tags: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// CATÁLOGO DE ALTERAÇÕES MAIS IMPACTANTES NOS GRANDES CÓDIGOS (CARROSSEL 2)
// ─────────────────────────────────────────────────────────────────────────────

const ALTERACOES_IMPACTANTES: AlteracaoImpactanteItem[] = [
  {
    id: 'cp-121-feminicidio',
    codigoId: 'cp',
    codigoNome: 'Código Penal',
    codigoSigla: 'CP',
    codigoCor: '#EF4444',
    artigoNumero: '121',
    artigoRotulo: 'Art. 121, § 2º-A e § 7º',
    tema: 'Feminicídio Autônomo e Pena de 20 a 40 Anos',
    oQueMudou: 'O feminicídio foi transformado em tipo penal autônomo (não mais qualificadora), com pena elevada para 20 a 40 anos de reclusão — a mais alta do Código Penal.',
    impactoPratico: 'Endurecimento no cumprimento de pena, vedação à saída temporária e regras mais rigorosas para progressão de regime prisional.',
    leiModificadora: 'Lei nº 14.994/2024 (Pacote Antifeminicídio)',
    anoModificacao: 2024,
    rotaLeitura: '/legislacao/codigos/cp/121',
    tags: ['Penal', 'Feminicídio', 'Mulher', 'Pena Máxima'],
  },
  {
    id: 'cp-146a-bullying',
    codigoId: 'cp',
    codigoNome: 'Código Penal',
    codigoSigla: 'CP',
    codigoCor: '#EF4444',
    artigoNumero: '146-A',
    artigoRotulo: 'Art. 146-A',
    tema: 'Intimidação Sistemática (Bullying e Cyberbullying)',
    oQueMudou: 'Tipificação penal expressa do bullying com multa, e do cyberbullying com pena de reclusão de 2 a 4 anos e multa quando praticado em redes sociais ou jogos virtuais.',
    impactoPratico: 'Criminalização de perseguições em ambiente escolar e virtual, facilitando a responsabilização civil e criminal de agressores.',
    leiModificadora: 'Lei nº 14.811/2024',
    anoModificacao: 2024,
    rotaLeitura: '/legislacao/codigos/cp/146-A',
    tags: ['Penal', 'Bullying', 'Cyberbullying', 'Internet'],
  },
  {
    id: 'cp-140-injuria-racial',
    codigoId: 'cp',
    codigoNome: 'Código Penal',
    codigoSigla: 'CP',
    codigoCor: '#EF4444',
    artigoNumero: '140',
    artigoRotulo: 'Art. 140, § 3º',
    tema: 'Injúria Racial Equiparada ao Crime de Racismo',
    oQueMudou: 'A ofensa discriminatória motivada por raça, cor, etnia ou procedência nacional passou para a Lei 7.716/89, tornando-se crime inafiançável e imprescritível.',
    impactoPratico: 'Fim da prescrição penal da injúria racial e pena privativa de liberdade de 2 a 5 anos, sem possibilidade de arbitramento de fiança policial.',
    leiModificadora: 'Lei nº 14.532/2023',
    anoModificacao: 2023,
    rotaLeitura: '/legislacao/codigos/cp/140',
    tags: ['Penal', 'Injúria Racial', 'Racismo', 'Imprescritível'],
  },
  {
    id: 'cp-171-fraude-eletronica',
    codigoId: 'cp',
    codigoNome: 'Código Penal',
    codigoSigla: 'CP',
    codigoCor: '#EF4444',
    artigoNumero: '171',
    artigoRotulo: 'Art. 171, § 2º-B',
    tema: 'Fraude Eletrônica (Golpes do PIX, Redes Sociais e Phishing)',
    oQueMudou: 'Criação da qualificadora de Fraude Eletrônica com pena de reclusão de 4 a 8 anos para estelionatos cometidos por meio digital, telefônico ou redes sociais.',
    impactoPratico: 'Aumento significativo da repressão a quadrilhas virtuais e afastamento de benefícios despenalizadores nos golpes eletrônicos.',
    leiModificadora: 'Lei nº 14.155/2021',
    anoModificacao: 2021,
    rotaLeitura: '/legislacao/codigos/cp/171',
    tags: ['Penal', 'PIX', 'Golpes Digitais', 'Estelionato'],
  },
  {
    id: 'cc-1584-guarda',
    codigoId: 'cc',
    codigoNome: 'Código Civil',
    codigoSigla: 'CC',
    codigoCor: '#F59E0B',
    artigoNumero: '1584',
    artigoRotulo: 'Art. 1.584, § 2º',
    tema: 'Vedação à Guarda Compartilhada em Risco de Violência',
    oQueMudou: 'A aplicação da guarda compartilhada foi expressamente proibida quando houver indício ou probabilidade de risco de violência doméstica ou familiar por um dos genitores.',
    impactoPratico: 'Proteção imediata aos filhos e à vítima de violência, exigindo consulta prévia pelo magistrado sobre processos de violência doméstica.',
    leiModificadora: 'Lei nº 14.713/2023',
    anoModificacao: 2023,
    rotaLeitura: '/legislacao/codigos/cc/1584',
    tags: ['Civil', 'Família', 'Guarda', 'Violência Doméstica'],
  },
  {
    id: 'cc-421a-contratos',
    codigoId: 'cc',
    codigoNome: 'Código Civil',
    codigoSigla: 'CC',
    codigoCor: '#F59E0B',
    artigoNumero: '421-A',
    artigoRotulo: 'Art. 421-A',
    tema: 'Liberdade Contratual e Intervenção Mínima Judicial',
    oQueMudou: 'Consagrou a presunção de paridade e simetria dos contratos civis e empresariais, restringindo a revisão judicial apenas a casos excepcionais e limitados.',
    impactoPratico: 'Maior segurança jurídica nos negócios entre empresas e valorização da alocação de riscos acordada livremente pelas partes.',
    leiModificadora: 'Lei nº 13.874/2019 (Liberdade Econômica)',
    anoModificacao: 2019,
    rotaLeitura: '/legislacao/codigos/cc/421-A',
    tags: ['Civil', 'Contratos', 'Empresarial', 'Autonomia'],
  },
  {
    id: 'cc-853a-garantias',
    codigoId: 'cc',
    codigoNome: 'Código Civil',
    codigoSigla: 'CC',
    codigoCor: '#F59E0B',
    artigoNumero: '853-A',
    artigoRotulo: 'Art. 853-A',
    tema: 'Execução Extrajudicial de Hipoteca em Cartório',
    oQueMudou: 'Autorizou a execução extrajudicial da hipoteca perante o Cartório de Registro de Imóveis, sem necessidade de morosa ação judicial.',
    impactoPratico: 'Redução do custo do crédito imobiliário e recuperação substancialmente mais célere dos ativos dados em garantia.',
    leiModificadora: 'Lei nº 14.711/2023 (Marco Legal das Garantias)',
    anoModificacao: 2023,
    rotaLeitura: '/legislacao/codigos/cc/853-A',
    tags: ['Civil', 'Imóveis', 'Garantias', 'Cartório'],
  },
  {
    id: 'clt-461-igualdade-salarial',
    codigoId: 'clt',
    codigoNome: 'Consolidação das Leis do Trabalho',
    codigoSigla: 'CLT',
    codigoCor: '#8B5CF6',
    artigoNumero: '461',
    artigoRotulo: 'Art. 461, § 6º',
    tema: 'Igualdade Salarial entre Homens e Mulheres (Multa de 10x)',
    oQueMudou: 'Em caso de discriminação de remuneração por motivo de sexo, etnia ou raça, o empregador deverá pagar as diferenças devidas acrescidas de multa de 10 vezes o novo salário.',
    impactoPratico: 'Obrigatoriedade de relatórios de transparência salarial e mitigação rigorosa da histórica disparidade de remuneração de gênero no mercado.',
    leiModificadora: 'Lei nº 14.611/2023',
    anoModificacao: 2023,
    rotaLeitura: '/legislacao/codigos/clt/461',
    tags: ['Trabalhista', 'Igualdade Salarial', 'Mulher', 'Multa'],
  },
  {
    id: 'clt-75b-teletrabalho',
    codigoId: 'clt',
    codigoNome: 'Consolidação das Leis do Trabalho',
    codigoSigla: 'CLT',
    codigoCor: '#8B5CF6',
    artigoNumero: '75-B',
    artigoRotulo: 'Art. 75-B e 75-C',
    tema: 'Regulamentação Definitiva do Teletrabalho e Modelo Híbrido',
    oQueMudou: 'Esclareceu que a ida presencial para tarefas específicas não descaracteriza o teletrabalho, regulamentando o regime híbrido e o trabalho remoto por tarefa vs. jornada.',
    impactoPratico: 'Garantia de segurança jurídica para contratos em home office e extensão do regime a estagiários e jovens aprendizes.',
    leiModificadora: 'Lei nº 14.442/2022',
    anoModificacao: 2022,
    rotaLeitura: '/legislacao/codigos/clt/75-B',
    tags: ['Trabalhista', 'Home Office', 'Teletrabalho', 'Jornada'],
  },
  {
    id: 'cf88-198-saude',
    codigoId: 'cf88',
    codigoNome: 'Constituição Federal',
    codigoSigla: 'CF/88',
    codigoCor: '#EAB308',
    artigoNumero: '198',
    artigoRotulo: 'Art. 198, §§ 14 a 16',
    tema: 'Aposentadoria Especial e Insalubridade aos Agentes de Saúde',
    oQueMudou: 'Inserção de regras constitucionais para aposentadoria especial, adicional de insalubridade e transição para o regime estatutário aos Agentes Comunitários (ACS/ACE).',
    impactoPratico: 'Fim da precarização dos agentes de saúde e combate a endemias nos municípios, garantindo estabilidade funcional até 2028.',
    leiModificadora: 'Emenda Constitucional nº 140/2026',
    anoModificacao: 2026,
    rotaLeitura: '/legislacao/constituicao/cf88/198',
    tags: ['Constitucional', 'SUS', 'Saúde', 'Aposentadoria'],
  },
  {
    id: 'cf88-156a-tributaria',
    codigoId: 'cf88',
    codigoNome: 'Constituição Federal',
    codigoSigla: 'CF/88',
    codigoCor: '#EAB308',
    artigoNumero: '156-A',
    artigoRotulo: 'Art. 156-A e 195, V',
    tema: 'Reforma Tributária do Consumo (IBS, CBS e Fim do ICMS/ISS)',
    oQueMudou: 'Criação do Imposto sobre Bens e Serviços (IBS) e da Contribuição sobre Bens e Serviços (CBS), iniciando a transição para tributação no destino com não-cumulatividade plena.',
    impactoPratico: 'Extinção gradual de PIS/Cofins, IPI, ICMS e ISS até 2033, eliminando a guerra fiscal e simplificando o sistema tributário nacional.',
    leiModificadora: 'Emenda Constitucional nº 132/2023 e LC 214/2025',
    anoModificacao: 2024,
    rotaLeitura: '/legislacao/constituicao/cf88/156-A',
    tags: ['Constitucional', 'Tributário', 'IBS', 'CBS', 'Consumo'],
  },
  {
    id: 'cpp-3a-juiz-garantias',
    codigoId: 'cpp',
    codigoNome: 'Código de Processo Penal',
    codigoSigla: 'CPP',
    codigoCor: '#EC4899',
    artigoNumero: '3-A',
    artigoRotulo: 'Art. 3º-A a 3º-F',
    tema: 'Juiz das Garantias (Constitucionalidade Chancelada pelo STF)',
    oQueMudou: 'Separação estrutural entre o juiz que atua na fase do inquérito e o juiz que instrui e julga o processo penal de mérito.',
    impactoPratico: 'Garantia de maior imparcialidade do julgador de mérito, que não fica previamente contaminado pelas provas colhidas na fase inquisitorial.',
    leiModificadora: 'Lei nº 13.964/2019 (Pacote Anticrime / STF)',
    anoModificacao: 2023,
    rotaLeitura: '/legislacao/codigos/cpp/3-A',
    tags: ['Processo Penal', 'Juiz das Garantias', 'Inquérito', 'Imparcialidade'],
  },
  {
    id: 'cpc-246-citacao-eletronica',
    codigoId: 'cpc',
    codigoNome: 'Código de Processo Civil',
    codigoSigla: 'CPC',
    codigoCor: '#3B82F6',
    artigoNumero: '246',
    artigoRotulo: 'Art. 246',
    tema: 'Citação Eletrônica Preferencial e Domicílio Judicial',
    oQueMudou: 'A citação judicial passou a ser realizada preferencialmente por meio eletrônico em até 2 dias úteis via Domicílio Judicial Eletrônico e e-mails cadastrados.',
    impactoPratico: 'Celeridade nos atos processuais e penalidade para partes que não confirmarem a citação no prazo legal sem justa causa.',
    leiModificadora: 'Lei nº 14.195/2021',
    anoModificacao: 2021,
    rotaLeitura: '/legislacao/codigos/cpc/246',
    tags: ['Processo Civil', 'Citação', 'Domicílio Eletrônico', 'Celeridade'],
  },
  {
    id: 'eca-18b-henry-borel',
    codigoId: 'eca',
    codigoNome: 'Estatuto da Criança e do Adolescente',
    codigoSigla: 'ECA',
    codigoCor: '#F43F5E',
    artigoNumero: '18-B',
    artigoRotulo: 'Art. 18-B',
    tema: 'Medidas Protetivas de Urgência para Menores (Lei Henry Borel)',
    oQueMudou: 'Possibilidade de concessão imediata de medidas protetivas de urgência para crianças e adolescentes em risco doméstico, com afastamento do agressor do lar.',
    impactoPratico: 'Mecanismo similar ao da Lei Maria da Penha voltado exclusivamente para a infância e juventude contra abusadores e agressores familiares.',
    leiModificadora: 'Lei nº 14.344/2022 (Lei Henry Borel)',
    anoModificacao: 2022,
    rotaLeitura: '/legislacao/estatutos/eca/18-B',
    tags: ['Estatutos', 'Criança', 'Violência Infantil', 'Henry Borel'],
  },
  {
    id: 'cdc-54a-superendividamento',
    codigoId: 'cdc',
    codigoNome: 'Código de Defesa do Consumidor',
    codigoSigla: 'CDC',
    codigoCor: '#F97316',
    artigoNumero: '54-A',
    artigoRotulo: 'Art. 54-A a 54-G',
    tema: 'Prevenção e Tratamento do Superendividamento',
    oQueMudou: 'Dever dos bancos e instituições de conceder crédito responsável, proibição de assédio publicitário a idosos e procedimento de repactuação global de dívidas.',
    impactoPratico: 'Preservação obrigatória do mínimo existencial do consumidor e audiência conciliatória com todos os credores reunidos.',
    leiModificadora: 'Lei nº 14.181/2021 (Lei do Superendividamento)',
    anoModificacao: 2021,
    rotaLeitura: '/legislacao/codigos/cdc/54-A',
    tags: ['Consumidor', 'Crédito', 'Superendividamento', 'Mínimo Existencial'],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// CURADORIA DE NOVAS LEIS DESTACADAS (CARROSSEL 1)
// ─────────────────────────────────────────────────────────────────────────────

const NOVAS_LEIS_CURADAS: NovaLeiCardItem[] = [
  {
    id: 'curated-ec-140',
    tipoAto: 'Emenda Constitucional',
    numeroAto: 'EC nº 140/2026',
    ano: 2026,
    tituloCurto: 'Aposentadoria Especial e Insalubridade para Agentes de Saúde',
    ementa: 'Altera o art. 198 da CF para dispor sobre a aposentadoria especial, o adicional de insalubridade e a regularização de vínculos dos Agentes Comunitários de Saúde e de Combate às Endemias.',
    dataPublicacao: '2026-10-18',
    url: 'https://www.planalto.gov.br/ccivil_03/constituicao/emendas/emc/emc140.htm',
    destaqueBadge: 'Recém Promulgada',
    isCurated: true,
  },
  {
    id: 'curated-lc-238',
    tipoAto: 'Lei Complementar',
    numeroAto: 'LC nº 238/2026',
    ano: 2026,
    tituloCurto: 'Normas Complementares de Assistência Financeira Previdenciária',
    ementa: 'Estabelece normas orçamentárias e financeiras suplementares para a complementação de proventos e assistência da União aos regimes previdenciários dos entes federados.',
    dataPublicacao: '2026-10-21',
    url: 'https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp238.htm',
    destaqueBadge: 'Outubro / 2026',
    isCurated: true,
  },
  {
    id: 'curated-lc-214',
    tipoAto: 'Lei Complementar',
    numeroAto: 'LC nº 214/2025',
    ano: 2025,
    tituloCurto: 'Instituição do IBS e da CBS (Regulamentação da Reforma Tributária)',
    ementa: 'Institui o Imposto sobre Bens e Serviços (IBS) e a Contribuição sobre Bens e Serviços (CBS), dispondo sobre o Comitê Gestor do IBS e a transição tributária do consumo.',
    dataPublicacao: '2025-12-15',
    url: 'https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp214.htm',
    destaqueBadge: 'Reforma Tributária',
    isCurated: true,
  },
  {
    id: 'curated-lei-14994',
    tipoAto: 'Lei',
    numeroAto: 'Lei nº 14.994/2024',
    ano: 2024,
    tituloCurto: 'Pacote Antifeminicídio: Crime Autônomo e Pena de 20 a 40 Anos',
    ementa: 'Altera o Código Penal, a Lei de Execução Penal e a Lei dos Crimes Hediondos para tornar o feminicídio crime autônomo, aumentar a pena para 20 a 40 anos e agravar sanções.',
    dataPublicacao: '2024-10-10',
    url: 'https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2024/lei/l14994.htm',
    destaqueBadge: 'Penal Rigoroso',
    isCurated: true,
  },
  {
    id: 'curated-lei-14811',
    tipoAto: 'Lei',
    numeroAto: 'Lei nº 14.811/2024',
    ano: 2024,
    tituloCurto: 'Combate ao Bullying, Cyberbullying e Proteção da Criança e Jovem',
    ementa: 'Institui medidas de proteção à criança e ao adolescente contra a violência nos estabelecimentos educacionais ou similares, prevê a Política Nacional e tipifica o bullying no CP.',
    dataPublicacao: '2024-01-15',
    url: 'https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2024/lei/l14811.htm',
    destaqueBadge: 'Ambiente Escolar',
    isCurated: true,
  },
  {
    id: 'curated-lei-14790',
    tipoAto: 'Lei',
    numeroAto: 'Lei nº 14.790/2023',
    ano: 2023,
    tituloCurto: 'Regulamentação das Apostas Esportivas e Jogos Online (Bets)',
    ementa: 'Dispõe sobre a modalidade lotérica denominada apostas de quota fixa, outorga de autorização a operadores, tributação e regras de jogo responsável.',
    dataPublicacao: '2023-12-30',
    url: 'https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2023/lei/l14790.htm',
    destaqueBadge: 'Marco das Bets',
    isCurated: true,
  },
  {
    id: 'curated-lei-14711',
    tipoAto: 'Lei',
    numeroAto: 'Lei nº 14.711/2023',
    ano: 2023,
    tituloCurto: 'Marco Legal das Garantias e Execuções Extrajudiciais',
    ementa: 'Aprimora as regras relativas ao tratamento do crédito e garantias, permitindo execução extrajudicial de hipoteca e atuação de agentes de garantia.',
    dataPublicacao: '2023-10-31',
    url: 'https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2023/lei/l14711.htm',
    destaqueBadge: 'Garantias & Crédito',
    isCurated: true,
  },
  {
    id: 'curated-lei-14611',
    tipoAto: 'Lei',
    numeroAto: 'Lei nº 14.611/2023',
    ano: 2023,
    tituloCurto: 'Igualdade Salarial e de Remuneração entre Mulheres e Homens',
    ementa: 'Dispõe sobre a igualdade salarial e de critérios remuneratórios entre mulheres e homens para a realização de trabalho de igual valor ou no exercício da mesma função.',
    dataPublicacao: '2023-07-04',
    url: 'https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2023/lei/l14611.htm',
    destaqueBadge: 'Trabalho & Equidade',
    isCurated: true,
  },
  {
    id: 'curated-lei-14532',
    tipoAto: 'Lei',
    numeroAto: 'Lei nº 14.532/2023',
    ano: 2023,
    tituloCurto: 'Tipificação da Injúria Racial na Lei de Crimes de Racismo',
    ementa: 'Altera a Lei nº 7.716/1989 e o Código Penal para tipificar a injúria racial como crime de racismo, tornando-a inafiançável e imprescritível.',
    dataPublicacao: '2023-01-12',
    url: 'https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2023/lei/l14532.htm',
    destaqueBadge: 'Direitos Humanos',
    isCurated: true,
  },
];

// Helper de cores por tipo de ato
const TIPO_ATO_COLORS: Record<string, { badge: string; border: string; glow: string; text: string }> = {
  'Emenda Constitucional': {
    badge: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    border: 'border-emerald-500/30 hover:border-emerald-500/60',
    glow: 'from-emerald-500/10 via-transparent to-transparent',
    text: 'text-emerald-400',
  },
  'Lei': {
    badge: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
    border: 'border-sky-500/30 hover:border-sky-500/60',
    glow: 'from-sky-500/10 via-transparent to-transparent',
    text: 'text-sky-400',
  },
  'Lei Complementar': {
    badge: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    border: 'border-amber-500/30 hover:border-amber-500/60',
    glow: 'from-amber-500/10 via-transparent to-transparent',
    text: 'text-amber-400',
  },
  'Decreto': {
    badge: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
    border: 'border-purple-500/30 hover:border-purple-500/60',
    glow: 'from-purple-500/10 via-transparent to-transparent',
    text: 'text-purple-400',
  },
  'Medida Provisória': {
    badge: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
    border: 'border-rose-500/30 hover:border-rose-500/60',
    glow: 'from-rose-500/10 via-transparent to-transparent',
    text: 'text-rose-400',
  },
};

function getTipoColors(tipo: string) {
  return TIPO_ATO_COLORS[tipo] || {
    badge: 'bg-muted text-muted-foreground border-border',
    border: 'border-border/40 hover:border-border',
    glow: 'from-white/5 to-transparent',
    text: 'text-foreground',
  };
}

function formatDateBr(d?: string): string {
  if (!d) return '';
  const clean = d.slice(0, 10);
  const [y, m, dia] = clean.split('-');
  if (!y || !m || !dia) return d;
  return `${dia}/${m}/${y}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────

export default function Novidades() {
  const navigate = useNavigate();

  // Estados de dados
  const [resenhaItems, setResenhaItems] = useState<ResenhaItem[]>([]);
  const [proposicoes, setProposicoes] = useState<ProposicaoTramitando[]>([]);
  const [loadingResenha, setLoadingResenha] = useState(true);
  const [loadingProposicoes, setLoadingProposicoes] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Estados de pesquisa e filtro de seções
  const [searchTerm, setSearchTerm] = useState('');
  const [activeSectionTab, setActiveSectionTab] = useState<'tudo' | 'leis' | 'impactos' | 'camara'>('tudo');

  // Estados para modais e detalhes
  const [selectedLeiCard, setSelectedLeiCard] = useState<NovaLeiCardItem | null>(null);
  const [selectedImpacto, setSelectedImpacto] = useState<AlteracaoImpactanteItem | null>(null);
  const [selectedProposicao, setSelectedProposicao] = useState<ProposicaoTramitando | null>(null);
  const [proposicaoHistorico, setProposicaoHistorico] = useState<TramitacaoPasso[]>([]);
  const [loadingHistorico, setLoadingHistorico] = useState(false);

  // Visualizador completo de Lei do Planalto (LeiOrdinariaDetail)
  const [detailItem, setDetailItem] = useState<LeiOrdinaria | null>(null);

  // Refs para controle de scroll horizontal suave
  const carousel1Ref = useRef<HTMLDivElement>(null);
  const carousel2Ref = useRef<HTMLDivElement>(null);
  const carousel3Ref = useRef<HTMLDivElement>(null);

  // ───────────────────────────────────────────────────────────────────────────
  // CARREGAMENTO DOS DADOS (RESENHA DIÁRIA + PROPOSIÇÕES CÂMARA)
  // ───────────────────────────────────────────────────────────────────────────

  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);

    // 1. Resenha Diária do Planalto
    try {
      const cached = getResenhaCache();
      if (!isRefresh && cached && cached.length > 0) {
        setResenhaItems(cached);
        setLoadingResenha(false);
      } else {
        const { data } = await supabase
          .from('resenha_diaria' as any)
          .select('id,tipo_ato,numero_ato,ementa,url,data_publicacao,data_dou,texto_completo,explicacao')
          .order('data_dou', { ascending: false })
          .limit(100);

        if (data && data.length > 0) {
          setResenhaItems(data as unknown as ResenhaItem[]);
          setResenhaCache(data as unknown as ResenhaItem[]);
        }
        setLoadingResenha(false);
      }
    } catch (err) {
      console.warn('Erro ao carregar resenha:', err);
      setLoadingResenha(false);
    }

    // 2. Proposições da Câmara dos Deputados e Senado
    try {
      const props = await getProposicoesEmTramitacao(isRefresh);
      if (props && props.length > 0) {
        setProposicoes(props);
      }
      setLoadingProposicoes(false);
    } catch (err) {
      console.warn('Erro ao carregar proposições:', err);
      setLoadingProposicoes(false);
    }

    if (isRefresh) {
      setRefreshing(false);
      toast.success('Novidades legislativas atualizadas!');
    }
  }, []);

  useEffect(() => {
    loadData();
    try {
      localStorage.setItem('radar_novidades_last_seen', new Date().toISOString());
    } catch {}
  }, [loadData]);

  // Carrega histórico quando uma proposição é selecionada
  useEffect(() => {
    if (!selectedProposicao) {
      setProposicaoHistorico([]);
      return;
    }
    let isCancelled = false;
    setLoadingHistorico(true);

    fetchHistoricoTramitacao(selectedProposicao)
      .then((passos) => {
        if (!isCancelled) {
          setProposicaoHistorico(passos);
          setLoadingHistorico(false);
        }
      })
      .catch(() => {
        if (!isCancelled) setLoadingHistorico(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [selectedProposicao]);

  // Scroll horizontal helpers
  const scrollHoriz = (ref: React.RefObject<HTMLDivElement | null>, dir: 'left' | 'right') => {
    if (!ref.current) return;
    const amount = dir === 'left' ? -340 : 340;
    ref.current.scrollBy({ left: amount, behavior: 'smooth' });
  };

  // ───────────────────────────────────────────────────────────────────────────
  // MESCLAGEM E FILTRAGEM DOS DADOS
  // ───────────────────────────────────────────────────────────────────────────

  // Carrossel 1: Mescla leis curadas célebres com resenha diária ao vivo
  const mergedNovasLeis = useMemo<NovaLeiCardItem[]>(() => {
    const list: NovaLeiCardItem[] = [...NOVAS_LEIS_CURADAS];
    const seenNumbers = new Set(NOVAS_LEIS_CURADAS.map((c) => c.numeroAto.toLowerCase().replace(/\s+/g, '')));

    resenhaItems.forEach((r) => {
      const normalizedNum = (r.numero_ato || '').toLowerCase().replace(/\s+/g, '');
      if (normalizedNum && !seenNumbers.has(normalizedNum)) {
        seenNumbers.add(normalizedNum);
        list.push({
          id: r.id,
          tipoAto: r.tipo_ato || 'Lei',
          numeroAto: r.numero_ato || 'Ato Normativo',
          ano: (r.data_dou || r.data_publicacao || '').slice(0, 4) || '2026',
          tituloCurto: r.numero_ato,
          ementa: r.ementa || 'Sem ementa disponível no momento.',
          dataPublicacao: r.data_publicacao || r.data_dou || '',
          dataDou: r.data_dou || '',
          url: r.url || '',
          textoCompleto: r.texto_completo,
          explicacao: r.explicacao,
          isCurated: false,
        });
      }
    });

    return list;
  }, [resenhaItems]);

  // Filtros aplicados por busca (searchTerm)
  const filteredNovasLeis = useMemo(() => {
    if (!searchTerm.trim()) return mergedNovasLeis;
    const term = searchTerm.toLowerCase();
    return mergedNovasLeis.filter(
      (item) =>
        item.numeroAto.toLowerCase().includes(term) ||
        item.tituloCurto.toLowerCase().includes(term) ||
        item.ementa.toLowerCase().includes(term) ||
        item.tipoAto.toLowerCase().includes(term)
    );
  }, [mergedNovasLeis, searchTerm]);

  const filteredImpactos = useMemo(() => {
    if (!searchTerm.trim()) return ALTERACOES_IMPACTANTES;
    const term = searchTerm.toLowerCase();
    return ALTERACOES_IMPACTANTES.filter(
      (item) =>
        item.codigoNome.toLowerCase().includes(term) ||
        item.codigoSigla.toLowerCase().includes(term) ||
        item.artigoRotulo.toLowerCase().includes(term) ||
        item.tema.toLowerCase().includes(term) ||
        item.oQueMudou.toLowerCase().includes(term) ||
        item.leiModificadora.toLowerCase().includes(term) ||
        item.tags.some((t) => t.toLowerCase().includes(term))
    );
  }, [searchTerm]);

  const filteredProposicoes = useMemo(() => {
    if (!searchTerm.trim()) return proposicoes;
    const term = searchTerm.toLowerCase();
    return proposicoes.filter(
      (p) =>
        p.codigoIdentificacao.toLowerCase().includes(term) ||
        p.ementa.toLowerCase().includes(term) ||
        p.autorNome.toLowerCase().includes(term) ||
        (p.leiAlvo && p.leiAlvo.toLowerCase().includes(term)) ||
        (p.autorPartido && p.autorPartido.toLowerCase().includes(term))
    );
  }, [proposicoes, searchTerm]);

  // Abre visualizador completo se solicitado
  if (detailItem) {
    return <LeiOrdinariaDetail lei={detailItem} onBack={() => setDetailItem(null)} />;
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col select-none">
      {/* ─────────────────────────────────────────────────────────────────────
          HEADER DA PÁGINA
      ───────────────────────────────────────────────────────────────────── */}
      <PageHeader
        title="Novidades"
        subtitle="Atualizações legislativas, alterações nos códigos e projetos no Congresso"
        onBack={() => navigate(-1)}
        rightAction={
          <button
            type="button"
            onClick={() => loadData(true)}
            disabled={refreshing}
            aria-label="Atualizar dados"
            className="w-10 h-10 rounded-full bg-white/[0.06] border border-white/10 flex items-center justify-center active:scale-95 transition-all text-muted-foreground hover:text-foreground touch-manipulation"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-primary' : ''}`} />
          </button>
        }
      />

      <main className="flex-1 overflow-y-auto pb-32">
        {/* ───────────────────────────────────────────────────────────────────
            BARRA DE BUSCA E CHIPS DE NAVEGAÇÃO RÁPIDA
        ─────────────────────────────────────────────────────────────────── */}
        <div className="px-4 pt-4 pb-2 max-w-7xl mx-auto w-full space-y-3">
          {/* Campo de Busca Rápida */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Pesquisar por lei, código, artigo, tema ou parlamentar..."
              className="w-full h-11 pl-10 pr-10 rounded-xl bg-card/70 border border-white/10 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 text-sm placeholder:text-muted-foreground/70 outline-none transition-all"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Chips de Seções para Filtragem Rápida */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
            <button
              type="button"
              onClick={() => setActiveSectionTab('tudo')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium shrink-0 transition-all ${
                activeSectionTab === 'tudo'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-card/70 border border-white/10 text-muted-foreground hover:text-foreground'
              }`}
            >
              Tudo
            </button>
            <button
              type="button"
              onClick={() => setActiveSectionTab('leis')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium shrink-0 flex items-center gap-1.5 transition-all ${
                activeSectionTab === 'leis'
                  ? 'bg-emerald-500 text-white shadow-sm'
                  : 'bg-card/70 border border-white/10 text-muted-foreground hover:text-foreground'
              }`}
            >
              <FileCheck className="w-3.5 h-3.5" />
              <span>Novas Leis</span>
              <span className="opacity-80 text-[10px]">({filteredNovasLeis.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveSectionTab('impactos')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium shrink-0 flex items-center gap-1.5 transition-all ${
                activeSectionTab === 'impactos'
                  ? 'bg-rose-500 text-white shadow-sm'
                  : 'bg-card/70 border border-white/10 text-muted-foreground hover:text-foreground'
              }`}
            >
              <Flame className="w-3.5 h-3.5" />
              <span>Grandes Códigos</span>
              <span className="opacity-80 text-[10px]">({filteredImpactos.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveSectionTab('camara')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium shrink-0 flex items-center gap-1.5 transition-all ${
                activeSectionTab === 'camara'
                  ? 'bg-sky-500 text-white shadow-sm'
                  : 'bg-card/70 border border-white/10 text-muted-foreground hover:text-foreground'
              }`}
            >
              <Landmark className="w-3.5 h-3.5" />
              <span>Câmara dos Deputados</span>
              <span className="opacity-80 text-[10px]">({filteredProposicoes.length})</span>
            </button>
          </div>
        </div>

        {/* ───────────────────────────────────────────────────────────────────
            CARROSSEL 1: NOVIDADES LEGISLATIVAS (NOVAS LEIS PROMULGADAS)
        ─────────────────────────────────────────────────────────────────── */}
        {(activeSectionTab === 'tudo' || activeSectionTab === 'leis') && (
          <section className="pt-5 pb-2">
            <div className="px-4 max-w-7xl mx-auto flex items-center justify-between gap-3 mb-2.5">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <h2 className="text-base sm:text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
                    Novidades Legislativas
                    <Badge variant="outline" className="text-[10px] font-normal border-emerald-500/30 text-emerald-400">
                      Novas Leis
                    </Badge>
                  </h2>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Leis recém-promulgadas, Emendas Constitucionais e atos publicados no Planalto
                </p>
              </div>

              {/* Botões desktop de navegação */}
              <div className="hidden sm:flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => scrollHoriz(carousel1Ref, 'left')}
                  className="w-8 h-8 rounded-full bg-card border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors"
                  aria-label="Rolar para esquerda"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => scrollHoriz(carousel1Ref, 'right')}
                  className="w-8 h-8 rounded-full bg-card border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors"
                  aria-label="Rolar para direita"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Carrossel de Novas Leis */}
            <div
              ref={carousel1Ref}
              className="flex gap-3.5 px-4 overflow-x-auto no-scrollbar snap-x snap-mandatory scroll-smooth pt-1 pb-3"
            >
              {filteredNovasLeis.map((lei) => {
                const colors = getTipoColors(lei.tipoAto);
                return (
                  <div
                    key={lei.id}
                    onClick={() => setSelectedLeiCard(lei)}
                    className={`w-[82vw] sm:w-[350px] md:w-[370px] shrink-0 snap-start rounded-2xl bg-gradient-to-b ${colors.glow} bg-card/80 border ${colors.border} p-4 flex flex-col justify-between shadow-lg cursor-pointer hover:shadow-emerald-500/5 hover:-translate-y-0.5 active:scale-[0.98] transition-all`}
                  >
                    <div>
                      {/* Top Header do Card */}
                      <div className="flex items-center justify-between gap-2 mb-2.5">
                        <Badge variant="outline" className={`text-[11px] font-medium ${colors.badge}`}>
                          {lei.tipoAto}
                        </Badge>
                        <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                          <Calendar className="w-3 h-3 opacity-70" />
                          {formatDateBr(lei.dataPublicacao)}
                        </span>
                      </div>

                      {/* Título e Número */}
                      <h3 className="font-bold text-foreground text-sm sm:text-base leading-snug line-clamp-1 mb-1">
                        {lei.numeroAto}
                      </h3>
                      {lei.destaqueBadge && (
                        <span className="inline-block px-2 py-0.5 mb-2 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          {lei.destaqueBadge}
                        </span>
                      )}

                      {/* Ementa / Síntese */}
                      <p className="text-xs text-muted-foreground/90 line-clamp-3 leading-relaxed">
                        {lei.ementa}
                      </p>
                    </div>

                    {/* Rodapé com Ação */}
                    <div className="pt-4 border-t border-white/5 flex items-center justify-between mt-3">
                      <span className="text-[11px] font-medium text-emerald-400 flex items-center gap-1">
                        Ver resumo e detalhes
                      </span>
                      <div className="w-7 h-7 rounded-full bg-white/5 flex items-center justify-center text-muted-foreground group-hover:text-foreground">
                        <ChevronRight className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ───────────────────────────────────────────────────────────────────
            CARROSSEL 2: ALTERAÇÕES MAIS IMPACTANTES (GRANDES CÓDIGOS)
        ─────────────────────────────────────────────────────────────────── */}
        {(activeSectionTab === 'tudo' || activeSectionTab === 'impactos') && (
          <section className="pt-6 pb-2">
            <div className="px-4 max-w-7xl mx-auto flex items-center justify-between gap-3 mb-2.5">
              <div>
                <div className="flex items-center gap-2">
                  <Flame className="w-4 h-4 text-rose-500" />
                  <h2 className="text-base sm:text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
                    Alterações Mais Impactantes
                    <Badge variant="outline" className="text-[10px] font-normal border-rose-500/30 text-rose-400">
                      Grandes Códigos
                    </Badge>
                  </h2>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Artigos modificados e novidades essenciais no CP, CC, CF/88, CLT, CPC, CPP, CDC e ECA
                </p>
              </div>

              {/* Botões desktop de navegação */}
              <div className="hidden sm:flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => scrollHoriz(carousel2Ref, 'left')}
                  className="w-8 h-8 rounded-full bg-card border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors"
                  aria-label="Rolar para esquerda"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => scrollHoriz(carousel2Ref, 'right')}
                  className="w-8 h-8 rounded-full bg-card border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors"
                  aria-label="Rolar para direita"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Carrossel de Alterações Impactantes */}
            <div
              ref={carousel2Ref}
              className="flex gap-3.5 px-4 overflow-x-auto no-scrollbar snap-x snap-mandatory scroll-smooth pt-1 pb-3"
            >
              {filteredImpactos.map((item) => (
                <div
                  key={item.id}
                  onClick={() => setSelectedImpacto(item)}
                  className="w-[84vw] sm:w-[360px] md:w-[380px] shrink-0 snap-start rounded-2xl bg-card/85 border border-white/10 hover:border-white/20 p-4 flex flex-col justify-between shadow-lg cursor-pointer hover:-translate-y-0.5 active:scale-[0.98] transition-all relative overflow-hidden group"
                >
                  {/* Faixa lateral indicativa da matéria */}
                  <div
                    className="absolute top-0 left-0 bottom-0 w-1.5"
                    style={{ backgroundColor: item.codigoCor }}
                  />

                  <div>
                    {/* Top Header: Badge do Código + Artigo */}
                    <div className="flex items-center justify-between gap-2 mb-2 pl-1.5">
                      <div className="flex items-center gap-2">
                        <span
                          className="px-2.5 py-0.5 rounded-full text-[11px] font-bold text-white shadow-sm"
                          style={{ backgroundColor: item.codigoCor }}
                        >
                          {item.codigoSigla}
                        </span>
                        <span className="text-xs font-semibold text-foreground/90">{item.artigoRotulo}</span>
                      </div>
                      <Badge variant="outline" className="text-[10px] font-medium border-white/10 text-muted-foreground">
                        {item.anoModificacao}
                      </Badge>
                    </div>

                    {/* Tema Principal da Mudança */}
                    <h3 className="font-bold text-foreground text-sm sm:text-base leading-snug line-clamp-2 mb-2 pl-1.5">
                      {item.tema}
                    </h3>

                    {/* O Que Mudou */}
                    <div className="pl-1.5 space-y-1.5">
                      <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                        {item.oQueMudou}
                      </p>
                      <div className="pt-1 flex items-center gap-1.5 text-[11px] text-amber-400 font-medium">
                        <Sparkles className="w-3 h-3 shrink-0" />
                        <span className="truncate">{item.leiModificadora}</span>
                      </div>
                    </div>
                  </div>

                  {/* Rodapé com botão direto para ler no código */}
                  <div className="pt-3.5 border-t border-white/5 flex items-center justify-between mt-3 pl-1.5">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(item.rotaLeitura);
                      }}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
                    >
                      <span>Abrir Artigo no Código</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                    <div className="w-7 h-7 rounded-full bg-white/5 flex items-center justify-center text-muted-foreground group-hover:text-foreground">
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ───────────────────────────────────────────────────────────────────
            CARROSSEL 3: O QUE PODE ACONTECER (CÂMARA DOS DEPUTADOS)
        ─────────────────────────────────────────────────────────────────── */}
        {(activeSectionTab === 'tudo' || activeSectionTab === 'camara') && (
          <section className="pt-6 pb-4">
            <div className="px-4 max-w-7xl mx-auto flex items-center justify-between gap-3 mb-2.5">
              <div>
                <div className="flex items-center gap-2">
                  <Landmark className="w-4 h-4 text-sky-400" />
                  <h2 className="text-base sm:text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
                    O Que Pode Acontecer
                    <Badge variant="outline" className="text-[10px] font-normal border-sky-500/30 text-sky-400">
                      Congresso Nacional
                    </Badge>
                  </h2>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Projetos de Lei e PECs em tramitação que visam alterar leis e artigos vigentes
                </p>
              </div>

              {/* Botões desktop de navegação */}
              <div className="hidden sm:flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => scrollHoriz(carousel3Ref, 'left')}
                  className="w-8 h-8 rounded-full bg-card border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors"
                  aria-label="Rolar para esquerda"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => scrollHoriz(carousel3Ref, 'right')}
                  className="w-8 h-8 rounded-full bg-card border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors"
                  aria-label="Rolar para direita"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Carrossel de Proposições da Câmara */}
            <div
              ref={carousel3Ref}
              className="flex gap-3.5 px-4 overflow-x-auto no-scrollbar snap-x snap-mandatory scroll-smooth pt-1 pb-3"
            >
              {loadingProposicoes && proposicoes.length === 0 ? (
                // Skeletons de carregamento
                Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={`skel-${i}`}
                    className="w-[84vw] sm:w-[360px] md:w-[380px] shrink-0 snap-start rounded-2xl bg-card/60 border border-white/5 p-4 flex flex-col justify-between animate-pulse h-[210px]"
                  >
                    <div className="space-y-3">
                      <div className="w-28 h-5 rounded bg-white/10" />
                      <div className="w-full h-8 rounded bg-white/5" />
                      <div className="w-3/4 h-4 rounded bg-white/5" />
                    </div>
                    <div className="w-32 h-4 rounded bg-white/10" />
                  </div>
                ))
              ) : (
                filteredProposicoes.map((prop) => (
                  <div
                    key={prop.id}
                    onClick={() => setSelectedProposicao(prop)}
                    className="w-[84vw] sm:w-[360px] md:w-[380px] shrink-0 snap-start rounded-2xl bg-gradient-to-b from-sky-500/10 via-card/90 to-card/90 border border-sky-500/20 hover:border-sky-500/50 p-4 flex flex-col justify-between shadow-lg cursor-pointer hover:-translate-y-0.5 active:scale-[0.98] transition-all group"
                  >
                    <div>
                      {/* Top Header: Tipo/Número + Tag de Lei Alvo */}
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <Badge variant="outline" className="text-xs font-bold bg-sky-500/20 text-sky-300 border-sky-500/40">
                          {prop.codigoIdentificacao}
                        </Badge>
                        <span className="text-[10px] uppercase font-semibold text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/20">
                          {prop.casa === 'senado' ? 'Senado' : 'Câmara'}
                        </span>
                      </div>

                      {/* Tag de Lei Alvo (se houver) */}
                      {prop.leiAlvo && (
                        <div className="mb-2">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                            <Scale className="w-3 h-3" />
                            <span>Altera: {prop.leiAlvo}</span>
                          </span>
                        </div>
                      )}

                      {/* Ementa do Projeto */}
                      <p className="text-xs text-muted-foreground/90 line-clamp-3 leading-relaxed mb-3">
                        {prop.ementa}
                      </p>

                      {/* Autor Parlamentar */}
                      <div className="flex items-center gap-2.5 pt-1">
                        {prop.autorFotoUrl ? (
                          <img
                            src={prop.autorFotoUrl}
                            alt={prop.autorNome}
                            className="w-7 h-7 rounded-full object-cover border border-white/10 shrink-0"
                            loading="lazy"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-sky-500/20 text-sky-300 flex items-center justify-center text-xs font-bold shrink-0">
                            <User className="w-3.5 h-3.5" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium text-foreground truncate">{prop.autorNome}</p>
                          <p className="text-[10px] text-muted-foreground truncate">
                            {prop.autorPartido ? `${prop.autorPartido}-${prop.autorUf || ''}` : prop.autorCargo || 'Parlamentar'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Rodapé com Situação e Ação */}
                    <div className="pt-3 border-t border-white/5 flex items-center justify-between mt-3">
                      <span className="text-[11px] font-medium text-sky-400 flex items-center gap-1 truncate max-w-[200px]">
                        <Clock className="w-3 h-3 shrink-0" />
                        <span className="truncate">{prop.situacao || 'Em tramitação'}</span>
                      </span>
                      <div className="w-7 h-7 rounded-full bg-white/5 flex items-center justify-center text-muted-foreground group-hover:text-foreground">
                        <ChevronRight className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        )}
      </main>

      {/* ─────────────────────────────────────────────────────────────────────
          MODAL / BOTTOM SHEET: DETALHE DE NOVA LEI (CARROSSEL 1)
      ───────────────────────────────────────────────────────────────────── */}
      <Sheet open={!!selectedLeiCard} onOpenChange={(open) => !open && setSelectedLeiCard(null)}>
        <SheetContent side="bottom" className="max-h-[88vh] rounded-t-3xl border-t border-white/10 bg-card p-0 flex flex-col">
          {selectedLeiCard && (
            <div className="flex flex-col h-full overflow-hidden">
              <SheetHeader className="p-5 pb-3 border-b border-white/10 text-left">
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <Badge variant="outline" className={getTipoColors(selectedLeiCard.tipoAto).badge}>
                    {selectedLeiCard.tipoAto}
                  </Badge>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    Publicação: {formatDateBr(selectedLeiCard.dataPublicacao)}
                  </span>
                </div>
                <SheetTitle className="text-lg sm:text-xl font-bold leading-snug text-foreground">
                  {selectedLeiCard.numeroAto}
                </SheetTitle>
                {selectedLeiCard.tituloCurto && (
                  <SheetDescription className="text-xs text-muted-foreground font-medium">
                    {selectedLeiCard.tituloCurto}
                  </SheetDescription>
                )}
              </SheetHeader>

              <ScrollArea className="flex-1 p-5 space-y-4">
                {/* Ementa Oficial */}
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                    Ementa Oficial
                  </h4>
                  <p className="text-sm text-foreground/90 leading-relaxed bg-white/[0.03] border border-white/5 p-3.5 rounded-xl">
                    {selectedLeiCard.ementa}
                  </p>
                </div>

                {/* Explicação Doutrinária / Resumo Prático (se houver) */}
                {selectedLeiCard.explicacao && (
                  <div className="pt-2">
                    <h4 className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      Análise de Impacto Jurídico
                    </h4>
                    <div className="text-xs sm:text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed bg-emerald-500/[0.06] border border-emerald-500/20 p-3.5 rounded-xl">
                      {selectedLeiCard.explicacao}
                    </div>
                  </div>
                )}
              </ScrollArea>

              {/* Botões de Ação */}
              <div className="p-4 border-t border-white/10 bg-background/80 flex items-center gap-3">
                {selectedLeiCard.textoCompleto ? (
                  <Button
                    onClick={() => {
                      const itemToOpen: LeiOrdinaria = {
                        id: selectedLeiCard.id,
                        tipo_ato: selectedLeiCard.tipoAto,
                        numero_ato: selectedLeiCard.numeroAto,
                        ementa: selectedLeiCard.ementa,
                        url: selectedLeiCard.url || '',
                        data_publicacao: selectedLeiCard.dataPublicacao,
                        data_dou: selectedLeiCard.dataDou || selectedLeiCard.dataPublicacao,
                        texto_completo: selectedLeiCard.textoCompleto,
                        explicacao: selectedLeiCard.explicacao,
                      };
                      setSelectedLeiCard(null);
                      setDetailItem(itemToOpen);
                    }}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
                  >
                    <BookOpen className="w-4 h-4 mr-2" />
                    Ler Inteiro Teor no App
                  </Button>
                ) : (
                  selectedLeiCard.url && (
                    <Button
                      onClick={() => window.open(selectedLeiCard.url, '_blank')}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Acessar Portal do Planalto
                    </Button>
                  )
                )}
                <Button variant="outline" onClick={() => setSelectedLeiCard(null)} className="border-white/10">
                  Fechar
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* ─────────────────────────────────────────────────────────────────────
          MODAL / BOTTOM SHEET: DETALHE DE ALTERAÇÃO IMPACTANTE (CARROSSEL 2)
      ───────────────────────────────────────────────────────────────────── */}
      <Sheet open={!!selectedImpacto} onOpenChange={(open) => !open && setSelectedImpacto(null)}>
        <SheetContent side="bottom" className="max-h-[88vh] rounded-t-3xl border-t border-white/10 bg-card p-0 flex flex-col">
          {selectedImpacto && (
            <div className="flex flex-col h-full overflow-hidden">
              <SheetHeader className="p-5 pb-3 border-b border-white/10 text-left">
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2">
                    <span
                      className="px-2.5 py-0.5 rounded-full text-xs font-bold text-white shadow-sm"
                      style={{ backgroundColor: selectedImpacto.codigoCor }}
                    >
                      {selectedImpacto.codigoSigla}
                    </span>
                    <span className="text-xs font-semibold text-muted-foreground">
                      {selectedImpacto.codigoNome}
                    </span>
                  </div>
                  <Badge variant="outline" className="text-xs border-white/10 text-muted-foreground">
                    Ano: {selectedImpacto.anoModificacao}
                  </Badge>
                </div>
                <SheetTitle className="text-lg sm:text-xl font-bold leading-snug text-foreground">
                  {selectedImpacto.artigoRotulo} — {selectedImpacto.tema}
                </SheetTitle>
                <SheetDescription className="text-xs font-medium text-amber-400">
                  Alterado por: {selectedImpacto.leiModificadora}
                </SheetDescription>
              </SheetHeader>

              <ScrollArea className="flex-1 p-5 space-y-4">
                {/* O Que Mudou */}
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                    O Que Mudou na Lei
                  </h4>
                  <p className="text-sm text-foreground/90 leading-relaxed bg-white/[0.03] border border-white/5 p-3.5 rounded-xl">
                    {selectedImpacto.oQueMudou}
                  </p>
                </div>

                {/* Impacto Prático */}
                <div>
                  <h4 className="text-xs font-semibold text-rose-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <Flame className="w-3.5 h-3.5" />
                    Impacto Jurídico e Prático
                  </h4>
                  <p className="text-sm text-foreground/90 leading-relaxed bg-rose-500/[0.06] border border-rose-500/20 p-3.5 rounded-xl">
                    {selectedImpacto.impactoPratico}
                  </p>
                </div>

                {/* Tags */}
                <div className="pt-1">
                  <div className="flex flex-wrap gap-1.5">
                    {selectedImpacto.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2.5 py-0.5 rounded-full text-[11px] bg-white/[0.05] border border-white/10 text-muted-foreground"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              </ScrollArea>

              {/* Botões de Ação */}
              <div className="p-4 border-t border-white/10 bg-background/80 flex items-center gap-3">
                <Button
                  onClick={() => {
                    const rota = selectedImpacto.rotaLeitura;
                    setSelectedImpacto(null);
                    navigate(rota);
                  }}
                  className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
                >
                  <BookOpen className="w-4 h-4 mr-2" />
                  Abrir Artigo no Código
                </Button>
                <Button variant="outline" onClick={() => setSelectedImpacto(null)} className="border-white/10">
                  Fechar
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* ─────────────────────────────────────────────────────────────────────
          MODAL / BOTTOM SHEET: DETALHE DE PROPOSIÇÃO CÂMARA (CARROSSEL 3)
      ───────────────────────────────────────────────────────────────────── */}
      <Sheet open={!!selectedProposicao} onOpenChange={(open) => !open && setSelectedProposicao(null)}>
        <SheetContent side="bottom" className="max-h-[88vh] rounded-t-3xl border-t border-white/10 bg-card p-0 flex flex-col">
          {selectedProposicao && (
            <div className="flex flex-col h-full overflow-hidden">
              <SheetHeader className="p-5 pb-3 border-b border-white/10 text-left">
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <Badge variant="outline" className="text-xs font-bold bg-sky-500/20 text-sky-300 border-sky-500/40">
                    {selectedProposicao.codigoIdentificacao}
                  </Badge>
                  <span className="text-xs text-muted-foreground uppercase font-semibold">
                    {selectedProposicao.casa === 'senado' ? 'Senado Federal' : 'Câmara dos Deputados'}
                  </span>
                </div>
                <SheetTitle className="text-lg sm:text-xl font-bold leading-snug text-foreground">
                  Proposição Legislativa
                </SheetTitle>
                {selectedProposicao.leiAlvo && (
                  <SheetDescription className="text-xs font-semibold text-amber-400">
                    Pretende alterar: {selectedProposicao.leiAlvo}
                  </SheetDescription>
                )}
              </SheetHeader>

              <ScrollArea className="flex-1 p-5 space-y-4">
                {/* Autor */}
                <div className="flex items-center gap-3 p-3.5 rounded-xl bg-white/[0.03] border border-white/5">
                  {selectedProposicao.autorFotoUrl ? (
                    <img
                      src={selectedProposicao.autorFotoUrl}
                      alt={selectedProposicao.autorNome}
                      className="w-12 h-12 rounded-full object-cover border border-white/15"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-sky-500/20 text-sky-300 flex items-center justify-center font-bold">
                      <User className="w-6 h-6" />
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-bold text-foreground">{selectedProposicao.autorNome}</p>
                    <p className="text-xs text-muted-foreground">
                      {selectedProposicao.autorPartido ? `${selectedProposicao.autorPartido} / ${selectedProposicao.autorUf || ''}` : selectedProposicao.autorCargo || 'Autor da Proposição'}
                    </p>
                  </div>
                </div>

                {/* Ementa do Projeto */}
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                    Ementa da Proposição
                  </h4>
                  <p className="text-sm text-foreground/90 leading-relaxed bg-white/[0.03] border border-white/5 p-3.5 rounded-xl">
                    {selectedProposicao.ementa}
                  </p>
                </div>

                {/* Situação Atual */}
                <div>
                  <h4 className="text-xs font-semibold text-sky-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    Situação Atual de Tramitação
                  </h4>
                  <div className="p-3.5 rounded-xl bg-sky-500/[0.06] border border-sky-500/20 text-xs sm:text-sm text-foreground/90">
                    <p className="font-semibold text-sky-300">{selectedProposicao.situacao || 'Em tramitação'}</p>
                    {selectedProposicao.orgao && (
                      <p className="text-muted-foreground text-xs mt-1">Órgão atual: {selectedProposicao.orgao}</p>
                    )}
                  </div>
                </div>

                {/* Linha do Tempo / Últimos Passos de Tramitação */}
                <div className="pt-2">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    Últimas Tramitações
                  </h4>
                  {loadingHistorico ? (
                    <div className="p-4 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-sky-400" />
                      <span>Consultando histórico oficial...</span>
                    </div>
                  ) : proposicaoHistorico.length > 0 ? (
                    <div className="space-y-2 border-l-2 border-sky-500/30 pl-3 ml-2">
                      {proposicaoHistorico.map((passo, idx) => (
                        <div key={`passo-${idx}`} className="text-xs space-y-0.5">
                          <span className="text-[10px] font-semibold text-sky-400">
                            {formatDateBr(passo.dataHora)} {passo.siglaOrgao ? `• ${passo.siglaOrgao}` : ''}
                          </span>
                          <p className="text-foreground/90 leading-snug">{passo.descricao}</p>
                          {passo.despacho && (
                            <p className="text-muted-foreground/80 text-[11px] italic">{passo.despacho}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground italic">
                      Histórico detalhado disponível no portal oficial.
                    </p>
                  )}
                </div>
              </ScrollArea>

              {/* Botões de Ação */}
              <div className="p-4 border-t border-white/10 bg-background/80 flex items-center gap-3">
                {selectedProposicao.urlTramitacao && (
                  <Button
                    onClick={() => window.open(selectedProposicao.urlTramitacao, '_blank')}
                    className="flex-1 bg-sky-600 hover:bg-sky-500 text-white font-semibold"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Acompanhar no Portal Oficial
                  </Button>
                )}
                <Button variant="outline" onClick={() => setSelectedProposicao(null)} className="border-white/10">
                  Fechar
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
