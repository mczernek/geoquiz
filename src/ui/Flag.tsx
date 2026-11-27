import { Image } from 'expo-image';
import { Platform, StyleSheet, type StyleProp, type ImageStyle } from 'react-native';

import { FLAGS } from '@/data/flags';

/** A country's flag in its real proportions (fits inside width × height). */
export function Flag({
  code,
  width,
  height,
  style,
}: {
  code: string;
  width: number;
  height: number;
  style?: StyleProp<ImageStyle>;
}) {
  return (
    <Image
      source={FLAGS[code]}
      style={[styles.flag, { width, height }, style]}
      contentFit="contain"
      accessibilityIgnoresInvertColors
      // On the web the fade-in left some flags in a long list stuck invisible (expo-image's transition on images
      // that load at once); a fade isn't worth that.
      transition={Platform.OS === 'web' ? undefined : 120}
    />
  );
}

const styles = StyleSheet.create({ flag: { borderRadius: 4 } });
