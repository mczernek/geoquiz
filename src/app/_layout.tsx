import {
  Fredoka_400Regular,
  Fredoka_500Medium,
  Fredoka_600SemiBold,
  Fredoka_700Bold,
  useFonts,
} from '@expo-google-fonts/fredoka';
import { Slot } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useSyncExternalStore } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { GlobeStage } from '@/globe/GlobeStage';
import { useLanguage, useLanguageStore } from '@/i18n';
import { useProgress } from '@/state/progress';
import { registerServiceWorker } from '@/sync/registerServiceWorker';
import { useSync } from '@/sync/useSync';
import { Background } from '@/ui/Background';

SplashScreen.preventAutoHideAsync();
registerServiceWorker();

const persisted = [useProgress.persist, useLanguageStore.persist];

function useHydrated(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const unsubscribe = persisted.map((p) => p.onFinishHydration(onChange));
      return () => unsubscribe.forEach((u) => u());
    },
    () => persisted.every((p) => p.hasHydrated()),
    () => false,
  );
}

/** Web: the page's language follows the app's, for screen readers and translation prompts. */
function useDocumentLanguage() {
  const language = useLanguage();
  useEffect(() => {
    if (Platform.OS === 'web') document.documentElement.lang = language;
  }, [language]);
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({ Fredoka_400Regular, Fredoka_500Medium, Fredoka_600SemiBold, Fredoka_700Bold });
  const hydrated = useHydrated();
  const ready = fontsLoaded && hydrated;
  useSync(hydrated);
  useDocumentLanguage();

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <Background />
        <GlobeStage />
        {ready && (
          <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
            <Slot />
          </View>
        )}
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({ root: { flex: 1 } });
