import { searchCountries } from '../search';

const codes = (q: string) => searchCountries(q).map((c) => c.code);

describe('searchCountries', () => {
  it('finds by English or Polish name, ignoring accents', () => {
    expect(codes('germ')[0]).toBe('DE');
    expect(codes('niem')[0]).toBe('DE');
    expect(codes('wegry')).toEqual(['HU']);
  });
  it('finds by capital', () => {
    expect(codes('Warszawa')).toEqual(['PL']);
    expect(codes('canberra')).toEqual(['AU']);
  });
  it('ranks name matches before capital matches', () => {
    // "Pan…": Panama by name before anything whose capital starts with it.
    expect(codes('panam')[0]).toBe('PA');
  });
  it('matches the start of later words', () => expect(codes('zealand')).toContain('NZ'));
  it('returns nothing for an empty query', () => expect(searchCountries('  ')).toEqual([]));
  it('limits the results', () => expect(searchCountries('a', 3)).toHaveLength(3));
});
