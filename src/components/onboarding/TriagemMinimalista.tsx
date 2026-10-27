import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import imgOrigem from '@/assets/onboarding/triagem-origem.webp';
import imgMudanca from '@/assets/onboarding/triagem-mudanca.webp';
import imgRisco from '@/assets/onboarding/triagem-risco.webp';
import imgSolucao from '@/assets/onboarding/triagem-solucao.webp';

export type TriagemMinimalistaResult = {
  persona: 'faculdade' | 'faculdade-oab' | 'concurso' | 'advogado' | null;
  personaLabel: string | null;
  faixa: string | null;
  nome: string;
  dorId: string | null;
  dorLabel: string | null;
  dorSolucao: string | null;
  areas?: string[];
  interesses?: string[];
};

type Props = {
  open?: boolean;
  onFinished: (result: TriagemMinimalistaResult) => void;
  previewMode?: boolean;
  initialName?: string;
};

const DORES = [
  {
    id: 'desatualizada',
    label: 'Leis desatualizadas',
    desc: 'Nunca sei se estou lendo a versão vigente',
    sol: 'Suas leis ficam sempre na versão vigente, e o Radar avisa a cada mudança.',
  },
  {
    id: 'dificil',
    label: 'Lei difícil de entender',
    desc: 'O texto é seco e cheio de juridiquês',
    sol: 'Cada artigo vem explicado em linguagem simples, com exemplo prático.',
  },
  {
    id: 'jurisprudencia',
    label: 'Achar jurisprudência demora',
    desc: 'Perco tempo caçando decisão e súmula',
    sol: 'Súmulas e decisões aparecem ligadas ao artigo, sem caçar em mil sites.',
  },
  {
    id: 'espalhado',
    label: 'Material espalhado',
    desc: 'Lei, livro e resumo cada um num lugar',
    sol: 'Lei, explicação, áudio, livros e questões, tudo num só lugar.',
  },
  {
    id: 'comecar',
    label: 'Não sei por onde começar',
    desc: 'Muita legislação e pouca direção',
    sol: 'Você recebe trilhas por área, na ordem certa para estudar.',
  },
] as const;

const MOMENTOS = [
  { id: 'faculdade', label: 'Faculdade', desc: 'Do 1º ao 6º semestre' },
  { id: 'faculdade-oab', label: 'Faculdade e OAB', desc: 'Do 7º semestre até o exame' },
  { id: 'concurso', label: 'Concurso', desc: 'Magistratura, MP, Delegado e carreiras' },
  { id: 'advogado', label: 'Advogado(a)', desc: 'Já atuo na prática' },
] as const;

const SOL_PADRAO = 'Toda a legislação atualizada, com narração, explicação e jurisprudência no mesmo lugar.';
const TOTAL_STEPS = 10;

