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
import { StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { GlobeStage } from '@/globe/GlobeStage';
import { useProgress } from '@/state/progress';
import { useSync } from '@/sync/useSync';
import { Background } from '@/ui/Background';

SplashScreen.preventAutoHideAsync();

function useHydrated(): boolean {
  return useSyncExternalStore(
    (onChange) => useProgress.persist.onFinishHydration(onChange),
    () => useProgress.persist.hasHydrated(),
    () => false,
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({ Fredoka_400Regular, Fredoka_500Medium, Fredoka_600SemiBold, Fredoka_700Bold });
  const hydrated = useHydrated();
  const ready = fontsLoaded && hydrated;
  useSync(hydrated);

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
