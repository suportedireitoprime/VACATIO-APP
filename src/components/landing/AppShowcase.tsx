import { motion } from 'framer-motion';
import {
  BookOpen, Scale, Brain, FileText, Mic, Sparkles, Bot, Newspaper,
  GraduationCap, Layers, Headphones, MapPin, ArrowRight,
} from 'lucide-react';

import secJustica from '@/assets/landing-tribunal/sec-justica.webp';
import secBiblioteca from '@/assets/landing-tribunal/sec-biblioteca.webp';
import secBalanca from '@/assets/landing-tribunal/sec-balanca.webp';
import secPlenario from '@/assets/landing-tribunal/sec-plenario.webp';

interface Props {
  onAcessar: () => void;
}

type Item = { icon: React.ElementType; label: string; desc: string };
type Variant = 'cards' | 'numbered' | 'grid' | 'rows';

/** Cada painel usa um formato de lista diferente e entra deslizando de um lado. */
const ItemsList = ({ items, variant, fromRight }: { items: Item[]; variant: Variant; fromRight: boolean }) => {
  const reveal = (i: number) => ({
    initial: { opacity: 0, x: fromRight ? 42 : -42 },
    whileInView: { opacity: 1, x: 0 },
    viewport: { once: true, margin: '-60px' } as const,
    transition: { delay: i * 0.09, duration: 0.5, ease: [0.22, 0.61, 0.36, 1] as [number, number, number, number] },
  });

  if (variant === 'numbered') {
    return (
      <ol className="relative pl-6">
        <span
          className="absolute left-[7px] top-2 bottom-2 w-px"
          style={{ background: 'linear-gradient(to bottom, hsl(var(--primary) / 0.7), transparent)' }}
        />
        {items.map((it, i) => (
          <motion.li key={it.label} {...reveal(i)} className="relative pb-7 last:pb-0">
            <span className="absolute -left-6 top-1 w-4 h-4 rounded-full bg-primary/25 border border-primary flex items-center justify-center">
              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            </span>
            <p className="flex items-center gap-2 text-foreground font-bold text-sm">
              <span className="font-legal text-primary text-lg leading-none">
                {String(i + 1).padStart(2, '0')}
              </span>
              {it.label}
            </p>
            <p className="text-muted-foreground text-[13px] leading-relaxed mt-1">{it.desc}</p>
          </motion.li>
        ))}
      </ol>
    );
  }

  if (variant === 'grid') {
    return (
      <div className="grid grid-cols-2 gap-3">
        {items.map((it, i) => (
          <motion.div
            key={it.label}
            {...reveal(i)}
            className="rounded-2xl p-4 text-center backdrop-blur-md border border-primary/20"
            style={{ background: 'hsl(var(--card) / 0.55)' }}
          >
            <it.icon
              className="w-6 h-6 mx-auto mb-3"
              style={{ color: 'hsl(350 78% 62%)' }}
              strokeWidth={1.8}
            />

            <p className="text-foreground font-bold text-[13px] mb-1">{it.label}</p>
            <p className="text-muted-foreground text-[12px] leading-relaxed">{it.desc}</p>
          </motion.div>
        ))}
      </div>
    );
  }

  if (variant === 'rows') {
    return (
      <div className="divide-y divide-primary/15">
        {items.map((it, i) => (
          <motion.div key={it.label} {...reveal(i)} className="flex items-center gap-4 py-4 first:pt-0 last:pb-0">
            <it.icon className="w-6 h-6 shrink-0" style={{ color: 'hsl(350 78% 62%)' }} strokeWidth={1.8} />
            <div className="min-w-0 flex-1">
              <p className="text-foreground font-bold text-sm">{it.label}</p>
              <p className="text-muted-foreground text-[13px] leading-relaxed">{it.desc}</p>
            </div>
            <span className="font-legal text-primary/40 text-xl shrink-0">{i + 1}</span>
          </motion.div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      {items.map((it, i) => (
        <motion.div
          key={it.label}
          {...reveal(i)}
          className="flex gap-3 items-start rounded-2xl p-4 backdrop-blur-md border border-primary/20"
          style={{ background: 'hsl(var(--card) / 0.6)' }}
        >
          <it.icon
            className="w-6 h-6 shrink-0 mt-0.5"
            style={{ color: 'hsl(350 78% 62%)' }}
            strokeWidth={1.8}
          />

          <div className="min-w-0">
            <p className="text-foreground font-bold text-sm mb-1">{it.label}</p>
            <p className="text-muted-foreground text-[13px] leading-relaxed">{it.desc}</p>
          </div>
        </motion.div>
      ))}
    </div>
  );
};

/** Painel cinematográfico com imagem de fundo no mesmo estilo do hero. */
const Panel = ({
  image, kicker, title, lead, items, reverse = false, alt, variant = 'cards',
}: {
  image: string;
  kicker: string;
  title: string;
  lead: string;
  items: Item[];
  reverse?: boolean;
  alt: string;
  variant?: Variant;
}) => (
  <section className="relative isolate overflow-hidden">
    <img
      src={image}
      alt={alt}
      width={1536}
      height={1024}
      loading="lazy"
      decoding="async"
      className="absolute inset-0 h-full w-full object-cover"
      style={{ transform: 'scale(1.05)' }}
    />
    <div
      className="absolute inset-0"
      style={{
        background:
          'linear-gradient(to bottom, hsl(var(--background) / 0.92), hsl(var(--background) / 0.7) 40%, hsl(var(--background) / 0.94))',
      }}
    />
    <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-background to-transparent" />
    <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-background to-transparent" />

    <div className="relative z-10 px-6 lg:px-12 py-16 md:py-24">
      <div
        className={`max-w-6xl mx-auto grid gap-8 md:gap-12 md:grid-cols-2 items-center ${
          reverse ? 'md:[&>*:first-child]:order-2' : ''
        }`}
      >
        <motion.div
          initial={{ opacity: 0, x: reverse ? 42 : -42 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6, ease: [0.22, 0.61, 0.36, 1] }}
        >
          <p className="text-primary text-[10px] font-bold uppercase tracking-[0.24em] mb-3">
            {kicker}
          </p>
          <h2
            className="font-legal font-black text-foreground leading-tight mb-4"
            style={{ fontSize: 'clamp(1.6rem, 4vw, 2.6rem)', textShadow: '0 3px 18px rgba(0,0,0,0.6)' }}
          >
            {title}
          </h2>
          <p className="text-foreground/85 text-sm md:text-base leading-relaxed max-w-lg">
            {lead}
          </p>
          <div
            className="mt-6 h-px max-w-[220px]"
            style={{ background: 'linear-gradient(to right, hsl(var(--primary) / 0.8), transparent)' }}
          />
        </motion.div>

        <ItemsList items={items} variant={variant} fromRight={!reverse} />
      </div>
    </div>
  </section>
);


const AppShowcase = ({ onAcessar }: Props) => {
  return (
    <div id="conhecer" className="relative bg-background">
      {/* Abertura da seção */}
      <section className="relative isolate overflow-hidden">
        <img
          src={secPlenario}
          alt="Plenário de tribunal iluminado"
          width={1536}
          height={1024}
          loading="lazy"
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(to bottom, hsl(var(--background)) 0%, hsl(var(--background) / 0.6) 45%, hsl(var(--background)) 100%)',
          }}
        />
        <div className="relative z-10 px-6 py-20 md:py-28 text-center max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <p className="text-primary text-[10px] font-bold uppercase tracking-[0.26em] mb-4">
              Conheça o aplicativo
            </p>
            <h2
              className="font-legal font-black text-foreground leading-tight mb-5"
              style={{ fontSize: 'clamp(1.9rem, 5.4vw, 3.4rem)', textShadow: '0 4px 22px rgba(0,0,0,0.7)' }}
            >
              Uma sala de estudos jurídica
              <br />
              <span className="text-primary">no seu bolso</span>
            </h2>
            <p className="text-foreground/85 text-sm md:text-lg leading-relaxed">
              Legislação viva, resumos inteligentes, questões comentadas, narração em áudio,
              flashcards e uma assistente jurídica que estuda com você. Desça e veja tudo
              o que está esperando por você.
            </p>
            <div
              className="mt-8 h-px mx-auto max-w-[240px]"
              style={{ background: 'linear-gradient(to right, transparent, hsl(var(--primary) / 0.8), transparent)' }}
            />
          </motion.div>
        </div>
      </section>

      <Panel
        image={secBiblioteca}
        alt="Biblioteca jurídica clássica"
        kicker="Legislação e biblioteca"
        variant="cards"
        title="Toda a lei brasileira, comentada artigo por artigo"
        lead="O Vade Mecum completo, direto da fonte oficial, com comentários, explicações em linguagem simples e busca instantânea. Nada de abrir cinco sites para entender um único artigo."
        items={[
          { icon: Scale, label: 'Vade Mecum completo', desc: 'Códigos, estatutos e leis especiais sempre atualizados, com busca por artigo, palavra ou tema.' },
          { icon: BookOpen, label: 'Biblioteca jurídica', desc: 'Doutrina, súmulas, informativos e obras clássicas organizadas para leitura confortável.' },
          { icon: FileText, label: 'Lei seca explicada', desc: 'Cada artigo com comentário técnico e explicação didática lado a lado.' },
          { icon: Layers, label: 'Modo offline', desc: 'Baixe leis e conteúdos e continue estudando sem internet, no ônibus ou na faculdade.' },
        ]}
      />

      <Panel
        image={secJustica}
        alt="Estátua da Justiça em mármore"
        kicker="Estudo ativo"
        variant="numbered"
        title="Resumos, mapas mentais e flashcards que realmente fixam"
        lead="Métodos de estudo consagrados aplicados ao Direito: Cornell, Feynman, mapas mentais visuais e repetição espaçada. Você entende, memoriza e revisa no tempo certo."
        reverse
        items={[
          { icon: Brain, label: 'Mapas mentais', desc: 'Matérias e subtemas em mapas visuais elegantes, prontos para baixar em PDF.' },
          { icon: Sparkles, label: 'Flashcards inteligentes', desc: 'Revisão espaçada que traz de volta exatamente o que você está esquecendo.' },
          { icon: GraduationCap, label: 'Resumos em 3 métodos', desc: 'Cornell, Feynman e resumo clássico para cada tema, com design editorial.' },
          { icon: Headphones, label: 'Narração em áudio', desc: 'Ouça leis, resumos e aulas com controle na tela de bloqueio do celular.' },
        ]}
      />

      <Panel
        image={secBalanca}
        alt="Balança da justiça sobre mesa de mármore"
        kicker="Treino e aprovação"
        variant="grid"
        title="Questões, simulados e treino focado em prova"
        lead="Da primeira prova da faculdade à segunda fase da OAB e ao concurso: questões comentadas, simulados cronometrados e estatísticas que mostram exatamente onde melhorar."
        items={[
          { icon: FileText, label: 'Questões comentadas', desc: 'Banco de questões por matéria, banca e nível, com comentário em cada alternativa.' },
          { icon: Scale, label: 'OAB 1ª e 2ª fase', desc: 'Treino direcionado, peças práticas e checklists de correção.' },
          { icon: GraduationCap, label: 'Concursos públicos', desc: 'Trilhas por cargo e edital, com foco no que a banca realmente cobra.' },
          { icon: Layers, label: 'Desempenho', desc: 'Estatísticas de acertos por tema para você atacar seus pontos fracos.' },
        ]}
      />

      <Panel
        image={secPlenario}
        alt="Sala de audiências"
        kicker="Inteligência e rotina"
        variant="rows"
        title="Uma assistente jurídica 24h e a sua vida acadêmica organizada"
        lead="IA que explica artigos, corrige seus textos, resume aulas gravadas e responde dúvidas na hora. Somado às ferramentas de rotina, o app acompanha você dentro e fora da sala."
        reverse
        items={[
          { icon: Bot, label: 'IA jurídica', desc: 'Tire dúvidas, peça exemplos práticos e explicações em qualquer nível de profundidade.' },

          { icon: Newspaper, label: 'Radar jurídico', desc: 'Novas leis, decisões e informativos resumidos todos os dias.' },
          { icon: MapPin, label: 'Locais jurídicos', desc: 'Fóruns, tribunais e cartórios perto de você, com rota em um toque.' },
        ]}
      />

      {/* Fechamento */}
      <section className="relative isolate overflow-hidden">
        <img
          src={secJustica}
          alt=""
          aria-hidden="true"
          width={1536}
          height={1024}
          loading="lazy"
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover object-top"
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(to bottom, hsl(var(--background)) 0%, hsl(var(--background) / 0.72) 50%, hsl(var(--background)) 100%)',
          }}
        />
        <div className="relative z-10 px-6 py-20 md:py-24 text-center max-w-2xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.55 }}
          >
            <h2
              className="font-legal font-black text-foreground leading-tight mb-4"
              style={{ fontSize: 'clamp(1.7rem, 4.6vw, 2.8rem)', textShadow: '0 4px 20px rgba(0,0,0,0.7)' }}
            >
              O Direito inteiro, em um só lugar
            </h2>
            <p className="text-foreground/85 text-sm md:text-base leading-relaxed mb-8">
              Comece grátis hoje e sinta a diferença de estudar com direção.
            </p>
            <button
              onClick={onAcessar}
              className="group inline-flex items-center gap-2 rounded-full px-8 py-4 text-base font-bold text-primary-foreground transition-transform hover:scale-105 active:scale-95"
              style={{
                background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(348 80% 40%))',
                boxShadow: '0 7px 0 hsl(0 72% 30%), 0 14px 32px hsl(var(--primary) / 0.35)',
              }}
            >
              Acessar agora
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </button>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default AppShowcase;
