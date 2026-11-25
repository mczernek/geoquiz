import type { SupabaseClient, User } from '@supabase/supabase-js';

import { failedOAuthRedirect, googleClientIds } from './oauth';

// The web app never talks to Google itself (Supabase holds the client and its secret); the id only marks that the
// project has the Google provider set up, so the button doesn't lead to an error page.
export const googleConfigured =
  googleClientIds('web', process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID, undefined) !== null;

/**
 * Leaves the page for Google's consent screen and comes back to the same path. supabase-js then exchanges the PKCE
 * code for a session while starting up (`detectSessionInUrl`), and the first sync adopts the device's progress
 * into the new user (engine.ts: owner changed), just like after an email sign-in.
 */
export async function signInWithGoogle(client: SupabaseClient): Promise<User | null> {
  const { error } = await client.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin + window.location.pathname },
  });
  if (error) throw error;
  return null;
}

/** The message of a sign-in redirect that failed on this page load (null if none, or the user cancelled). */
export async function googleRedirectFailure(client: SupabaseClient): Promise<string | null> {
  const { error } = await client.auth.initialize();
  const failure = failedOAuthRedirect(window.location.href, error);
  if (!failure) return null;
  window.history.replaceState(window.history.state, '', failure.cleanUrl);
  return failure.message;
}
