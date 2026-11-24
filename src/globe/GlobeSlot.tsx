import { useRef, type ComponentRef } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { camera } from './camera';

/**
 * An empty area of a screen where the shared globe should sit (decision 005). The globe animates into the most
 * recently laid out slot. `fill` is the share of the slot's smaller side the globe's diameter takes at zoom 1.
 */
export function GlobeSlot({ style, fill = 0.9 }: { style?: StyleProp<ViewStyle>; fill?: number }) {
  const ref = useRef<ComponentRef<typeof View>>(null);
  const measure = () => {
    ref.current?.measureInWindow((x, y, width, height) => {
      if (width <= 0 || height <= 0) return;
      camera.setSlot({ cx: x + width / 2, cy: y + height / 2, r: (Math.min(width, height) / 2) * fill });
    });
  };
  return <View ref={ref} style={style} onLayout={measure} pointerEvents="none" collapsable={false} />;
}
