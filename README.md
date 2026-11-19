# Another Great Day in E-T-I: The Lyric Book

A page-turning lyric booklet for the love-song version of "Another Great Day in E-T-I",
written for the Enterprise Technology & Intelligence team at Great Day Improvements.
Press play and the book opens, turns its own pages and underlines the line being sung.

Live: https://g8jgy.github.io/eti-lyric-book/

## What is here

- `index.html` is the source page (one file, no build step for the page itself).
- `docs/` is the published site: the same page wrapped as a full HTML document, the song, and the link-preview image.
- `tools/` holds the small scripts used to build and time it.

## Updating the site

1. Edit `index.html`.
2. Run `node tools/build-pages.mjs` to rebuild `docs/`.
3. Commit, push `main`, then publish the site branch: `git subtree push --prefix docs origin gh-pages`.

Local preview: `node tools/serve.mjs 8805`, then open http://localhost:8805.

## How the lyrics are timed to the song

The line times inside `index.html` (`CUE_T` and `CUE_E`) were measured from the recording:

1. `tools/transcribe.py` transcribes the song locally with word-level timestamps (faster-whisper).
2. `tools/align.mjs` matches the printed lines in `tools/cues.json` to those words and prints a report.
3. `tools/finalize.mjs` applies a few hand corrections and writes the times into `index.html`.

If the song is regenerated, all three steps need to be run again.

The song was generated with Suno from lyrics written for the team.
