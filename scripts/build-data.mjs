#!/usr/bin/env node
// Builds the bundled geography data (docs/specs/data.md):
//   src/data/countries.json  quiz countries: names, capitals, continent, answer aliases
//   assets/geo/world.json    Natural Earth 1:50m borders as TopoJSON, three LODs (`high`, `mid`, `low`), ids = ISO alpha-2
// Sources: world-countries (mledoze, ODbL) and world-atlas (Natural Earth, public domain), both devDependencies.
// Run: pnpm data
import { writeFileSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { feature, quantize } from 'topojson-client';
import { topology } from 'topojson-server';
import { presimplify, simplify } from 'topojson-simplify';
import { geoArea, geoCentroid, geoDistance } from 'd3-geo';

const require = createRequire(import.meta.url);
const countries = require('world-countries');
const atlas = require('world-atlas/countries-50m.json');
const root = new URL('..', import.meta.url).pathname;

// UN members (the dataset counts the Holy See) plus Palestine, Kosovo and Taiwan (decision 004).
const EXTRA = new Set(['PS', 'XK', 'TW']);
const quiz = countries.filter((c) => c.unMember || EXTRA.has(c.cca2));

// Natural Earth features without an ISO numeric code, and breakaway areas counted as part of a country.
const FEATURE_OVERRIDES = { Kosovo: 'XK', Somaliland: 'SO', 'N. Cyprus': 'CY' };

// Capitals: first is shown, all are accepted. Fixes where the dataset lists only one seat of government.
const CAPITALS = {
  BO: ['Sucre', 'La Paz'],
  SZ: ['Mbabane', 'Lobamba'],
  LK: ['Sri Jayawardenepura Kotte', 'Colombo'],
  MY: ['Kuala Lumpur', 'Putrajaya'],
  ZA: ['Pretoria', 'Cape Town', 'Bloemfontein'],
  US: ['Washington, D.C.'],
  SM: ['San Marino'],
};

// Extra accepted spellings: common English variants and Polish exonyms (capitals have no translations in the dataset).
const COUNTRY_ALIASES = {
  US: ['America', 'United States of America', 'USA', 'US'],
  GB: ['UK', 'Britain', 'Great Britain', 'England'],
  CZ: ['Czech Republic'],
  CI: ["Cote d'Ivoire"],
  CD: ['Democratic Republic of the Congo', 'Congo Kinshasa', 'DRC'],
  CG: ['Congo', 'Congo Brazzaville', 'Republic of Congo'],
  VA: ['Holy See', 'Vatican'],
  CV: ['Cabo Verde'],
  TR: ['Turkiye', 'Türkiye'],
  MM: ['Burma'],
  SZ: ['Swaziland'],
  MK: ['Macedonia'],
  TL: ['East Timor'],
  KR: ['Korea'],
  FM: ['Federated States of Micronesia'],
  AE: ['UAE', 'Emirates'],
  BA: ['Bosnia'],
  VC: ['Saint Vincent', 'St Vincent and the Grenadines'],
  KN: ['St Kitts and Nevis', 'Saint Kitts'],
  LC: ['St Lucia'],
  NL: ['Holland', 'The Netherlands'],
  PS: ['State of Palestine'],
  TW: ['Republic of China'],
};
const CAPITAL_ALIASES = {
  UA: ['Kiev', 'Kijów'],
  PL: ['Warszawa'],
  CZ: ['Praha', 'Praga'],
  AT: ['Wien', 'Wiedeń'],
  DE: ['Berlin'],
  IT: ['Roma', 'Rzym'],
  DK: ['København', 'Kopenhaga'],
  BE: ['Bruxelles', 'Brussel', 'Bruksela'],
  PT: ['Lisboa', 'Lizbona'],
  RU: ['Moskwa', 'Moskva'],
  GR: ['Athina', 'Ateny'],
  RO: ['Bukareszt'],
  HU: ['Budapeszt'],
  BY: ['Mińsk'],
  LT: ['Wilno'],
  NO: ['Oslo'],
  SE: ['Sztokholm'],
  FI: ['Helsinki'],
  RS: ['Belgrad'],
  HR: ['Zagrzeb'],
  BG: ['Sofija'],
  MD: ['Kiszyniów', 'Kishinev'],
  EE: ['Tallinn'],
  LV: ['Ryga'],
  IE: ['Dublin'],
  GB: ['Londyn'],
  FR: ['Paryż'],
  ES: ['Madryt'],
  CH: ['Berno'],
  NL: ['Amsterdam'],
  IS: ['Reykjavik'],
  SK: ['Bratysława'],
  SI: ['Lublana'],
  MK: ['Skopie'],
  AL: ['Tirana'],
  ME: ['Podgorica'],
  CN: ['Peking', 'Pekin'],
  JP: ['Tokio'],
  IN: ['Delhi', 'Nowe Delhi'],
  US: ['Washington', 'Washington DC', 'Waszyngton'],
  MX: ['Mexico City', 'Meksyk'],
  IL: ['Jerozolima'],
  EG: ['Kair'],
  KZ: ['Nur-Sultan'],
  MM: ['Naypyitaw', 'Nay Pyi Taw'],
  CI: ['Yamusukro'],
  ZA: ['Pretoria'],
  SA: ['Rijad'],
  IR: ['Teheran'],
  IQ: ['Bagdad'],
  SY: ['Damaszek'],
  LB: ['Bejrut'],
  AF: ['Kabul'],
  TH: ['Krung Thep'],
  VN: ['Hanoi'],
  KR: ['Seul'],
  KP: ['Phenian'],
  CU: ['Hawana'],
  VA: ['Vatican', 'Watykan'],
  KW: ['Kuwait', 'Kuwejt'],
  SG: ['Singapur'],
  MC: ['Monako'],
  LU: ['Luksemburg'],
  DJ: ['Dżibuti'],
  GT: ['Gwatemala'],
  PA: ['Panama'],
  ST: ['Sao Tome'],
  PW: ['Melekeok'],
  NR: ['Yaren District'],
};

const CONTINENT_BY_SUBREGION = {
  'South America': 'south-america',
  'North America': 'north-america',
  'Central America': 'north-america',
  Caribbean: 'north-america',
};
function continentOf(c) {
  if (c.region === 'Americas') return CONTINENT_BY_SUBREGION[c.subregion];
  return { Africa: 'africa', Asia: 'asia', Europe: 'europe', Oceania: 'oceania' }[c.region];
}

const byNumeric = new Map(countries.filter((c) => c.ccn3).map((c) => [c.ccn3, c.cca2]));
const quizCodes = new Set(quiz.map((c) => c.cca2));

// Re-key the atlas: id = ISO alpha-2, dropping names to keep the bundle small.
const geometries = atlas.objects.countries.geometries.map((g) => {
  const code = FEATURE_OVERRIDES[g.properties.name] ?? byNumeric.get(g.id) ?? null;
  return { ...g, id: code ?? undefined, properties: {} };
});
const keyed = { ...atlas, objects: { countries: { ...atlas.objects.countries, geometries } } };
const features = feature(keyed, keyed.objects.countries).features;

// Merge features sharing a code (Somalia + Somaliland, Cyprus + N. Cyprus) into one TopoJSON object per code.
const merged = new Map();
for (const f of features) {
  const key = f.id ?? `_${merged.size}`;
  const prev = merged.get(key);
  if (!prev) {
    merged.set(key, f);
    continue;
  }
  const polys = (g) => (g.type === 'Polygon' ? [g.coordinates] : g.coordinates);
  prev.geometry = { type: 'MultiPolygon', coordinates: [...polys(prev.geometry), ...polys(f.geometry)] };
}
const collection = {
  type: 'FeatureCollection',
  features: [...merged.values()].map((f) => ({ type: 'Feature', id: f.id, properties: {}, geometry: f.geometry })),
};

// Three levels of detail, chosen by zoom (decision 006). Weights are planar areas in square
// degrees: points spanning less than `minArea` are dropped. Both are quantized (delta-encoded) to stay small.
function build(minArea) {
  let topo = topology({ countries: collection });
  if (minArea > 0) topo = simplify(presimplify(topo), minArea);
  topo.arcs = topo.arcs.map((arc) => arc.filter((p) => p.length < 3 || p[2] >= minArea).map(([x, y]) => [x, y]));
  return quantize(topo, 5e4);
}
const high = build(0);
const mid = build(0.02);
const low = build(0.2);

const byCode = new Map(collection.features.filter((f) => f.id).map((f) => [f.id, f]));

// Where the camera looks: the polygons at least 20% the size of the largest (mainland France without French Guiana,
// but all the main islands of Indonesia), as a center and an angular radius in degrees.
function focusOf(f) {
  const polys = (f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates).map(
    (coordinates) => ({ type: 'Polygon', coordinates }),
  );
  const largest = Math.max(...polys.map(geoArea));
  const main = {
    type: 'MultiPolygon',
    coordinates: polys.filter((p) => geoArea(p) >= largest * 0.2).map((p) => p.coordinates),
  };
  const center = geoCentroid(main);
  const radius = Math.max(...main.coordinates.flatMap((p) => p[0].map((v) => geoDistance(center, v))));
  return [...center, (radius * 180) / Math.PI].map((v) => Math.round(v * 1000) / 1000);
}

const out = quiz
  .map((c) => {
    const f = byCode.get(c.cca2);
    // Area in steradians; tiny countries get a tap target and a marker on the globe.
    const area = f ? geoArea(f) : 0;
    const aliases = new Set([
      c.name.common,
      c.name.official,
      ...c.altSpellings.filter((s) => s.length > 2),
      ...(c.translations.pol ? [c.translations.pol.common, c.translations.pol.official] : []),
      ...(COUNTRY_ALIASES[c.cca2] ?? []),
    ]);
    const capitals = CAPITALS[c.cca2] ?? c.capital;
    return {
      code: c.cca2,
      name: c.name.common,
      capitals,
      continent: continentOf(c),
      focus: f && area > 1e-6 ? focusOf(f) : [c.latlng[1], c.latlng[0], 0.5],
      area: Number(area.toPrecision(3)),
      hasShape: Boolean(f),
      aliases: [...aliases].filter((a) => a !== c.name.common),
      capitalAliases: [...new Set(CAPITAL_ALIASES[c.cca2] ?? [])],
    };
  })
  .sort((a, b) => a.name.localeCompare(b.name));

const missingContinent = out.filter((c) => !c.continent);
if (missingContinent.length) throw new Error(`No continent: ${missingContinent.map((c) => c.code)}`);
if (out.length !== 197) throw new Error(`Expected 197 countries, got ${out.length}`);
for (const code of Object.keys({ ...COUNTRY_ALIASES, ...CAPITAL_ALIASES, ...CAPITALS })) {
  if (!quizCodes.has(code)) throw new Error(`Alias for unknown country ${code}`);
}

mkdirSync(`${root}assets/geo`, { recursive: true });
writeFileSync(`${root}src/data/countries.json`, `${JSON.stringify(out, null, 1)}\n`);
writeFileSync(`${root}assets/geo/world.json`, JSON.stringify({ high, mid, low }));
console.log(
  `countries: ${out.length}, without shape: ${out.filter((c) => !c.hasShape).map((c) => c.code)}, ` +
    `geometries: ${collection.features.length}`,
);
