import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, Send, Sparkles, MessageCircleWarning, Bug, HelpCircle, Loader2, CheckCircle2, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { toast } from 'sonner';
import { Capacitor } from '@capacitor/core';
import { PageHeader } from '@/components/vademecum/PageHeader';

const TAGS = [
  { id: 'funcionalidade', label: 'Funcionalidade', icon: Sparkles, color: 'text-primary' },
  { id: 'critica', label: 'Crítica', icon: MessageCircleWarning, color: 'text-orange-400' },
  { id: 'bug', label: 'Bug', icon: Bug, color: 'text-red-400' },
  { id: 'duvida', label: 'Dúvida', icon: HelpCircle, color: 'text-sky-400' },
];

export default function Opiniao() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isPremium } = useSubscription();
  const [comentario, setComentario] = useState('');
  const [email, setEmail] = useState('');
  const [tag, setTag] = useState('funcionalidade');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) {
      toast.error('Imagem muito grande (máx 5MB)');
      return;
    }
    setPhotoFile(f);
    const reader = new FileReader();
    reader.onload = () => setPhotoPreview(String(reader.result));
    reader.readAsDataURL(f);
  };

  const handleSubmit = async () => {
    if (!user) { toast.error('Você precisa estar logado'); return; }
    const texto = comentario.trim();
    if (texto.length < 5) { toast.error('Escreva pelo menos 5 caracteres'); return; }
    if (texto.length > 2000) { toast.error('Máximo 2000 caracteres'); return; }

    setSending(true);
    try {
      let photo_url: string | null = null;
      if (photoFile) {
        const ext = photoFile.name.split('.').pop() || 'jpg';
        const path = `${user.id}/${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from('feedback-photos')
          .upload(path, photoFile, { upsert: false, contentType: photoFile.type });
        if (upErr) throw upErr;
        photo_url = path;
      }

      const displayName =
        (user.user_metadata as any)?.display_name ??
        (user.user_metadata as any)?.full_name ??
        user.email?.split('@')[0] ??
        null;

      const { error } = await supabase.from('app_feedback' as any).insert({
        user_id: user.id,
        email: email.trim() || user.email || null,
        display_name: displayName,
        comentario: texto,
        tag,
        photo_url,
        is_premium: !!isPremium,
        platform: Capacitor.isNativePlatform() ? Capacitor.getPlatform() : 'web',
        user_agent: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 300) : null,
      });
      if (error) throw error;

      setSent(true);
      setTimeout(() => navigate(-1), 1400);
    } catch (e: any) {
      console.error('[opiniao] erro', e);
      toast.error('Não foi possível enviar. Tente novamente.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-dvh flex flex-col bg-background">
      <PageHeader title="Sua opinião" subtitle="Conte o que achou, sugira, critique ou reporte" onBack={() => navigate(-1)} />
      {sent ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 py-16">
          <CheckCircle2 className="w-16 h-16 text-primary" />
          <p className="font-display text-lg font-semibold text-foreground">Recebido!</p>
          <p className="text-sm text-muted-foreground font-body">Obrigado por contribuir 💛</p>
        </div>
      ) : (
        <>
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 max-w-2xl w-full mx-auto">
            <div className="relative">
              <textarea
                value={comentario}
                onChange={(e) => setComentario(e.target.value)}
                placeholder="Escreva aqui o que quer nos dizer..."
                maxLength={2000}
                rows={6}
                className="w-full resize-none rounded-2xl bg-secondary/60 border border-border px-4 py-3 pr-12 text-foreground placeholder:text-muted-foreground/60 font-body text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="absolute bottom-3 right-3 w-9 h-9 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center text-primary hover:bg-primary/25"
                aria-label="Anexar foto"
              >
                <Camera className="w-4 h-4" />
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
            </div>

            {photoPreview && (
              <div className="relative w-28 h-28 rounded-xl overflow-hidden border border-border">
                <img src={photoPreview} alt="anexo" className="w-full h-full object-cover" />
                <button
                  onClick={() => { setPhotoFile(null); setPhotoPreview(null); }}
                  className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/70 text-white flex items-center justify-center"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            <div>
              <p className="text-xs font-body font-semibold text-muted-foreground uppercase tracking-wider mb-2">Categoria</p>
              <div className="grid grid-cols-2 gap-2">
                {TAGS.map(t => {
                  const Ic = t.icon;
                  const active = tag === t.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setTag(t.id)}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border transition-colors text-sm font-body font-medium ${
                        active
                          ? 'bg-primary/15 border-primary/50 text-foreground'
                          : 'bg-secondary/60 border-border text-foreground/70 hover:bg-secondary'
                      }`}
                    >
                      <Ic className={`w-4 h-4 ${active ? 'text-primary' : t.color}`} />
                      {t.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <p className="text-xs font-body font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                E-mail para retorno <span className="normal-case text-muted-foreground/60 font-normal">(opcional)</span>
              </p>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={user?.email || 'voce@exemplo.com'}
                className="w-full rounded-2xl bg-secondary/60 border border-border px-4 py-3 text-foreground placeholder:text-muted-foreground/60 font-body text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
          </div>

          <div className="p-4 border-t border-border max-w-2xl w-full mx-auto">
            <button
              onClick={handleSubmit}
              disabled={sending || comentario.trim().length < 5}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-primary text-primary-foreground font-body font-semibold disabled:opacity-40 active:scale-[0.98] transition-transform"
            >
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {sending ? 'Enviando...' : 'Enviar opinião'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
