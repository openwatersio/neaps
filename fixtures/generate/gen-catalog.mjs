// Emit the constituent catalog as data (Sources/SlackwaterKit/Resources/catalog.json).
// The IHO Annex-B name decomposition + sign resolution runs HERE, in Slackwater, at build
// time; Swift consumes the resolved members and never needs the parser.
// Each entry: { name, speed, coefficients: [7 ints]|null, members: [[name, factor]]|null }.
import { constituents } from '@slackwater/engine';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { writeGenerated } from './write.mjs';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'swift', 'Sources', 'SlackwaterKit', 'Resources', 'catalog.json');

// constituents is a map that also includes aliases pointing at the same object.
// De-dup by identity, keyed on the canonical .name. Alias keys (e.g. NOAA's "NU2"
// for canonical "nu2") are captured so real station data resolves correctly.
const seen = new Map();
const aliases = {};
for (const key of Object.keys(constituents)) {
  const c = constituents[key];
  if (!c || !c.name) continue;
  if (key !== c.name) aliases[key] = c.name;
  if (seen.has(c.name)) continue;
  let members = null;
  try {
    const m = c.members;
    if (m && m.length) members = m.map((x) => ({ name: x.constituent.name, factor: x.factor }));
  } catch { members = null; }
  seen.set(c.name, {
    name: c.name,
    speed: c.speed,
    coefficients: c.coefficients ?? null,
    members,
  });
}

const entries = [...seen.values()].sort((a, b) => a.name.localeCompare(b.name));
writeGenerated(OUT, JSON.stringify({ note: 'Generated from @slackwater/engine. Members pre-resolved.', constituents: entries, aliases }) + '\n');
console.log(`${entries.length} constituents, ${Object.keys(aliases).length} aliases`);
