import { checkTyped, editDistance, normalize } from '../answer';
import { getCountry } from '../countries';

describe('normalize', () => {
  it.each([
    ['Côte d’Ivoire', 'cote d ivoire'],
    ['  The Gambia ', 'gambia'],
    ['Saint Lucia', 'st lucia'],
    ['St. Lucia', 'st lucia'],
    ['Bosnia & Herzegovina', 'bosnia and herzegovina'],
    ['Łódź', 'lodz'],
  ])('%s → %s', (input, expected) => expect(normalize(input)).toBe(expected));
});

describe('editDistance', () => {
  it('counts a transposition as one edit', () => expect(editDistance('fracne', 'france')).toBe(1));
  it('stops early above the limit', () => expect(editDistance('abcdef', 'uvwxyz', 1)).toBe(2));
});

describe('checkTyped', () => {
  const poland = getCountry('PL');
  it('accepts the name, aliases and Polish names', () => {
    for (const input of ['Poland', 'poland ', 'Polska', 'Republic of Poland']) {
      expect(checkTyped(input, poland, 'country')).toEqual({ correct: true, exact: true });
    }
  });
  it('forgives a typo in a long enough name', () => {
    expect(checkTyped('Polnad', poland, 'country')).toEqual({ correct: true, exact: false });
    expect(checkTyped('Kazakstan', getCountry('KZ'), 'country')).toEqual({ correct: true, exact: false });
  });
  it('rejects another country, even one typo away', () => {
    expect(checkTyped('Iran', getCountry('IQ'), 'country')).toEqual({ correct: false, matched: 'IR' });
    expect(checkTyped('Niger', getCountry('NG'), 'country')).toEqual({ correct: false, matched: 'NE' });
    expect(checkTyped('Australia', getCountry('AT'), 'country')).toEqual({ correct: false, matched: 'AU' });
    expect(checkTyped('Austria', getCountry('AU'), 'country')).toEqual({ correct: false, matched: 'AT' });
  });
  it('checks capitals, with every seat and exonyms', () => {
    expect(checkTyped('Warsaw', poland, 'capital').correct).toBe(true);
    expect(checkTyped('Warszawa', poland, 'capital').correct).toBe(true);
    expect(checkTyped('La Paz', getCountry('BO'), 'capital').correct).toBe(true);
    expect(checkTyped('Cape Town', getCountry('ZA'), 'capital').correct).toBe(true);
    expect(checkTyped('Sydney', getCountry('AU'), 'capital')).toEqual({ correct: false });
    expect(checkTyped('Kiev', getCountry('UA'), 'capital').correct).toBe(true);
  });
  it('accepts Polish names whatever the UI language', () => {
    expect(checkTyped('Niemcy', getCountry('DE'), 'country').correct).toBe(true);
    expect(checkTyped('Wegry', getCountry('HU'), 'country')).toEqual({ correct: true, exact: true });
    expect(checkTyped('Kamerun', getCountry('CM'), 'country').correct).toBe(true);
    expect(checkTyped('RPA', getCountry('ZA'), 'country').correct).toBe(true);
    expect(checkTyped('Kapsztad', getCountry('ZA'), 'capital').correct).toBe(true);
    expect(checkTyped('Pekin', getCountry('CN'), 'capital').correct).toBe(true);
    expect(checkTyped('Ułan Bator', getCountry('MN'), 'capital').correct).toBe(true);
  });
  it('does not take a bad translation as an answer', () => {
    // The source data gives Cameroon the Polish name of Côte d'Ivoire.
    expect(checkTyped('Wybrzeże Kości Słoniowej', getCountry('CM'), 'country')).toEqual({
      correct: false,
      matched: 'CI',
    });
    expect(checkTyped('Sudan', getCountry('SS'), 'country')).toEqual({ correct: false, matched: 'SD' });
  });
  it('rejects an empty answer', () => expect(checkTyped('  ', poland, 'country').correct).toBe(false));
  it('accepts common English variants', () => {
    expect(checkTyped('USA', getCountry('US'), 'country').correct).toBe(true);
    expect(checkTyped('Czech Republic', getCountry('CZ'), 'country').correct).toBe(true);
    expect(checkTyped("Côte d'Ivoire", getCountry('CI'), 'country').correct).toBe(true);
    expect(checkTyped('DR Congo', getCountry('CD'), 'country').correct).toBe(true);
    expect(checkTyped('Congo', getCountry('CG'), 'country').correct).toBe(true);
  });
});
