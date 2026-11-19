// Align the printed lyric lines (cues.json) to the local transcript (transcript.json).
// Usage: node align.mjs <cues.json> <transcript.json> <timings.json>
// Prints a line-by-line report so the result can be checked by eye.
import { readFileSync, writeFileSync } from 'node:fs';

const [, , cuesPath, trPath, outPath] = process.argv;
const cues = JSON.parse(readFileSync(cuesPath, 'utf8'));
const tr = JSON.parse(readFileSync(trPath, 'utf8'));

const DIGITS = { 0: 'zero', 1: 'one', 2: 'two', 3: 'three', 4: 'four', 5: 'five', 6: 'six', 7: 'seven', 8: 'eight', 9: 'nine' };

function tokens(raw) {
  let s = raw.replace(/[’']/g, '');
  // letter spellings and short acronyms become single letters: E-T-I, API, ERP
  s = s.replace(/\b([A-Z])[-. ]([A-Z])[-. ]([A-Z])\b\.?/g, '$1 $2 $3');
  s = s.replace(/\b[A-Z]{2,4}\b/g, m => m.split('').join(' '));
  s = s.replace(/([A-Za-z])(\d)/g, '$1 $2').replace(/(\d)([A-Za-z])/g, '$1 $2');
  s = s.replace(/\d/g, d => ' ' + DIGITS[d] + ' ');
  return s.toLowerCase().replace(/[^a-z]+/g, ' ').trim().split(' ').filter(Boolean);
}

const SOUND = { a: ['a', 'ay', 'ayy', 'hey', 'eh'], p: ['p', 'pee', 'pea', 'be', 'pi'], i: ['i', 'eye', 'aye', 'ai'], e: ['e', 'ee', 'he'], t: ['t', 'tea', 'tee', 'ti'], r: ['r', 'are', 'our'] };

function lev(a, b) {
  const m = a.length, n = b.length;
  if (!m) return n; if (!n) return m;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const row = [i];
    for (let j = 1; j <= n; j++) row[j] = Math.min(prev[j] + 1, row[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = row;
  }
  return prev[n];
}
function sim(a, b) {
  if (a === b) return 2;
  if (a.length === 1 && SOUND[a] && SOUND[a].includes(b)) return 1.5;
  if (a.length < 3 || b.length < 3) return -1;
  const r = 1 - lev(a, b) / Math.max(a.length, b.length);
  return r >= 0.6 ? 1 : -1;
}

// lyric tokens
const L = [];
cues.forEach(([i, , , text]) => tokens(text).forEach(t => L.push({ t, cue: i })));
// transcript tokens
const W = [];
tr.segments.forEach(seg => (seg.words || []).forEach(w => {
  const ts = tokens(w.w);
  ts.forEach((t, k) => {
    const d = (w.e - w.s) / ts.length;
    W.push({ t, s: w.s + d * k, e: w.s + d * (k + 1), p: w.p, raw: w.w });
  });
}));

// global alignment
const GAP_L = -1, GAP_W = -0.6;
const n = L.length, m = W.length;
const S = Array.from({ length: n + 1 }, () => new Float32Array(m + 1));
const B = Array.from({ length: n + 1 }, () => new Uint8Array(m + 1));
for (let i = 1; i <= n; i++) { S[i][0] = i * GAP_L; B[i][0] = 1; }
for (let j = 1; j <= m; j++) { S[0][j] = j * GAP_W; B[0][j] = 2; }
for (let i = 1; i <= n; i++) {
  for (let j = 1; j <= m; j++) {
    const d = S[i - 1][j - 1] + sim(L[i - 1].t, W[j - 1].t);
    const u = S[i - 1][j] + GAP_L;
    const l = S[i][j - 1] + GAP_W;
    if (d >= u && d >= l) { S[i][j] = d; B[i][j] = 0; }
    else if (u >= l) { S[i][j] = u; B[i][j] = 1; }
    else { S[i][j] = l; B[i][j] = 2; }
  }
}
const pair = new Array(n).fill(-1);
const usedW = new Array(m).fill(false);
for (let i = n, j = m; i > 0 || j > 0;) {
  const b = B[i][j];
  if (b === 0) { if (sim(L[i - 1].t, W[j - 1].t) > 0) { pair[i - 1] = j - 1; usedW[j - 1] = true; } i--; j--; }
  else if (b === 1) i--;
  else j--;
}

// per-cue times
const res = cues.map(([i, page, kind, text]) => ({ i, page, kind, text, s: null, e: null, hit: 0, n: 0, heard: [] }));
L.forEach((tok, k) => {
  const r = res[tok.cue]; r.n++;
  const j = pair[k];
  if (j >= 0) { r.hit++; const w = W[j]; r.s = r.s === null ? w.s : Math.min(r.s, w.s); r.e = r.e === null ? w.e : Math.max(r.e, w.e); r.heard.push(w.raw); }
});
// fill unmatched cues by spreading them across the gap between their matched neighbours
for (let a = 0; a < res.length; a++) {
  if (res[a].s !== null) continue;
  let b = a; while (b < res.length && res[b].s === null) b++;
  const t0 = a > 0 ? res[a - 1].e : 0;
  const t1 = b < res.length ? res[b].s : tr.duration;
  const total = res.slice(a, b).reduce((x, r) => x + r.n, 0) || 1;
  let acc = 0;
  for (let k = a; k < b; k++) { const r = res[k]; r.s = t0 + (t1 - t0) * (acc / total); acc += r.n; r.e = t0 + (t1 - t0) * (acc / total); r.guess = true; }
  a = b - 1;
}

const f = x => x.toFixed(2).padStart(7);
res.forEach((r, k) => {
  const gap = k ? r.s - res[k - 1].e : r.s;
  console.log(`#${String(r.i).padStart(3)} p${String(r.page + 1).padStart(2)} ${f(r.s)}-${f(r.e)} gap${f(gap)} ${r.guess ? 'GUESS' : (r.hit + '/' + r.n).padStart(5)}  ${r.text}  <<  ${r.heard.join(' ')}`);
});
const extra = W.filter((w, j) => !usedW[j]);
console.log('\nHEARD BUT NOT IN THE PRINTED LYRICS (' + extra.length + ' tokens):');
let line = [], last = -10;
extra.forEach(w => { if (w.s - last > 4 && line.length) { console.log('  ' + line.join(' ')); line = []; } line.push(`${w.raw}@${w.s.toFixed(1)}`); last = w.s; });
if (line.length) console.log('  ' + line.join(' '));
const hit = res.reduce((x, r) => x + r.hit, 0), tot = res.reduce((x, r) => x + r.n, 0);
console.log(`\nmatched ${hit}/${tot} lyric tokens (${Math.round(100 * hit / tot)}%), ${res.filter(r => r.guess).length} lines guessed, duration ${tr.duration.toFixed(1)}s`);

writeFileSync(outPath, JSON.stringify({ T: res.map(r => +r.s.toFixed(2)), E: res.map(r => +r.e.toFixed(2)), guess: res.filter(r => r.guess).map(r => r.i) }));
