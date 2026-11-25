import { normalize } from './answer';
import { COUNTRIES, type Country } from './countries';

interface Entry {
  country: Country;
  names: string[];
  capitals: string[];
}

let index: Entry[] | null = null;
function entries(): Entry[] {
  index ??= COUNTRIES.map((country) => ({
    country,
    names: [country.name, country.namePl, ...country.aliases].map(normalize),
    capitals: [...country.capitals, ...country.capitalsPl, ...country.capitalAliases].map(normalize),
  }));
  return index;
}

/**
 * Countries matching a typed query by any name or capital, in either language (Explore → search). Names starting
 * with the query rank first, then words starting with it, then capitals; ties keep alphabetical order.
 */
export function searchCountries(query: string, limit = 6): Country[] {
  const q = normalize(query);
  if (!q) return [];
  const rank = (texts: string[], base: number) => {
    if (texts.some((t) => t.startsWith(q))) return base;
    if (texts.some((t) => t.split(' ').some((w) => w.startsWith(q)))) return base + 1;
    return Infinity;
  };
  return entries()
    .map((e) => ({ e, score: Math.min(rank(e.names, 0), rank(e.capitals, 2)) }))
    .filter((r) => r.score < Infinity)
    .sort((a, b) => a.score - b.score)
    .slice(0, limit)
    .map((r) => r.e.country);
}
