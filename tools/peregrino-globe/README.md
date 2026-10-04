# Peregrino globe textures

Builds `peregrino/assets/globe/` from the Peregrino app itself, so the site's
globe is drawn from the same data and the same recipe as the app's.

```
node tools/peregrino-globe/build.js <path to the peregrinoApp repo>
```

Needs Node 18+, Playwright with its Chromium
(`npm i -g playwright && npx playwright install chromium`) and ImageMagick.
It takes about twenty seconds.

| File | What it is |
|---|---|
| `build.js` | Reads the app's countries (`CountryKit/CountryData`, `countries.geojson`, `Models/ISOCodeMapping.swift`), runs `gen.js` in a headless page, converts and writes the assets. |
| `gen.js` | A port of `Home/Globe/GlobeTextureGenerator.swift` and `GlobeTheme.earth`: height map, ocean gradient, coastal shelf glow, deep-ocean mottling, ocean dots, per-country land colours, borders, foam, ambient occlusion, and the country id map. |

Out of it come:

- `base-4096.webp`, `base-2048.webp`, the world's colour texture
- `ids-4096.png`, `ids-2048.png`, one country index per texel (no antialiasing)
- `height.png`, the 720 × 360 height map the mesh is displaced by
- `europe-base.webp`, `europe-ids.png`, a 4096 × 2048 window over Europe
  (`EUROPE` in `build.js`, which `globe.js` must match) for the close-ups
- `countries.json`, simplified outlines with each country's id, codes, name,
  continent and natural land colour, used for the hit tests, the stamps and the
  passport map

Distances and sizes are kept in the app's own texels (its texture is 2048
wide) and scaled to the output, so a bigger texture is the same picture, only
sharper. The Europe window is drawn with a margin, so the coast effects near
its edges still see the land beyond them, and its noise and dots are tied to
the world's, so it blends into the world texture without a seam.

Two departures from the app, both for the poles, which the site shows and the
app's camera rarely does: the deep-ocean mottling and the ocean dots fade out
above 66°, and each row is blurred along its length by how much it is squeezed
there. Otherwise both turn into a starburst on the sphere.
