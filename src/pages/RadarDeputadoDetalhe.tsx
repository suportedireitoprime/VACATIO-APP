import { useState, useEffect } from 'react';
import { ArrowLeft, RefreshCw, DollarSign, TrendingUp, Calendar, Receipt } from 'lucide-react';
import { PageHeader } from '@/components/vademecum/PageHeader';
import { useNavigate, useParams } from 'react-router-dom';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const CAMARA_API = 'https://dadosabertos.camara.leg.br/api/v2';

interface Despesa {
  ano: number;
  mes: number;
  tipoDespesa: string;
  valorLiquido: number;
  nomeFornecedor: string;
  cnpjCpfFornecedor: string;
  dataDocumento: string;
  urlDocumento: string;
  numDocumento: string;
}

interface DeputadoInfo {
  id: number;
  nome: string;
  siglaPartido: string;
  siglaUf: string;
  urlFoto: string;
  email: string;
}

const COLORS = ['#f43f5e', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#8b5cf6', '#ec4899', '#14b8a6', '#6366f1', '#a855f7'];

const RadarDeputadoDetalhe = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [deputado, setDeputado] = useState<DeputadoInfo | null>(null);
  const [despesas, setDespesas] = useState<Despesa[]>([]);
  const [loading, setLoading] = useState(true);
  const [anoSelecionado, setAnoSelecionado] = useState(new Date().getFullYear());

  useEffect(() => {
    if (id) loadData(id);
  }, [id, anoSelecionado]);

  const loadData = async (depId: string) => {
    setLoading(true);

    // Fetch deputado info and despesas in parallel
    const [infoRes, despRes] = await Promise.all([
      fetch(`${CAMARA_API}/deputados/${depId}`, { headers: { Accept: 'application/json' } }),
      fetch(`${CAMARA_API}/deputados/${depId}/despesas?ano=${anoSelecionado}&itens=100&ordem=DESC&ordenarPor=mes`, { headers: { Accept: 'application/json' } }),
    ]);

    if (infoRes.ok) {
      const infoJson = await infoRes.json();
      const d = infoJson.dados;
      setDeputado({
        id: d.id,
        nome: d.nomeCivil || d.ultimoStatus?.nome || d.nomeEleitoral,
        siglaPartido: d.ultimoStatus?.siglaPartido || '',
        siglaUf: d.ultimoStatus?.siglaUf || '',
        urlFoto: d.ultimoStatus?.urlFoto || '',
        email: d.ultimoStatus?.email || '',
      });
    }

    if (despRes.ok) {
      const despJson = await despRes.json();
      setDespesas(despJson.dados || []);

      // If no data for current year, try previous
      if ((!despJson.dados || despJson.dados.length === 0) && anoSelecionado === new Date().getFullYear()) {
        const prevRes = await fetch(`${CAMARA_API}/deputados/${depId}/despesas?ano=${anoSelecionado - 1}&itens=100&ordem=DESC&ordenarPor=mes`, { headers: { Accept: 'application/json' } });
        if (prevRes.ok) {
          const prevJson = await prevRes.json();
          if (prevJson.dados?.length > 0) {
            setDespesas(prevJson.dados);
            setAnoSelecionado(anoSelecionado - 1);
          }
        }
      }
    }

    setLoading(false);
  };

  const totalGasto = despesas.reduce((sum, d) => sum + (d.valorLiquido || 0), 0);

  // Monthly chart data
  const monthlyData = Array.from({ length: 12 }, (_, i) => {
    const mes = i + 1;
    const total = despesas
      .filter(d => d.mes === mes)
      .reduce((sum, d) => sum + (d.valorLiquido || 0), 0);
    return { mes: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'][i], valor: total };
  }).filter(d => d.valor > 0);

  // By category
  const byCategory: Record<string, number> = {};
  despesas.forEach(d => {
    const tipo = d.tipoDespesa || 'Outros';
    byCategory[tipo] = (byCategory[tipo] || 0) + (d.valorLiquido || 0);
  });
  const categoryData = Object.entries(byCategory)
    .map(([name, value]) => ({ name: name.length > 30 ? name.slice(0, 30) + '...' : name, fullName: name, value }))
    .sort((a, b) => b.value - a.value);

  const pieData = categoryData.slice(0, 8);

  return (
    <div className="min-h-dvh bg-background text-foreground">
      {/* Header */}
      <div className="sticky top-0 z-50">
        <PageHeader
          title={deputado?.nome || 'Carregando...'}
          subtitle={deputado ? `${deputado.siglaPartido}-${deputado.siglaUf}` : ''}
          onBack={() => navigate(-1)}
        />
      </div>


      {loading ? (
        <div className="flex justify-center py-20">
          <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="p-4 space-y-5">
          {/* Profile card */}
          <div className="flex items-center gap-4 p-4 rounded-2xl bg-card border border-border/50">
            <Avatar className="w-16 h-16 border-2 border-primary/30">
              <AvatarImage src={deputado?.urlFoto} alt={deputado?.nome} />
              <AvatarFallback className="text-lg bg-primary/10 text-primary">{deputado?.nome?.slice(0, 2)}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-foreground truncate">{deputado?.nome}</p>
              <p className="text-sm text-muted-foreground">{deputado?.siglaPartido}-{deputado?.siglaUf}</p>
              {deputado?.email && (
                <p className="text-xs text-muted-foreground truncate mt-0.5">{deputado.email}</p>
              )}
            </div>
          </div>

          {/* Year selector + total */}
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              {[new Date().getFullYear(), new Date().getFullYear() - 1].map(ano => (
                <button
                  key={ano}
                  onClick={() => setAnoSelecionado(ano)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    anoSelecionado === ano
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {ano}
                </button>
              ))}
            </div>
            <div className="text-right">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Total gasto</p>
              <p className="text-lg font-bold text-rose-400">
                R$ {totalGasto.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
          </div>

          {/* Monthly bar chart */}
          {monthlyData.length > 0 && (
            <div className="rounded-2xl bg-card border border-border/50 p-4">
              <div className="flex items-center gap-2 mb-3">
                <Calendar className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-bold">Gastos por Mês</h3>
              </div>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={monthlyData}>
                  <XAxis dataKey="mes" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} width={35} />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 12, fontSize: 12 }}
                    formatter={(value: number) => [`R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 'Valor']}
                  />
                  <Bar dataKey="valor" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Pie chart by category */}
          {pieData.length > 0 && (
            <div className="rounded-2xl bg-card border border-border/50 p-4">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-bold">Por Categoria</h3>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {pieData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 12, fontSize: 11 }}
                    formatter={(value: number) => [`R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, '']}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 mt-2">
                {categoryData.map((cat, idx) => (
                  <div key={cat.name} className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                    <p className="text-[10px] text-muted-foreground flex-1 truncate">{cat.fullName}</p>
                    <p className="text-[10px] font-semibold text-foreground shrink-0">
                      R$ {cat.value.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Detailed expenses list */}
          <div className="rounded-2xl bg-card border border-border/50 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Receipt className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-bold">Despesas Detalhadas</h3>
              <span className="text-[10px] text-muted-foreground ml-auto">{despesas.length} registros</span>
            </div>
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {despesas.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-8">Nenhuma despesa encontrada para {anoSelecionado}</p>
              ) : (
                despesas.map((d, i) => (
                  <div key={i} className="p-3 rounded-xl bg-background border border-border/30">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <p className="text-xs font-medium text-foreground flex-1">{d.tipoDespesa}</p>
                      <p className="text-xs font-bold text-rose-400 shrink-0">
                        R$ {(d.valorLiquido || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <p className="text-[10px] text-muted-foreground truncate">{d.nomeFornecedor || 'Fornecedor não informado'}</p>
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-[10px] text-muted-foreground/70">
                        {d.dataDocumento ? new Date(d.dataDocumento).toLocaleDateString('pt-BR') : `${d.mes}/${d.ano}`}
                      </p>
                      {d.urlDocumento && (
                        <a
                          href={d.urlDocumento}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] text-primary font-semibold"
                        >
                          Ver documento
                        </a>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RadarDeputadoDetalhe;
