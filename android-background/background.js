// Vacatio background worker (Capacitor Background Runner)
// Executa periodicamente em background (Android/iOS) para pré-carregar
// novidades do Radar e agendar o lembrete diário de estudo.
//
// Este arquivo roda em uma VM isolada (QuickJS/JSCore). NÃO tem window/DOM,
// nem imports de módulos. Apenas APIs expostas: CapacitorKV, CapacitorNotifications,
// CapacitorGeolocation e fetch.

 

const RADAR_CACHE_KEY = 'bg.radar.lastFetch';
const REMINDER_LAST_KEY = 'bg.reminder.lastFired';

async function prefetchRadar() {
  try {
    // Endpoint público (idempotente) — mantém o cache local aquecido.
    // Substitua pela URL de produção quando disponível.
    const url = 'https://vacatio.app/api/radar/novidades?limit=10';
    const res = await fetch(url, { method: 'GET' });
    if (!res.ok) return;
    const body = await res.text();
    CapacitorKV.set(RADAR_CACHE_KEY, JSON.stringify({ at: Date.now(), size: body.length }));
  } catch (e) {
    console.log('[bg] radar prefetch failed', String(e));
  }
}

function shouldFireDailyReminder() {
  const now = new Date();
  // Dispara entre 20:00 e 21:00 locais, no máximo 1x por dia
  if (now.getHours() < 20 || now.getHours() >= 21) return false;
  const last = CapacitorKV.get(REMINDER_LAST_KEY)?.value;
  if (!last) return true;
  const lastDate = new Date(Number(last));
  return lastDate.toDateString() !== now.toDateString();
}

async function scheduleDailyReminder() {
  if (!shouldFireDailyReminder()) return;
  try {
    await CapacitorNotifications.schedule([{
      id: 42001,
      title: 'Vacatio — hora de estudar',
      body: 'Que tal 10 minutos revisando um artigo hoje? Sua sequência agradece.',
      scheduleAt: new Date(Date.now() + 60_000),
    }]);
    CapacitorKV.set(REMINDER_LAST_KEY, String(Date.now()));
  } catch (e) {
    console.log('[bg] reminder schedule failed', String(e));
  }
}

addEventListener('prefetch', async (resolve, reject, _args) => {
  try {
    await prefetchRadar();
    await scheduleDailyReminder();
    resolve();
  } catch (err) {
    console.log('[bg] prefetch error', String(err));
    reject(err);
  }
});
