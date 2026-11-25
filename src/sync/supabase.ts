import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

/** Null when the build has no Supabase configuration: the app then keeps progress on the device only. */
export const supabase: SupabaseClient | null =
  url && key
    ? createClient(url, key, {
        auth: {
          storage: Platform.OS === 'web' ? undefined : AsyncStorage,
          autoRefreshToken: true,
          persistSession: true,
          // Google sign-in on the web is a redirect that comes back with a PKCE code; supabase-js exchanges it while
          // starting up. Native apps sign in with ID tokens and never receive auth URLs, so they keep the defaults.
          detectSessionInUrl: Platform.OS === 'web',
          flowType: Platform.OS === 'web' ? 'pkce' : 'implicit',
        },
      })
    : null;

// Native apps refresh the session only while in the foreground (Supabase's React Native guidance).
if (supabase && Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}
