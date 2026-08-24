// E-mails com acesso administrativo completo ao aplicativo.
export const ADMIN_EMAILS = [
  'wn7corporation@gmail.com',
  'suporte.vacatio@gmail.com',
  'wn7juridico@gmail.com',
] as const;

export function isAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.toLowerCase() as (typeof ADMIN_EMAILS)[number]);
}
