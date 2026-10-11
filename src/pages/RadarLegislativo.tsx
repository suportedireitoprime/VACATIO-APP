import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ScanEye,
  Search,
  RefreshCw,
  Info,
  ExternalLink,
  ChevronRight,
  Landmark,
  FileText,
  User,
  Share2,
  Clock,
  Sparkles,
  Scale,
  Building2,
  Loader2,
  X,
  SlidersHorizontal,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

import { PageHeader } from '@/components/vademecum/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

import {
  getProposicoesEmTramitacao,
  fetchHistoricoTramitacao,
  type ProposicaoTramitando,
  type TramitacaoPasso,
  type CasaLegislativa,
  type TipoProposicao,
} from '@/services/radarTramitacaoService';

export default function RadarLegislativo() {
  const navigate = useNavigate();

  const [itens, setItens] = useState<ProposicaoTramitando[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filtros
  const [busca, setBusca] = useState('');
  const [casaFiltro, setCasaFiltro] = useState<CasaLegislativa>('todas');
  const [tipoFiltro, setTipoFiltro] = useState<TipoProposicao>('todos');
  const [apenasAlteracao, setApenasAlteracao] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);

  // Detalhe selecionado (Modal)
  const [selecionado, setSelecionado] = useState<ProposicaoTramitando | null>(null);
  const [historico, setHistorico] = useState<TramitacaoPasso[]>([]);
  const [loadingHistorico, setLoadingHistorico] = useState(false);

  const carregar = useCallback(async (forcar = false) => {
    if (forcar) setRefreshing(true);
    else setLoading(true);

    try {
      const dados = await getProposicoesEmTramitacao(forcar);
      setItens(dados);
      if (forcar) {
        toast.success('Radar legislativo atualizado com sucesso!');
      }
    } catch (err) {
      console.error(err);
      toast.error('Não foi possível sincronizar os dados do Congresso.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    carregar(false);
  }, [carregar]);

  // Carrega histórico quando abre o modal de detalhes
  const abrirDetalhe = useCallback(async (p: ProposicaoTramitando) => {
    setSelecionado(p);
    setHistorico([]);
    setLoadingHistorico(true);
    try {
      const passos = await fetchHistoricoTramitacao(p);
      setHistorico(passos);
    } catch {
      // Falha não crítica
    } finally {
      setLoadingHistorico(false);
    }
  }, []);

  const fecharDetalhe = () => {
    setSelecionado(null);
    setHistorico([]);
  };

  const compartilhar = async (p: ProposicaoTramitando) => {
    const texto = `⚖️ Radar Legislativo: ${p.codigoIdentificacao}\nAutor: ${p.autorNome}\nStatus: ${p.situacao}\n\nEmenta: ${p.ementa}`;
    try {
      if (navigator.share) {
        await navigator.share({
          title: p.codigoIdentificacao,
          text: texto,
          url: p.urlTramitacao || window.location.href,
        });
      } else {
        await navigator.clipboard.writeText(`${texto}\n${p.urlTramitacao || ''}`);
        toast.success('Informações do projeto copiadas para a área de transferência!');
      }
    } catch {
      // Cancelado pelo usuário
    }
  };

  // Filtragem dos itens
  const filtrados = useMemo(() => {
    let lista = itens;

    if (casaFiltro !== 'todas') {
      lista = lista.filter((i) => i.casa === casaFiltro);
    }

    if (tipoFiltro !== 'todos') {
      lista = lista.filter((i) => i.siglaTipo.toUpperCase() === tipoFiltro.toUpperCase());
    }

    if (apenasAlteracao) {
      lista = lista.filter((i) => i.alteraLegislacao);
    }

    const termo = busca.trim().toLowerCase();
    if (termo) {
      lista = lista.filter((i) => {
        const cod = i.codigoIdentificacao.toLowerCase();
        const em = i.ementa.toLowerCase();
        const aut = i.autorNome.toLowerCase();
        const lei = (i.leiAlvo || '').toLowerCase();
        const sit = i.situacao.toLowerCase();
        return (
          cod.includes(termo) ||
          em.includes(termo) ||
          aut.includes(termo) ||
          lei.includes(termo) ||
          sit.includes(termo)
        );
      });
    }

    return lista;
  }, [itens, casaFiltro, tipoFiltro, apenasAlteracao, busca]);

  // Estatísticas rápidas
  const totalCamara = useMemo(() => itens.filter((i) => i.casa === 'camara').length, [itens]);
  const totalSenado = useMemo(() => itens.filter((i) => i.casa === 'senado').length, [itens]);
  const totalAlteracoes = useMemo(() => itens.filter((i) => i.alteraLegislacao).length, [itens]);

  return (
    <div className="min-h-dvh bg-background pb-[calc(5.5rem+var(--sai-bottom))] lg:pb-8 text-foreground selection:bg-primary/20">
      {/* Header com Gradiente Temático do Radar */}
      <div className="bg-gradient-to-b from-purple-900/25 via-primary/10 to-background pb-3">
        <PageHeader
          title="Radar Legislativo"
          subtitle="Projetos em tramitação no Congresso Nacional"
          onBack={() => navigate(-1)}
          rightAction={
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setInfoOpen((v) => !v)}
                aria-label="Sobre o Radar"
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                  infoOpen ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                <Info className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => carregar(true)}
                disabled={refreshing || loading}
                aria-label="Atualizar dados"
                className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:bg-muted/80 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-primary' : ''}`} />
              </button>
            </div>
          }
        />

        {/* Painel Informativo Dropdown */}
        <AnimatePresence initial={false}>
          {infoOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 280, damping: 26 }}
              className="overflow-hidden max-w-3xl mx-auto px-4"
            >
              <div className="mt-1 mb-3 rounded-2xl border border-purple-500/30 bg-card/80 backdrop-blur-md p-4 space-y-2 shadow-xl">
                <div className="flex items-center gap-2">
                  <ScanEye className="w-4 h-4 text-purple-400" />
                  <h3 className="font-display text-sm font-bold text-foreground">
                    Como funciona o Radar Legislativo?
                  </h3>
                </div>
                <p className="font-body text-[12.5px] leading-relaxed text-muted-foreground">
                  O Radar acompanha em tempo real as <strong className="text-foreground">proposições legislativas (PL, PLP, PEC)</strong> que estão tramitando na <strong className="text-foreground">Câmara dos Deputados</strong> e no <strong className="text-foreground">Senado Federal</strong>.
                </p>
                <p className="font-body text-[12.5px] leading-relaxed text-muted-foreground">
                  São projetos que <strong className="text-foreground">ainda não foram aprovados em definitivo</strong> e que podem transformar o ordenamento jurídico, alterar artigos dos Códigos (Penal, Civil, CLT, etc.) ou criar novas leis.
                </p>
                <div className="pt-1 flex items-center gap-2 text-[11px] text-purple-400 font-semibold">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Dados oficiais integrados via API da Câmara e do Senado</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Quick Stats Badges */}
        <div className="max-w-3xl mx-auto px-4 mt-1 grid grid-cols-3 gap-2">
          <div className="rounded-xl border border-white/5 bg-card/40 backdrop-blur-sm p-2.5 text-center flex flex-col items-center justify-center">
            <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
              <Building2 className="w-3 h-3 text-blue-400" /> Câmara
            </span>
            <span className="font-display font-bold text-base text-foreground mt-0.5">{totalCamara}</span>
          </div>
          <div className="rounded-xl border border-white/5 bg-card/40 backdrop-blur-sm p-2.5 text-center flex flex-col items-center justify-center">
            <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
              <Landmark className="w-3 h-3 text-emerald-400" /> Senado
            </span>
            <span className="font-display font-bold text-base text-foreground mt-0.5">{totalSenado}</span>
          </div>
          <div className="rounded-xl border border-white/5 bg-card/40 backdrop-blur-sm p-2.5 text-center flex flex-col items-center justify-center">
            <span className="text-[11px] font-medium text-amber-400 flex items-center gap-1 truncate">
              <Scale className="w-3 h-3 text-amber-400" /> Altera Leis
            </span>
            <span className="font-display font-bold text-base text-amber-300 mt-0.5">{totalAlteracoes}</span>
          </div>
        </div>

        {/* Campo de Busca Inteligente */}
        <div className="max-w-3xl mx-auto px-4 mt-3">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por número (ex: PL 5539), parlamentar, código ou ementa..."
              className="pl-10 pr-9 h-11 bg-card/60 backdrop-blur-md border-border rounded-xl text-[14px] placeholder:text-muted-foreground/70"
            />
            {busca && (
              <button
                type="button"
                onClick={() => setBusca('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center text-muted-foreground hover:text-foreground"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Filtros de Casa e Tipo */}
        <div className="max-w-3xl mx-auto px-4 mt-3 space-y-2">
          {/* Seletor de Casa Legislativa */}
          <div className="flex gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            <button
              type="button"
              onClick={() => setCasaFiltro('todas')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                casaFiltro === 'todas'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-600/25'
                  : 'bg-card/60 border border-white/5 text-muted-foreground hover:text-foreground'
              }`}
            >
              <span>Congresso (Todas)</span>
            </button>
            <button
              type="button"
              onClick={() => setCasaFiltro('camara')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                casaFiltro === 'camara'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25'
                  : 'bg-card/60 border border-white/5 text-muted-foreground hover:text-foreground'
              }`}
            >
              <Building2 className="w-3 h-3" />
              <span>Câmara dos Deputados</span>
            </button>
            <button
              type="button"
              onClick={() => setCasaFiltro('senado')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                casaFiltro === 'senado'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/25'
                  : 'bg-card/60 border border-white/5 text-muted-foreground hover:text-foreground'
              }`}
            >
              <Landmark className="w-3 h-3" />
              <span>Senado Federal</span>
            </button>
          </div>

          {/* Seletor de Tipo e Altera Legislação */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            {(['todos', 'PL', 'PLP', 'PEC'] as TipoProposicao[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTipoFiltro(t)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider whitespace-nowrap transition-colors ${
                  tipoFiltro === t
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted/60 text-muted-foreground hover:bg-muted'
                }`}
              >
                {t === 'todos' ? 'Todos os tipos' : t}
              </button>
            ))}

            <button
              type="button"
              onClick={() => setApenasAlteracao((v) => !v)}
              className={`ml-auto px-2.5 py-1 rounded-md text-[11px] font-bold whitespace-nowrap flex items-center gap-1 transition-all ${
                apenasAlteracao
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                  : 'bg-muted/40 text-muted-foreground border border-transparent hover:bg-muted/60'
              }`}
            >
              <Scale className="w-3 h-3 text-amber-400" />
              <span>Só que alteram Leis</span>
            </button>
          </div>
        </div>
      </div>

      {/* Conteúdo Principal / Lista de Proposições */}
      <main className="max-w-3xl mx-auto px-4 mt-2 space-y-3">
        {loading && (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
            <p className="text-xs text-muted-foreground font-body">
              Conectando aos dados da Câmara e do Senado...
            </p>
          </div>
        )}

        {!loading && filtrados.length === 0 && (
          <div className="text-center py-16 space-y-3 rounded-2xl border border-dashed border-border/60 p-6 bg-card/20">
            <ScanEye className="w-10 h-10 mx-auto text-muted-foreground/60" />
            <h3 className="font-display font-semibold text-foreground text-base">
              Nenhuma proposição encontrada
            </h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Tente ajustar os filtros ou digitar outro termo de pesquisa (como número ou assunto).
            </p>
            {(busca || casaFiltro !== 'todas' || tipoFiltro !== 'todos' || apenasAlteracao) && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setBusca('');
                  setCasaFiltro('todas');
                  setTipoFiltro('todos');
                  setApenasAlteracao(false);
                }}
                className="mt-2 text-xs"
              >
                Limpar todos os filtros
              </Button>
            )}
          </div>
        )}

        {!loading &&
          filtrados.map((item, idx) => {
            const ehCamara = item.casa === 'camara';
            const casaBadgeColor = ehCamara
              ? 'bg-blue-500/15 text-blue-400 border-blue-500/25'
              : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25';

            return (
              <motion.article
                key={item.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(idx * 0.025, 0.25) }}
                onClick={() => abrirDetalhe(item)}
                className="group relative rounded-2xl border border-white/10 bg-card/60 backdrop-blur-md p-4 transition-all duration-200 hover:border-purple-500/40 hover:bg-card/90 active:scale-[0.99] cursor-pointer shadow-lg shadow-black/20"
              >
                {/* Linha superior: Tags, Código e Status */}
                <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-bold border ${casaBadgeColor}`}
                    >
                      {ehCamara ? <Building2 className="w-3 h-3" /> : <Landmark className="w-3 h-3" />}
                      {ehCamara ? 'Câmara' : 'Senado'}
                    </span>

                    <span className="font-display font-bold text-[14px] text-foreground tracking-tight">
                      {item.codigoIdentificacao}
                    </span>

                    {item.alteraLegislacao && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-300 border border-amber-500/25 text-[10px] font-bold">
                        <Scale className="w-2.5 h-2.5" />
                        {item.leiAlvo || 'Altera Legislação'}
                      </span>
                    )}
                  </div>

                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-400/90 bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-400/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                    Em tramitação
                  </span>
                </div>

                {/* Ementa do Projeto */}
                <p className="font-body text-[13px] text-foreground/90 leading-relaxed line-clamp-3 mb-3">
                  {item.ementa}
                </p>

                {/* Rodapé do Card: Parlamentar Autor + Situação/Órgão */}
                <div className="pt-2.5 border-t border-white/5 flex items-center justify-between gap-2 text-xs text-muted-foreground flex-wrap">
                  <div className="flex items-center gap-2 min-w-0">
                    {item.autorFotoUrl ? (
                      <img
                        src={item.autorFotoUrl}
                        alt={item.autorNome}
                        className="w-6 h-6 rounded-full object-cover border border-white/10 shrink-0"
                        loading="lazy"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center shrink-0 text-muted-foreground">
                        <User className="w-3 h-3" />
                      </div>
                    )}
                    <span className="font-medium text-foreground truncate max-w-[200px] sm:max-w-[280px]">
                      {item.autorNome}
                      {item.autorPartido ? ` (${item.autorPartido}${item.autorUf ? `/${item.autorUf}` : ''})` : ''}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 text-[11.5px] text-purple-400 font-semibold group-hover:translate-x-0.5 transition-transform">
                    <span>Ver tramitação</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </motion.article>
            );
          })}
      </main>

      {/* Modal / Dialog de Detalhe Completo da Proposição */}
      <Dialog open={!!selecionado} onOpenChange={(open) => !open && fecharDetalhe()}>
        <DialogContent className="max-w-xl max-h-[90dvh] p-0 overflow-hidden bg-card/95 border-border backdrop-blur-xl flex flex-col">
          {selecionado && (
            <>
              {/* Header do Modal */}
              <div className="p-4 sm:p-5 border-b border-border bg-gradient-to-b from-purple-900/20 to-transparent flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold border ${
                        selecionado.casa === 'camara'
                          ? 'bg-blue-500/15 text-blue-400 border-blue-500/25'
                          : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25'
                      }`}
                    >
                      {selecionado.casa === 'camara' ? <Building2 className="w-3 h-3" /> : <Landmark className="w-3 h-3" />}
                      {selecionado.casa === 'camara' ? 'Câmara dos Deputados' : 'Senado Federal'}
                    </span>

                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-400/20">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                      Em tramitação (não aprovado)
                    </span>
                  </div>

                  <DialogTitle className="font-display text-xl font-bold text-foreground">
                    {selecionado.codigoIdentificacao}
                  </DialogTitle>
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => compartilhar(selecionado)}
                  className="rounded-full w-9 h-9 text-muted-foreground hover:text-foreground shrink-0"
                  title="Compartilhar"
                >
                  <Share2 className="w-4 h-4" />
                </Button>
              </div>

              {/* Corpo com Scroll */}
              <ScrollArea className="flex-1 p-4 sm:p-5 space-y-4 max-h-[calc(90dvh-130px)]">
                {/* Destaque de Alteração de Legislação */}
                {selecionado.alteraLegislacao && (
                  <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 flex items-start gap-3">
                    <Scale className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold text-amber-300 uppercase tracking-wider">
                        Impacto Legislativo Direto
                      </p>
                      <p className="text-[13px] text-amber-200/90 leading-snug mt-0.5">
                        Este projeto altera ou revoga dispositivos de:{' '}
                        <strong className="text-white">{selecionado.leiAlvo || 'legislação em vigor'}</strong>.
                        Se aprovado pelo Congresso e sancionado, modificará o texto da lei.
                      </p>
                    </div>
                  </div>
                )}

                {/* Ementa Completa */}
                <div className="space-y-1.5 mb-4">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-purple-400">
                    Ementa Oficial
                  </p>
                  <p className="text-[14px] leading-relaxed text-foreground font-body bg-muted/30 p-3.5 rounded-xl border border-white/5 whitespace-pre-line">
                    {selecionado.ementa}
                  </p>
                </div>

                {/* Dados do Autor e Situação Atual */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                  <div className="rounded-xl border border-border/60 bg-muted/20 p-3 space-y-1">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-primary" /> Parlamentar Autor
                    </p>
                    <p className="font-semibold text-[13.5px] text-foreground">
                      {selecionado.autorNome}
                    </p>
                    {selecionado.autorPartido && (
                      <p className="text-xs text-muted-foreground">
                        {selecionado.autorPartido} {selecionado.autorUf ? `· ${selecionado.autorUf}` : ''} · {selecionado.autorCargo}
                      </p>
                    )}
                  </div>

                  <div className="rounded-xl border border-border/60 bg-muted/20 p-3 space-y-1">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-purple-400" /> Situação Atual
                    </p>
                    <p className="font-semibold text-[13.5px] text-foreground line-clamp-2">
                      {selecionado.situacao}
                    </p>
                    {selecionado.orgao && (
                      <p className="text-xs text-muted-foreground">
                        Órgão / Comissão: <span className="text-foreground">{selecionado.orgao}</span>
                      </p>
                    )}
                  </div>
                </div>

                {/* Histórico de Tramitação (Passos) */}
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" /> Histórico de Tramitação
                    </p>
                    {loadingHistorico && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Loader2 className="w-3 h-3 animate-spin text-purple-400" /> Carregando...
                      </span>
                    )}
                  </div>

                  {!loadingHistorico && historico.length === 0 && (
                    <div className="text-xs text-muted-foreground bg-muted/10 p-3 rounded-xl border border-white/5">
                      Proposição recente. Última fase registrada: <strong className="text-foreground">{selecionado.situacao}</strong>.
                    </div>
                  )}

                  {historico.length > 0 && (
                    <div className="relative pl-5 border-l-2 border-purple-500/30 space-y-4 my-2">
                      {historico.slice(0, 15).map((h, i) => (
                        <div key={i} className="relative">
                          <span className="absolute -left-[27px] top-1 w-3 h-3 rounded-full bg-purple-500 ring-4 ring-purple-500/15" />
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-bold text-purple-300">
                              {h.dataHora ? new Date(h.dataHora).toLocaleDateString('pt-BR') : 'Data não informada'}
                            </span>
                            {h.siglaOrgao && (
                              <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-muted text-muted-foreground">
                                {h.siglaOrgao}
                              </span>
                            )}
                          </div>
                          <p className="text-[13px] text-foreground font-medium mt-0.5 leading-snug">
                            {h.descricao}
                          </p>
                          {h.despacho && (
                            <p className="text-[12px] text-muted-foreground leading-relaxed mt-1 bg-black/20 p-2 rounded-lg border border-white/5">
                              {h.despacho}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="h-4" />
              </ScrollArea>

              {/* Botões de Ação no Rodapé do Modal */}
              <div className="p-3 sm:p-4 border-t border-border bg-card flex items-center gap-2">
                {selecionado.urlInteiroTeor ? (
                  <a
                    href={selecionado.urlInteiroTeor}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 h-11 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-lg shadow-purple-600/30"
                  >
                    <FileText className="w-4 h-4" />
                    <span>Abrir Inteiro Teor Oficial</span>
                    <ExternalLink className="w-3.5 h-3.5 ml-0.5 opacity-70" />
                  </a>
                ) : selecionado.urlTramitacao ? (
                  <a
                    href={selecionado.urlTramitacao}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 h-11 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-lg shadow-purple-600/30"
                  >
                    <Landmark className="w-4 h-4" />
                    <span>Ver no Portal do Congresso</span>
                    <ExternalLink className="w-3.5 h-3.5 ml-0.5 opacity-70" />
                  </a>
                ) : null}

                <Button
                  variant="outline"
                  onClick={fecharDetalhe}
                  className="h-11 rounded-xl text-xs sm:text-sm"
                >
                  Fechar
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
