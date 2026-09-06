// Built-in word list used when the admin's "Filter banned keywords" setting is on (see
// app_settings.filter_banned_keywords). Deliberately a plain, editable array rather than a
// database table for now — there's no admin UI to manage individual words yet, just the
// on/off switch, so this is the whole "list" the toggle controls.
export const BANNED_KEYWORDS: string[] = [
  'fuck',
  'shit',
  'bitch',
  'asshole',
  'bastard',
  'cunt',
  'whore',
  'slut',
  'faggot',
  'nigger',
  'retard',
];

export function containsBannedKeyword(text: string): boolean {
  const lower = text.toLowerCase();
  return BANNED_KEYWORDS.some((word) => lower.includes(word));
}
