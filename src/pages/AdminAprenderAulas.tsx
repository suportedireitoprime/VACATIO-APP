import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  GraduationCap,
  PlayCircle,
  CheckCircle2,
  CloudUpload,
  BookOpen,
  Sparkles,
  Clock,
  ArrowLeft,
  Maximize2,
  Minimize2,
  X,
  Server,
  Search,
  Volume2,
  Layers,
  HelpCircle,
  FileCode,
  Radio,
} from 'lucide-react';
import { PageHeader } from '@/components/vademecum/PageHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { MATERIAS_DIREITO_PENAL, MateriaPenal } from './aprender/materiasPenalData';
import { LEI_DROGAS_AULAS, LEI_DROGAS_AULA_01_SLIDES, AulaInfo } from './aprender/leiDrogasData';
import { CRIMES_CONTRA_FAMILIA_SLIDES, R2_APRENDER_BASE_URL } from './aprender/crimesContraFamiliaData';
import { buildAulaHTML } from './aprender/aulaHtmlBuilder';

export default function AdminAprenderAulas() {
  const navigate = useNavigate();

  // Estados principais
  const [selectedMateriaSlug, setSelectedMateriaSlug] = useState<string>('40-lei-de-drogas');
  const [searchMateria, setSearchMateria] = useState<string>('');
  const [activePlayer, setActivePlayer] = useState<{
    id: string;
    titulo: string;
    materia: string;
    html: string;
    r2AudioUrl: string;
    r2ImagensUrl: string;
  } | null>(null);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [infoModalOpen, setInfoModalOpen] = useState<boolean>(false);

  // Matéria ativa
  const currentMateria = useMemo(() => {
    return (
      MATERIAS_DIREITO_PENAL.find((m) => m.slug === selectedMateriaSlug) ||
      MATERIAS_DIREITO_PENAL.find((m) => m.slug === '40-lei-de-drogas')!
    );
  }, [selectedMateriaSlug]);

  // Lista filtrada de matérias para o seletor rápido
  const filteredMaterias = useMemo(() => {
    if (!searchMateria.trim()) return MATERIAS_DIREITO_PENAL;
    const term = searchMateria.toLowerCase();
    return MATERIAS_DIREITO_PENAL.filter(
      (m) => m.titulo.toLowerCase().includes(term) || m.numero.includes(term)
    );
  }, [searchMateria]);

  // Iniciar Player Interativo
  const handleLaunchClass = (aulaNumero: number) => {
    if (selectedMateriaSlug === '40-lei-de-drogas' && aulaNumero === 1) {
      const html = buildAulaHTML({
        materiaNome: 'Direito Penal · Lei de Drogas (Lei 11.343/2006)',
        aulaTitulo: 'Aula 01 · Lei de Drogas: Sistema e Bem Jurídico',
        slides: LEI_DROGAS_AULA_01_SLIDES,
        imagesBaseUrl: `${R2_APRENDER_BASE_URL}imagens/`,
        audioBaseUrl: `${R2_APRENDER_BASE_URL}audio/`,
      });

      setActivePlayer({
        id: 'lei-drogas-01',
        titulo: '40. Lei de Drogas · Aula 01 (Sistema e Bem Jurídico)',
        materia: '40. Lei de Drogas',
        html,
        r2AudioUrl: `${R2_APRENDER_BASE_URL}audio/`,
        r2ImagensUrl: `${R2_APRENDER_BASE_URL}imagens/`,
      });
      return;
    }

    if (selectedMateriaSlug === '01-crimes-contra-a-familia' && aulaNumero === 1) {
      const html = buildAulaHTML({
        materiaNome: 'Direito Penal · Crimes Contra a Família',
        aulaTitulo: 'Aula 01 · Crimes Contra a Família e Bigamia',
        slides: CRIMES_CONTRA_FAMILIA_SLIDES,
        imagesBaseUrl: `${R2_APRENDER_BASE_URL}imagens/`,
        audioBaseUrl: `${R2_APRENDER_BASE_URL}audio/`,
      });

      setActivePlayer({
        id: 'crimes-familia-01',
        titulo: '01. Crimes Contra a Família · Aula 01 (Bigamia)',
        materia: '01. Crimes Contra a Família',
        html,
        r2AudioUrl: `${R2_APRENDER_BASE_URL}audio/`,
        r2ImagensUrl: `${R2_APRENDER_BASE_URL}imagens/`,
      });
      return;
    }
  };

  return (
    <div className="min-h-dvh bg-background text-foreground flex flex-col pb-16">
      <PageHeader
        title="Aprender — Direito Penal"
        onBack={() => navigate('/admin-funcoes')}
      />

      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 space-y-6 flex-1">
        {/* Banner Superior com Identidade Visual e Status R2 */}
        <div className="relative overflow-hidden rounded-2xl border border-red-950/60 bg-gradient-to-br from-[#1a050c] via-[#240a12] to-[#120409] p-5 sm:p-7 shadow-2xl">
          <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  variant="outline"
                  className="bg-red-500/10 text-red-300 border-red-500/30 text-xs px-2.5 py-0.5 font-medium flex items-center gap-1.5"
                >
                  <GraduationCap className="w-3.5 h-3.5 text-red-400" />
                  Módulo de Aprendizado Interativo
                </Badge>
                <Badge
                  variant="outline"
                  className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-xs px-2.5 py-0.5 flex items-center gap-1.5"
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Cloudflare R2 Ativo (vacatio-midias)
                </Badge>
                <Badge
                  variant="outline"
                  className="bg-amber-500/10 text-amber-300 border-amber-500/30 text-xs px-2.5 py-0.5"
                >
                  47 Matérias Catalogadas
                </Badge>
              </div>

              <h1 className="text-2xl sm:text-3xl font-serif font-bold text-white tracking-tight flex items-center gap-2">
                Aulas Interativas com Áudio e Imagens
              </h1>
              <p className="text-sm sm:text-base text-zinc-300 max-w-3xl leading-relaxed">
                Motor idêntico ao modelo aprovado: viewport vertical no formato celular, dock de narração independente na lateral, 32 etapas estruturadas, desafios pontuados, comparadores e sincronização direta no Cloudflare R2.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setInfoModalOpen(true)}
                className="border-zinc-700 bg-zinc-900/60 hover:bg-zinc-800 text-zinc-200 text-xs h-9 gap-1.5"
              >
                <HelpCircle className="w-4 h-4 text-amber-400" />
                Como Foi Feita (Docs)
              </Button>
              <Button
                size="sm"
                onClick={() => handleLaunchClass(1)}
                className="bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white font-medium text-xs h-9 shadow-lg shadow-red-900/30 gap-1.5"
              >
                <PlayCircle className="w-4 h-4" />
                Testar Aula 01 da Matéria Ativa
              </Button>
            </div>
          </div>
        </div>

        {/* Barra de Seletor de Matérias com Destaque para 40. Lei de Drogas */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-red-400" />
              <h2 className="text-sm font-semibold text-zinc-200 uppercase tracking-wider">
                Selecione a Matéria de Direito Penal
              </h2>
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <Input
                value={searchMateria}
                onChange={(e) => setSearchMateria(e.target.value)}
                placeholder="Filtrar matérias (ex: Drogas, Família)..."
                className="pl-8 h-8 text-xs bg-zinc-900/60 border-zinc-800 rounded-lg text-zinc-200"
              />
            </div>
          </div>

          {/* Abas Rápidas com destaque especial */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {/* 40. Lei de Drogas (Principal solicitada) */}
            <button
              type="button"
              onClick={() => setSelectedMateriaSlug('40-lei-de-drogas')}
              className={`p-4 rounded-xl text-left transition-all border relative overflow-hidden flex flex-col justify-between ${
                selectedMateriaSlug === '40-lei-de-drogas'
                  ? 'bg-gradient-to-br from-red-950/80 to-[#220710] border-red-500/80 shadow-lg shadow-red-950/50'
                  : 'bg-zinc-900/40 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/70'
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <Badge className="bg-red-500/20 text-red-300 border-red-500/40 text-[10px] font-mono">
                  Matéria 40 (Solicitada)
                </Badge>
                <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/40 text-[10px]">
                  20 Aulas
                </Badge>
              </div>
              <p className="font-semibold text-sm text-white line-clamp-1">
                40. Lei de Drogas (Lei 11.343/2006)
              </p>
              <p className="text-xs text-zinc-400 mt-1 line-clamp-2">
                Sistema Nacional de Políticas Públicas sobre Drogas (SISNAD), Art. 28 x Art. 33, tráfico privilegiado e jurisprudência STF/STJ.
              </p>
              <div className="mt-3 flex items-center justify-between text-[11px] font-medium text-red-300">
                <span className="flex items-center gap-1">
                  <PlayCircle className="w-3.5 h-3.5" /> Aula 01 Pronta (32 Etapas)
                </span>
                <span className="text-zinc-400">Ver Aulas →</span>
              </div>
            </button>

            {/* 01. Crimes Contra a Família (Referência 100% pronta com áudios e imagens no R2) */}
            <button
              type="button"
              onClick={() => setSelectedMateriaSlug('01-crimes-contra-a-familia')}
              className={`p-4 rounded-xl text-left transition-all border relative overflow-hidden flex flex-col justify-between ${
                selectedMateriaSlug === '01-crimes-contra-a-familia'
                  ? 'bg-gradient-to-br from-red-950/80 to-[#220710] border-red-500/80 shadow-lg shadow-red-950/50'
                  : 'bg-zinc-900/40 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/70'
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40 text-[10px] font-mono">
                  Matéria 01 (Base R2)
                </Badge>
                <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40 text-[10px]">
                  32 Áudios + 30 Imagens R2
                </Badge>
              </div>
              <p className="font-semibold text-sm text-white line-clamp-1">
                01. Crimes Contra a Família
              </p>
              <p className="text-xs text-zinc-400 mt-1 line-clamp-2">
                Visão geral dos arts. 235 a 249, os 4 capítulos, casamento no centro e bigamia completa com áudios e ilustrações reais no R2.
              </p>
              <div className="mt-3 flex items-center justify-between text-[11px] font-medium text-emerald-300">
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> R2 Sincronizado
                </span>
                <span className="text-zinc-400">Ouvir Narração →</span>
              </div>
            </button>

            {/* Seletor dropdown das outras 45 matérias */}
            <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/40 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-2 mb-1">
                  <Badge variant="outline" className="text-[10px] text-zinc-400 border-zinc-700">
                    Outras Matérias
                  </Badge>
                  <span className="text-[11px] text-zinc-400 font-mono">
                    Total: {MATERIAS_DIREITO_PENAL.length}
                  </span>
                </div>
                <p className="font-semibold text-sm text-zinc-200 mb-2">
                  Navegar pelo Catálogo Penal
                </p>
              </div>

              <select
                aria-label="Selecionar matéria de Direito Penal"
                value={selectedMateriaSlug}
                onChange={(e) => setSelectedMateriaSlug(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-xs text-zinc-200 focus:outline-none focus:border-red-500"
              >
                {filteredMaterias.map((m) => (
                  <option key={m.slug} value={m.slug}>
                    {m.titulo} ({m.totalAulas} aulas)
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Grade de Aulas da Matéria Selecionada */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800/80 pb-3">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span>{currentMateria.titulo}</span>
                <Badge variant="outline" className="border-red-500/40 text-red-300 text-xs">
                  {selectedMateriaSlug === '40-lei-de-drogas' ? '20 Aulas' : `${currentMateria.totalAulas} Aulas`}
                </Badge>
              </h2>
              <p className="text-xs text-zinc-400">
                Selecione uma aula abaixo para abrir o simulador com a experiência completa em HTML/CSS/JS idêntica ao modelo.
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs text-zinc-400">
              <Server className="w-3.5 h-3.5 text-red-400" />
              <span>CDN R2:</span>
              <code className="text-[11px] text-red-300 bg-red-950/40 px-1.5 py-0.5 rounded border border-red-900/40">
                vacatio-midias / aprender / direito-penal /
              </code>
            </div>
          </div>

          {/* Lista de Aulas */}
          {selectedMateriaSlug === '40-lei-de-drogas' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {LEI_DROGAS_AULAS.map((aula) => (
                <div
                  key={aula.numero}
                  className={`p-4 rounded-xl border transition-all flex flex-col justify-between ${
                    aula.prontaParaEstudo
                      ? 'bg-zinc-900/60 border-red-500/50 shadow-md shadow-red-950/20'
                      : 'bg-zinc-900/20 border-zinc-800/60 hover:bg-zinc-900/40'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs font-bold text-red-400">
                        AULA {String(aula.numero).padStart(2, '0')}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] text-zinc-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {aula.duracaoEstimada}
                        </span>
                        {aula.prontaParaEstudo ? (
                          <Badge className="bg-red-500/20 text-red-300 border-red-500/40 text-[10px]">
                            32 Etapas Prontas
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-zinc-500 border-zinc-800 text-[10px]">
                            Em Povoamento
                          </Badge>
                        )}
                      </div>
                    </div>

                    <h3 className="font-semibold text-sm text-zinc-100">{aula.titulo}</h3>
                    <p className="text-xs text-zinc-400 leading-relaxed line-clamp-2">
                      {aula.descricao}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-zinc-800/60 flex items-center justify-between">
                    <span className="text-[11px] text-zinc-400 font-mono">
                      {aula.totalEtapas} etapas ativas
                    </span>

                    {aula.prontaParaEstudo ? (
                      <Button
                        size="sm"
                        onClick={() => handleLaunchClass(aula.numero)}
                        className="bg-red-600 hover:bg-red-500 text-white text-xs h-8 px-3 gap-1.5 shadow-md shadow-red-900/20"
                      >
                        <PlayCircle className="w-3.5 h-3.5" />
                        Abrir Aula Interativa
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleLaunchClass(1)}
                        className="border-zinc-800 text-zinc-400 hover:text-zinc-200 text-xs h-8 px-3"
                      >
                        Ver Estrutura
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : selectedMateriaSlug === '01-crimes-contra-a-familia' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              <div className="p-4 rounded-xl border bg-zinc-900/60 border-emerald-500/60 shadow-lg shadow-emerald-950/20 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs font-bold text-emerald-400">
                      AULA 01 · COMPLETA COM ÁUDIOS E IMAGENS
                    </span>
                    <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40 text-[10px]">
                      100% no Cloudflare R2
                    </Badge>
                  </div>

                  <h3 className="font-semibold text-sm text-white">
                    Crimes Contra a Família e Bigamia (Art. 235)
                  </h3>
                  <p className="text-xs text-zinc-300 leading-relaxed">
                    A aula completa original de referência com 32 arquivos MP3 de narração e 30 imagens WebP hospedados no bucket Cloudflare R2 vacatio-midias.
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-zinc-800/60 flex items-center justify-between">
                  <span className="text-[11px] text-emerald-300 font-mono">
                    32 Etapas · Narração Ativa
                  </span>
                  <Button
                    size="sm"
                    onClick={() => handleLaunchClass(1)}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs h-8 px-3 gap-1.5 shadow-md shadow-emerald-900/20"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                    Abrir com Áudio R2
                  </Button>
                </div>
              </div>

              {/* Informação sobre as demais aulas */}
              <div className="p-4 rounded-xl border border-dashed border-zinc-800 bg-zinc-950/40 flex flex-col justify-center items-center text-center p-6 space-y-2">
                <FileCode className="w-8 h-8 text-zinc-500" />
                <h4 className="font-medium text-sm text-zinc-300">Demais Aulas de Família (Aulas 02 a 10)</h4>
                <p className="text-xs text-zinc-500 max-w-sm">
                  Prontas para receber arquivos `.json`, áudios e imagens para upload automatizado ao bucket R2 sob o prefixo `aprender/direito-penal/crimes-contra-a-familia/`.
                </p>
              </div>
            </div>
          ) : (
            <div className="p-8 rounded-xl border border-zinc-800 bg-zinc-900/30 text-center space-y-3">
              <BookOpen className="w-8 h-8 mx-auto text-zinc-500" />
              <h3 className="font-semibold text-zinc-200">
                Matéria: {currentMateria.titulo}
              </h3>
              <p className="text-xs text-zinc-400 max-w-md mx-auto">
                Esta matéria possui {currentMateria.totalAulas} aulas mapeadas na estrutura do Google Drive. Você pode testar o motor interativo clicando no botão abaixo:
              </p>
              <Button
                size="sm"
                onClick={() => handleLaunchClass(1)}
                className="bg-red-600 hover:bg-red-500 text-white text-xs h-8 px-4 gap-1.5"
              >
                <PlayCircle className="w-3.5 h-3.5" />
                Carregar Motor Interativo
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* MODAL DO PLAYER INTERATIVO (O MOTOR IDÊNTICO AO HTML) */}
      {activePlayer && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black/95 backdrop-blur-md animate-in fade-in duration-200">
          {/* Barra de Controles Superior do Player */}
          <div className="flex items-center justify-between px-4 py-2.5 bg-[#17050c] border-b border-red-950/80 text-white select-none">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setActivePlayer(null)}
                className="h-8 px-2.5 text-zinc-300 hover:text-white hover:bg-red-950/50 gap-1 text-xs"
              >
                <ArrowLeft className="w-4 h-4" />
                Voltar
              </Button>

              <div className="h-4 w-px bg-zinc-800" />

              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <span className="font-semibold text-xs text-zinc-200 truncate max-w-[200px] sm:max-w-md">
                  {activePlayer.titulo}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className="hidden sm:inline-flex bg-red-950/40 text-red-300 border-red-900/50 text-[10px]"
              >
                Motor Standalone · 32 Etapas
              </Badge>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="h-8 w-8 text-zinc-300 hover:text-white hover:bg-red-950/50"
                title={isFullscreen ? 'Reduzir' : 'Tela Cheia'}
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </Button>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => setActivePlayer(null)}
                className="h-8 w-8 text-zinc-300 hover:text-white hover:bg-red-950/50"
                title="Fechar Player"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Iframe que renderiza exatamente o HTML/CSS/JS do motor original */}
          <div className="flex-1 w-full h-full relative overflow-hidden bg-[#120409]">
            <iframe
              title={activePlayer.titulo}
              srcDoc={activePlayer.html}
              className="w-full h-full border-0"
              allow="autoplay; encrypted-media"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
            />
          </div>
        </div>
      )}

      {/* Modal Informativo: Como Foi Feita (Docs) */}
      {infoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-[#19060e] border border-red-950/80 rounded-2xl max-w-2xl w-full p-6 text-zinc-200 space-y-4 max-h-[85vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between border-b border-red-950/60 pb-3">
              <h3 className="font-serif font-bold text-lg text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-400" />
                Especificação Pedagógica e Técnica do Motor
              </h3>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setInfoModalOpen(false)}
                className="h-7 w-7 text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="space-y-3 text-xs leading-relaxed text-zinc-300">
              <p>
                <b>Metodologia ativa:</b> cada aula é rigorosamente dividida em <b>32 etapas</b>, estruturadas em 3 blocos temáticos e um fechamento:
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-zinc-300">
                <li><b>Bloco 1 (Etapas 1-5):</b> Capa ilustrada, roteiro da aula, bem jurídico tutelado, mapa sistemático dos capítulos e conceito central.</li>
                <li><b>Bloco 2 (Etapas 6-17):</b> Tipo penal em detalhes, verbos nucleares, elementos subjetivos (dolo), questões comentadas, flashcards 3D, karaokê sincronizado, comparador deslizante e exploração vertical com 5 hotspots luminosos.</li>
                <li><b>Bloco 3 (Etapas 18-29):</b> Toque e revele em 3 estágios, ligar termos em duas colunas, preenchimento de lacunas com banco de palavras, tabela comparativa, verdadeiro ou falso, linha do tempo interativa e mapa mental ramificado.</li>
                <li><b>Fechamento (Etapas 30-32):</b> Desafio com placar de pontos (+100 pts por acerto), a Pergunta de Ouro e resumo final dos pontos principais.</li>
              </ul>

              <div className="p-3 bg-red-950/30 border border-red-900/40 rounded-xl space-y-1 mt-3">
                <p className="font-semibold text-red-300 flex items-center gap-1.5">
                  <Server className="w-3.5 h-3.5" /> Armazenamento e CDN (Cloudflare R2)
                </p>
                <p className="text-[11px] text-zinc-400">
                  Os áudios (<code className="text-zinc-200">s01.mp3 ... s32.mp3</code>) e as ilustrações WebP são armazenados no bucket <code className="text-zinc-200">vacatio-midias</code> sob a rota <code className="text-zinc-200">aprender/direito-penal/{'{materia}'}/aula-{'{num}'}/</code>.
                </p>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <Button
                size="sm"
                onClick={() => setInfoModalOpen(false)}
                className="bg-red-600 hover:bg-red-500 text-white text-xs"
              >
                Entendido
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
