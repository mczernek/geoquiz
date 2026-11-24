import { COUNTRIES, getCountry, type Country } from './countries';
import { parseCardKey, type CardKey, type CardState } from './scheduler';

/**
 * Question variants (docs/specs/learning.md):
 * - flag-pick: country name → choose its flag from four
 * - flag-name: flag → type the country
 * - capital-of: country → type its capital
 * - capital-country: capital → type the country
 * - map-name: highlighted country on the globe → type its name
 * - map-locate: country name → tap it on the globe
 */
export type Variant = 'flag-pick' | 'flag-name' | 'capital-of' | 'capital-country' | 'map-name' | 'map-locate';

export interface Question {
  key: CardKey;
  variant: Variant;
  country: Country;
  /** flag-pick only: four codes in display order, one of them correct. */
  options?: string[];
}

export function chooseVariant(key: CardKey, card: CardState | undefined, random: () => number): Variant {
  const parsed = parseCardKey(key);
  if (!parsed) throw new Error(`Bad card ${key}`);
  const box = card?.box ?? 0;
  const r = random();
  switch (parsed.mode) {
    case 'flag':
      // Recognizing comes before recalling: new cards mostly pick, known cards mostly type.
      return r < (box <= 1 ? 0.7 : 0.3) ? 'flag-pick' : 'flag-name';
    case 'capital':
      return r < 0.75 ? 'capital-of' : 'capital-country';
    case 'map':
      return r < 0.5 ? 'map-name' : 'map-locate';
  }
}

export function flagOptions(country: Country, random: () => number): string[] {
  // Distractors from the same continent are harder and more useful; top up from anywhere.
  const shuffle = <T,>(items: T[]) => {
    for (let i = items.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [items[i], items[j]] = [items[j], items[i]];
    }
    return items;
  };
  const near = shuffle(COUNTRIES.filter((c) => c.continent === country.continent && c.code !== country.code));
  const far = shuffle(COUNTRIES.filter((c) => c.continent !== country.continent));
  const distractors = [...near, ...far].slice(0, 3).map((c) => c.code);
  return shuffle([country.code, ...distractors]);
}

export function buildQuestion(key: CardKey, card: CardState | undefined, random: () => number = Math.random): Question {
  const parsed = parseCardKey(key);
  if (!parsed) throw new Error(`Bad card ${key}`);
  const country = getCountry(parsed.code);
  const variant = chooseVariant(key, card, random);
  return {
    key,
    variant,
    country,
    options: variant === 'flag-pick' ? flagOptions(country, random) : undefined,
  };
}
