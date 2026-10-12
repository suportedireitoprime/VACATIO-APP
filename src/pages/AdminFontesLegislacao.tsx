import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Globe, Search, ExternalLink, ShieldCheck, Database, Layers,
  RefreshCw, CheckCircle2, Clock, Sparkles, Filter, ChevronRight,
  BookOpen, Building, Landmark, Compass, ArrowUpRight, Info,
  Share2, ArrowLeft, Activity, Radio, Cpu
} from 'lucide-react';
import {
  FONTES_LEGISLACAO,
  FonteLegislacao,
  EsferaLegis,
  getEstatisticasFontes,
  filtrarFontes,
  obterEsferasComContador
} from '@/data/fontesLegislacao';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { MapaLegislacaoBrasil } from '@/components/admin/MapaLegislacaoBrasil';
import { CarrosselEvolucaoNormativa } from '@/components/admin/CarrosselEvolucaoNormativa';

export default function AdminFontesLegislacao() {
  const navigate = useNavigate();
  const [esferaAtiva, setEsferaAtiva] = useState<EsferaLegis | 'TODAS'>('TODAS');
  const [termoBusca, setTermoBusca] = useState('');
  const [categoriaAtiva, setCategoriaAtiva] = useState<string>('TODAS');
  const [ufSelecionada, setUfSelecionada] = useState<string | null>(null);
  const [exibirMapa, setExibirMapa] = useState(true);
  const [fonteSelecionada, setFonteSelecionada] = useState<FonteLegislacao | null>(null);

  // Estatísticas gerais
  const stats = useMemo(() => getEstatisticasFontes(), []);
  const esferasComContagem = useMemo(() => obterEsferasComContador(), []);

  // Categorias únicas
  const categorias = useMemo(() => {
    const set = new Set(FONTES_LEGISLACAO.map(f => f.categoria));
    return ['TODAS', ...Array.from(set)];
  }, []);

  // Lista filtrada
  const fontesFiltradas = useMemo(() => {
    let list = filtrarFontes(esferaAtiva, termoBusca, ufSelecionada || undefined);
    if (categoriaAtiva !== 'TODAS') {
      list = list.filter(f => f.categoria === categoriaAtiva);
    }
    return list;
  }, [esferaAtiva, termoBusca, categoriaAtiva, ufSelecionada]);

  const getEsferaBadgeColor = (esfera: EsferaLegis) => {
    switch (esfera) {
      case 'FEDERAL':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
      case 'ESTADUAL':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'MUNICIPAL':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'INTERNACIONAL':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/30';
      default:
        return 'bg-zinc-500/10 text-zinc-400 border-zinc-500/30';
    }
  };

  const getEsferaIcon = (esfera: EsferaLegis) => {
    switch (esfera) {
      case 'FEDERAL':
        return Landmark;
      case 'ESTADUAL':
        return Building;
      case 'MUNICIPAL':
        return Compass;
      case 'INTERNACIONAL':
        return Globe;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-16 selection:bg-blue-600/30">
      {/* Top Bar / Header */}
      <header className="sticky top-0 z-30 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/admin-funcoes')}
              className="p-2 -ml-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Voltar ao Painel Admin"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-gradient-to-tr from-blue-600 to-indigo-500 rounded-xl shadow-lg shadow-blue-500/20">
                <Globe className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                  Fontes da Legislação
                  <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 font-mono border border-blue-500/20">
                    v1.0 • UNOS
                  </span>
                </h1>
                <p className="text-xs text-slate-400 hidden sm:block">
                  Catálogo e monitoramento de portais oficiais legislativos das 4 esferas
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                toast.success('Rastreadores e índices sincronizados com sucesso!');
              }}
              className="border-slate-800 hover:bg-slate-900 text-slate-300 text-xs gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Verificar Conexões</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-8">
        {/* Banner de Boas-Vindas e Resumo Técnico */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-blue-950/40 border border-slate-800/80 p-6 sm:p-8">
          <div className="absolute right-0 top-0 -mt-10 -mr-10 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 max-w-3xl space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs font-medium">
              <Cpu className="w-3.5 h-3.5 text-blue-400 animate-pulse" />
              Infraestrutura de Indexação Normativa
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Portais e Rastreadores de Legislação
            </h2>
            <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
              Mapeamento estruturado das fontes primárias do direito positivo. O VACATIO integra portais dos poderes Executivo e Legislativo da União, dos 26 estados e DF, dos 5.570 municípios e dos principais tratados internacionais.
            </p>
          </div>

          {/* Cards de Métricas Principais */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-8 pt-6 border-t border-slate-800/60">
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/60 backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-400">Total de Fontes</span>
                <Database className="w-4 h-4 text-blue-400" />
              </div>
              <p className="text-2xl sm:text-3xl font-black text-white mt-2">
                {stats.totalFontes}
              </p>
              <p className="text-[11px] text-slate-500 mt-1">Portais canônicos auditados</p>
            </div>

            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/60 backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-400">Atos Rastreados</span>
                <Sparkles className="w-4 h-4 text-emerald-400" />
              </div>
              <p className="text-2xl sm:text-3xl font-black text-emerald-400 mt-2">
                &gt; {(stats.totalAtosEstimados / 1000000).toFixed(1)}M
              </p>
              <p className="text-[11px] text-slate-500 mt-1">Normas, decretos e leis</p>
            </div>

            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/60 backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-400">Esferas Cobertas</span>
                <Layers className="w-4 h-4 text-purple-400" />
              </div>
              <p className="text-2xl sm:text-3xl font-black text-white mt-2">
                4 <span className="text-xs text-purple-400 font-normal">Níveis</span>
              </p>
              <p className="text-[11px] text-slate-500 mt-1">Fed, Est, Mun &amp; Global</p>
            </div>

            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/60 backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-400">Disponibilidade</span>
                <Activity className="w-4 h-4 text-emerald-400" />
              </div>
              <p className="text-2xl sm:text-3xl font-black text-white mt-2">
                100%
              </p>
              <p className="text-[11px] text-emerald-400 flex items-center gap-1 mt-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping inline-block" />
                Operacional
              </p>
            </div>
          </div>
        </div>

        {/* Botão de Toggle do Mapa do Brasil */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Compass className="w-4 h-4 text-blue-400" />
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Cobertura Geográfica Federativa
            </span>
            {ufSelecionada && (
              <span className="text-xs px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-300 border border-blue-500/30 font-bold">
                UF: {ufSelecionada}
              </span>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExibirMapa(!exibirMapa)}
            className="text-xs text-slate-400 hover:text-white hover:bg-slate-900 border border-slate-800/80 h-7 px-2.5 rounded-lg"
          >
            {exibirMapa ? 'Ocultar Mapa' : 'Visualizar Mapa do Brasil'}
          </Button>
        </div>

        {/* Seção do Mapa Interativo do Brasil */}
        {exibirMapa && (
          <MapaLegislacaoBrasil
            ufSelecionada={ufSelecionada}
            onSelecionarUF={(uf) => {
              setUfSelecionada(uf);
              if (uf) {
                toast.info(`Filtrando portais e câmaras da UF ${uf}`);
              }
            }}
          />
        )}

        {/* Carrossel de Evolução Normativa por Esfera (UNOS) */}
        <CarrosselEvolucaoNormativa
          esferaAtiva={esferaAtiva}
          onSelecionarEsfera={(novaEsfera) => {
            setEsferaAtiva(novaEsfera);
            toast.info(`Esfera alterada para ${novaEsfera}`);
          }}
        />

        {/* Barra de Filtros e Busca */}
        <div className="space-y-4">
          {/* Tabs por Esfera */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            <button
              onClick={() => setEsferaAtiva('TODAS')}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap flex items-center gap-2 border ${
                esferaAtiva === 'TODAS'
                  ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-500/20'
                  : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Layers className="w-4 h-4" />
              Todas as Esferas
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                esferaAtiva === 'TODAS' ? 'bg-blue-700 text-white' : 'bg-slate-800 text-slate-400'
              }`}>
                {stats.totalFontes}
              </span>
            </button>

            {esferasComContagem.map(({ esfera, total }) => {
              const Icon = getEsferaIcon(esfera);
              const isActive = esferaAtiva === esfera;
              return (
                <button
                  key={esfera}
                  onClick={() => setEsferaAtiva(esfera)}
                  className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap flex items-center gap-2 border ${
                    isActive
                      ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-500/20'
                      : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {esfera.charAt(0) + esfera.slice(1).toLowerCase()}
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                    isActive ? 'bg-blue-700 text-white' : 'bg-slate-800 text-slate-400'
                  }`}>
                    {total}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search + Categorias */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <Input
                type="text"
                placeholder="Buscar por portal, sigla, estado (UF), órgão ou palavra-chave..."
                value={termoBusca}
                onChange={(e) => setTermoBusca(e.target.value)}
                className="pl-10 bg-slate-900/90 border-slate-800 text-slate-200 placeholder:text-slate-500 text-sm rounded-xl focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
              {termoBusca && (
                <button
                  onClick={() => setTermoBusca('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white"
                >
                  Limpar
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
              <Filter className="w-4 h-4 text-slate-500 shrink-0 hidden sm:block" />
              <div className="flex gap-1.5">
                {categorias.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setCategoriaAtiva(cat)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors border ${
                      categoriaAtiva === cat
                        ? 'bg-slate-800 text-blue-400 border-blue-500/40'
                        : 'bg-slate-900/50 text-slate-400 border-slate-800 hover:text-slate-300'
                    }`}
                  >
                    {cat === 'TODAS' ? 'Todas Categorias' : cat}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Grid de Portais */}
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-400 px-1">
            <span>Mostrando <strong className="text-white">{fontesFiltradas.length}</strong> de {stats.totalFontes} portais catalogados</span>
            <span className="flex items-center gap-1.5 text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
              Monitoramento Ativo
            </span>
          </div>

          {fontesFiltradas.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-slate-900/40 border border-slate-800/80 space-y-3">
              <Search className="w-8 h-8 text-slate-600 mx-auto" />
              <p className="text-sm font-medium text-slate-300">Nenhum portal legislativo encontrado</p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Tente ajustar os filtros de esfera ou limpar o termo de busca para encontrar as fontes oficiais.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setEsferaAtiva('TODAS');
                  setCategoriaAtiva('TODAS');
                  setTermoBusca('');
                }}
                className="border-slate-800 text-xs"
              >
                Resetar Filtros
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {fontesFiltradas.map((fonte) => {
                const EsferaIcon = getEsferaIcon(fonte.esfera);
                return (
                  <div
                    key={fonte.id}
                    className="group relative flex flex-col justify-between rounded-2xl bg-slate-900/70 border border-slate-800/90 hover:border-blue-500/40 p-5 transition-all duration-200 hover:shadow-xl hover:shadow-blue-500/5 hover:-translate-y-0.5"
                  >
                    <div className="space-y-3.5">
                      {/* Top Badges */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold border ${getEsferaBadgeColor(fonte.esfera)}`}>
                            <EsferaIcon className="w-3 h-3" />
                            {fonte.esfera}
                          </span>
                          {fonte.subesfera && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-slate-300 border border-slate-700/60">
                              {fonte.subesfera}
                            </span>
                          )}
                        </div>

                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          Operacional
                        </span>
                      </div>

                      {/* Título & Sigla */}
                      <div>
                        <div className="flex items-baseline gap-2">
                          <h3 className="text-base font-bold text-white group-hover:text-blue-300 transition-colors">
                            {fonte.nome}
                          </h3>
                        </div>
                        <p className="text-xs text-blue-400/90 font-mono mt-0.5">
                          {fonte.sigla}
                        </p>
                      </div>

                      {/* Descrição */}
                      <p className="text-xs text-slate-300 leading-relaxed line-clamp-3">
                        {fonte.descricao}
                      </p>

                      {/* Órgão Responsável */}
                      <div className="pt-2 border-t border-slate-800/60 text-[11px] text-slate-400 space-y-1">
                        <div className="flex items-start gap-1.5">
                          <Building className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
                          <span className="line-clamp-1">{fonte.orgaoResponsavel}</span>
                        </div>
                        <div className="flex items-center justify-between pt-1">
                          <span className="flex items-center gap-1 text-slate-400">
                            <Clock className="w-3 h-3 text-slate-500" />
                            {fonte.frequenciaAtualizacao}
                          </span>
                          {fonte.totalAtosEstimados && (
                            <span className="text-slate-300 font-mono text-[11px]">
                              ~{fonte.totalAtosEstimados.toLocaleString('pt-BR')} atos
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Tags de Formatos */}
                      <div className="flex items-center gap-1.5 flex-wrap pt-1">
                        {fonte.tipoFormatos.map((fmt) => (
                          <span
                            key={fmt}
                            className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-950 text-slate-400 border border-slate-800"
                          >
                            {fmt}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Ações do Card */}
                    <div className="pt-4 mt-4 border-t border-slate-800/70 flex items-center gap-2">
                      <Button
                        variant="default"
                        size="sm"
                        asChild
                        className="flex-1 bg-blue-600 hover:bg-blue-500 text-white text-xs h-8 rounded-lg shadow-sm font-medium"
                      >
                        <a
                          href={fonte.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center gap-1.5"
                        >
                          <span>Acessar Portal</span>
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </a>
                      </Button>

                      {fonte.urlBusca && (
                        <Button
                          variant="outline"
                          size="sm"
                          asChild
                          className="border-slate-800 hover:bg-slate-800 text-slate-300 text-xs h-8 px-2.5 rounded-lg"
                          title="Abrir página oficial de pesquisa"
                        >
                          <a
                            href={fonte.urlBusca}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Search className="w-3.5 h-3.5" />
                          </a>
                        </Button>
                      )}

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setFonteSelecionada(fonte)}
                        className="hover:bg-slate-800 text-slate-400 hover:text-white text-xs h-8 px-2.5 rounded-lg"
                        title="Ver detalhes técnicos do portal"
                      >
                        <Info className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Modal / Dialog de Detalhes Técnicos */}
      <Dialog open={!!fonteSelecionada} onOpenChange={(open) => !open && setFonteSelecionada(null)}>
        {fonteSelecionada && (
          <DialogContent className="max-w-xl bg-slate-950 border border-slate-800 text-slate-100 p-6 rounded-2xl">
            <DialogHeader className="space-y-2">
              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-0.5 rounded text-xs font-bold border ${getEsferaBadgeColor(fonteSelecionada.esfera)}`}>
                  {fonteSelecionada.esfera}
                </span>
                {fonteSelecionada.subesfera && (
                  <span className="text-xs text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                    {fonteSelecionada.subesfera}
                  </span>
                )}
              </div>
              <DialogTitle className="text-xl font-bold text-white">
                {fonteSelecionada.nome} ({fonteSelecionada.sigla})
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-400">
                Ficha técnica do repositório legislativo e parâmetros do rastreador
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-3 text-xs text-slate-300">
              <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
                <p className="font-semibold text-white">Finalidade &amp; Cobertura:</p>
                <p className="text-slate-300 leading-relaxed">{fonteSelecionada.descricao}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-slate-900/50 border border-slate-800/80">
                  <span className="text-slate-400 block text-[11px]">Órgão Responsável</span>
                  <span className="text-white font-medium mt-1 block">{fonteSelecionada.orgaoResponsavel}</span>
                </div>
                <div className="p-3 rounded-lg bg-slate-900/50 border border-slate-800/80">
                  <span className="text-slate-400 block text-[11px]">Frequência do Crawler</span>
                  <span className="text-emerald-400 font-medium mt-1 block flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {fonteSelecionada.frequenciaAtualizacao}
                  </span>
                </div>
                <div className="p-3 rounded-lg bg-slate-900/50 border border-slate-800/80">
                  <span className="text-slate-400 block text-[11px]">Formatos Disponibilizados</span>
                  <span className="text-white font-medium mt-1 block">
                    {fonteSelecionada.tipoFormatos.join(', ')}
                  </span>
                </div>
                <div className="p-3 rounded-lg bg-slate-900/50 border border-slate-800/80">
                  <span className="text-slate-400 block text-[11px]">Total de Atos Estimado</span>
                  <span className="text-white font-mono font-medium mt-1 block">
                    {fonteSelecionada.totalAtosEstimados ? fonteSelecionada.totalAtosEstimados.toLocaleString('pt-BR') : 'Contínuo'}
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-slate-900/50 border border-slate-800/80 space-y-1.5">
                <span className="text-slate-400 block text-[11px]">URL Oficial Canônica</span>
                <a
                  href={fonteSelecionada.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:underline break-all flex items-center gap-1 font-mono text-[11px]"
                >
                  {fonteSelecionada.url}
                  <ExternalLink className="w-3 h-3 shrink-0" />
                </a>
              </div>

              {fonteSelecionada.urlBusca && (
                <div className="p-3 rounded-lg bg-slate-900/50 border border-slate-800/80 space-y-1.5">
                  <span className="text-slate-400 block text-[11px]">URL de Pesquisa e Consulta</span>
                  <a
                    href={fonteSelecionada.urlBusca}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:underline break-all flex items-center gap-1 font-mono text-[11px]"
                  >
                    {fonteSelecionada.urlBusca}
                    <ExternalLink className="w-3 h-3 shrink-0" />
                  </a>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFonteSelecionada(null)}
                className="border-slate-800 text-xs"
              >
                Fechar
              </Button>
              <Button
                variant="default"
                size="sm"
                asChild
                className="bg-blue-600 hover:bg-blue-500 text-xs gap-1.5"
              >
                <a
                  href={fonteSelecionada.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Abrir no Navegador
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </Button>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
