export function isAllowedEmail(email: string | null | undefined, list = process.env.ALLOWED_EMAILS ?? ''): boolean {
  if (!email) return false;
  const allowed = list.split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);
  return allowed.includes(email.trim().toLowerCase());
}
