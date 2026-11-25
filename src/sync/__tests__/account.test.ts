import { GoogleError } from '../oauth';

const mockGoogle = { user: null as { id: string } | null, error: null as unknown };

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('../supabase', () => ({ supabase: {} }));
jest.mock('../engine', () => ({ syncNow: jest.fn(() => Promise.resolve()), useSyncStatus: { setState: jest.fn() } }));
jest.mock('../google', () => ({
  googleConfigured: true,
  googleRedirectFailure: () => Promise.resolve(null),
  signInWithGoogle: () => (mockGoogle.error ? Promise.reject(mockGoogle.error) : Promise.resolve(mockGoogle.user)),
}));

import { useLanguageStore } from '@/i18n';
import { useProgress } from '@/state/progress';

import { AccountError, googleAvailable, signInWithGoogle } from '../account';
import { syncNow } from '../engine';

beforeEach(() => {
  useLanguageStore.getState().setLanguage('en');
  Object.assign(mockGoogle, { user: null, error: null });
  jest.mocked(syncNow).mockClear();
  const progress = useProgress.getState();
  progress.clear();
  progress.answer('flag:PL', true);
  progress.adopt('anon-1');
  progress.markPushed({ ...useProgress.getState().dirty }, true);
});

it('is offered when Supabase and Google are configured', () => {
  expect(googleAvailable).toBe(true);
});

it('moves the device’s progress into the Google account and syncs', async () => {
  mockGoogle.user = { id: 'google-1' };
  await signInWithGoogle();
  expect(useProgress.getState().ownerId).toBe('google-1');
  expect(Object.keys(useProgress.getState().dirty)).toEqual(['flag:PL']);
  expect(syncNow).toHaveBeenCalledTimes(1);
});

it('does nothing when the user cancels', async () => {
  await signInWithGoogle();
  expect(useProgress.getState().ownerId).toBe('anon-1');
  expect(syncNow).not.toHaveBeenCalled();
});

it('turns failures into friendly messages', async () => {
  mockGoogle.error = new GoogleError('googlePlayServices');
  await expect(signInWithGoogle()).rejects.toThrow(
    new AccountError('Signing in with Google needs Google Play services on this device.'),
  );
  mockGoogle.error = new Error('TypeError: Network request failed');
  await expect(signInWithGoogle()).rejects.toThrow("You're offline. Try again when you're connected.");
});
