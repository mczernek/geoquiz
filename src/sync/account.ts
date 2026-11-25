import { useProgress } from '@/state/progress';
import { useSession } from '@/state/session';

import { syncNow, useSyncStatus } from './engine';
import { supabase } from './supabase';

export class AccountError extends Error {}

function client() {
  if (!supabase) throw new AccountError('Sync is not configured in this build.');
  return supabase;
}

function friendly(message: string): string {
  if (/invalid login credentials/i.test(message)) return 'Wrong email or password.';
  if (/already registered|already been registered/i.test(message))
    return 'That email already has an account. Sign in instead.';
  if (/password should be at least/i.test(message)) return 'Use at least 8 characters for the password.';
  if (/network|fetch/i.test(message)) return "You're offline. Try again when you're connected.";
  return message;
}

/**
 * Creates an account and moves this device's progress into it (decision 011). Returns false when the project
 * requires confirming the email first.
 */
export async function signUp(email: string, password: string): Promise<boolean> {
  const { data, error } = await client().auth.signUp({ email: email.trim(), password });
  if (error) throw new AccountError(friendly(error.message));
  if (!data.session) return false;
  useProgress.getState().adopt(data.session.user.id);
  await syncNow();
  return true;
}

/** Signs in and merges this device's progress with the account's (newer card wins). */
export async function signIn(email: string, password: string): Promise<void> {
  const { data, error } = await client().auth.signInWithPassword({ email: email.trim(), password });
  if (error) throw new AccountError(friendly(error.message));
  useProgress.getState().adopt(data.user.id);
  await syncNow();
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
  if (error) throw new AccountError(friendly(error.message));
  await signOut();
}

export function pendingChanges(): number {
  const { dirty, settingsDirty } = useProgress.getState();
  return Object.keys(dirty).length + (settingsDirty ? 1 : 0);
}
