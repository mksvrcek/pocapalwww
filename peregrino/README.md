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
  vehicles.js       side views of the vehicles that carry the tour's phone (window.PeregrinoVehicles)
  assets/globe/     textures, height map and country outlines, built by tools/peregrino-globe
  assets/screens/   app screens from peregrinoApp/redesign/prototype/screens (590×1278)
                    and the lower halves of five of them (*-sheet.webp), under the live top panes
  assets/dubu.webp  the Dubu Card's mascot, from the app's DubuCharacter asset
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
| **The journey** (`#story`) | The big scroll story. The globe rises out of the hero with nothing marked and goes round the world from Prague: a drive to Budapest, trains across the Alps to Amsterdam and on to Stockholm and Oslo, flights to Helsinki, Seoul, Tokyo and Hong Kong, a train into China, Hanoi, Bangkok, San Francisco, Reykjavík, a ferry from Dublin to Liverpool, the Camino Português on foot, a bus along the Riviera to Monaco, Athens, Kraków and the train home. A country is painted the moment the route crosses into it, one at a time, and its stamp thumps down there; the count climbs to 32. Then a big open passport comes up behind the globe, the globe settles onto its page and the passport snaps shut on it. The closed booklet, upright like a real one, opens again on the data page, now full; it turns the way the app holds it, six stamps land, it pops out of the page and the phone slides in beside it, both a little tilted. |
| **The tour** (`#tour`) | One phone pinned while the blades scroll past, carried to the far side of each one by one of the app's vehicles: an airliner tows it across on a line, a push-pull train and a car with a trailer give it a ride, a cargo ship takes it over the waves, and the Mars theme's moon lander winches it into the middle. Each stop changes the screen and brings out what the app prints for it: *Today* stamps Österreich, *Journal* hangs two luggage tags off the phone, *Tickets* fans a hand of printed tickets out from behind the phone (the chips print more, the buttons pencil in, book or tear the front one), *Places* fans out polaroids, *Statistics* feeds a receipt, *Customise* fans out the app's six passports: click one, or a swatch, and the passport in the phone changes to it. |
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
print (`print`); the page doesn't use either at the moment (the passport's map
is drawn on its own canvas).

Planes, ships, routes, pins and the traveller are drawn on a 2D canvas over the
globe (`#over`), placed with `globe.project()`.

## Tuning the journey

**`LEGS` in `app.js`** is the trip. Ground legs follow the road, rail or sea
lane through their `via` points (a city's code there marks a stop on the way);
flights take the great circle. Nothing lists which countries a leg adds:
`findEvents()` walks each route through the country outlines and notes where it
crosses into somewhere new (or, for a flight, where it lands), so moving a
route moves its stamps with it. `at` places a country by hand where the
outlines can't, and a city's `a3` names its country where the simplified
coastline misses it. The stamps are dated a few days apart from 2 June 2026.

**`V` in `app.js`** holds the beats in vh of scrolling. The legs share the
middle of the run, each weighted by its length (`U` vh per unit; flights by
the arc, ground legs by the distance, the walk a little slower); everything
after them is counted from `E0`, the end of the trip:

| key | what it controls |
|---|---|
| `heroOut`, `rise`, `home` | the headline leaving, the blank globe coming up, Prague |
| `settle` | the camera pulling back to the whole world |
| `bookIn`, `dock` | the big open passport coming up behind the globe; the globe settling onto its page |
| `shut`, `gulp`, `closed` | the passport snapping shut on it; the closed booklet coming to the middle |
| `reopen`, `turn` | opening again on the data page, turning to the way the app holds it |
| `stamps`, `pop` | six stamps landing; the passport popping out of the page |
| `side`, `outro` | the phone sliding in beside it, the closing line |

The story's height is set from these (`TOTAL` + 100 vh). `zoomFor()` is how
close the camera follows each leg.

## The tour

Each stop is an `<article class="stop">` with `data-side` (`left`, `right` or
`centre`), `data-screen`, and `data-carrier`, the vehicle that brings the phone
to it (`plane`, `train`, `car`, `ship` or `lander`, drawn in `vehicles.js`).
`carry()` in `app.js` is the choreography, as a function of how far the scroll
has got between two stops: the vehicle comes in from behind, the phone shrinks
a little and hops on (or is hooked, for the plane and the lander), rides
across, hops off and grows back, and the vehicle goes on its way. The rails,
the road and the sea are laid in front of their vehicle and taken up behind
it; wheels roll by the distance covered, and a hanging phone trails the way
it came. The screens change half way. `LIVE` in `app.js` is the screens that
show a live globe in their top pane (where it looks, its routes, its pill),
with the page under it from `SHEETS`; `FULL` is the screens shown whole.

Artifacts sit on the phone's open side, away from the copy. *Tickets*: the
printer grows out of the Dynamic Island on a spring, feeds a ticket out of its
slot stub first and turned a quarter, the way the app prints it, and shrinks
back; the ticket flies to the front of the hand behind the phone (`HAND`).
`KINDS` holds the tickets the chips print, each press printing one in turn; the
state buttons act on the front ticket, and clicking one further back brings it
forward. *Customise*: `STYLES` is the app's `PassportBackgroundStyle` (cover,
pages, binding and inks for Classic Purple, Leather Book, Burgundy, Navy, Swiss
and Dubu). The phone's top pane is the app's Customize screen built live: the
passport open on its data page and visited page in the chosen style, under it
the sheet with the chosen one marked Selected. The covers fan out round the
phone (`FAN`; over its top on a narrow screen), and they and the swatches under
the copy choose.

## Reduced motion

Under `prefers-reduced-motion` the journey is a still: the headline, the
globe with the whole trip drawn once, the closing line, then the open passport
with all six stamps beside the phone. The tour becomes plain blades of copy
(the ticket buttons and the passport swatches go with the phone they drive).

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
