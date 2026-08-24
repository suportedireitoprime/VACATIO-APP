import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, Sparkles, Bot, MessageSquare, Mic, ShieldCheck, Phone, CheckCircle2 } from 'lucide-react';
import { haptic } from '@/lib/nativeHaptics';
import { toast } from 'sonner';
import feat1 from '@/assets/assistente-feature-1.jpg';
import feat2 from '@/assets/assistente-feature-2.jpg';
import feat3 from '@/assets/assistente-feature-3.jpg';
import AssistenteOverlay from '@/components/vademecum/AssistenteOverlay';
import { PageHeader } from '@/components/vademecum/PageHeader';
import { track } from '@/lib/analyticsEvents';


const STORAGE_KEY = 'assistente_phone_confirmado_v1';

const SLIDES = [
  {
    img: feat1,
    icon: MessageSquare,
    title: 'Converse com a IA',
    desc: 'Tire dúvidas jurídicas em linguagem natural, com respostas fundamentadas em lei.',
  },
  {
    img: feat2,
    icon: Sparkles,
    title: 'Resumos instantâneos',
    desc: 'Peça explicações e resumos de artigos, jurisprudência e conceitos em segundos.',
  },
  {
    img: feat3,
    icon: Mic,
    title: 'Fale por voz',
    desc: 'Ative o microfone e converse por voz. A IA também pode responder falando.',
  },
];

function formatPhone(v: string) {
  const digits = v.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

const AssistenteApp = () => {
  const navigate = useNavigate();
  const [slide, setSlide] = useState(0);
  const [phone, setPhone] = useState('');
  const [confirmed, setConfirmed] = useState<boolean>(() => !!localStorage.getItem(STORAGE_KEY));
  const [chatOpen, setChatOpen] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);

  // Auto-avança slides
  useEffect(() => {
    if (chatOpen) return;
    const t = setInterval(() => setSlide((s) => (s + 1) % SLIDES.length), 4500);
    return () => clearInterval(t);
  }, [chatOpen]);

  const digits = phone.replace(/\D/g, '');
  const phoneValid = digits.length === 10 || digits.length === 11;

  const handleConfirmar = () => {
    if (!phoneValid) {
      toast.error('Informe um número de WhatsApp válido com DDD.');
      return;
    }
    track('assistente_phone_confirmed', { phone_digits: digits.length });
    haptic.success();
    localStorage.setItem(STORAGE_KEY, digits);
    setConfirmed(true);
    setChatOpen(true);
  };

  const handleFalar = () => {
    track('assistente_chat_opened', { source: 'landing_card' });
    haptic.selection();
    setChatOpen(true);
  };

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col">
      {/* Header */}
      <PageHeader
        title="Assistente IA"
        subtitle="Sua parceira jurídica no app"
        onBack={() => navigate(-1)}
        rightAction={
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
            <Bot className="w-5 h-5 text-white" />
          </div>
        }
      />


      <main className="flex-1 max-w-3xl w-full mx-auto px-4 pb-10 pt-4 flex flex-col gap-6">
        {/* Carrossel */}
        <section aria-label="Funcionalidades da IA">
          <div className="relative rounded-3xl overflow-hidden border border-border/60 shadow-xl shadow-black/20 bg-secondary/40">
            <div
              ref={trackRef}
              className="flex transition-transform duration-500 ease-out"
              style={{ transform: `translateX(-${slide * 100}%)` }}
            >
              {SLIDES.map((s, i) => {
                const Icon = s.icon;
                return (
                  <div key={i} className="min-w-full shrink-0 relative">
                    <div className="relative aspect-[4/3] overflow-hidden">
                      <img
                        src={s.img}
                        alt={s.title}
                        loading={i === 0 ? 'eager' : 'lazy'}
                        width={1024}
                        height={768}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
                    </div>
                    <div className="p-5 -mt-16 relative">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/30 mb-3">
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      <h2 className="font-display text-2xl font-bold text-foreground leading-tight">{s.title}</h2>
                      <p className="font-body text-sm text-muted-foreground mt-1.5 leading-snug">{s.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Dots */}
          <div className="flex items-center justify-center gap-2 mt-4">
            {SLIDES.map((_, i) => (
              <button
                key={i}
                onClick={() => setSlide(i)}
                aria-label={`Slide ${i + 1}`}
                className={`h-1.5 rounded-full transition-all ${
                  i === slide ? 'w-8 bg-primary' : 'w-2 bg-muted-foreground/30'
                }`}
              />
            ))}
          </div>
        </section>

        {/* Card confirmação / falar */}
        <section className="relative rounded-3xl border border-border/70 bg-card/60 backdrop-blur p-5 shadow-lg shadow-black/10">
          {confirmed ? (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-display text-lg font-bold text-foreground leading-tight">Tudo pronto!</p>
                  <p className="font-body text-xs text-muted-foreground">Número confirmado. É só começar a conversa.</p>
                </div>
              </div>
              <button
                onClick={handleFalar}
                data-track="assistente_chat_opened"
                data-source="landing_card"
                className="w-full h-14 rounded-2xl bg-gradient-to-r from-violet-500 to-purple-600 text-white font-body font-bold text-base flex items-center justify-center gap-2 shadow-lg shadow-violet-500/30 active:scale-[0.98] transition-transform"
              >
                <Sparkles className="w-5 h-5" /> Falar com a IA
              </button>
              <button
                onClick={() => {
                  localStorage.removeItem(STORAGE_KEY);
                  setConfirmed(false);
                  setPhone('');
                }}
                className="text-xs text-muted-foreground font-body underline text-center"
              >
                Alterar número
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-primary/15 flex items-center justify-center">
                  <ShieldCheck className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-display text-lg font-bold text-foreground leading-tight">Confirme seu WhatsApp</p>
                  <p className="font-body text-xs text-muted-foreground leading-snug">
                    Usado apenas para segurança e continuidade da conversa. Não enviamos spam.
                  </p>
                </div>
              </div>
              <label className="relative block">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                  <Phone className="w-5 h-5" />
                </span>
                <input
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="(11) 99999-9999"
                  value={phone}
                  onChange={(e) => setPhone(formatPhone(e.target.value))}
                  className="w-full h-14 pl-12 pr-4 rounded-2xl bg-secondary/60 border border-border focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 font-body text-base text-foreground placeholder:text-muted-foreground/60"
                />
              </label>
              <button
                onClick={handleConfirmar}
                disabled={!phoneValid}
                className="w-full h-14 rounded-2xl bg-primary text-primary-foreground font-body font-bold text-base flex items-center justify-center gap-2 shadow-lg shadow-primary/30 active:scale-[0.98] transition-all disabled:opacity-50 disabled:shadow-none"
              >
                Confirmar e conversar <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}
        </section>

        {/* Bullets pequenos */}
        <ul className="grid grid-cols-1 gap-2">
          {[
            'Respostas fundamentadas em lei',
            'Histórico privado da sua conversa',
            'Fale por voz ou digite',
          ].map((t) => (
            <li key={t} className="flex items-center gap-2 text-sm font-body text-muted-foreground">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              {t}
            </li>
          ))}
        </ul>
      </main>

      <AssistenteOverlay open={chatOpen} onClose={() => setChatOpen(false)} />
    </div>
  );
};

export default AssistenteApp;
