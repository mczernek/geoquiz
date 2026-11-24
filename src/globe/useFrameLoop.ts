import { useEffect, useRef } from 'react';

import { camera, type CameraState } from './camera';
import { computeFrame, type Frame, type Paint } from './scene';

/** Calls `onFrame` at most once per display frame, whenever the camera or the paint changes. */
export function useFrameLoop(paint: Paint, onFrame: (frame: Frame) => void): void {
  const paintRef = useRef(paint);
  const onFrameRef = useRef(onFrame);
  const request = useRef<() => void>(() => {});

  useEffect(() => {
    onFrameRef.current = onFrame;
  }, [onFrame]);

  useEffect(() => {
    let raf: number | null = null;
    let latest: CameraState = camera.snapshot();
    const draw = () => {
      raf = null;
      onFrameRef.current(computeFrame(latest, paintRef.current));
    };
    request.current = () => {
      if (raf === null) raf = requestAnimationFrame(draw);
    };
    const unsubscribe = camera.subscribe((state) => {
      latest = state;
      request.current();
    });
    return () => {
      unsubscribe();
      if (raf !== null) cancelAnimationFrame(raf);
    };
  }, []);

  useEffect(() => {
    paintRef.current = paint;
    request.current();
  }, [paint]);
}
