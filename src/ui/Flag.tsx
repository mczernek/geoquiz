import { Image } from 'expo-image';
import { StyleSheet, type StyleProp, type ImageStyle } from 'react-native';

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
      transition={120}
    />
  );
}

const styles = StyleSheet.create({ flag: { borderRadius: 4 } });
