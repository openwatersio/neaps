// Real-world validation fixtures: predict from published harmonic constants, compare
// to the tide authority's own official predictions. Friday Harbor (NOAA 9449880).
// Constituents come from @neaps/tide-database (sourced from NOAA); the comparison
// target is NOAA's live CO-OPS prediction API — an independent authority check.
import { stations } from '@neaps/tide-database';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const FIX = join(dirname(fileURLToPath(import.meta.url)), '..', 'Tests', 'TideEngineTests', 'Fixtures');
const write = (name, obj) => { writeFileSync(join(FIX, name), JSON.stringify(obj, null, 2) + '\n'); console.log('wrote', name); };

const BEGIN = '20260715', END = '20260717';
const startISO = '2026-07-15T00:00:00Z', endISO = '2026-07-17T23:59:00Z';

const fh = stations.find((s) => s.id === 'noaa/9449880');
const offset = fh.datums.MSL - fh.datums.MLLW; // shift MSL-relative harmonics to chart datum MLLW

const url = `https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?begin_date=${BEGIN}&end_date=${END}`
  + `&station=9449880&product=predictions&datum=MLLW&interval=hilo&units=metric&time_zone=gmt&format=json`;
const res = await fetch(url);
const data = await res.json();
const official = data.predictions.map((p) => ({
  time: p.t.replace(' ', 'T') + ':00Z',
  height: parseFloat(p.v),
  kind: p.type === 'H' ? 'high' : 'low',
}));

write('realworld-friday-harbor.json', {
  note: 'Friday Harbor NOAA 9449880. Constituents from @neaps/tide-database (NOAA source); '
    + 'official hi/lo from NOAA CO-OPS API (datum MLLW, GMT). offset = MSL-MLLW.',
  station: 'noaa/9449880',
  datum: 'MLLW',
  offset,
  start: startISO,
  end: endISO,
  constituents: fh.harmonic_constituents.map((c) => ({ name: c.name, amplitude: c.amplitude, phase: c.phase })),
  official,
});
console.log(`offset=${offset.toFixed(3)}m, ${official.length} official extremes, ${fh.harmonic_constituents.length} constituents`);
