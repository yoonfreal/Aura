export const AU_EMAIL_DOMAIN = '@au.edu';

export function isAuEmail(email: string): boolean {
  return email.trim().toLowerCase().endsWith(AU_EMAIL_DOMAIN);
}
