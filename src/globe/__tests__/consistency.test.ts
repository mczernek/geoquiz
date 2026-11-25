import { projectionFor, type CameraState } from '../camera';
import { lonLatToXyz, makeView, projectPoint } from '../projector';

describe('drawing and hit tests agree', () => {
  const state: CameraState = {
    center: [12, 48],
    zoom: 2.3,
    slot: { cx: 201, cy: 300, r: 170 },
    width: 402,
    height: 874,
    moving: false,
  };
  it.each([
    [-8, 53],
    [2.3, 48.8],
    [30, 10],
    [12, 48],
  ])('projects %d,%d to the same pixel', (lon, lat) => {
    const d3 = projectionFor(state)([lon, lat])!;
    const view = makeView(state.center, state.slot.r * state.zoom, state.slot.cx, state.slot.cy, 402, 874);
    const mine = projectPoint(view, ...lonLatToXyz(lon, lat))!;
    expect(mine[0]).toBeCloseTo(d3[0], 3);
    expect(mine[1]).toBeCloseTo(d3[1], 3);
  });
});
