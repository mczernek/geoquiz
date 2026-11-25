import { useEffect, useRef, type ComponentRef, type RefObject } from 'react';
import { Platform, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { GestureDetector, usePanGesture, usePinchGesture, useSimultaneousGestures } from 'react-native-gesture-handler';

import { camera } from './camera';
import { countryAt, tinyNear } from './geo';
import { GlobeCanvas } from './GlobeCanvas';
import { useGlobeStore } from './store';

/**
 * Tiny countries (decision 007): their marker wins within this many px when the tap is on the sea, and within
 * MARKER_TAP_PX even on land (so Vatican City can be tapped inside Italy, but France isn't lost to Andorra).
 */
const TINY_TAP_PX = 18;
const MARKER_TAP_PX = 9;
/** A touch that ends within this distance and time without dragging is a tap. */
const TAP_SLOP_PX = 10;
/** A tap on the sea this close to a coast counts as that country (fingers are wide, coastlines thin). */
const COAST_SNAP_PX = [6, 12];
const TAP_MAX_MS = 450;

function handleTap(x: number, y: number) {
  const onTap = useGlobeStore.getState().onTap;
  if (!onTap) return;
  const point = camera.invert(x, y);
  if (!point) return;
  const land = countryAt(point) ?? nearestCoast(x, y);
  const tiny = tinyNear(x, y, TINY_TAP_PX, (p) => camera.project(p));
  const code = tiny && (land === null || tiny.distance <= MARKER_TAP_PX) ? tiny.code : land;
  onTap(code, point);
}

function nearestCoast(x: number, y: number): string | null {
  for (const r of COAST_SNAP_PX) {
    for (let a = 0; a < 8; a++) {
      const p = camera.invert(x + r * Math.cos((a * Math.PI) / 4), y + r * Math.sin((a * Math.PI) / 4));
      const code = p && countryAt(p);
      if (code) return code;
    }
  }
  return null;
}

/** Taps come from the pan gesture (touch down → up without dragging or a second finger), not a separate tap
 * recognizer, which could miss the first tap after a pinch. */
const touch = { x: 0, y: 0, at: 0, dragged: false, multi: false };

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
    minDistance: TAP_SLOP_PX,
    onBegin: (e) => {
      Object.assign(touch, { x: e.x, y: e.y, at: Date.now(), dragged: false, multi: e.numberOfPointers > 1 });
    },
    onActivate: () => {
      touch.dragged = true;
      camera.dragStart();
    },
    onUpdate: (e) => {
      if (e.numberOfPointers > 1) touch.multi = true;
      camera.dragBy(e.changeX, e.changeY);
    },
    onDeactivate: (e) => camera.dragEnd(e.velocityX, e.velocityY),
    onFinalize: (e) => {
      const still = Math.hypot(e.x - touch.x, e.y - touch.y) < TAP_SLOP_PX;
      if (!touch.dragged && !touch.multi && still && Date.now() - touch.at < TAP_MAX_MS) handleTap(e.x, e.y);
    },
  });
  const pinch = usePinchGesture({
    runOnJS: true,
    onActivate: () => {
      touch.multi = true;
    },
    onUpdate: (e) => camera.zoomBy(e.scaleChange),
  });
  const gesture = useSimultaneousGestures(pan, pinch);

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
