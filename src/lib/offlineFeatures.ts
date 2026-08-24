import { toast } from 'sonner';

/** Recursos que dependem de internet — usados no Modo Offline e nos guards. */
export const RECURSOS_ONLINE: { label: string; desc: string }[] = [
  { label: 'Videoaulas', desc: 'Busca e reprodução dos vídeos do YouTube' },
  { label: 'IA Jurídica', desc: 'Explicar, perguntar, resumir, grifo mágico e termos' },
  { label: 'Novas narrações', desc: 'Gerar áudio novo (os já baixados tocam offline)' },
  { label: 'Jurisprudência ao vivo', desc: 'Súmulas, teses e informativos ainda não abertos' },
  { label: 'Radar Legislativo', desc: 'Projetos e movimentações em tempo real' },
  { label: 'Notícias e boletins', desc: 'Conteúdo novo publicado no app' },
  { label: 'Blog e biblioteca novos', desc: 'Artigos e livros ainda não baixados' },
  { label: 'Conta e assinatura', desc: 'Login, cadastro, compra e restauração de plano' },
];

export function isOffline(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine === false;
}

/**
 * Retorna false e avisa o usuário quando não há internet.
 * Uso: `if (!requireOnline('Videoaulas')) return;`
 */
export function requireOnline(feature: string): boolean {
  if (!isOffline()) return true;
  toast.error('Você está sem internet', {
    description: `${feature} só funciona com conexão. Reconecte e tente de novo.`,
  });
  return false;
}
