import { useNavigate } from 'react-router-dom';
import { MapPin, ExternalLink } from 'lucide-react';
import { PageHeader } from '@/components/vademecum/PageHeader';
import { motion } from 'framer-motion';
import { bandeiraUF } from '@/data/estadoFlags';


export interface Estado {
  uf: string;
  nome: string;
  capital: string;
  portalUrl: string;
  regiao: string;
}

export const ESTADOS: Estado[] = [
  { uf: 'AC', nome: 'Acre', capital: 'Rio Branco', portalUrl: 'http://www.legis.ac.gov.br/', regiao: 'Norte' },
  { uf: 'AL', nome: 'Alagoas', capital: 'Maceió', portalUrl: 'http://www.legislacao.al.gov.br/', regiao: 'Nordeste' },
  { uf: 'AP', nome: 'Amapá', capital: 'Macapá', portalUrl: 'http://www.al.ap.gov.br/legislacao', regiao: 'Norte' },
  { uf: 'AM', nome: 'Amazonas', capital: 'Manaus', portalUrl: 'https://sapl.al.am.leg.br/', regiao: 'Norte' },
  { uf: 'BA', nome: 'Bahia', capital: 'Salvador', portalUrl: 'https://legislabahia.ba.gov.br/', regiao: 'Nordeste' },
  { uf: 'CE', nome: 'Ceará', capital: 'Fortaleza', portalUrl: 'https://belt.al.ce.gov.br/', regiao: 'Nordeste' },
  { uf: 'DF', nome: 'Distrito Federal', capital: 'Brasília', portalUrl: 'http://www.sinj.df.gov.br/', regiao: 'Centro-Oeste' },
  { uf: 'ES', nome: 'Espírito Santo', capital: 'Vitória', portalUrl: 'http://www3.al.es.gov.br/legislacao', regiao: 'Sudeste' },
  { uf: 'GO', nome: 'Goiás', capital: 'Goiânia', portalUrl: 'https://legisla.casacivil.go.gov.br/', regiao: 'Centro-Oeste' },
  { uf: 'MA', nome: 'Maranhão', capital: 'São Luís', portalUrl: 'http://www.stc.ma.gov.br/', regiao: 'Nordeste' },
  { uf: 'MT', nome: 'Mato Grosso', capital: 'Cuiabá', portalUrl: 'https://www.al.mt.gov.br/legislacao', regiao: 'Centro-Oeste' },
  { uf: 'MS', nome: 'Mato Grosso do Sul', capital: 'Campo Grande', portalUrl: 'http://www.al.ms.gov.br/legislacao', regiao: 'Centro-Oeste' },
  { uf: 'MG', nome: 'Minas Gerais', capital: 'Belo Horizonte', portalUrl: 'https://www.almg.gov.br/legislacao/', regiao: 'Sudeste' },
  { uf: 'PA', nome: 'Pará', capital: 'Belém', portalUrl: 'https://www.sistemas.pa.gov.br/sisleis/', regiao: 'Norte' },
  { uf: 'PB', nome: 'Paraíba', capital: 'João Pessoa', portalUrl: 'https://sapl.al.pb.leg.br/', regiao: 'Nordeste' },
  { uf: 'PR', nome: 'Paraná', capital: 'Curitiba', portalUrl: 'https://www.legislacao.pr.gov.br/', regiao: 'Sul' },
  { uf: 'PE', nome: 'Pernambuco', capital: 'Recife', portalUrl: 'https://legis.alepe.pe.gov.br/', regiao: 'Nordeste' },
  { uf: 'PI', nome: 'Piauí', capital: 'Teresina', portalUrl: 'http://www.legislacao.pi.gov.br/', regiao: 'Nordeste' },
  { uf: 'RJ', nome: 'Rio de Janeiro', capital: 'Rio de Janeiro', portalUrl: 'http://alfrj.rj.gov.br/', regiao: 'Sudeste' },
  { uf: 'RN', nome: 'Rio Grande do Norte', capital: 'Natal', portalUrl: 'http://www.al.rn.gov.br/legislacao', regiao: 'Nordeste' },
  { uf: 'RS', nome: 'Rio Grande do Sul', capital: 'Porto Alegre', portalUrl: 'http://www.al.rs.gov.br/legislativo/', regiao: 'Sul' },
  { uf: 'RO', nome: 'Rondônia', capital: 'Porto Velho', portalUrl: 'https://sapl.al.ro.leg.br/', regiao: 'Norte' },
  { uf: 'RR', nome: 'Roraima', capital: 'Boa Vista', portalUrl: 'http://www.al.rr.leg.br/', regiao: 'Norte' },
  { uf: 'SC', nome: 'Santa Catarina', capital: 'Florianópolis', portalUrl: 'http://leis.alesc.sc.gov.br/', regiao: 'Sul' },
  { uf: 'SP', nome: 'São Paulo', capital: 'São Paulo', portalUrl: 'https://www.al.sp.gov.br/legislacao/', regiao: 'Sudeste' },
  { uf: 'SE', nome: 'Sergipe', capital: 'Aracaju', portalUrl: 'https://al.se.leg.br/legislacao/', regiao: 'Nordeste' },
  { uf: 'TO', nome: 'Tocantins', capital: 'Palmas', portalUrl: 'http://www.al.to.leg.br/legislacao', regiao: 'Norte' },
];

