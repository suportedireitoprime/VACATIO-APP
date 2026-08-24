import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type TakeoverNotice = {
  id: string;
  phone_e164: string;
  new_owner_email: string | null;
  created_at: string;
};

function maskEmail(email: string | null): string {
  if (!email) return 'outra conta';
  const [user, domain] = email.split('@');
  if (!domain) return email;
  const visible = user.slice(0, 3);
  return `${visible}${'*'.repeat(Math.max(1, user.length - 3))}@${domain}`;
}

function maskPhone(phone: string): string {
  const d = phone.replace(/\D/g, '');
  if (d.length < 6) return phone;
  const last4 = d.slice(-4);
  const cc = d.startsWith('55') ? '+55 ' : '';
  const rest = d.startsWith('55') ? d.slice(2, -4) : d.slice(0, -4);
  const ddd = rest.slice(0, 2);
  return `${cc}(${ddd}) *****-${last4}`;
}

export function useHorusTakeoverNotice() {
  const [notice, setNotice] = useState<TakeoverNotice | null>(null);

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from('horus_phone_takeover_notices')
      .select('id, phone_e164, new_owner_email, created_at')
      .eq('user_id', user.id)
      .is('acknowledged_at', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data) setNotice(data as TakeoverNotice);
  }, []);

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let userId: string | null = null;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      userId = user.id;
      await load();
      channel = supabase
        .channel(`horus-takeover-${user.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'horus_phone_takeover_notices',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            const row = payload.new as any;
            if (!row?.acknowledged_at) {
              setNotice({
                id: row.id,
                phone_e164: row.phone_e164,
                new_owner_email: row.new_owner_email,
                created_at: row.created_at,
              });
            }
          },
        )
        .subscribe();
    })();
    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [load]);

  const acknowledge = useCallback(async () => {
    if (!notice) return;
    setNotice(null);
    await supabase
      .from('horus_phone_takeover_notices')
      .update({ acknowledged_at: new Date().toISOString() })
      .eq('id', notice.id);
  }, [notice]);

  return {
    notice,
    acknowledge,
    maskedEmail: notice ? maskEmail(notice.new_owner_email) : '',
    maskedPhone: notice ? maskPhone(notice.phone_e164) : '',
  };
}
