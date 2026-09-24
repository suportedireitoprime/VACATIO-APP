import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import heroTribunal from '@/assets/landing-tribunal/hero-tribunal.webp';
import laurel from '@/assets/landing-tribunal/laurel-leaf.webp';
import scales from '@/assets/landing-tribunal/scales.webp';
import FuncoesCarousel from './FuncoesCarousel';

interface Props {
  onAcessar: () => void;
  onConhecer: () => void;
}

/**
 * Hero cinematográfico com as mesmas mecânicas do projeto de referência:
 * parallax de mouse (camadas em profundidades diferentes), elementos caindo
 * (folhas de louro), flutuantes (balanças) e uma "pilha" no rodapé que reage
 * à posição do ponteiro. Tudo desativado quando o usuário pede menos movimento.
 */
const HeroTribunal = ({ onAcessar, onConhecer }: Props) => {
  const [parallax, setParallax] = useState({ x: 0, y: 0 });
  const [pointerX, setPointerX] = useState(0.5);
  const reduce = useRef(false);

  useEffect(() => {
    reduce.current =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce.current) return;

    let raf = 0;
    const apply = (cx: number, cy: number) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        setParallax({
          x: (cx / window.innerWidth - 0.5) * 2,
          y: (cy / window.innerHeight - 0.5) * 2,
        });
        setPointerX(cx / window.innerWidth);
      });
    };
    const onMove = (e: MouseEvent) => apply(e.clientX, e.clientY);
    const onTouch = (e: TouchEvent) => {
      const t = e.touches[0];
      if (t) apply(t.clientX, t.clientY);
    };
    window.addEventListener('mousemove', onMove, { passive: true });
    window.addEventListener('touchmove', onTouch, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('touchmove', onTouch);
    };
  }, []);

  const falling = useMemo(() => Array.from({ length: 12 }, (_, i) => i), []);
  const pile = useMemo(() => Array.from({ length: 14 }, (_, i) => i), []);

  return (
    <section
      className="relative w-full overflow-hidden isolate min-h-[100svh] flex flex-col"
      style={{ background: 'hsl(var(--background))' }}
    >
      {/* Cena de fundo com parallax */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          transform: `translate3d(${parallax.x * -22}px, ${parallax.y * -14}px, 0) scale(1.1)`,
          transition: 'transform 0.35s ease-out',
          willChange: 'transform',
        }}
      >
        <img
          src={heroTribunal}
          alt="Plenário de tribunal com a estátua da Justiça"
          width={1920}
          height={1088}
          fetchPriority="high"
          decoding="async"
          className="w-full h-full object-cover object-center lp-hero-zoom"
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse at center, transparent 25%, hsl(var(--background) / 0.75) 95%)',
          }}
        />
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-b from-transparent via-background/60 to-background" />
      </div>

      {/* Brilho superior */}
      <div
        className="pointer-events-none absolute -top-40 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full opacity-50 blur-3xl"
        style={{
          background: 'radial-gradient(circle, hsl(var(--primary) / 0.55), transparent 70%)',
        }}
      />

      {/* Folhas de louro caindo */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {falling.map((i) => (
          <img
            key={i}
            src={laurel}
            alt=""
            aria-hidden="true"
            loading="lazy"
            decoding="async"
            className="absolute top-0 lp-fall"
            style={{
              left: `${(i * 8.5 + 3) % 100}%`,
              width: `${16 + (i % 4) * 8}px`,
              animationDuration: `${11 + (i % 5) * 3}s`,
              animationDelay: `${i * 1.2}s`,
              opacity: 0.7,
              filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.45))',
            }}
          />
        ))}
      </div>

      {/* Balanças flutuando com parallax */}
      <img
        src={laurel}
        alt=""
        aria-hidden="true"
        loading="lazy"
        decoding="async"
        className="pointer-events-none absolute left-[7%] top-[26%] w-10 md:w-14 lp-float"
        style={{ transform: `translate(${parallax.x * 44}px, ${parallax.y * 22}px)`, opacity: 0.75 }}
      />
      <img
        src={scales}
        alt=""
        aria-hidden="true"
        loading="lazy"
        decoding="async"
        className="pointer-events-none absolute right-[9%] top-[38%] w-12 md:w-20 lp-float"
        style={{
          transform: `translate(${parallax.x * 62}px, ${parallax.y * 30}px)`,
          animationDirection: 'reverse',
          opacity: 0.7,
          filter: 'drop-shadow(0 0 18px hsl(var(--primary) / 0.35))',
        }}
      />
      <img
        src={scales}
        alt=""
        aria-hidden="true"
        loading="lazy"
        decoding="async"
        className="pointer-events-none absolute bottom-[24%] left-[18%] w-8 md:w-12 lp-float"
        style={{
          transform: `translate(${parallax.x * 30}px, ${parallax.y * 16}px)`,
          animationDelay: '2s',
          opacity: 0.5,
        }}
      />

      {/* Conteúdo */}
      <div
        className="relative z-10 flex-1 flex flex-col items-center justify-center text-center gap-3 sm:gap-4 px-5 sm:px-8 pb-10 md:pb-12 max-w-4xl mx-auto w-full"
        style={{ paddingTop: 'calc(5.5rem + var(--sai-top))' }}
      >
        <h1
          className="lp-title lp-sheen font-legal font-black leading-[1.05] tracking-tight"
          style={{
            fontSize: 'clamp(2rem, 4.8vw, 3.8rem)',
            transform: `translate(${parallax.x * 7}px, ${parallax.y * 4}px)`,
            transition: 'transform 0.35s ease-out',
            color: 'hsl(40 30% 98%)',
            textShadow: '0 3px 18px rgba(0,0,0,0.85), 0 1px 2px rgba(0,0,0,0.9)',
            ['--lp-sheen-delay' as string]: '0.9s',
          }}
        >

          Tudo para você{' '}
          <span
            className="inline-block"
            style={{ color: 'hsl(352 62% 50%)', textShadow: '0 3px 18px rgba(0,0,0,0.85), 0 1px 2px rgba(0,0,0,0.9)' }}
          >
            estudar Direito
          </span>{' '}
          em um{' '}
          <span
            className="inline-block"
            style={{ color: 'hsl(352 62% 50%)', textShadow: '0 3px 18px rgba(0,0,0,0.85), 0 1px 2px rgba(0,0,0,0.9)' }}
          >
            só lugar
          </span>

        </h1>

        <p
          className="lp-pop max-w-2xl text-[15px] sm:text-base md:text-lg font-medium leading-relaxed"
          style={{
            animationDelay: '0.8s',
            color: 'hsl(40 20% 96%)',
            textShadow: '0 2px 12px rgba(0,0,0,0.9)',
          }}
        >
          Tudo em um só app e um caminho claro até a aprovação.
          Estude menos e aprenda muito mais.
        </p>



        <div
          className="lp-pop flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 pt-1"
          style={{ animationDelay: '1.1s' }}
        >
          <button
            onClick={onAcessar}
            className="group lp-sheen lp-sheen-loop relative overflow-hidden rounded-full h-14 w-[15rem] text-base sm:text-lg font-bold transition-transform hover:scale-105 active:scale-95"
            style={{
              background: 'linear-gradient(135deg, hsl(352 58% 44%), hsl(345 55% 30%))',
              color: 'hsl(40 30% 98%)',
              boxShadow: '0 5px 0 hsl(0 0% 6%), 0 14px 30px hsl(0 0% 0% / 0.65)',
              ['--lp-sheen-delay' as string]: '2.5s',
            }}

          >
            <span className="relative z-10 flex items-center justify-center gap-2 whitespace-nowrap">
              Acessar agora
              <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
            </span>
          </button>

        </div>

        <p className="text-xs font-medium tracking-wide" style={{ color: 'hsl(40 15% 92%)' }}>
          ⭐ +100.000 alunos já estudam com a gente
        </p>

        {/* Funções em cards de carrossel */}
        <FuncoesCarousel />



      </div>


      {/* Pilha de louros no rodapé — reage ao ponteiro */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 sm:h-28 z-[6]">
        <div className="absolute inset-x-0 bottom-0 h-full bg-gradient-to-t from-background via-background/60 to-transparent" />
        {pile.map((i) => {
          const pos = (i + 0.5) / pile.length;
          const dist = pointerX - pos;
          const push = Math.max(0, 1 - Math.abs(dist) * 6);
          return (
            <img
              key={i}
              src={laurel}
              alt=""
              aria-hidden="true"
              className="absolute bottom-0"
              style={{
                left: `${pos * 100}%`,
                width: `${20 + (i % 3) * 9}px`,
                transform: `translateX(-50%) translate(${dist * -70 * push}px, ${
                  push * -22
                }px) rotate(${(i % 2 ? 1 : -1) * (12 + push * 45)}deg)`,
                transition: 'transform 0.45s cubic-bezier(0.22, 1, 0.36, 1)',
                opacity: 0.55 + push * 0.4,
                filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.5))',
              }}
            />
          );
        })}
      </div>
    </section>
  );
};

export default HeroTribunal;
