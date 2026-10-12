import React, { useState } from 'react';
import {
  ESTADOS_BRASIL,
  EstadoBrasilInfo,
} from '@/data/fontesLegislacao';
import {
  MapPin, Building, Globe, ExternalLink, ShieldCheck,
  CheckCircle2, Clock, Filter, ArrowRight, Sparkles, Layers,
  Compass
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface MapaLegislacaoBrasilProps {
  ufSelecionada: string | null;
  onSelecionarUF: (uf: string | null) => void;
}

export const MapaLegislacaoBrasil: React.FC<MapaLegislacaoBrasilProps> = ({
  ufSelecionada,
  onSelecionarUF,
}) => {
  const [regiaoAtiva, setRegiaoAtiva] = useState<string>('TODAS');
  const [ufHover, setUfHover] = useState<string | null>(null);

  const regioes = ['TODAS', 'Sudeste', 'Sul', 'Nordeste', 'Centro-Oeste', 'Norte'];

  const estadosFiltrados = ESTADOS_BRASIL.filter(est => {
    if (regiaoAtiva === 'TODAS') return true;
    return est.regiao === regiaoAtiva;
  });

  const estadoFocado = ESTADOS_BRASIL.find(e => e.uf === (ufHover || ufSelecionada)) || 
                       ESTADOS_BRASIL.find(e => e.uf === 'SP')!;

  const getCorStatus = (status: 'operacional' | 'em_monitoramento') => {
    return status === 'operacional'
      ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10'
      : 'border-amber-500/30 text-amber-400 bg-amber-500/10';
  };

  return (
    <div className="rounded-2xl bg-slate-900/70 border border-slate-800/90 p-5 sm:p-7 space-y-6 shadow-xl backdrop-blur-sm">
      {/* Top Header do Módulo do Mapa */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/70 pb-5">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold mb-1.5">
            <Compass className="w-3.5 h-3.5" />
            Cartografia Federativa • 27 UFs
          </div>
          <h3 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
            Rastreamento Federativo por Estado
            {ufSelecionada && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-600 text-white font-mono">
                {ufSelecionada} Ativo
              </span>
            )}
          </h3>
          <p className="text-xs text-slate-400">
            Selecione uma Unidade Federativa para visualizar a cobertura da Assembleia Estadual e Câmaras Municipais.
          </p>
        </div>

        {/* Filtro por Região */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <Filter className="w-3.5 h-3.5 text-slate-500 shrink-0 hidden sm:block" />
          {regioes.map(reg => (
            <button
              key={reg}
              onClick={() => setRegiaoAtiva(reg)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-colors border ${
                regiaoAtiva === reg
                  ? 'bg-blue-600 text-white border-blue-500 shadow-sm'
                  : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:text-white hover:bg-slate-800'
              }`}
            >
              {reg}
            </button>
          ))}
          {ufSelecionada && (
            <button
              onClick={() => onSelecionarUF(null)}
              className="text-xs text-rose-400 hover:text-rose-300 underline ml-2 whitespace-nowrap"
            >
              Limpar Filtro UF
            </button>
          )}
        </div>
      </div>

      {/* Grid Principal: Mapa Cartográfico Interativo + Detalhes do Estado */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Lado Esquerdo: Grid Cartográfico Esquematizado do Brasil (8 colunas x 7 linhas) */}
        <div className="lg:col-span-7 bg-slate-950/80 rounded-xl p-4 sm:p-5 border border-slate-800/80">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-3 px-1">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              Operacional
              <span className="w-2 h-2 rounded-full bg-amber-400 ml-2" />
              Em expansão
            </span>
            <span className="text-[11px] text-slate-500 font-mono">
              Clique em uma UF para filtrar
            </span>
          </div>

          {/* Grid Cartográfico Geométrico de 8 colunas */}
          <div className="grid grid-cols-8 gap-2 aspect-[8/7] max-w-md mx-auto sm:max-w-none">
            {Array.from({ length: 7 }).map((_, rIdx) => {
              const row = rIdx + 1;
              return Array.from({ length: 8 }).map((_, cIdx) => {
                const col = cIdx + 1;
                const estado = ESTADOS_BRASIL.find(
                  e => e.gridPos.row === row && e.gridPos.col === col
                );

                if (!estado) {
                  return <div key={`empty-${row}-${col}`} className="rounded-lg opacity-0 pointer-events-none" />;
                }

                const isSelected = ufSelecionada === estado.uf;
                const isHovered = ufHover === estado.uf;
                const isOperacional = estado.status === 'operacional';
                const isDimmed = regiaoAtiva !== 'TODAS' && estado.regiao !== regiaoAtiva;

                return (
                  <button
                    key={estado.uf}
                    onClick={() => {
                      if (ufSelecionada === estado.uf) {
                        onSelecionarUF(null);
                      } else {
                        onSelecionarUF(estado.uf);
                      }
                    }}
                    onMouseEnter={() => setUfHover(estado.uf)}
                    onMouseLeave={() => setUfHover(null)}
                    className={`relative flex flex-col items-center justify-center rounded-xl p-1 sm:p-2 transition-all duration-200 border text-center ${
                      isDimmed ? 'opacity-30' : 'opacity-100'
                    } ${
                      isSelected
                        ? 'bg-blue-600 border-blue-400 text-white shadow-lg shadow-blue-500/30 scale-105 z-10'
                        : isHovered
                        ? 'bg-slate-800 border-blue-500/60 text-white scale-102 z-10'
                        : isOperacional
                        ? 'bg-slate-900/90 border-emerald-500/30 text-slate-200 hover:border-emerald-500/60 hover:bg-slate-800'
                        : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:bg-slate-800'
                    }`}
                  >
                    <span className="text-xs sm:text-sm font-black tracking-wider">
                      {estado.uf}
                    </span>
                    <span className="text-[9px] font-mono leading-none mt-0.5 opacity-80 hidden sm:block">
                      {estado.assembleia}
                    </span>
                    {/* Status dot */}
                    <span
                      className={`absolute top-1 right-1 w-1.5 h-1.5 rounded-full ${
                        isOperacional ? 'bg-emerald-400' : 'bg-amber-400'
                      }`}
                    />
                  </button>
                );
              });
            })}
          </div>

          {/* Quick pills bar para telas pequenas */}
          <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center gap-1.5 overflow-x-auto scrollbar-none">
            <span className="text-[11px] text-slate-500 shrink-0 font-medium">UFs:</span>
            {estadosFiltrados.map(est => (
              <button
                key={est.uf}
                onClick={() => onSelecionarUF(ufSelecionada === est.uf ? null : est.uf)}
                className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors border ${
                  ufSelecionada === est.uf
                    ? 'bg-blue-600 text-white border-blue-400'
                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                }`}
              >
                {est.uf}
              </button>
            ))}
          </div>
        </div>

        {/* Lado Direito: Ficha Técnica do Estado Selecionado / Focado */}
        <div className="lg:col-span-5 bg-slate-950/90 rounded-xl p-5 border border-slate-800/90 space-y-4 shadow-inner">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-black text-white">{estadoFocado.nome}</span>
                <span className="px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-300 font-mono font-bold text-xs border border-blue-500/30">
                  {estadoFocado.uf}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Região {estadoFocado.regiao} • Capital: <strong className="text-slate-300">{estadoFocado.capital}</strong>
              </p>
            </div>

            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${getCorStatus(estadoFocado.status)}`}>
              {estadoFocado.status === 'operacional' ? 'Operacional' : 'Em expansão'}
            </span>
          </div>

          {/* Métricas do Estado */}
          <div className="grid grid-cols-2 gap-2.5 pt-2">
            <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800/80">
              <span className="text-[11px] text-slate-400 block">Municípios Cobertos</span>
              <span className="text-base font-bold text-white mt-0.5 block">
                {estadoFocado.totalMunicipios} cidades
              </span>
            </div>
            <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800/80">
              <span className="text-[11px] text-slate-400 block">Atos Normativos</span>
              <span className="text-base font-bold text-emerald-400 mt-0.5 block font-mono">
                ~{(estadoFocado.totalAtosEstimados / 1000).toFixed(0)}k normas
              </span>
            </div>
          </div>

          {/* Assembleia Oficial */}
          <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800/80 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-blue-400" />
                Assembleia Legislativa:
              </span>
              <strong className="text-white font-mono">{estadoFocado.assembleia}</strong>
            </div>
            <a
              href={estadoFocado.urlAssembleia}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-400 hover:underline flex items-center gap-1 font-mono break-all pt-1"
            >
              {estadoFocado.urlAssembleia}
              <ExternalLink className="w-3 h-3 shrink-0" />
            </a>
          </div>

          {/* Ações da UF */}
          <div className="pt-2 flex flex-col gap-2">
            <Button
              variant="default"
              size="sm"
              onClick={() => onSelecionarUF(estadoFocado.uf)}
              className={`w-full text-xs h-9 rounded-lg font-semibold gap-1.5 ${
                ufSelecionada === estadoFocado.uf
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                  : 'bg-blue-600 hover:bg-blue-500 text-white'
              }`}
            >
              {ufSelecionada === estadoFocado.uf ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  UF {estadoFocado.uf} Filtrada na Lista Abaixo
                </>
              ) : (
                <>
                  <Filter className="w-3.5 h-3.5" />
                  Filtrar Portais e Câmaras de {estadoFocado.uf}
                </>
              )}
            </Button>

            <Button
              variant="outline"
              size="sm"
              asChild
              className="w-full border-slate-800 hover:bg-slate-900 text-slate-300 text-xs h-8"
            >
              <a
                href={estadoFocado.urlAssembleia}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5"
              >
                <span>Acessar Portal da {estadoFocado.assembleia}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </a>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
