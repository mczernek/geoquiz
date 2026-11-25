import { COUNTRIES, CONTINENTS, countriesIn } from '../countries';
import { FLAGS } from '../../data/flags';
import { buildQuestion, flagOptions } from '../questions';
import { cardKey } from '../scheduler';

describe('country data', () => {
  it('has 197 countries with a flag, a capital and a continent', () => {
    expect(COUNTRIES).toHaveLength(197);
    for (const c of COUNTRIES) {
      expect(FLAGS[c.code]).toBeDefined();
      expect(c.capitals.length).toBeGreaterThan(0);
      expect(CONTINENTS).toContain(c.continent);
    }
  });
  it('covers every country with the continents', () => {
    expect(countriesIn([...CONTINENTS])).toHaveLength(COUNTRIES.length);
  });
  it('has unique codes and names, in English and Polish', () => {
    expect(new Set(COUNTRIES.map((c) => c.code)).size).toBe(COUNTRIES.length);
    expect(new Set(COUNTRIES.map((c) => c.name)).size).toBe(COUNTRIES.length);
    expect(new Set(COUNTRIES.map((c) => c.namePl)).size).toBe(COUNTRIES.length);
  });
  it('has a Polish name for every capital', () => {
    for (const c of COUNTRIES) {
      expect(c.capitalsPl).toHaveLength(c.capitals.length);
      for (const name of c.capitalsPl) expect(name.trim()).toBe(name);
    }
  });
});

describe('questions', () => {
  it('offers four distinct flags including the right one', () => {
    const pl = COUNTRIES.find((c) => c.code === 'PL')!;
    const options = flagOptions(pl, Math.random);
    expect(options).toHaveLength(4);
    expect(new Set(options).size).toBe(4);
    expect(options).toContain('PL');
  });
  it('builds the variant for the mode', () => {
    expect(buildQuestion(cardKey('map', 'FR'), undefined, () => 0).variant).toBe('map-name');
    expect(buildQuestion(cardKey('map', 'FR'), undefined, () => 0.9).variant).toBe('map-locate');
    expect(buildQuestion(cardKey('capital', 'FR'), undefined, () => 0).variant).toBe('capital-of');
    const flag = buildQuestion(cardKey('flag', 'FR'), undefined, () => 0);
    expect(flag.variant).toBe('flag-pick');
    expect(flag.options).toContain('FR');
  });
});
