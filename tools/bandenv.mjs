// Print loudness envelopes for a few windows of the song, so quiet whispered parts can be located.
// Usage: node bandenv.mjs <audio> <start:dur> [<start:dur> ...]
import { execFileSync } from 'node:child_process';
import path from 'node:path';

const ffmpeg = path.join(process.env.LOCALAPPDATA, 'Programs', 'ffmpeg', 'bin', 'ffmpeg.exe');
const [, , audio, ...wins] = process.argv;
const SR = 16000, FRAME = 0.1;
const RAMP = ' .:-=+*#%@';

function env(start, dur, filter) {
  const args = ['-v', 'error', '-ss', String(start), '-t', String(dur), '-i', audio];
  if (filter) args.push('-af', filter);
  args.push('-ac', '1', '-ar', String(SR), '-f', 's16le', '-');
  const buf = execFileSync(ffmpeg, args, { maxBuffer: 1 << 28 });
  const n = Math.floor(buf.length / 2), per = Math.round(SR * FRAME), out = [];
  for (let i = 0; i + per <= n; i += per) {
    let s = 0;
    for (let k = 0; k < per; k++) { const v = buf.readInt16LE((i + k) * 2) / 32768; s += v * v; }
    out.push(Math.sqrt(s / per));
  }
  return out;
}
const bar = (a, max) => a.map(v => RAMP[Math.min(RAMP.length - 1, Math.floor((v / max) * (RAMP.length - 0.001)))]).join('');

for (const w of wins) {
  const [start, dur] = w.split(':').map(Number);
  const full = env(start, dur, null);
  const hiss = env(start, dur, 'highpass=f=4500,lowpass=f=7800');
  const voice = env(start, dur, 'highpass=f=1200,lowpass=f=3600');
  const ratio = hiss.map((v, i) => v / (full[i] + 1e-4));
  const ticks = Array.from({ length: full.length }, (_, i) => (i % 10 === 0 ? String(Math.floor((start + i * FRAME) % 100 / 10)) : (i % 5 === 0 ? '+' : '-'))).join('');
  console.log(`\nwindow ${start}s to ${start + dur}s (one column = ${FRAME}s, digit = tens of seconds mark every 1s)`);
  console.log('time   ' + ticks);
  console.log('full   ' + bar(full, Math.max(...full)) + '  max ' + Math.max(...full).toFixed(3));
  console.log('voice  ' + bar(voice, Math.max(...voice)) + '  max ' + Math.max(...voice).toFixed(3));
  console.log('hiss   ' + bar(hiss, Math.max(...hiss)) + '  max ' + Math.max(...hiss).toFixed(4));
  console.log('hiss/f ' + bar(ratio, Math.max(...ratio)) + '  max ' + Math.max(...ratio).toFixed(3));
}
