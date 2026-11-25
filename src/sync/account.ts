import type { User } from '@supabase/supabase-js';

import { currentStrings } from '@/i18n';
import { useProgress } from '@/state/progress';
import { useSession } from '@/state/session';

import { syncNow, useSyncStatus } from './engine';
import { googleConfigured, googleRedirectFailure, signInWithGoogle as googleSignIn } from './google';
import { GoogleError } from './oauth';
import { supabase } from './supabase';

export class AccountError extends Error {}

function client() {
  if (!supabase) throw new AccountError(currentStrings().errors.notConfigured);
  return supabase;
}

function friendly(e: unknown): string {
  const t = currentStrings().errors;
  if (e instanceof GoogleError) return t[e.reason];
  const message = e instanceof Error ? e.message : String(e);
  if (/invalid login credentials/i.test(message)) return t.wrongCredentials;
  if (/already registered|already been registered/i.test(message)) return t.alreadyRegistered;
  if (/password should be at least/i.test(message)) return t.shortPassword;
  if (/network|fetch/i.test(message)) return t.offline;
  return message;
}

/**
 * Creates an account and moves this device's progress into it (decision 011). Returns false when the project
 * requires confirming the email first.
 */
export async function signUp(email: string, password: string): Promise<boolean> {
  const { data, error } = await client().auth.signUp({ email: email.trim(), password });
  if (error) throw new AccountError(friendly(error));
  if (!data.session) return false;
  useProgress.getState().adopt(data.session.user.id);
  await syncNow();
  return true;
}

/** Signs in and merges this device's progress with the account's (newer card wins). */
export async function signIn(email: string, password: string): Promise<void> {
  const { data, error } = await client().auth.signInWithPassword({ email: email.trim(), password });
  if (error) throw new AccountError(friendly(error));
  useProgress.getState().adopt(data.user.id);
  await syncNow();
}

/** Whether this build can offer "Continue with Google" (Supabase and the platform's Google client ids are set). */
export const googleAvailable = Boolean(supabase) && googleConfigured;

/**
 * Signs in with Google and merges this device's progress with the account's, like `signIn`; a new Google user
 * gets the device's progress. Cancelling is silent. On the web the page leaves for Google and the merge happens
 * on the way back (the first sync sees a new owner).
 */
export async function signInWithGoogle(): Promise<void> {
  let user: User | null;
  try {
    user = await googleSignIn(client());
  } catch (e) {
    throw new AccountError(friendly(e));
  }
  if (!user) return;
  useProgress.getState().adopt(user.id);
  await syncNow();
}

/** Web: the message of a Google sign-in that failed on the way back to this page, or null. */
export async function googleRedirectError(): Promise<string | null> {
  if (!supabase) return null;
  const message = await googleRedirectFailure(supabase);
  return message === null ? null : friendly(new Error(message));
}

/** Signs out and forgets local progress; the next sync starts a fresh anonymous profile. */
export async function signOut(): Promise<void> {
  await client().auth.signOut({ scope: 'local' });
  useProgress.getState().clear();
  useSession.setState({ question: null, result: null, recent: [] });
  useSyncStatus.setState({ user: null, status: 'idle' });
  await syncNow();
}

export async function deleteAccount(): Promise<void> {
  const { error } = await client().rpc('delete_account');
  if (error) throw new AccountError(friendly(error));
  await signOut();
}

export function pendingChanges(): number {
  const { dirty, settingsDirty } = useProgress.getState();
  return Object.keys(dirty).length + (settingsDirty ? 1 : 0);
}