const REGIAO_COLORS: Record<string, string> = {
  Norte: 'from-emerald-500/50 to-emerald-700/20',
  Nordeste: 'from-amber-500/50 to-amber-700/20',
  'Centro-Oeste': 'from-sky-500/50 to-sky-700/20',
  Sudeste: 'from-violet-500/50 to-violet-700/20',
  Sul: 'from-pink-500/50 to-pink-700/20',
};

const REGIOES = ['Norte', 'Nordeste', 'Centro-Oeste', 'Sudeste', 'Sul'];

const LegislacaoEstadual = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-dvh bg-background">
      <PageHeader
        title="Legislação Estadual"
        subtitle="27 unidades federativas"
        onBack={() => navigate(-1)}
      />



      <div className="px-4 py-4 max-w-5xl mx-auto space-y-6 pb-20">
        {REGIOES.map((regiao) => {
          const estados = ESTADOS.filter((e) => e.regiao === regiao);
          return (
            <div key={regiao}>
              <h2 className="font-display text-sm font-bold text-muted-foreground uppercase tracking-wider mb-3">
                {regiao}
              </h2>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
                {estados.map((estado, i) => (
                  <motion.button
                    key={estado.uf}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.03 }}
                    onClick={() => navigate(`/legislacao-estadual/${estado.uf.toLowerCase()}`)}
                    className={`bg-gradient-to-br ${REGIAO_COLORS[regiao]} rounded-xl p-3 flex flex-col items-center gap-1.5 relative overflow-hidden group shadow-md shadow-black/15 hover:shadow-lg transition-shadow`}
                  >
                    <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-xl">
                      <div
                        className="absolute top-0 -left-full w-1/2 h-full bg-gradient-to-r from-transparent via-white/[0.10] to-transparent skew-x-[-20deg]"
                        style={{ animation: 'shinePratique 3s ease-in-out infinite', animationDelay: `${i * 0.3}s` }}
                      />
                    </div>
                    <div className="w-10 h-7 rounded-md overflow-hidden bg-black/20 border border-white/20 shadow-sm flex items-center justify-center">
                      <img
                        src={bandeiraUF(estado.uf, 96) || ''}
                        alt={`Bandeira de ${estado.nome}`}
                        loading="lazy"
                        decoding="async"
                        className="w-full h-full object-cover"
                        onError={(e) => { (e.currentTarget as HTMLImageElement).style.visibility = 'hidden'; }}
                      />
                    </div>
                    <span className="font-display text-base font-bold text-white leading-none">{estado.uf}</span>
                    <span className="font-body text-[10px] text-white/70 leading-tight text-center">{estado.nome}</span>
                  </motion.button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default LegislacaoEstadual;
