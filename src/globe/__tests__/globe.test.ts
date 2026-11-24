import { GlobeCamera, type CameraState } from '../camera';
import { countryAt, getWorld } from '../geo';
import { computeFrame, EMPTY_PAINT } from '../scene';

describe('countryAt', () => {
  it.each([
    [[21.01, 52.23], 'PL'],
    [[2.35, 48.86], 'FR'],
    [[-100, 40], 'US'],
    [[44.4, 33.3], 'IQ'],
    [[51.4, 35.7], 'IR'],
    [[45.0, 10.0], 'SO'], // Somaliland counts as Somalia
    [[-30, 30], null], // Atlantic
    [[-42, 72], null], // Greenland is not a quiz country
  ])('%j → %s', (point, code) => expect(countryAt(point as [number, number])).toBe(code));
});

describe('computeFrame', () => {
  const state: CameraState = {
    center: [15, 45],
    zoom: 1,
    slot: { cx: 200, cy: 300, r: 180 },
    width: 400,
    height: 800,
    moving: false,
  };
  it('draws land, borders and tiny-country markers', () => {
    getWorld();
    const frame = computeFrame(state, { ...EMPTY_PAINT, fills: { PL: '#f00' }, outlines: { PL: '#0f0' } });
    expect(frame.land.find((l) => l.color === '#f00')?.d).toMatch(/^M\d+,\d+L/);
    expect(frame.outlines).toHaveLength(1);
    expect(frame.borders.length).toBeGreaterThan(1000);
    expect(frame.graticule).toMatch(/^M/);
    expect(frame.markers.length).toBeGreaterThan(3); // Vatican, San Marino, Monaco, Liechtenstein, Malta…
    expect(frame.r).toBe(180);
  });
  it('is fast enough to draw every frame while moving', () => {
    const t0 = performance.now();
    for (let i = 0; i < 20; i++) computeFrame({ ...state, center: [i * 9, 20], moving: true }, EMPTY_PAINT);
    const moving = (performance.now() - t0) / 20;
    const t1 = performance.now();
    for (let i = 0; i < 20; i++) computeFrame({ ...state, center: [i * 9, 20] }, EMPTY_PAINT);
    const rest = (performance.now() - t1) / 20;
    const t2 = performance.now();
    for (let i = 0; i < 20; i++) computeFrame({ ...state, zoom: 8, center: [10 + i, 50] }, EMPTY_PAINT);
    const zoomed = (performance.now() - t2) / 20;
    console.log(`frame: moving ${moving.toFixed(1)} ms, rest ${rest.toFixed(1)} ms, zoomed ${zoomed.toFixed(1)} ms`);
    expect(moving).toBeLessThan(10);
  });
});

describe('GlobeCamera.zoomToFit', () => {
  it('zooms in on small countries and not on big ones', () => {
    expect(GlobeCamera.zoomToFit(37)).toBe(1);
    expect(GlobeCamera.zoomToFit(5)).toBeGreaterThan(4);
    expect(GlobeCamera.zoomToFit(0.1)).toBe(14);
  });
});

describe('projectRing', () => {
  const { makeRing, makeView, projectRing } = jest.requireActual<typeof import('../projector')>('../projector');
  const view = makeView([0, 0], 100, 200, 200, 400, 400);
  it('projects a visible ring to an identical fill and stroke', () => {
    const p = projectRing(makeRing([[0, 0], [10, 0], [10, 10], [0, 0]], true), view);
    expect(p.fill).toBe('M800,800L869,800L868,731L800,800Z');
    expect(p.stroke).toBe(p.fill);
  });
  it('skips rings on the far side', () => {
    expect(projectRing(makeRing([[170, 0], [175, 0], [175, 5], [170, 0]], true), view)).toEqual({ fill: '', stroke: '' });
  });
  it('closes a ring crossing the horizon along the edge, and strokes only the visible part', () => {
    const p = projectRing(makeRing([[80, 0], [100, 0], [100, 10], [80, 10], [80, 0]], true), view);
    expect(p.fill).toMatch(/Z$/);
    expect(p.stroke.split('M')).toHaveLength(3); // two visible pieces, cut at the horizon
    expect(p.stroke).toContain('L1200,800'); // the horizon (x = 200 + 100 px) at the equator
  });
  it('does not stroke cuts along the antimeridian', () => {
    const view2 = makeView([180, 0], 100, 200, 200, 400, 400);
    const p = projectRing(makeRing([[170, 0], [180, 0], [180, 10], [170, 10], [170, 0]], true), view2);
    expect(p.stroke.split('M').length).toBeGreaterThan(1);
    expect(p.stroke).not.toBe(p.fill);
  });
});
