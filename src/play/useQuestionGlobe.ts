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

function flyToCountry(code: string, fill: number) {
  const c = getCountry(code);
  return camera.flyTo([c.focus[0], c.focus[1]], GlobeCamera.zoomToFit(c.focus[2], fill));
}

/** What the globe shows for the current question and its answer (docs/specs/learning.md → Globe). */
export function useQuestionGlobe(
  question: Question | null,
  result: Result | null,
  continents: readonly Continent[],
  onTap: TapHandler,
) {
  const setPaint = useGlobeStore((s) => s.setPaint);
  const setOnTap = useGlobeStore((s) => s.setOnTap);

  useEffect(() => {
    if (!question) return;
    const code = question.country.code;
    const tiny = isTiny(question.country);

    if (result) {
      setOnTap(null);
      camera.setAutoRotate(false);
      const paint: Paint = {
        fills: { [code]: result.correct ? colors.correct : colors.target },
        outlines: { [code]: result.correct ? colors.correct : colors.target },
        rings: tiny ? { [code]: result.correct ? colors.correct : colors.target } : {},
      };
      if (result.givenCountry && result.givenCountry !== code) {
        paint.fills = { ...paint.fills, [result.givenCountry]: colors.wrong };
      }
      setPaint(paint);
      flyToCountry(code, 0.3);
      return;
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
        flyToCountry(code, 0.2);
        setOnTap(null);
        break;
      case 'flag-name':
      case 'capital-country':
        setPaint(EMPTY_PAINT);
        camera.flyTo(continentsCenter(continents), 1).then(() => camera.setAutoRotate(true));
        setOnTap(null);
        break;
    }
  }, [question, result, continents, onTap, setPaint, setOnTap]);

  useEffect(
    () => () => {
      setOnTap(null);
      setPaint(EMPTY_PAINT);
      camera.setAutoRotate(false);
    },
    [setOnTap, setPaint],
  );
}
