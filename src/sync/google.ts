import {
  GoogleSignin,
  isCancelledResponse,
  isErrorWithCode,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import { Platform } from 'react-native';

import { GoogleError, googleClientIds } from './oauth';

const ids = googleClientIds(
  Platform.OS,
  process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
);

export const googleConfigured = ids !== null;

let configured = false;

/**
 * Google's native account picker, then Supabase with the ID token it returns. Null when the user cancels (or a
 * picker is already open), which the caller keeps silent.
 */
export async function signInWithGoogle(client: SupabaseClient): Promise<User | null> {
  if (!ids) throw new GoogleError('googleFailed');
  if (!configured) {
    GoogleSignin.configure(ids);
    configured = true;
  }
  let token: string | null;
  try {
    if (Platform.OS === 'android') await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const response = await GoogleSignin.signIn();
    if (isCancelledResponse(response)) return null;
    token = response.data.idToken;
  } catch (e) {
    if (isErrorWithCode(e) && e.code === statusCodes.IN_PROGRESS) return null;
    if (isErrorWithCode(e) && e.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE)
      throw new GoogleError('googlePlayServices');
    throw e;
  }
  // Google leaves the ID token out when the web client id doesn't belong to the app's project: a build problem.
  if (!token) throw new GoogleError('googleFailed');
  const { data, error } = await client.auth.signInWithIdToken({ provider: 'google', token });
  if (error) throw error;
  return data.user;
}

/** Native sign-in never leaves the app, so there is no redirect to recover from. */
export async function googleRedirectFailure(_client: SupabaseClient): Promise<string | null> {
  return null;
}
