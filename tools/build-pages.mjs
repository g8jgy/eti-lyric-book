// Build the standalone copy of the lyric book for GitHub Pages, into docs/.
// index.html is written as an artifact page (no doctype or head); this wraps it into a full document,
// adds the link-preview tags, and copies the song next to it.
// Usage: node tools/build-pages.mjs [site-url]
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SITE = (process.argv[2] || 'https://g8jgy.github.io/eti-lyric-book/').replace(/\/?$/, '/');
const SONG = 'another-great-day-love-song.mp3';

const src = readFileSync(path.join(root, 'index.html'), 'utf8');
const cut = src.indexOf('<div class="app">');
if (cut < 0) throw new Error('page body not found in index.html');
const head = src.slice(0, cut).replace(/<meta name="claude:viewport-fit-sides"[^>]*>\s*/, '').trim();
const body = src.slice(cut).trim();

const desc = 'A love song for Enterprise Technology &amp; Intelligence. Press play and the book follows along.';
const icon = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Ccircle cx='32' cy='32' r='31' fill='%230b0608'/%3E%3Ccircle cx='32' cy='32' r='22' fill='none' stroke='%232a1c20' stroke-width='1'/%3E%3Ccircle cx='32' cy='32' r='13' fill='%237c1535'/%3E%3Ccircle cx='32' cy='32' r='11.4' fill='none' stroke='%23e3ba6a' stroke-width='1'/%3E%3Ccircle cx='32' cy='32' r='2.2' fill='%230b0608'/%3E%3C/svg%3E";

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex, nofollow">
<meta name="theme-color" content="#0d060a">
<meta name="description" content="${desc}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="The Lyric Book">
<meta property="og:title" content="Another Great Day in E-T-I">
<meta property="og:description" content="${desc}">
<meta property="og:url" content="${SITE}">
<meta property="og:image" content="${SITE}og.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="${icon}">
<style>:root{padding:env(safe-area-inset-top,0px) 0 env(safe-area-inset-bottom,0px)}img{max-width:100%}[hidden]{display:none!important}</style>
${head}
</head>
<body>
${body}
</body>
</html>
`;

const out = path.join(root, 'docs');
mkdirSync(out, { recursive: true });
writeFileSync(path.join(out, 'index.html'), html);
writeFileSync(path.join(out, '.nojekyll'), '');
const song = path.join(root, 'audio', SONG);
if (existsSync(song)) copyFileSync(song, path.join(out, SONG));
else if (!existsSync(path.join(out, SONG))) console.warn('warning: ' + SONG + ' is in neither audio/ nor docs/');
console.log('docs/index.html written (' + html.length + ' chars) for ' + SITE);
