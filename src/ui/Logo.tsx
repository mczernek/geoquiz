import { Image } from 'expo-image';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withSpring } from 'react-native-reanimated';

import { colors, fonts } from '@/theme';

import { Text } from './Text';

const MARK = require('../../assets/images/brand-mark.png');

const SIZES = { m: 40, s: 28 } as const;

/**
 * The "globik" wordmark (docs/brand.md): Fredoka Bold, with the mark (globe + orbit) as the "o". The mark rolls in
 * when the logo appears.
 */
export function Logo({ size = 'm' }: { size?: keyof typeof SIZES }) {
  const font = SIZES[size];
  // The mark's image is 512 px with the globe 320 px across; the globe should be a little taller than the x-height
  // and sit on the baseline like an "o".
  const box = font * 1.1;
  const spin = useSharedValue(-120);
  const scale = useSharedValue(0.4);
  useEffect(() => {
    spin.set(withDelay(150, withSpring(0, { damping: 9, stiffness: 90 })));
    scale.set(withDelay(150, withSpring(1, { damping: 8, stiffness: 160 })));
  }, [spin, scale]);
  const markStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${spin.get()}deg` }, { scale: scale.get() }],
  }));

  const text = { fontSize: font, lineHeight: font * 1.15, fontFamily: fonts.brand, color: colors.white };
  return (
    <View style={styles.row} accessible accessibilityRole="header" accessibilityLabel="Globik">
      <Text style={text}>gl</Text>
      <Animated.View
        style={[{ width: box, height: box, marginHorizontal: -box * 0.1, marginBottom: -font * 0.06 }, markStyle]}
      >
        <Image source={MARK} style={StyleSheet.absoluteFill} contentFit="contain" />
      </Animated.View>
      <Text style={text}>bik</Text>
    </View>
  );
}

const styles = StyleSheet.create({ row: { flexDirection: 'row', alignItems: 'flex-end' } });
