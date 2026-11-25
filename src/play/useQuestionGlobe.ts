import { geoDistance, geoInterpolate } from 'd3-geo';
import { useEffect } from 'react';

import { CONTINENTS, countriesIn, getCountry, isTiny, type Continent } from '@/domain/countries';
import type { Question } from '@/domain/questions';
import { camera, GlobeCamera } from '@/globe/camera';
import { useGlobeStore, type TapHandler } from '@/globe/store';
import { EMPTY_PAINT, type Paint } from '@/globe/scene';
import type { Result } from '@/state/session';
import { colors } from '@/theme';

/** Average position of the selected continents: where "find it on the map" starts, without giving it away. */
function continentsCenter(continents: readonly Continent[]): [number, number] {
  const list = countriesIn(continents.length ? continents : [...CONTINENTS]);
  let x = 0;
  let y = 0;
  let z = 0;
  for (const c of list) {
    const lon = (c.focus[0] * Math.PI) / 180;
    const lat = (c.focus[1] * Math.PI) / 180;
    x += Math.cos(lat) * Math.cos(lon);
    y += Math.cos(lat) * Math.sin(lon);
    z += Math.sin(lat);
  }
  return [(Math.atan2(y, x) * 180) / Math.PI, (Math.atan2(z, Math.hypot(x, y)) * 180) / Math.PI];
}

/** Zoom caps keep the globe recognizable as a globe; tiny countries get a ring instead of a closer look. */
const MAX_ZOOM_CONTEXT = 4;
const MAX_ZOOM_FOCUS = 8;

function flyToCountry(code: string, fill: number, max = MAX_ZOOM_FOCUS) {
  const c = getCountry(code);
  return camera.flyTo([c.focus[0], c.focus[1]], GlobeCamera.zoomToFit(c.focus[2], fill, max));
}

/** Frames two countries at once: the answer and the one the user picked instead. */
function flyToBoth(a: string, b: string) {
  const ca = getCountry(a);
  const cb = getCountry(b);
  const pa: [number, number] = [ca.focus[0], ca.focus[1]];
  const pb: [number, number] = [cb.focus[0], cb.focus[1]];
  const between = (geoDistance(pa, pb) * 180) / Math.PI;
  const radius = between / 2 + Math.max(ca.focus[2], cb.focus[2]);
  return camera.flyTo(
    geoInterpolate(pa, pb)(0.5) as [number, number],
    GlobeCamera.zoomToFit(radius, 0.42, MAX_ZOOM_FOCUS),
  );
}

/** What the globe shows for the current question and its answer (docs/specs/learning.md → Globe). */
export function useQuestionGlobe(
  question: Question | null,
  result: Result | null,
  continents: readonly Continent[],
  onTap: TapHandler,
  /** Called when the camera arrives at the answer, with its position on screen. */
  onArrive: (x: number, y: number, correct: boolean) => void,
) {
  const setPaint = useGlobeStore((s) => s.setPaint);
  const setOnTap = useGlobeStore((s) => s.setOnTap);

  useEffect(() => {
    if (!question) return;
    const code = question.country.code;
    const tiny = isTiny(question.country);
    // A newer question cancels this one's flight, which still resolves: its follow-ups must not run then.
    let current = true;
    const stale = () => {
      current = false;
    };

    if (result) {
      setOnTap(null);
      camera.setAutoRotate(false);
      const paint: Paint = {
        fills: { [code]: result.correct ? colors.correct : colors.target },
        outlines: { [code]: result.correct ? colors.correct : colors.target },
        rings: tiny ? { [code]: result.correct ? colors.correct : colors.target } : {},
      };
      const other = result.givenCountry && result.givenCountry !== code ? result.givenCountry : null;
      if (other) {
        paint.fills = { ...paint.fills, [other]: colors.wrong };
        paint.outlines = { ...paint.outlines, [other]: colors.wrong };
        if (isTiny(getCountry(other))) paint.rings = { ...paint.rings, [other]: colors.wrong };
      }
      setPaint(paint);
      const correct = result.correct;
      (other ? flyToBoth(code, other) : flyToCountry(code, 0.3)).then(() => {
        if (!current) return;
        const at = camera.project([question.country.focus[0], question.country.focus[1]]);
        if (at) onArrive(at[0], at[1], correct);
      });
      return stale;
    }

    switch (question.variant) {
      case 'map-name':
        camera.setAutoRotate(false);
        setPaint({
          fills: { [code]: colors.target },
          outlines: { [code]: colors.target },
          rings: tiny ? { [code]: colors.target } : {},
        });
        flyToCountry(code, 0.22);
        setOnTap(null);
        break;
      case 'map-locate':
        camera.setAutoRotate(false);
        setPaint(EMPTY_PAINT);
        camera.flyTo(continentsCenter(continents), 1.15);
        setOnTap(onTap);
        break;
      case 'flag-pick':
      case 'capital-of':
        // The country is in the question, so showing where it is gives nothing away.
        camera.setAutoRotate(false);
        setPaint({ fills: { [code]: colors.target }, outlines: {}, rings: tiny ? { [code]: colors.target } : {} });
        flyToCountry(code, 0.2, MAX_ZOOM_CONTEXT);
        setOnTap(null);
        break;
      case 'flag-name':
      case 'capital-country':
        setPaint(EMPTY_PAINT);
        camera.flyTo(continentsCenter(continents), 1).then(() => {
          if (current) camera.setAutoRotate(true);
        });
        setOnTap(null);
        break;
    }
    return stale;
  }, [question, result, continents, onTap, onArrive, setPaint, setOnTap]);

  useEffect(
    () => () => {
      setOnTap(null);
      setPaint(EMPTY_PAINT);
      camera.setAutoRotate(false);
    },
    [setOnTap, setPaint],
  );
}
