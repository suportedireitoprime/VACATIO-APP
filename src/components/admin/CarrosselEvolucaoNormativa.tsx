import React, { useState, useEffect } from 'react';
import {
  EsferaLegis,
  FONTES_LEGISLACAO,
} from '@/data/fontesLegislacao';
import {
  Landmark, Building, Compass, Globe, ChevronLeft, ChevronRight,
  TrendingUp, BarChart3, Clock, Zap, ShieldCheck, ArrowRight,
  FileCheck2, Database, Sparkles, Activity, Layers
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EsferaDetalhada {
  id: EsferaLegis;
  titulo: string;
  subtitulo: string;
  descricao: string;
  corGradiente: string;
  corBorda: string;
  corTexto: string;
  corBadge: string;
  totalPortais: number;
  totalAtos: string;
  latenciaMedia: string;
  orgaosPrincipais: string[];
  tiposNormas: string[];
  distribuicaoFormatos: { formato: string; pct: number }[];
  destaques: string[];
}

const ESFERAS_DETALHADAS: EsferaDetalhada[] = [
  {
    id: 'FEDERAL',
    titulo: 'Esfera Federal (União)',
    subtitulo: 'Presidência da República, Congresso Nacional e Tribunais Superiores',
    descricao: 'Monitoramento contínuo dos atos normativos do Governo Federal e do Poder Legislativo Nacional. Base do ordenamento jurídico brasileiro com vigência erga omnes em todo o território.',
    corGradiente: 'from-blue-950/70 via-slate-900 to-indigo-950/60',
    corBorda: 'border-blue-500/40',
    corTexto: 'text-blue-400',
    corBadge: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    totalPortais: 6,
    totalAtos: '8.8M+',
    latenciaMedia: '15 minutos (DOU / Planalto)',
    orgaosPrincipais: ['Planalto (SAJ)', 'Imprensa Nacional (DOU)', 'Senado (LexML)', 'Câmara dos Deputados', 'STF'],
    tiposNormas: ['Constituição Federal', 'Emendas Constitucionais', 'Leis Complementares', 'Leis Ordinárias', 'Medidas Provisórias', 'Decretos Regulamentares'],
    distribuicaoFormatos: [
      { formato: 'HTML Estruturado', pct: 60 },
      { formato: 'PDF Certificado ICP', pct: 25 },
      { formato: 'API / OpenData', pct: 15 },
    ],
    destaques: [
      'Indexação imediata das edições extras do Diário Oficial da União',
      'Cruzamento de vigência e revogações expressas no Planalto',
      'Integração com vocabulário controlado do LexML Brasil',
    ],
  },
  {
    id: 'ESTADUAL',
    titulo: 'Esfera Estadual (26 Estados + DF)',
    subtitulo: 'Assembleias Legislativas e Governos Estaduais',
    descricao: 'Rastreamento da legislação estadual, competências concorrentes e tributárias (ICMS, IPVA, ITCMD), códigos de organização judiciária e normas de funcionalismo público estadual.',
    corGradiente: 'from-emerald-950/70 via-slate-900 to-teal-950/60',
    corBorda: 'border-emerald-500/40',
    corTexto: 'text-emerald-400',
    corBadge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    totalPortais: 10,
    totalAtos: '4.2M+',
    latenciaMedia: '1 hora (Diários Oficiais dos Estados)',
    orgaosPrincipais: ['ALESP (São Paulo)', 'ALERJ (Rio de Janeiro)', 'ALMG (Minas Gerais)', 'ALRS (Rio Grande do Sul)', 'CLDF (Brasília)'],
    tiposNormas: ['Constituições Estaduais', 'Leis Complementares Estaduais', 'Decretos Tributários (RICMS)', 'Regimentos Internos de TJs'],
    distribuicaoFormatos: [
      { formato: 'HTML Web', pct: 50 },
      { formato: 'PDF / Diário Eletrônico', pct: 40 },
      { formato: 'JSON / XML', pct: 10 },
    ],
    destaques: [
      'Cobertura das maiores economias e assembleias legislativas do país',
      'Indexação de normas tributárias estaduais de alto impacto',
      'Rastreamento de mensagens de veto dos Governadores',
    ],
  },
  {
    id: 'MUNICIPAL',
    titulo: 'Esfera Municipal (5.570 Cidades)',
    subtitulo: 'Câmaras de Vereadores e Prefeituras Municipais',
    descricao: 'Mapeamento massivo das normas locais: Leis Orgânicas Municipais, Códigos Tributários Municipais (ISS, IPTU, ITBI), Planos Diretores Urbanísticos, Zoneamento e Posturas.',
    corGradiente: 'from-amber-950/70 via-slate-900 to-orange-950/60',
    corBorda: 'border-amber-500/40',
    corTexto: 'text-amber-400',
    corBadge: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    totalPortais: 7,
    totalAtos: '1.2M+',
    latenciaMedia: '4 horas (Câmaras Municipais & Hub LeisMunicipais)',
    orgaosPrincipais: ['Câmara Municipal de SP (LegislaSP)', 'CMRJ (Rio)', 'CMBH (Belo Horizonte)', 'CMC (Curitiba)', 'Hub LeisMunicipais (5.570 cidades)'],
    tiposNormas: ['Leis Orgânicas', 'Planos Diretores', 'Códigos Tributários Municipais (ISS)', 'Leis de Zoneamento', 'Decretos Executivos Municipais'],
    distribuicaoFormatos: [
      { formato: 'HTML Digital', pct: 45 },
      { formato: 'PDF Digitalizado / OCR', pct: 45 },
      { formato: 'API / OpenData', pct: 10 },
    ],
    destaques: [
      'Hub LeisMunicipais cobrindo mais de 98% dos municípios brasileiros',
      'Portais nativos dedicados das capitais (SP, RJ, BH, Curitiba, Porto Alegre, Salvador)',
      'Extração de metadados de zoneamento e alvarás municipais',
    ],
  },
  {
    id: 'INTERNACIONAL',
    titulo: 'Esfera Internacional e Tratados',
    subtitulo: 'Organismos Multilaterais, Direitos Humanos e Comércio Global',
    descricao: 'Monitoramento de convenções ratificadas pelo Congresso Nacional (Decreto Presidencial de Promulgação), diretivas da União Europeia (EUR-Lex), normas marítimas IMO e jurisprudência da Corte IDH.',
    corGradiente: 'from-purple-950/70 via-slate-900 to-fuchsia-950/60',
    corBorda: 'border-purple-500/40',
    corTexto: 'text-purple-400',
    corBadge: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    totalPortais: 4,
    totalAtos: '1.05M+',
    latenciaMedia: '12 horas (Tratados ONU / EUR-Lex / Corte IDH)',
    orgaosPrincipais: ['EUR-Lex (União Europeia)', 'United Nations Treaty Collection', 'IMO Docs (Marítimo)', 'Corte Interamericana (Corte IDH)'],
    tiposNormas: ['Tratados de Direitos Humanos', 'Convenções de Viena', 'Regulamentos de Navegação e Comércio', 'Decisões da Corte IDH'],
    distribuicaoFormatos: [
      { formato: 'HTML Multilíngue', pct: 55 },
      { formato: 'PDF Oficial ONU/UE', pct: 35 },
      { formato: 'XML / RDF Linked Data', pct: 10 },
    ],
    destaques: [
      'Alinhamento com tratados com status supralegal e de emenda constitucional (§ 3º do Art. 5º da CF)',
      'Acesso a repositórios de tratados multilaterais da ONU',
      'Sentenças vinculantes da Corte Interamericana de Direitos Humanos',
    ],
  },
];

interface CarrosselEvolucaoNormativaProps {
  esferaAtiva: EsferaLegis | 'TODAS';
  onSelecionarEsfera: (esfera: EsferaLegis) => void;
}

export const CarrosselEvolucaoNormativa: React.FC<CarrosselEvolucaoNormativaProps> = ({
  esferaAtiva,
  onSelecionarEsfera,
}) => {
  const [slideIndex, setSlideIndex] = useState(0);

  // Sincronizar slide com a esfera selecionada externamente
  useEffect(() => {
    if (esferaAtiva !== 'TODAS') {
      const idx = ESFERAS_DETALHADAS.findIndex(e => e.id === esferaAtiva);
      if (idx !== -1) setSlideIndex(idx);
    }
  }, [esferaAtiva]);

  const slideAtual = ESFERAS_DETALHADAS[slideIndex];

  const proximoSlide = () => {
    const next = (slideIndex + 1) % ESFERAS_DETALHADAS.length;
    setSlideIndex(next);
    onSelecionarEsfera(ESFERAS_DETALHADAS[next].id);
  };

  const anteriorSlide = () => {
    const prev = (slideIndex - 1 + ESFERAS_DETALHADAS.length) % ESFERAS_DETALHADAS.length;
    setSlideIndex(prev);
    onSelecionarEsfera(ESFERAS_DETALHADAS[prev].id);
  };

  const getEsferaIcon = (id: EsferaLegis) => {
    switch (id) {
      case 'FEDERAL': return Landmark;
      case 'ESTADUAL': return Building;
      case 'MUNICIPAL': return Compass;
      case 'INTERNACIONAL': return Globe;
    }
  };

  const IconAtual = getEsferaIcon(slideAtual.id);

  return (
    <div className="rounded-2xl bg-slate-900/80 border border-slate-800/90 overflow-hidden shadow-xl">
      {/* Top Bar do Carrossel */}
      <div className="p-5 sm:p-6 border-b border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-950/60">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold mb-1.5">
            <TrendingUp className="w-3.5 h-3.5" />
            Evolução Normativa por Esfera (UNOS)
          </div>
          <h3 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
            Panorama Integrado das 4 Esferas Jurídicas
          </h3>
          <p className="text-xs text-slate-400">
            Navegue pelos níveis de jurisdição para ver arquitetura de ingestão, latência e volume normativo.
          </p>
        </div>

        {/* Controles de Navegação e Pílulas Rápidas */}
        <div className="flex items-center gap-2 self-end sm:self-center">
          <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
            {ESFERAS_DETALHADAS.map((esfera, idx) => (
              <button
                key={esfera.id}
                onClick={() => {
                  setSlideIndex(idx);
                  onSelecionarEsfera(esfera.id);
                }}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  slideIndex === idx
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                {esfera.id.charAt(0) + esfera.id.slice(1).toLowerCase()}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              onClick={anteriorSlide}
              className="h-8 w-8 rounded-lg border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white"
              title="Esfera anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={proximoSlide}
              className="h-8 w-8 rounded-lg border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white"
              title="Próxima esfera"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Conteúdo do Slide Ativo */}
      <div className={`p-6 sm:p-8 bg-gradient-to-br ${slideAtual.corGradiente} border-b ${slideAtual.corBorda} transition-all duration-300`}>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Coluna 1: Informações Gerais da Esfera (7 colunas) */}
          <div className="lg:col-span-7 space-y-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-2xl bg-slate-900/90 border ${slideAtual.corBorda} shadow-lg`}>
                  <IconAtual className={`w-6 h-6 ${slideAtual.corTexto}`} />
                </div>
                <div>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${slideAtual.corBadge}`}>
                    {slideAtual.id}
                  </span>
                  <h4 className="text-xl sm:text-2xl font-black text-white mt-1">
                    {slideAtual.titulo}
                  </h4>
                  <p className="text-xs text-slate-400 font-medium">
                    {slideAtual.subtitulo}
                  </p>
                </div>
              </div>
            </div>

            <p className="text-sm text-slate-300 leading-relaxed">
              {slideAtual.descricao}
            </p>

            {/* Destaques Operacionais */}
            <div className="space-y-2 pt-2">
              <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5 uppercase tracking-wider">
                <Sparkles className={`w-3.5 h-3.5 ${slideAtual.corTexto}`} />
                Capacidades do Rastreador
              </span>
              <div className="space-y-1.5">
                {slideAtual.destaques.map((item, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-slate-300">
                    <FileCheck2 className={`w-3.5 h-3.5 ${slideAtual.corTexto} shrink-0 mt-0.5`} />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Tipos de Normas Monitoradas */}
            <div className="pt-2">
              <span className="text-[11px] font-semibold text-slate-400 block mb-2">
                Espécies Normativas Ingeridas:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {slideAtual.tiposNormas.map((tipo) => (
                  <span
                    key={tipo}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-slate-950/80 text-slate-200 border border-slate-800/80"
                  >
                    {tipo}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Coluna 2: Métricas de Ingestão e Distribuição de Formatos (5 colunas) */}
          <div className="lg:col-span-5 bg-slate-950/90 rounded-2xl p-5 border border-slate-800/90 space-y-5 shadow-inner">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <BarChart3 className="w-3.5 h-3.5 text-blue-400" />
                Métricas da Esfera
              </span>
              <span className="text-xs text-emerald-400 flex items-center gap-1 font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Monitoramento 24/7
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80">
                <span className="text-[11px] text-slate-400 block">Atos Rastreados</span>
                <span className={`text-xl font-black mt-1 block font-mono ${slideAtual.corTexto}`}>
                  {slideAtual.totalAtos}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80">
                <span className="text-[11px] text-slate-400 block">Portais Oficiais</span>
                <span className="text-xl font-black text-white mt-1 block">
                  {slideAtual.totalPortais} portais
                </span>
              </div>
            </div>

            {/* Latência de Detecção */}
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-1">
              <span className="text-[11px] text-slate-400 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                Latência Média de Detecção de Nova Lei:
              </span>
              <span className="text-xs font-semibold text-white block">
                {slideAtual.latenciaMedia}
              </span>
            </div>

            {/* Distribuição por Formato de Arquivo */}
            <div className="space-y-2">
              <span className="text-[11px] text-slate-400 block font-medium">
                Distribuição de Formatos Brutos:
              </span>
              <div className="space-y-1.5">
                {slideAtual.distribuicaoFormatos.map((fmt) => (
                  <div key={fmt.formato} className="space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-300">{fmt.formato}</span>
                      <span className="font-mono text-slate-400">{fmt.pct}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                      <div
                        className={`h-full rounded-full ${
                          slideAtual.id === 'FEDERAL' ? 'bg-blue-500' :
                          slideAtual.id === 'ESTADUAL' ? 'bg-emerald-500' :
                          slideAtual.id === 'MUNICIPAL' ? 'bg-amber-500' : 'bg-purple-500'
                        }`}
                        style={{ width: `${fmt.pct}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Ação: Filtrar Lista para esta Esfera */}
            <Button
              variant="default"
              size="sm"
              onClick={() => onSelecionarEsfera(slideAtual.id)}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white text-xs border border-slate-700/80 h-9 rounded-xl font-semibold gap-1.5"
            >
              <Layers className="w-3.5 h-3.5 text-blue-400" />
              Ver Apenas Portais da Esfera {slideAtual.id}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
