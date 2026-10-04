# Peregrino, product page

Static single page for the Peregrino travel app, built the same way as the
PocaPal page next door in `public/`: no build step, no backend, no external
requests. `peregrino/` is the whole site.

```
peregrino/
  index.html        structure + all copy
  styles.css        all styling (night-sky journey → warm paper body, ticket-blue accent)
  app.js            the journey, the tour and the smaller interactions; tuning constants up top
  globe.js          the app's SceneKit globe, ported to WebGL (window.PeregrinoGlobe)
  artifacts.js/.css the app's print family: stamps, tickets, tags, receipt, polaroids (window.PeregrinoArt)
  assets/globe/     textures, height map and country outlines, built by tools/peregrino-globe
  assets/screens/   app screens from peregrinoApp/redesign/prototype/screens (590×1278)
                    and the lower halves of four of them (*-sheet.webp) for the live-globe screens
  assets/photos/    illustrations cropped from the prototype's photo grid
  assets/fonts/     Archivo (OFL), standing in for SF Pro Expanded / Condensed on the artifacts
  assets/phone-frame.webp  the same device frame PocaPal uses
```

Everything on the page is taken from the app's current code or the redesign
prototype's screens. The old screenshots in `peregrinoApp/screenshots/` show the
app before the redesign and are not used.

## Run locally
```
python3 dev-server.py 5174 peregrino
# → http://localhost:5174
```

## The page, top to bottom

| Section | What it does |
|---|---|
| **The journey** (`#story`) | The big scroll story. The globe rises out of the hero and follows one summer: a drive from Prague to Vienna, a flight to Lisbon, the Camino Português on foot to Santiago, a flight to Stockholm, the train to Oslo, then Reykjavík and home. A country is painted the moment the route crosses into it (one at a time), and its stamp thumps down there. Then a closed passport comes up, the globe settles onto the emblem on its cover, the cover swings open underneath it, and the globe dives into the data page and unrolls into its map. The summer's six stamps land on the next page, the count goes 26 → 32, and the phone comes to sit beside the passport. |
| **The tour** (`#tour`) | One phone pinned while the blades scroll past, crossing sides (right, left, right, left, right, centre) to sit opposite each one. Each stop changes the screen and brings out what the app prints for it: *Today* stamps Österreich, *Journal* hangs two luggage tags off the phone, *Tickets* runs the printer, *Places* fans out polaroids, *Statistics* feeds a receipt, *Customise* fans the passport covers. |
| **More** | Bento tiles: Flighty share, Schengen ring, enamel pins, globe layers, Pinpoint, calendar. |
| CTA, FAQ, footer | Same shape as PocaPal's. The download blade fans a hand of the app's paper (passport, ticket, polaroid, tag) behind the icon, the way PocaPal fans photocards. |

## The globe (`globe.js`)

A WebGL port of `peregrino/Home/Globe`: the same displaced sphere (240 × 120
segments, height × 0.09), the same texture recipe, the app's three lights
(ambient 0.6 × 800, a warm sun 1200 from the upper right, a cool fill 400 from
the lower left) lit in linear light as SceneKit does, and the blue atmosphere
rim. It is a real sphere with a depth buffer, so nothing on the far side can
fold over the near one.

Countries are painted live rather than baked. `ids-*.png` holds one country
index per texel and a 256 × 4 lookup texture says what each index wears: its
natural land colour, a paint colour and amount, a hatch ink and amount. Paint
keeps the texture's own shading (it is scaled by base ÷ natural land colour),
so borders, foam and relief show through, and the four ids around a pixel are
blended so painted edges stay smooth. `paint(a3, rgb, amount)` and
`hatch(a3, rgb, amount)` are all the page calls; an amount between 0 and 1 is
how a country fills in.

Close in over Europe a sharper texture takes over (`europe-*`, 4096 × 2048 over
30°W–50°E, 31°N–71°N, about 4.5× the world texture's detail), fading in with
zoom and out towards its edges. Its noise and dots are tied to the world
texture, so the two meet without a seam. `EUROPE` in `globe.js` must match the
build script.

The mesh can also unroll into a flat Mercator map (`morph`) and turn into
print (`print`): that is how the globe ends up on the passport's data page.

Planes, ships, routes, pins and the traveller are drawn on a 2D canvas over the
globe (`#over`), placed with `globe.project()`.

## Tuning the journey

**`LEGS` in `app.js`** is the summer. Ground legs follow the road or rail
through their `via` points; flights take the great circle. Nothing lists which
countries a leg adds: `findEvents()` walks each route through the country
outlines and notes where it crosses into somewhere new (or, for a flight, where
it lands), so moving a route moves its stamps with it. `STAMP_DATE` dates
them.

**`T` in `app.js`** holds the beats as scroll progress across `#story`:

| key | what it controls |
|---|---|
| `heroOut`, `rise` | the headline leaving, the globe coming up |
| `journey` | the span the legs share (ground legs get more room, flights scale with distance) |
| `settle` | the camera pulling back to the whole summer |
| `rise2`, `dock` | the closed passport coming up; the globe settling onto its emblem |
| `open` | the cover swinging open, on the app's book-opening spring |
| `fly`, `unroll`, `print` | the globe diving into the data page, unrolling, becoming print |
| `stamps` | the six stamps landing |
| `side`, `outro` | the passport moving aside for the phone, the closing line |

The length of the run is the `height` of `.story` in `styles.css` (`900vh`,
`820vh` on narrow screens). `ZG` is how close the camera comes for the ground
legs.

## The tour

Each stop is an `<article class="stop">` with `data-side` (`left`, `right` or
`centre`) and `data-screen`. Between two stops the phone crosses over with a
little turn, and the screens change half way. `LIVE` in `app.js` is the screens
that show a live globe in their top pane (where it looks, its routes, its pill),
with the page under it from `SHEETS`; `FULL` is the screens shown whole.

Artifacts sit on the phone's open side, away from the copy, and partly over the
phone where the gap is narrow. The printer grows out of the Dynamic Island on a
spring, feeds the ticket out of its slot stub first and turned a quarter, the
way the app prints it, then shrinks back into the island; the ticket turns back
and is filed across the phone's edge. `KINDS` holds the tickets the chips
print; the state buttons pencil it in, book it or tear the stub.

## Reduced motion

Under `prefers-reduced-motion` the journey is a still: the headline, the
summer's globe drawn once, the closing line, then the open passport with all
six stamps beside the phone. The tour becomes plain blades of copy (the ticket
buttons go with the printer they drive).

## Rebuilding the globe's textures

```
node tools/peregrino-globe/build.js ../peregrinoApp
```

reads the app's own country data and runs its `GlobeTextureGenerator` recipe
(ported in `tools/peregrino-globe/gen.js`) in headless Chromium. See that
folder's README. Images on this site are cached as immutable for a year, so
give regenerated files new names (and update `globe.js`) once the site is live.

## Deploy

`firebase.json` declares two hosting targets, `pocapal` (`public/`) and
`peregrino` (`peregrino/`). Map each to its Firebase Hosting site once:

```
firebase target:apply hosting pocapal   <pocapal-site-id>
firebase target:apply hosting peregrino <peregrino-site-id>
firebase deploy --only hosting:peregrino
```