export default function TriagemMinimalista({ onFinished, initialName, previewMode }: Props) {
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [dor, setDor] = useState<string | null>(null);
  const [momento, setMomento] = useState<'faculdade' | 'faculdade-oab' | 'concurso' | 'advogado' | null>(null);
  const [nome, setNome] = useState(() => {
    if (initialName) return initialName;
    const metaName = user?.user_metadata?.full_name || user?.user_metadata?.name || '';
    return metaName ? metaName.split(' ')[0] : '';
  });
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2400);
  };

  const restart = () => {
    setStep(0);
    setDor(null);
    setMomento(null);
    showToast('Recomeçando do início');
  };

  const go = (n: number) => {
    setStep(n);
    if (bodyRef.current) {
      bodyRef.current.scrollTop = 0;
    }
  };

  // Scroll to top on step change
  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.scrollTop = 0;
    }
  }, [step]);

  const concluir = () => {
    const dorObj = DORES.find((d) => d.id === dor);
    const momentoObj = MOMENTOS.find((m) => m.id === momento);

    onFinished({
      persona: momento || 'faculdade',
      personaLabel: momentoObj?.label || 'Faculdade',
      faixa: null,
      nome: (nome || '').trim(),
      dorId: dor,
      dorLabel: dorObj?.label || null,
      dorSolucao: dorObj?.sol || SOL_PADRAO,
      interesses: dor ? [dor] : [],
    });
  };

  const progressPercent = Math.round((step / (TOTAL_STEPS - 1)) * 100);

  return (
    <div className="triagem-root min-h-dvh w-full flex items-center justify-center bg-[#08080B] text-[#EFECE4] select-none p-0 sm:p-4">
      <style>{`
        .triagem-root {
          --ink: #EFECE4;
          --mut: #9C968A;
          --line: #2B2B31;
          --gold: #D9A82E;
          --paper: #101014;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
        }
        .triagem-phone {
          width: min(410px, 100%);
          height: 100dvh;
          min-height: 580px;
          background: var(--paper);
          position: relative;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        @media (min-width: 640px) {
          .triagem-phone {
            height: min(820px, calc(100dvh - 32px));
            border-radius: 36px;
            border: 2px solid #2E2E35;
            box-shadow: 0 24px 60px rgba(0, 0, 0, 0.7);
          }
        }
        .triagem-font-serif {
          font-family: Georgia, "Times New Roman", Garamond, serif;
        }
        .triagem-pic {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-top: 18px;
        }
        .triagem-pic::before {
          content: "";
          position: absolute;
          inset: 8% 12%;
          background: radial-gradient(ellipse at center, rgba(217,168,46,0.32), transparent 65%);
          filter: blur(24px);
          opacity: 0;
          animation: triagemGlowIn 1.1s ease 0.25s forwards;
          z-index: 0;
          pointer-events: none;
        }
        @keyframes triagemGlowIn {
          to { opacity: 1; }
        }
        .triagem-pic img {
          position: relative;
          z-index: 1;
          max-width: 100%;
          max-height: 310px;
          width: auto;
          height: auto;
          display: inline-block;
          opacity: 0;
          animation: triagemImgIn 0.85s cubic-bezier(.22,1.25,.36,1) 0.18s forwards, triagemFloaty 5.5s ease-in-out 1.2s infinite alternate;
        }
        @keyframes triagemImgIn {
          0% {
            opacity: 0;
            transform: scale(0.85) translateY(28px);
            filter: blur(8px);
          }
          55% {
            opacity: 1;
            filter: blur(0);
          }
          72% {
            transform: scale(1.03) translateY(-4px);
          }
          100% {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
        @keyframes triagemFloaty {
          from { transform: translateY(0); }
          to { transform: translateY(-8px); }
        }
        .triagem-dot {
          width: 22px;
          height: 22px;
          border-radius: 50%;
          border: 1.8px solid #4A4A52;
          position: relative;
          transition: border-color 0.15s ease;
          flex-shrink: 0;
        }
        .triagem-row-sel .triagem-dot {
          border-color: var(--gold);
        }
        .triagem-row-sel .triagem-dot::after {
          content: "";
          position: absolute;
          inset: 4px;
          border-radius: 50%;
          background: var(--gold);
        }
      `}</style>

      <div className="triagem-phone">
        {/* Topbar */}
        <header className="flex items-center gap-3 px-5 pt-4 pb-2 shrink-0 border-b border-white/[0.04]">
          {step > 0 ? (
            <button
              type="button"
              onClick={() => go(step - 1)}
              aria-label="Voltar"
              className="text-xl text-[#EFECE4] hover:text-white transition w-7 text-left leading-none cursor-pointer"
            >
              ‹
            </button>
          ) : (
            <span className="w-7" />
          )}

          <span className="text-[11.5px] text-[#9C968A] font-bold tracking-wider whitespace-nowrap">
            {step + 1} de {TOTAL_STEPS}
          </span>

          <div className="flex-1 h-[2.5px] bg-[#2B2B31] rounded-full overflow-hidden mx-1">
            <div
              className="h-full bg-[#D9A82E] transition-all duration-300 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <button
            type="button"
            onClick={restart}
            className="text-[12px] text-[#EFECE4] hover:text-[#D9A82E] font-bold cursor-pointer whitespace-nowrap transition-colors"
          >
            ↺ <span className="underline underline-offset-4">Recomeçar</span>
          </button>

          {previewMode && (
            <button
              type="button"
              onClick={() =>
                onFinished({
                  persona: momento || 'faculdade',
                  personaLabel: 'Preview',
                  faixa: null,
                  nome: nome || 'Preview',
                  dorId: dor,
                  dorLabel: null,
                  dorSolucao: null,
                })
              }
              className="text-[11px] text-white/70 hover:text-white px-2 py-1 rounded bg-white/10 ml-1 cursor-pointer font-bold"
            >
              ✕ Fechar
            </button>
          )}
        </header>

        {/* Body content with smooth slide & fade */}
        <div
          ref={bodyRef}
          className="flex-1 overflow-y-auto px-7 py-5 scrollbar-none"
        >
          <AnimatePresence mode="wait">
            {step === 0 && (
              <motion.div
                key="step-0"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -14 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                className="flex flex-col items-center text-center pt-8"
              >
                <div className="flex flex-col items-center">
                  <svg
                    viewBox="0 0 150 150"
                    fill="none"
                    stroke="#EFECE4"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="w-20 h-20 drop-shadow-[0_4px_16px_rgba(217,168,46,0.35)]"
                  >
                    <circle cx="75" cy="75" r="66" stroke="#D9A82E" strokeWidth="2.5" />
                    <path d="M75 38 L106 56 H44 Z" />
                    <line x1="53" y1="66" x2="53" y2="96" />
                    <line x1="75" y1="66" x2="75" y2="96" />
                    <line x1="97" y1="66" x2="97" y2="96" />
                    <line x1="46" y1="106" x2="104" y2="106" />
                  </svg>
                  <div className="text-[13px] font-black tracking-[0.5em] text-[#EFECE4] mt-4 pl-[0.5em]">
                    VACATIO
                  </div>
                </div>

                <h1 className="triagem-font-serif text-[32px] sm:text-[34px] font-bold leading-[1.18] text-[#EFECE4] mt-8 px-2">
                  A lei, <em className="italic text-[#D9A82E]">sempre</em> ao seu lado.
                </h1>

                <p className="text-[14px] text-[#9C968A] leading-[1.65] mt-4 max-w-[285px]">
                  O vade mecum completo do Brasil, atualizado, narrado e explicado. Antes de entrar, uma história rápida.
                </p>
              </motion.div>
            )}

            {step === 1 && (
              <motion.div
                key="step-1"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -14 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                className="flex flex-col"
              >
                <div className="text-[11px] font-bold tracking-[0.35em] text-[#D9A82E] mb-3 uppercase">
                  A ORIGEM
                </div>
                <h2 className="triagem-font-serif text-[32px] sm:text-[35px] font-bold leading-[1.15] text-[#EFECE4]">
                  As leis nasceram há <em className="italic text-[#D9A82E]">milhares de anos</em>.
                </h2>
                <p className="text-[14.5px] text-[#9C968A] leading-[1.6] mt-3.5 max-w-[310px]">
                  Escritas na pedra, elas organizaram as primeiras cidades, protegeram pessoas e atravessaram os séculos até chegar a você.
                </p>

                <figure className="triagem-pic">
                  <img src={imgOrigem} alt="Pedra antiga com as primeiras leis gravadas" />
                </figure>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step-2"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -14 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                className="flex flex-col"
              >
                <div className="text-[11px] font-bold tracking-[0.35em] text-[#D9A82E] mb-3 uppercase">
                  A MUDANÇA
                </div>
                <h2 className="triagem-font-serif text-[32px] sm:text-[35px] font-bold leading-[1.15] text-[#EFECE4]">
                  E elas <em className="italic text-[#D9A82E]">nunca</em> pararam de mudar.
                </h2>
                <p className="text-[14.5px] text-[#9C968A] leading-[1.6] mt-3.5 max-w-[310px]">
                  Constituições, códigos e estatutos são escritos e reescritos o tempo todo. A lei de ontem já pode não ser a lei de hoje.
                </p>

                <figure className="triagem-pic">
                  <img src={imgMudanca} alt="Pergaminho, livro antigo, livro moderno e tablet" />
                </figure>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="step-3"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -14 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                className="flex flex-col"
              >
                <div className="text-[11px] font-bold tracking-[0.35em] text-[#D9A82E] mb-3 uppercase">
                  O RISCO
                </div>
                <h2 className="triagem-font-serif text-[32px] sm:text-[35px] font-bold leading-[1.15] text-[#EFECE4]">
                  Quem não se atualiza, <em className="italic text-[#D9A82E]">fica para trás</em>.
                </h2>
                <p className="text-[14.5px] text-[#9C968A] leading-[1.6] mt-3.5 max-w-[310px]">
                  Material parado no tempo vira risco de verdade: na prova, no concurso, na audiência e no parecer.
                </p>

                <figure className="triagem-pic">
                  <img src={imgRisco} alt="Livro velho e empoeirado esquecido numa prateleira" />
                </figure>
              </motion.div>
            )}

            {step === 4 && (
              <motion.div
                key="step-4"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -14 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                className="flex flex-col"
              >
                <div className="text-[11px] font-bold tracking-[0.35em] text-[#D9A82E] mb-3 uppercase">
                  A SOLUÇÃO
                </div>
                <h2 className="triagem-font-serif text-[32px] sm:text-[35px] font-bold leading-[1.15] text-[#EFECE4]">
                  Por isso, o Vacatio se atualiza <em className="italic text-[#D9A82E]">por você</em>.
                </h2>
                <p className="text-[14.5px] text-[#9C968A] leading-[1.6] mt-3.5 max-w-[310px]">
                  Toda a legislação brasileira, revisada, organizada e pronta para ler ou ouvir, num só lugar.
                </p>

                <figure className="triagem-pic">
                  <img src={imgSolucao} alt="Livro novo e celular sobre a mesa na luz da manhã" />
                </figure>
              </motion.div>
            )}

            {step === 5 && (
              <motion.div
                key="step-5"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -14 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                className="flex flex-col"
              >
                <div className="text-[11px] font-bold tracking-[0.35em] text-[#D9A82E] mb-1.5 uppercase">
                  O APLICATIVO
                </div>
                <h2 className="text-[25px] font-extrabold tracking-tight text-[#EFECE4]">
                  O que tem dentro
                </h2>
                <p className="text-[13.5px] text-[#9C968A] leading-relaxed mt-1">
                  As funções que vão trabalhar por você, todos os dias.
                </p>

                <div className="mt-4 border-t border-[#2B2B31] divide-y divide-[#2B2B31]">
                  {[
                    {
                      title: 'Ouvir a lei',
                      desc: 'Narração de cada artigo, para estudar em qualquer lugar',
                      icon: (
                        <svg viewBox="0 0 27 27" fill="none" stroke="#EFECE4" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="w-[26px] h-[26px] shrink-0 mt-0.5">
                          <circle cx="13.5" cy="13.5" r="10" />
                          <path d="M11 9.5 L18 13.5 L11 17.5 Z" fill="#EFECE4" stroke="none" />
                        </svg>
                      ),
                    },
                    {
                      title: 'Leis explicadas',
                      desc: 'Artigo por artigo, em linguagem simples e com exemplo',
                      icon: (
                        <svg viewBox="0 0 27 27" fill="none" stroke="#EFECE4" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="w-[26px] h-[26px] shrink-0 mt-0.5">
                          <path d="M13.5 6.5 C11 4.3 6.8 4 4 5.5 V21 C6.8 19.7 11 20 13.5 22.3 C16 20 20.2 19.7 23 21 V5.5 C20.2 4 16 4.3 13.5 6.5 Z" />
                          <line x1="13.5" y1="6.5" x2="13.5" y2="22.3" />
                        </svg>
                      ),
                    },
                    {
                      title: 'Jurisprudência e súmulas',
                      desc: 'STF, STJ e TST ligados ao artigo que você está lendo',
                      icon: (
                        <svg viewBox="0 0 27 27" fill="none" stroke="#EFECE4" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="w-[26px] h-[26px] shrink-0 mt-0.5">
                          <line x1="13.5" y1="4" x2="13.5" y2="20" />
                          <line x1="5" y1="7" x2="22" y2="7" />
                          <path d="M5 7 L2.5 13 a2.8 2.8 0 0 0 5 0 Z" />
                          <path d="M22 7 L19.5 13 a2.8 2.8 0 0 0 5 0 Z" />
                          <line x1="8" y1="23" x2="19" y2="23" />
                        </svg>
                      ),
                    },
                    {
                      title: 'Questões e simulados',
                      desc: 'Prática de OAB e de concursos, com correção na hora',
                      icon: (
                        <svg viewBox="0 0 27 27" fill="none" stroke="#EFECE4" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="w-[26px] h-[26px] shrink-0 mt-0.5">
                          <rect x="4" y="4" width="19" height="19" rx="4" />
                          <path d="M8.5 13.8 L12 17.2 L18.5 10" />
                        </svg>
                      ),
                    },
                    {
                      title: 'Radar de leis novas',
                      desc: 'Lei nova e súmula nova chegam com resumo pronto',
                      icon: (
                        <svg viewBox="0 0 27 27" fill="none" stroke="#EFECE4" strokeWidth="1.7" strokeLinecap="round" className="w-[26px] h-[26px] shrink-0 mt-0.5">
                          <circle cx="10" cy="17" r="1.6" fill="#EFECE4" stroke="none" />
                          <path d="M10 10.5 a6.5 6.5 0 0 1 6.5 6.5" />
                          <path d="M10 5.5 a11.5 11.5 0 0 1 11.5 11.5" />
                        </svg>
                      ),
                    },
                    {
                      title: 'Biblioteca completa',
                      desc: 'Códigos, estatutos, livros e doutrina sempre à mão',
                      icon: (
                        <svg viewBox="0 0 27 27" fill="none" stroke="#EFECE4" strokeWidth="1.7" strokeLinecap="round" className="w-[26px] h-[26px] shrink-0 mt-0.5">
                          <rect x="5" y="4" width="4.6" height="19" />
                          <rect x="11.2" y="4" width="4.6" height="19" />
                          <path d="M17.8 5.2 L21.6 4 L24 22.4 L20.2 23.6 Z" />
                        </svg>
                      ),
                    },
                    {
                      title: 'Horus no WhatsApp',
                      desc: 'Tire dúvidas por texto, foto ou áudio, a qualquer hora',
                      icon: (
                        <svg viewBox="0 0 27 27" fill="none" stroke="#EFECE4" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="w-[26px] h-[26px] shrink-0 mt-0.5">
                          <path d="M4 5.5 a2 2 0 0 1 2 -2 h15 a2 2 0 0 1 2 2 v10 a2 2 0 0 1 -2 2 H12 L6.5 22 V17.5 H6 a2 2 0 0 1 -2 -2 Z" />
                          <line x1="8.5" y1="9" x2="18.5" y2="9" />
                          <line x1="8.5" y1="12.8" x2="15" y2="12.8" />
                        </svg>
                      ),
                    },
                    {
                      title: 'Modo offline',
                      desc: 'Baixe as leis e estude sem internet',
                      icon: (
                        <svg viewBox="0 0 27 27" fill="none" stroke="#EFECE4" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="w-[26px] h-[26px] shrink-0 mt-0.5">
                          <path d="M13.5 4 V16" />
                          <path d="M8.5 11.5 L13.5 16.5 L18.5 11.5" />
                          <path d="M4.5 21.5 H22.5" />
                        </svg>
                      ),
                    },
                  ].map((feat, i) => (
                    <div
                      key={feat.title}
                      className="flex items-start gap-3.5 py-3.5 px-0.5 text-left"
                      style={{ animationDelay: `${90 + i * 50}ms` }}
                    >
                      {feat.icon}
                      <div className="flex-1 min-w-0">
                        <b className="text-[15px] font-bold text-[#EFECE4] block leading-tight">
                          {feat.title}
                        </b>
                        <span className="text-[13px] text-[#9C968A] block mt-1 leading-snug">
                          {feat.desc}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {step === 6 && (
              <motion.div
                key="step-6"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -14 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                className="flex flex-col"
              >
                <div className="text-[11px] font-bold tracking-[0.35em] text-[#D9A82E] mb-1.5 uppercase">
                  SUA VEZ
                </div>
                <h2 className="text-[24px] font-extrabold tracking-tight text-[#EFECE4]">
                  O que mais te atrapalha hoje?
                </h2>
                <p className="text-[13.5px] text-[#9C968A] leading-relaxed mt-1">
                  Escolha a sua maior dor. O app resolve ela primeiro.
                </p>

                <div className="mt-4 border-t border-[#2B2B31] divide-y divide-[#2B2B31]">
                  {DORES.map((d) => {
                    const isSel = dor === d.id;
                    return (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => setDor(d.id)}
                        className={`w-full flex items-center gap-3.5 py-4 px-1 text-left transition-colors cursor-pointer ${
                          isSel ? 'triagem-row-sel bg-white/[0.02]' : 'hover:bg-white/[0.01]'
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <b className={`text-[15.5px] block leading-tight ${isSel ? 'text-white font-extrabold' : 'text-[#EFECE4] font-bold'}`}>
                            {d.label}
                          </b>
                          <span className="text-[13px] text-[#9C968A] block mt-1 leading-snug">
                            {d.desc}
                          </span>
                        </div>
                        <span className="triagem-dot" />
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {step === 7 && (
              <motion.div
                key="step-7"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -14 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                className="flex flex-col"
              >
                <div className="text-[11px] font-bold tracking-[0.35em] text-[#D9A82E] mb-1.5 uppercase">
                  SEU MOMENTO
                </div>
                <h2 className="text-[24px] font-extrabold tracking-tight text-[#EFECE4]">
                  Onde você está agora?
                </h2>
                <p className="text-[13.5px] text-[#9C968A] leading-relaxed mt-1">
                  A sua home muda conforme o seu momento.
                </p>

                <div className="mt-4 border-t border-[#2B2B31] divide-y divide-[#2B2B31]">
                  {MOMENTOS.map((m) => {
                    const isSel = momento === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setMomento(m.id)}
                        className={`w-full flex items-center gap-3.5 py-4 px-1 text-left transition-colors cursor-pointer ${
                          isSel ? 'triagem-row-sel bg-white/[0.02]' : 'hover:bg-white/[0.01]'
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <b className={`text-[15.5px] block leading-tight ${isSel ? 'text-white font-extrabold' : 'text-[#EFECE4] font-bold'}`}>
                            {m.label}
                          </b>
                          <span className="text-[13px] text-[#9C968A] block mt-1 leading-snug">
                            {m.desc}
                          </span>
                        </div>
                        <span className="triagem-dot" />
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {step === 8 && (
              <motion.div
                key="step-8"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -14 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                className="flex flex-col"
              >
                <div className="text-[11px] font-bold tracking-[0.35em] text-[#D9A82E] mb-1.5 uppercase">
                  POR ÚLTIMO
                </div>
                <h2 className="text-[24px] font-extrabold tracking-tight text-[#EFECE4]">
                  Como posso te chamar?
                </h2>
                <p className="text-[13.5px] text-[#9C968A] leading-relaxed mt-1">
                  Só para o app falar com você pelo nome.
                </p>

                <input
                  type="text"
                  maxLength={30}
                  placeholder="Seu nome"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  autoFocus
                  className="w-full bg-transparent border-b-2 border-[#EFECE4] py-3 px-0.5 mt-8 text-[22px] triagem-font-serif text-[#EFECE4] placeholder:text-[#55534C] focus:outline-none focus:border-[#D9A82E] transition-colors"
                />
              </motion.div>
            )}

            {step === 9 && (
              <motion.div
                key="step-9"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -14 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                className="flex flex-col"
              >
                <div className="triagem-font-serif text-[38px] font-bold text-[#EFECE4] mt-2">
                  Pronto{nome ? `, ${nome.trim().split(' ')[0]}` : ''}.
                </div>
                <p className="text-[14.5px] text-[#9C968A] leading-relaxed mt-2.5 max-w-[310px]">
                  Seu Vacatio já nasce do seu jeito. Olha o que ficou definido:
                </p>

                <div className="mt-6 border-t border-[#2B2B31] divide-y divide-[#2B2B31]">
                  <div className="py-3.5 px-0.5">
                    <b className="block text-[10.5px] font-extrabold tracking-[0.22em] text-[#D9A82E] mb-1 uppercase">
                      SEU MOMENTO
                    </b>
                    <span className="text-[15px] text-[#EFECE4] leading-snug">
                      {MOMENTOS.find((m) => m.id === momento)?.label || 'Faculdade'}
                    </span>
                  </div>

                  <div className="py-3.5 px-0.5">
                    <b className="block text-[10.5px] font-extrabold tracking-[0.22em] text-[#D9A82E] mb-1 uppercase">
                      A DOR QUE VAMOS RESOLVER
                    </b>
                    <span className="text-[15px] text-[#EFECE4] leading-snug">
                      {DORES.find((d) => d.id === dor)?.label || 'Leis desatualizadas'}
                    </span>
                  </div>

                  <div className="py-3.5 px-0.5">
                    <b className="block text-[10.5px] font-extrabold tracking-[0.22em] text-[#D9A82E] mb-1 uppercase">
                      O QUE O VACATIO FAZ POR VOCÊ
                    </b>
                    <span className="text-[14.5px] text-[#9C968A] leading-relaxed block mt-0.5">
                      {DORES.find((d) => d.id === dor)?.sol || SOL_PADRAO}
                    </span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer Actions */}
        <footer className="p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shrink-0 flex flex-col items-center gap-2">
          {step === 0 && (
            <>
              <button
                type="button"
                onClick={() => go(1)}
                className="w-full bg-[#EFECE4] hover:bg-white text-[#141310] font-bold text-[16px] py-4 rounded-full active:scale-[0.98] transition cursor-pointer shadow-md"
              >
                Começar
              </button>
              <p className="text-[12px] text-[#9C968A] text-center mt-1">
                Leva menos de 1 minuto.
              </p>
            </>
          )}

          {step >= 1 && step <= 3 && (
            <button
              type="button"
              onClick={() => go(step + 1)}
              className="w-full bg-[#EFECE4] hover:bg-white text-[#141310] font-bold text-[16px] py-4 rounded-full active:scale-[0.98] transition cursor-pointer shadow-md"
            >
              Continuar
            </button>
          )}

          {step === 4 && (
            <button
              type="button"
              onClick={() => go(5)}
              className="w-full bg-[#EFECE4] hover:bg-white text-[#141310] font-bold text-[16px] py-4 rounded-full active:scale-[0.98] transition cursor-pointer shadow-md"
            >
              Ver o que tem dentro
            </button>
          )}

          {step === 5 && (
            <button
              type="button"
              onClick={() => go(6)}
              className="w-full bg-[#EFECE4] hover:bg-white text-[#141310] font-bold text-[16px] py-4 rounded-full active:scale-[0.98] transition cursor-pointer shadow-md"
            >
              Continuar
            </button>
          )}

          {step === 6 && (
            <button
              type="button"
              onClick={() => go(7)}
              disabled={!dor}
              className={`w-full font-bold text-[16px] py-4 rounded-full transition shadow-md ${
                dor
                  ? 'bg-[#EFECE4] hover:bg-white text-[#141310] active:scale-[0.98] cursor-pointer'
                  : 'bg-[#2B2B31] text-[#6E6A5E] cursor-not-allowed'
              }`}
            >
              Continuar
            </button>
          )}

          {step === 7 && (
            <button
              type="button"
              onClick={() => go(8)}
              disabled={!momento}
              className={`w-full font-bold text-[16px] py-4 rounded-full transition shadow-md ${
                momento
                  ? 'bg-[#EFECE4] hover:bg-white text-[#141310] active:scale-[0.98] cursor-pointer'
                  : 'bg-[#2B2B31] text-[#6E6A5E] cursor-not-allowed'
              }`}
            >
              Continuar
            </button>
          )}

          {step === 8 && (
            <button
              type="button"
              onClick={() => go(9)}
              className="w-full bg-[#EFECE4] hover:bg-white text-[#141310] font-bold text-[16px] py-4 rounded-full active:scale-[0.98] transition cursor-pointer shadow-md"
            >
              Concluir
            </button>
          )}

          {step === 9 && (
            <>
              <button
                type="button"
                onClick={concluir}
                className="w-full bg-[#EFECE4] hover:bg-white text-[#141310] font-bold text-[16px] py-4 rounded-full active:scale-[0.98] transition cursor-pointer shadow-md"
              >
                Entrar no Vacatio
              </button>
              <button
                type="button"
                onClick={restart}
                className="text-[13.5px] text-[#9C968A] hover:text-[#EFECE4] font-bold py-2 transition-colors cursor-pointer"
              >
                ↺ Recomeçar a triagem
              </button>
            </>
          )}
        </footer>

        {/* Floating toast */}
        <AnimatePresence>
          {toastMsg && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 16 }}
              className="absolute left-1/2 -translate-x-1/2 bottom-24 bg-[#EFECE4] text-[#141310] text-[13px] font-bold rounded-full px-4 py-2 shadow-xl whitespace-nowrap z-50 pointer-events-none"
            >
              {toastMsg}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
