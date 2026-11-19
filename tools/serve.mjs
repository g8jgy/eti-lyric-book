// Local preview for the lyric book. The published artifact wraps index.html in a
// small page skeleton; this serves the same wrapping so the preview matches.
// The song is served from audio/ with byte-range support, as a real host would.
import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const port = Number(process.argv[2] || 8805);
const head = '<!doctype html><html><head><meta charset="utf-8">'
  + '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">'
  + '<style>:root{color-scheme:light;padding:env(safe-area-inset-top,0px) 0 env(safe-area-inset-bottom,0px)}'
  + 'body{margin:0;font:14px system-ui,sans-serif}img{max-width:100%}[hidden]{display:none!important}</style>'
  + '</head><body>';

async function sendSong(req, res, name) {
  const file = path.join(root, 'audio', path.basename(name));
  const info = await stat(file);
  const m = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || '');
  const base = { 'content-type': 'audio/mpeg', 'accept-ranges': 'bytes', 'cache-control': 'no-store' };
  if (m && (m[1] || m[2])) {
    const start = m[1] ? Number(m[1]) : Math.max(0, info.size - Number(m[2]));
    const end = m[1] && m[2] ? Math.min(Number(m[2]), info.size - 1) : info.size - 1;
    res.writeHead(206, { ...base, 'content-range': `bytes ${start}-${end}/${info.size}`, 'content-length': end - start + 1 });
    createReadStream(file, { start, end }).pipe(res);
  } else {
    res.writeHead(200, { ...base, 'content-length': info.size });
    createReadStream(file).pipe(res);
  }
}

http.createServer(async (req, res) => {
  try {
    const url = decodeURIComponent((req.url || '/').split('?')[0]);
    if (url.endsWith('.mp3')) { await sendSong(req, res, url); return; }
    const body = await readFile(path.join(root, 'index.html'), 'utf8');
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
    res.end(head + body + '</body></html>');
  } catch (err) {
    res.writeHead(err && err.code === 'ENOENT' ? 404 : 500, { 'content-type': 'text/plain; charset=utf-8' });
    res.end(String(err));
  }
}).listen(port, '127.0.0.1', () => {
  console.log('Lyric book preview on http://127.0.0.1:' + port);
});
