const FALLBACK_DISPLAY_NAME = 'user';
const DISPLAY_NAME_MAX_LENGTH = 80;

export function displayNameFromEmail(email: string | null | undefined): string {
  const local = email?.split('@')[0]?.trim() ?? '';

  if (!local) {
    return FALLBACK_DISPLAY_NAME;
  }

  return local.slice(0, DISPLAY_NAME_MAX_LENGTH);
}
