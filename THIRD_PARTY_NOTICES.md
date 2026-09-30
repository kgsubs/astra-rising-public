# Third-party notices

Everything below was checked directly against the bundled files
(`public/vendor/fonts/*`, via each font's own embedded name/license table)
on 2026-09-30, not assumed from general knowledge about the font names.

## Fonts

### Audiowide

- Files: `public/vendor/fonts/audiowide-regular.woff2` (Latin subset)
- License: SIL Open Font License 1.1 (OFL). Full license text:
  `public/vendor/fonts/OFL-Audiowide.txt`.
- Copyright: 2012 Brian J. Bonislawsky DBA Astigmatic (AOETI), with Reserved
  Font Name "Audiowide"

### Karla

- Files: `public/vendor/fonts/karla-*.woff2`
- License: SIL Open Font License 1.1 (OFL), per the font's own embedded
  license URL: https://scripts.sil.org/OFL. Full license text:
  `public/vendor/fonts/OFL-Karla.txt`, fetched from
  github.com/google/fonts (`ofl/karla/OFL.txt`).
- Copyright: 2019 The Karla Project Authors
  (https://github.com/googlefonts/karla)

### Roboto Mono

- Files: `public/vendor/fonts/roboto-mono-*.woff2`. (Plain Roboto, not just
  Roboto Mono, was bundled here until this pass: `fonts.css` defines no
  `@font-face` for it and nothing in `public/` references the files, so the
  9 unused plain-Roboto subsets were removed rather than documented as
  shipped.)
- License: SIL Open Font License 1.1 (OFL), per the font's own embedded
  license URL: https://openfontlicense.org. (Roboto Mono shipped under the
  Apache License 2.0 for years; Google relicensed it to the OFL, and the
  bundled files here already carry the OFL license URL, not Apache's; the
  google/fonts repo's own `apache/robotomono` directory is gone, confirming
  the family now lives under `ofl/`.) Full license text:
  `public/vendor/fonts/OFL-RobotoMono.txt`, fetched from
  github.com/google/fonts (`ofl/robotomono/OFL.txt`).
- Copyright: 2015 The Roboto Mono Project Authors
  (https://github.com/googlefonts/robotomono)

## JavaScript libraries

Vendored as static files under `public/vendor/`, not installed through npm.

### React / ReactDOM

- Files: `public/vendor/react.production.min.js`,
  `public/vendor/react-dom.production.min.js`
- License: MIT, per the file's own header (`@license React`).
- Copyright: Facebook, Inc. and its affiliates.

### lucide-react

- File: `public/vendor/lucide-react.slim.js` (a trimmed build, only the
  icons `public/app.js` destructures)
- License: ISC, per the file's own header (`@license lucide-react v0.383.0 - ISC`).

## Images

`public/data/images/*.jpg` / `*.webp` (character race portraits) are
project assets. Their origin (how they were made and under what rights)
is not documented anywhere in this repo, in either the file names, a
credits file, or the planning history. Flagged rather than asserted.
