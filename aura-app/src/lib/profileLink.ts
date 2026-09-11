// Shared by the QR/share sheet (which builds this link) and the chat thread (which needs
// to recognize it in a message body and render it as a tappable chip instead of dead text).
const PROFILE_LINK_PREFIX = 'auraapp://friend/';
const UUID_PATTERN = '[0-9a-fA-F-]{36}';

export function buildProfileLink(userId: string): string {
  return `${PROFILE_LINK_PREFIX}${userId}`;
}

// Returns the linked user's id if the text contains a profile link, otherwise null.
export function extractProfileLinkUserId(text: string): string | null {
  const match = text.match(new RegExp(`${PROFILE_LINK_PREFIX}(${UUID_PATTERN})`));
  return match ? match[1] : null;
}

export type ProfileLinkSplit = { before: string; link: string; after: string; userId: string };

// Splits message text around the raw link substring so the chat bubble can render that
// exact text as a tappable span (React Native's Text has no auto-linkify for custom
// schemes like auraapp:// — the OS's built-in link detection only catches http(s)/phone/
// email), while everything before and after it stays plain text.
export function splitProfileLink(text: string): ProfileLinkSplit | null {
  const match = text.match(new RegExp(`${PROFILE_LINK_PREFIX}${UUID_PATTERN}`));
  if (!match || match.index == null) return null;

  const link = match[0];
  const userId = link.slice(PROFILE_LINK_PREFIX.length);
  return {
    before: text.slice(0, match.index),
    link,
    after: text.slice(match.index + link.length),
    userId,
  };
}
