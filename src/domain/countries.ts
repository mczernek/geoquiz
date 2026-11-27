import data from '@/data/countries.json';

export const CONTINENTS = ['africa', 'asia', 'europe', 'north-america', 'south-america', 'oceania'] as const;
export type Continent = (typeof CONTINENTS)[number];

export interface Country {
  code: string;
  name: string;
  namePl: string;
  /** First is displayed; all are accepted. */
  capitals: string[];
  /** Polish names of `capitals`, same order. */
  capitalsPl: string[];
  continent: Continent;
  /** Where the camera looks: [longitude, latitude, angular radius in degrees] of the main landmass. */
  focus: [number, number, number];
  /** Area in steradians (0 when the map has no shape). */
  area: number;
  hasShape: boolean;
  aliases: string[];
  capitalAliases: string[];
}

export const COUNTRIES: readonly Country[] = data as Country[];

const byCode = new Map(COUNTRIES.map((c) => [c.code, c]));

export function countryByCode(code: string): Country | undefined {
  return byCode.get(code);
}

export function getCountry(code: string): Country {
  const country = byCode.get(code);
  if (!country) throw new Error(`Unknown country ${code}`);
  return country;
}

export function countriesIn(continents: readonly Continent[]): Country[] {
  const set = new Set(continents);
  return COUNTRIES.filter((c) => set.has(c.continent));
}

/** Countries too small to tap reliably get a marker and a generous tap target (decision 007). */
export const TINY_AREA = 2e-5;
export function isTiny(country: Country): boolean {
  return country.area < TINY_AREA;
}

/** The middle of a group of countries and how far (degrees) they reach from it: what the camera frames. */
export function frameOf(codes: readonly string[]): { center: [number, number]; radius: number } {
  const points = codes.map((code) => {
    const c = getCountry(code);
    const lon = (c.focus[0] * Math.PI) / 180;
    const lat = (c.focus[1] * Math.PI) / 180;
    return { v: [Math.cos(lat) * Math.cos(lon), Math.cos(lat) * Math.sin(lon), Math.sin(lat)], reach: c.focus[2] };
  });
  const sum = [0, 1, 2].map((i) => points.reduce((s, p) => s + p.v[i], 0));
  const len = Math.hypot(sum[0], sum[1], sum[2]) || 1;
  const mid = sum.map((x) => x / len);
  const radius = Math.max(
    0,
    ...points.map((p) => {
      const cos = Math.min(1, p.v[0] * mid[0] + p.v[1] * mid[1] + p.v[2] * mid[2]);
      return (Math.acos(cos) * 180) / Math.PI + p.reach;
    }),
  );
  return {
    center: [
      (Math.atan2(mid[1], mid[0]) * 180) / Math.PI,
      (Math.atan2(mid[2], Math.hypot(mid[0], mid[1])) * 180) / Math.PI,
    ],
    radius,
  };
}
