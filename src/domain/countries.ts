import data from '@/data/countries.json';

export const CONTINENTS = ['africa', 'asia', 'europe', 'north-america', 'south-america', 'oceania'] as const;
export type Continent = (typeof CONTINENTS)[number];

export const CONTINENT_NAMES: Record<Continent, string> = {
  africa: 'Africa',
  asia: 'Asia',
  europe: 'Europe',
  'north-america': 'North America',
  'south-america': 'South America',
  oceania: 'Oceania',
};

export interface Country {
  code: string;
  name: string;
  /** First is displayed; all are accepted. */
  capitals: string[];
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
