import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, User, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { haptic } from '@/lib/nativeHaptics';

type PerfilPessoal = {
  nome_como_chamar?: string;
  idade?: string;
  ocupacao?: string;
  estudando_para?: string;
  area_interesse?: string;
  nivel_conhecimento?: string;
  cidade?: string;
  hobbies?: string;
  objetivo?: string;
  bio?: string;
};

const FIELDS: Array<{
  key: keyof PerfilPessoal;
  label: string;
  placeholder: string;
  type?: 'text' | 'textarea';
  hint?: string;
}> = [
  { key: 'nome_como_chamar', label: 'Como o Horus deve te chamar', placeholder: 'Ex.: Wesley, Dra. Ana, Xará…' },
  { key: 'idade', label: 'Idade', placeholder: 'Ex.: 27' },
  { key: 'ocupacao', label: 'O que você faz hoje', placeholder: 'Ex.: Estudante de Direito, advogado(a) autônomo(a), estagiário(a)…' },
  { key: 'estudando_para', label: 'Está estudando pra quê', placeholder: 'Ex.: OAB 2ª fase, concurso PC-SP, TCC, ENEM Jurídico…' },
  { key: 'area_interesse', label: 'Áreas que mais te interessam', placeholder: 'Ex.: Penal, Trabalhista, Constitucional…' },
  { key: 'nivel_conhecimento', label: 'Nível de conhecimento em Direito', placeholder: 'Ex.: iniciante, intermediário, avançado' },
  { key: 'cidade', label: 'Cidade / Estado', placeholder: 'Ex.: Recife-PE' },
  { key: 'hobbies', label: 'Hobbies e interesses', placeholder: 'Ex.: futebol, leitura, séries, música…', type: 'textarea' },
  { key: 'objetivo', label: 'O que você espera do Horus', placeholder: 'Ex.: revisar leis diárias, tirar dúvidas rápidas, me manter estudando…', type: 'textarea' },
  { key: 'bio', label: 'Algo mais que ele deve saber', placeholder: 'Escreve à vontade, ele lembra disso nas conversas.', type: 'textarea' },
];

export default function HorusEuSheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [perfil, setPerfil] = useState<PerfilPessoal>({});
  const [linkedUserId, setLinkedUserId] = useState<string | null>(null);
  const [phone, setPhone] = useState<string | null>(null);
  const [notVerified, setNotVerified] = useState(false);

  useEffect(() => {
    if (!open) return;
    (async () => {
      setLoading(true);
      setNotVerified(false);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setNotVerified(true);
        setLoading(false);
        return;
      }
      const { data } = await supabase
        .from('horus_whatsapp_users')
        .select('phone_e164, verified_at, perfil_pessoal, nome_preferido')
        .eq('user_id', user.id)
        .maybeSingle();
      if (!data || !(data as any).verified_at) {
        setNotVerified(true);
      } else {
        setLinkedUserId(user.id);
        setPhone((data as any).phone_e164);
        const base: PerfilPessoal = ((data as any).perfil_pessoal || {}) as PerfilPessoal;
        if (!base.nome_como_chamar && (data as any).nome_preferido) {
          base.nome_como_chamar = (data as any).nome_preferido;
        }
        setPerfil(base);
      }
      setLoading(false);
    })();
  }, [open]);

  async function salvar() {
    if (!linkedUserId) return;
    setSaving(true);
    const clean: PerfilPessoal = {};
    (Object.keys(perfil) as Array<keyof PerfilPessoal>).forEach((k) => {
      const v = (perfil[k] || '').toString().trim();
      if (v) clean[k] = v;
    });
    const patch: any = { perfil_pessoal: clean };
    if (clean.nome_como_chamar) patch.nome_preferido = clean.nome_como_chamar;
    const { error } = await supabase
      .from('horus_whatsapp_users')
      .update(patch)
      .eq('user_id', linkedUserId);
    setSaving(false);
    if (error) {
      toast.error('Não deu pra salvar. Tente de novo.');
      return;
    }
    haptic.medium();
    toast.success('Prontinho, o Horus já te conhece melhor 💚');
    onClose();
  }

  const setField = (k: keyof PerfilPessoal, v: string) =>
    setPerfil((p) => ({ ...p, [k]: v }));

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
            className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            key="sheet"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 34 }}
            className="fixed left-0 right-0 bottom-0 z-[61] bg-background border-t border-border rounded-t-3xl shadow-2xl max-h-[92vh] flex flex-col"
            style={{ paddingBottom: 'var(--sai-bottom,env(safe-area-inset-bottom,0px))' }}
          >
            <div className="flex items-center gap-3 px-5 pt-4 pb-3 border-b border-border">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 flex items-center justify-center">
                <User className="w-5 h-5 text-emerald-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="font-display text-lg font-bold leading-tight">Sobre você</h2>
                <p className="font-body text-xs text-muted-foreground leading-tight">
                  O que o Horus deve lembrar em cada conversa
                </p>
              </div>
              <button
                onClick={onClose}
                aria-label="Fechar"
                className="w-9 h-9 rounded-full hover:bg-secondary flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-5">
              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : notVerified ? (
                <div className="flex flex-col items-center text-center gap-3 py-10">
                  <Sparkles className="w-10 h-10 text-amber-400" />
                  <p className="font-display text-base font-bold">Verifique seu WhatsApp primeiro</p>
                  <p className="font-body text-sm text-muted-foreground max-w-xs">
                    Depois de vincular seu número, você pode contar tudo sobre você aqui.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30">
                    <p className="font-body text-xs text-emerald-300 leading-snug">
                      Nada aqui é obrigatório. Quanto mais o Horus souber, mais natural e personalizada
                      fica a conversa no WhatsApp.
                    </p>
                  </div>

                  {FIELDS.map((f) => (
                    <div key={f.key} className="flex flex-col gap-1.5">
                      <label className="font-body text-sm font-semibold text-foreground/90">
                        {f.label}
                      </label>
                      {f.type === 'textarea' ? (
                        <textarea
                          value={perfil[f.key] || ''}
                          onChange={(e) => setField(f.key, e.target.value)}
                          placeholder={f.placeholder}
                          rows={3}
                          maxLength={500}
                          className="w-full px-4 py-3 rounded-xl bg-secondary/60 border border-border focus:border-emerald-500 outline-none font-body text-base resize-none"
                        />
                      ) : (
                        <input
                          type="text"
                          value={perfil[f.key] || ''}
                          onChange={(e) => setField(f.key, e.target.value)}
                          placeholder={f.placeholder}
                          maxLength={120}
                          className="w-full h-12 px-4 rounded-xl bg-secondary/60 border border-border focus:border-emerald-500 outline-none font-body text-base"
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {!loading && !notVerified && (
              <div className="px-5 py-4 border-t border-border">
                <button
                  onClick={salvar}
                  disabled={saving}
                  className="w-full h-13 min-h-[52px] rounded-2xl font-display font-bold text-base text-white flex items-center justify-center gap-2 disabled:opacity-60"
                  style={{ background: 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)' }}
                >
                  {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
                  Salvar meu perfil
                </button>
                {phone && (
                  <p className="mt-2 text-center font-body text-[11px] text-muted-foreground">
                    Vinculado a •••• {phone.slice(-4)}
                  </p>
                )}
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
