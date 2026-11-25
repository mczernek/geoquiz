/** A Google sign-in failure that has a localized message (`errors.<reason>`). */
export class GoogleError extends Error {
  constructor(readonly reason: 'googlePlayServices' | 'googleFailed') {
    super(reason);
  }
}

/**
 * The OAuth client ids Google sign-in needs on this platform, or null when the build lacks them (the button is
 * hidden). The web and Android flows only need the web client: Supabase verifies tokens issued to it, and Android
 * finds its own client by package name and signing key. iOS has its own client.
 */
export function googleClientIds(
  platform: string,
  webClientId: string | undefined,
  iosClientId: string | undefined,
): { webClientId: string; iosClientId?: string } | null {
  if (!webClientId) return null;
  if (platform !== 'ios') return { webClientId };
  return iosClientId ? { webClientId, iosClientId } : null;
}

// What Supabase appends to the redirect URL: a PKCE code (+ flow id) on success, error fields on failure.
const CALLBACK_PARAMS = ['code', 'sb_flow_id', 'error', 'error_code', 'error_description'];

/**
 * After returning from Google on the web: whether this page load is a failed sign-in redirect. Null when it isn't
 * (no callback parameters, or supabase-js signed in fine). `message` is null when the user cancelled on Google's
 * screen, which stays silent; `cleanUrl` drops the callback parameters so a reload doesn't retry them.
 */
export function failedOAuthRedirect(
  href: string,
  initError: { message: string } | null,
): { message: string | null; cleanUrl: string } | null {
  if (!initError) return null;
  const url = new URL(href);
  const hash = new URLSearchParams(url.hash.slice(1));
  const get = (key: string) => url.searchParams.get(key) ?? hash.get(key);
  if (!CALLBACK_PARAMS.some((key) => get(key) !== null)) return null;
  const cancelled = get('error') === 'access_denied' || get('error_code') === 'access_denied';
  for (const key of CALLBACK_PARAMS) {
    url.searchParams.delete(key);
    hash.delete(key);
  }
  url.hash = hash.toString();
  return { message: cancelled ? null : initError.message, cleanUrl: url.toString() };
}
