import NetInfo from '@react-native-community/netinfo';
import { useEffect } from 'react';
import { AppState } from 'react-native';

import { useProgress } from '@/state/progress';

import { loadUser, syncNow } from './engine';
import { supabase } from './supabase';

const DEBOUNCE_MS = 2500;

/**
 * Keeps progress in sync (docs/specs/sync.md): at start, on return to the foreground, when the connection comes
 * back, and shortly after every answer.
 */
export function useSync(ready: boolean): void {
  useEffect(() => {
    if (!ready || !supabase) return;
    loadUser();
    syncNow();

    let timer: ReturnType<typeof setTimeout> | null = null;
    const soon = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => syncNow(), DEBOUNCE_MS);
    };
    const unsubscribeProgress = useProgress.subscribe((s, prev) => {
      if (s.dirty !== prev.dirty && Object.keys(s.dirty).length > 0) soon();
      else if (s.settingsDirty && !prev.settingsDirty) soon();
    });
    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'active') syncNow();
    });
    let wasConnected = true;
    const unsubscribeNet = NetInfo.addEventListener((net) => {
      const connected = Boolean(net.isConnected);
      if (connected && !wasConnected) syncNow();
      wasConnected = connected;
    });
    return () => {
      if (timer) clearTimeout(timer);
      unsubscribeProgress();
      appState.remove();
      unsubscribeNet();
    };
  }, [ready]);
}
