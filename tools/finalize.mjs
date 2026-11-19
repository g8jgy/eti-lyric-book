// Turn the aligner's output into the two rows of line times inside index.html.
// Usage: node finalize.mjs <timings.json> <index.html>
// The hand corrections below come from a closer listen (a re-transcription of the stretch around each one);
// they belong to the recording made on 2026-11-19 and must be redone if the song is regenerated.
import { readFileSync, writeFileSync } from 'node:fs';

const [, , timingsPath, htmlPath] = process.argv;
const { T, E } = JSON.parse(readFileSync(timingsPath, 'utf8'));

// cue index: [start, end]; null keeps the aligner's value
const FIX = {
  1: [null, 8.9],        // "...E-T-I townhall." (town hall was heard as two extra words)
  9: [49.66, 53.08],     // "Kristie's got a plan."
  10: [54.88, 57.34],    // "Tristan's building Folio," (missed in the first pass)
  11: [57.6, 60.6],      // "As fast as anyone can."
  34: [null, 127.9],     // "...the lakehouse,"
  55: [195.8, null],     // "Jesus has the hardware" starts on the name
  69: [223.7, null],     // "Mel is working Salesforce,"
  82: [259.5, null],     // "Maryanne's got the Champion team,"
  84: [263.9, null],     // "Katelyn's got the call center"
  86: [267.4, null],     // "Soo-Jin's a frequent flyer,"
  88: [270.9, null],     // "Auzair's deep in Folio,"
  90: [275.3, null],     // "Erin took the service desk"
  97: [299.8, 302.6],    // third whisper: not audible under the sax solo, placed two bars before verse five
  99: [308.4, 311.6],    // "And a brand-new Talent Hub."
  106: [null, 338.5],    // final chorus hook
  107: [338.6, null],    // "I'd still choose this team every time."
};
for (const [k, [s, e]] of Object.entries(FIX)) { if (s !== null) T[k] = s; if (e !== null) E[k] = e; }

// starts never run backwards, and a line ends no later than the next one begins
for (let i = 1; i < T.length; i++) if (T[i] < T[i - 1]) T[i] = T[i - 1];
for (let i = 0; i < T.length; i++) {
  if (E[i] < T[i]) E[i] = T[i] + 0.5;
  if (i + 1 < T.length && E[i] > T[i + 1]) E[i] = T[i + 1];
}

const row = a => '[' + a.map(v => +v.toFixed(2)).join(',') + ']';
let html = readFileSync(htmlPath, 'utf8');
const before = html;
html = html.replace(/const CUE_T = \[[^\]]*\];/, 'const CUE_T = ' + row(T) + ';');
html = html.replace(/const CUE_E = \[[^\]]*\];/, 'const CUE_E = ' + row(E) + ';');
if (html === before) { console.error('CUE_T / CUE_E rows not found or unchanged'); process.exit(1); }
writeFileSync(htmlPath, html);
console.log(T.length + ' lines written. First ' + T[0] + 's, last ' + T[T.length - 1] + 's to ' + E[E.length - 1] + 's.');
