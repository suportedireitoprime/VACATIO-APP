import { useNavigate } from 'react-router-dom';
import { BookOpenText, ScanEye, ChevronRight, Newspaper, Film, NotebookText, Clapperboard, MapPin, Radar } from 'lucide-react';

import { motion } from 'framer-motion';
import { lazy, Suspense, useState } from 'react';
const DicionarioJuridico = lazy(() => import('@/components/ferramentas/DicionarioJuridico'));
import DesktopPageLayout from '@/components/layout/DesktopPageLayout';
import { PageHeader } from '@/components/vademecum/PageHeader';


const TOOLS = [
  {
    id: 'dicionario',
    label: 'Dicionário Jurídico',
    desc: 'Consulte termos e conceitos do Direito',
    icon: BookOpenText,
  },
  {
    id: 'radares',
    label: 'Radares',
    desc: 'Alterações de leis e projetos monitorados',
    icon: Radar,
  },
  {
    id: 'radar360',
    label: 'Radar 360',
    desc: 'Alterações recentes e projetos de lei',
    icon: ScanEye,
  },
  {
    id: 'locais',
    label: 'Locais Jurídicos',
    desc: 'Tribunais, cartórios, delegacias e museus perto de você',
    icon: MapPin,
  },
  {
    id: 'tematica',
    label: 'Temática Jurídica',
    desc: 'Filmes, séries e documentários para juristas',
    icon: Film,
  },
  {
    id: 'resumos-juridicos',
    label: 'Resumos Jurídicos',
    desc: 'Biblioteca de resumos por área, tema e subtema',
    icon: NotebookText,
  },
  {
    id: 'boletins',
    label: 'Boletins Jurídicos',
    desc: 'Vídeo diário com as normas quentes de hoje',
    icon: Clapperboard,
  },
  {
    id: 'noticias',
    label: 'Notícias',
    desc: 'Notícias jurídicas e atualizações',
    icon: Newspaper,
  },
];


const Ferramentas = () => {
  const navigate = useNavigate();
  const [dicionarioOpen, setDicionarioOpen] = useState(false);

  const handleToolClick = (id: string) => {
    switch (id) {
      case 'dicionario': navigate('/ferramentas/dicionario'); break;
      case 'radar360': navigate('/radar-360'); break;
      case 'radares': navigate('/radares'); break;
      case 'resumos-juridicos': navigate('/resumos-juridicos'); break;
      case 'boletins': navigate('/boletins'); break;
      case 'noticias': navigate('/noticias'); break;
      case 'locais': navigate('/ferramentas/locais'); break;
      case 'tematica': navigate('/tematica-juridica'); break;
    }
  };


  const mobileHeader = (
    <PageHeader
      title="Ferramentas"
      subtitle="Recursos para potencializar seus estudos"
      onBack={() => navigate('/')}
    />
  );


  const toolsList = (
    <div className="space-y-3">
      {TOOLS.map((tool, i) => {
        const Icon = tool.icon;
        return (
          <motion.button
            key={tool.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            onClick={() => handleToolClick(tool.id)}
            data-track="ferramenta_abrir"
            data-ferramenta-id={tool.id}
            data-ferramenta-nome={tool.label}
            className="flex items-center gap-4 p-5 min-h-[80px] rounded-xl bg-card border border-border hover:border-primary/40 transition-all group w-full"
          >
            <Icon className="w-6 h-6 text-primary stroke-[1.5] shrink-0" />
            <div className="flex-1 text-left">
              <p className="font-display text-base font-bold text-foreground group-hover:text-primary transition-colors">
                {tool.label}
              </p>
              <p className="text-sm text-muted-foreground mt-0.5 leading-tight">
                {tool.desc}
              </p>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
          </motion.button>
        );
      })}
    </div>
  );

  return (
    <DesktopPageLayout
      activeId="ferramentas"
      title="Ferramentas"
      subtitle="Recursos para potencializar seus estudos"
      mobileHeader={mobileHeader}
    >
      <div className="px-4 sm:px-6 py-4 lg:max-w-none lg:px-0 lg:py-0">
        {toolsList}
      </div>

      <Suspense fallback={null}>
        {dicionarioOpen && <DicionarioJuridico open={dicionarioOpen} onClose={() => setDicionarioOpen(false)} />}
      </Suspense>
    </DesktopPageLayout>
  );
};

export default Ferramentas;
