import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, ShieldCheck, MessageCircle, PartyPopper } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { haptic } from '@/lib/nativeHaptics';

type Props = {
  open: boolean;
  onClose: () => void;
  onVerified: (info?: { transferred?: boolean }) => void;
  initialPhone?: string;
};

function maskBR(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

async function suggestName(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return '';
  const meta = user.user_metadata || {};
  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('id', user.id)
    .maybeSingle();
  const raw =
    profile?.display_name ||
    (meta as any).display_name ||
    (meta as any).full_name ||
    (meta as any).name ||
    (user.email ? user.email.split('@')[0] : '');
  return String(raw || '').trim();
}

export default function HorusVerifyPhoneSheet({ open, onClose, onVerified, initialPhone }: Props) {
  const [step, setStep] = useState<'phone' | 'code' | 'success'>('phone');
  const [phone, setPhone] = useState(initialPhone || '');
  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [sending, setSending] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const [nome, setNome] = useState('');
  const [transferred, setTransferred] = useState(false);
  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    if (!open) {
      setStep('phone');
      setDigits(['', '', '', '', '', '']);
      setResendIn(0);
      setNome('');
      setTransferred(false);
    }
  }, [open]);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((n) => n - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  async function sendCode() {
    const raw = phone.replace(/\D/g, '');
    if (raw.length < 10) return toast.error('Número inválido');
    setSending(true);
    haptic.light();
    const { data, error } = await supabase.functions.invoke('horus-verify', {
      body: { action: 'start', phone: raw },
    });
    setSending(false);
    if (error || data?.error) return toast.error(data?.error || 'Não foi possível enviar o código');
    toast.success('Código enviado no WhatsApp');
    setStep('code');
    setResendIn(60);
    setTimeout(() => inputsRef.current[0]?.focus(), 100);
  }

  function setDigit(i: number, val: string) {
    const d = val.replace(/\D/g, '').slice(0, 1);
    setDigits((arr) => {
      const next = [...arr];
      next[i] = d;
      return next;
    });
    if (d && i < 5) inputsRef.current[i + 1]?.focus();
  }

  function onPaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const t = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!t) return;
    e.preventDefault();
    const arr = t.split('').concat(Array(6).fill('')).slice(0, 6);
    setDigits(arr);
    inputsRef.current[Math.min(t.length, 5)]?.focus();
  }

  function onKeyDown(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !digits[i] && i > 0) inputsRef.current[i - 1]?.focus();
  }

  async function confirmCode() {
    const code = digits.join('');
    if (code.length !== 6) return toast.error('Digite os 6 dígitos');
    setSending(true);
    haptic.light();
    const raw = phone.replace(/\D/g, '');
    const { data, error } = await supabase.functions.invoke('horus-verify', {
      body: { action: 'confirm', phone: raw, code },
    });
    setSending(false);
    if (error || data?.error) return toast.error(data?.error || 'Código incorreto');
    haptic.medium();
    const wasTransferred = Boolean((data as any)?.transferred);
    setTransferred(wasTransferred);
    const suggested = await suggestName();
    setNome(suggested);
    setStep('success');
    onVerified({ transferred: wasTransferred });
  }

  async function saveNameAndFinish() {
    const finalName = nome.trim();
    if (!finalName) return toast.error('Diga como o Horus deve te chamar');
    setSending(true);
    const { data: { user } } = await supabase.auth.getUser();
    const raw = phone.replace(/\D/g, '');
    if (user) {
      await supabase
        .from('horus_whatsapp_users')
        .update({ nome_preferido: finalName })
        .eq('user_id', user.id);
      await supabase
        .from('horus_user_stats')
        .update({ nome_preferido: finalName })
        .eq('telefone', raw);
    }
    setSending(false);
    haptic.medium();
    toast.success(`Prazer, ${finalName.split(' ')[0]}! 👋`);
    onVerified({ transferred });
    onClose();
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="ov"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm"
          />
          <motion.div
            key="sh"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed left-0 right-0 bottom-0 z-[101] bg-background rounded-t-3xl border-t border-border px-6 pt-6 pb-10 max-w-lg mx-auto max-h-[92vh] overflow-y-auto"
          >
            <div className="mx-auto w-12 h-1.5 rounded-full bg-border mb-5" />
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2.5">
                {step === 'success' ? (
                  <PartyPopper className="w-6 h-6 text-emerald-400" />
                ) : (
                  <ShieldCheck className="w-6 h-6 text-emerald-400" />
                )}
                <h2 className="font-display text-lg sm:text-xl font-bold">
                  {step === 'phone'
                    ? 'Verificar seu WhatsApp'
                    : step === 'code'
                    ? 'Confirmar código'
                    : 'Número verificado!'}
                </h2>
              </div>
              <button onClick={onClose} className="p-2 -mr-2 rounded-full hover:bg-secondary">
                <X className="w-6 h-6" />
              </button>
            </div>

            {step === 'phone' && (
              <div className="space-y-5">
                <p className="font-body text-base text-muted-foreground leading-relaxed">
                  Vamos mandar um código de 6 dígitos no seu WhatsApp. Você cola aqui pra provar que o número é seu.
                </p>
                <label className="block">
                  <span className="font-body text-sm text-muted-foreground">Seu número (com DDD)</span>
                  <input
                    type="tel"
                    inputMode="tel"
                    placeholder="(11) 99999-9999"
                    value={phone}
                    onChange={(e) => setPhone(maskBR(e.target.value))}
                    className="mt-2 w-full h-14 px-4 rounded-2xl bg-secondary/60 border border-border focus:border-emerald-500 outline-none font-body text-lg"
                  />
                </label>
                <button
                  onClick={sendCode}
                  disabled={sending || phone.replace(/\D/g, '').length < 10}
                  className="w-full h-14 rounded-2xl font-display font-bold text-base flex items-center justify-center gap-2.5 disabled:opacity-50 text-white shadow-lg active:scale-[0.98] transition-transform"
                  style={{
                    background: 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)',
                    boxShadow: '0 8px 24px -6px rgba(37, 211, 102, 0.55)',
                  }}
                >
                  {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <MessageCircle className="w-5 h-5" />}
                  Enviar código no WhatsApp
                </button>
              </div>
            )}

            {step === 'code' && (
              <div className="space-y-5">
                <p className="font-body text-base text-muted-foreground leading-relaxed">
                  Enviei um código pra <b className="text-foreground">{phone}</b>. Toque em <b>Copiar código</b> na mensagem do WhatsApp e cole aqui — ou digite manualmente.
                </p>
                <div className="flex gap-1.5 sm:gap-2 justify-between" onPaste={onPaste}>
                  {digits.map((d, i) => (
                    <input
                      key={i}
                      ref={(el) => (inputsRef.current[i] = el)}
                      value={d}
                      onChange={(e) => setDigit(i, e.target.value)}
                      onKeyDown={(e) => onKeyDown(i, e)}
                      inputMode="numeric"
                      maxLength={1}
                      className="flex-1 min-w-0 aspect-[3/4] max-h-16 text-center rounded-xl bg-secondary/60 border-2 border-border focus:border-emerald-500 outline-none font-display text-2xl sm:text-3xl font-bold"
                    />
                  ))}
                </div>
                <button
                  onClick={confirmCode}
                  disabled={sending || digits.join('').length !== 6}
                  className="w-full h-14 rounded-2xl font-display font-bold text-base flex items-center justify-center gap-2.5 disabled:opacity-50 text-white shadow-lg active:scale-[0.98] transition-transform"
                  style={{
                    background: 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)',
                    boxShadow: '0 8px 24px -6px rgba(37, 211, 102, 0.55)',
                  }}
                >
                  {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <ShieldCheck className="w-5 h-5" />}
                  Confirmar código
                </button>
                <div className="flex items-center justify-between text-sm pt-1">
                  <button
                    onClick={() => setStep('phone')}
                    className="text-muted-foreground underline underline-offset-2 py-1"
                  >
                    Trocar número
                  </button>
                  <button
                    onClick={sendCode}
                    disabled={resendIn > 0 || sending}
                    className="text-emerald-400 disabled:text-muted-foreground font-semibold py-1"
                  >
                    {resendIn > 0 ? `Reenviar em ${resendIn}s` : 'Reenviar código'}
                  </button>
                </div>
              </div>
            )}

            {step === 'success' && (
              <div className="space-y-5">
                <div className="flex flex-col items-center text-center gap-3 py-2">
                  <div className="w-20 h-20 rounded-full bg-emerald-500/15 ring-4 ring-emerald-500/25 flex items-center justify-center">
                    <PartyPopper className="w-10 h-10 text-emerald-400" />
                  </div>
                  <div>
                    <p className="font-display text-xl font-bold">🎉 Parabéns!</p>
                    <p className="font-body text-sm text-muted-foreground mt-1">
                      Você acabou de verificar seu número <b className="text-foreground">{phone}</b>.
                    </p>
                    {transferred && (
                      <p className="font-body text-xs text-amber-400 mt-2">
                        O vínculo com a conta anterior foi encerrado automaticamente.
                      </p>
                    )}
                  </div>
                </div>
                <label className="block">
                  <span className="font-body text-sm text-muted-foreground">
                    Como o Horus deve te chamar?
                  </span>
                  <input
                    type="text"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    placeholder="Seu nome"
                    maxLength={60}
                    className="mt-2 w-full h-14 px-4 rounded-2xl bg-secondary/60 border border-border focus:border-emerald-500 outline-none font-body text-lg"
                  />
                  <span className="mt-2 block font-body text-xs text-muted-foreground">
                    Pode editar depois em Ajustes.
                  </span>
                </label>
                <button
                  onClick={saveNameAndFinish}
                  disabled={sending || !nome.trim()}
                  className="w-full h-14 rounded-2xl font-display font-bold text-base flex items-center justify-center gap-2.5 disabled:opacity-50 text-white shadow-lg active:scale-[0.98] transition-transform"
                  style={{
                    background: 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)',
                    boxShadow: '0 8px 24px -6px rgba(37, 211, 102, 0.55)',
                  }}
                >
                  {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <PartyPopper className="w-5 h-5" />}
                  Salvar e começar
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
