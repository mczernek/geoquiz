import { useEffect, useRef, type ComponentRef, type RefObject } from 'react';
import { Platform, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import {
  GestureDetector,
  usePanGesture,
  usePinchGesture,
  useSimultaneousGestures,
  useTapGesture,
} from 'react-native-gesture-handler';

import { camera } from './camera';
import { countryAt, tinyNear } from './geo';
import { GlobeCanvas } from './GlobeCanvas';
import { useGlobeStore } from './store';

/** Tiny countries' markers win within this many px of a tap (decision 007). */
const TINY_TAP_PX = 16;

function handleTap(x: number, y: number) {
  const onTap = useGlobeStore.getState().onTap;
  if (!onTap) return;
  const point = camera.invert(x, y);
  if (!point) return;
  const code = tinyNear(x, y, TINY_TAP_PX, (p) => camera.project(p)) ?? countryAt(point);
  onTap(code, point);
}

/** Web: wheel / trackpad pinch zooms, arrow keys rotate, +/- zoom (decision 010). */
function useWebControls(ref: RefObject<ComponentRef<typeof View> | null>) {
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const el = ref.current as unknown as HTMLElement | null;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      // Trackpad pinch arrives as ctrl+wheel with small deltas.
      const speed = e.ctrlKey ? 0.012 : 0.0018;
      const delta = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
      camera.zoomBy(Math.exp(-delta * speed));
    };
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;
      const step = 40;
      const actions: Record<string, () => void> = {
        ArrowLeft: () => camera.dragBy(step, 0),
        ArrowRight: () => camera.dragBy(-step, 0),
        ArrowUp: () => camera.dragBy(0, step),
        ArrowDown: () => camera.dragBy(0, -step),
        '+': () => camera.zoomBy(1.25),
        '=': () => camera.zoomBy(1.25),
        '-': () => camera.zoomBy(0.8),
      };
      const action = actions[e.key];
      if (action && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        action();
      }
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('keydown', onKey);
    return () => {
      el.removeEventListener('wheel', onWheel);
      window.removeEventListener('keydown', onKey);
    };
  }, [ref]);
}

/**
 * The globe behind every screen (decision 005): renders the shared camera and turns gestures into camera moves.
 * Screens are drawn on top with `pointerEvents="box-none"`, so empty areas reach the globe.
 */
export function GlobeStage() {
  const paint = useGlobeStore((s) => s.paint);
  const ref = useRef<ComponentRef<typeof View>>(null);
  useWebControls(ref);

  const pan = usePanGesture({
    runOnJS: true,
    minDistance: 4,
    onActivate: () => camera.dragStart(),
    onUpdate: (e) => camera.dragBy(e.changeX, e.changeY),
    onDeactivate: (e) => camera.dragEnd(e.velocityX, e.velocityY),
  });
  const pinch = usePinchGesture({
    runOnJS: true,
    onUpdate: (e) => camera.zoomBy(e.scaleChange),
  });
  const tap = useTapGesture({
    runOnJS: true,
    maxDistance: 8,
    onActivate: (e) => handleTap(e.x, e.y),
  });
  const gesture = useSimultaneousGestures(pan, pinch, tap);

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    camera.setScreen(width, height);
  };

  return (
    <GestureDetector gesture={gesture}>
      <View ref={ref} style={[StyleSheet.absoluteFill, styles.stage]} onLayout={onLayout} collapsable={false}>
        <GlobeCanvas paint={paint} />
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  stage: Platform.select({ web: { cursor: 'grab', touchAction: 'none' } as object, default: {} }),
});
