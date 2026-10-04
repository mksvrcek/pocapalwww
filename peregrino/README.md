# Peregrino, product page

Static single page for the Peregrino travel app, built the same way as the
PocaPal page next door in `public/`: no build step, no backend, no external
requests. `peregrino/` is the whole site.

```
peregrino/
  index.html          structure + all copy
  styles.css          all styling (night-sky story → warm paper body, ticket-blue accent)
  app.js              both scroll stories + the smaller interactions; tuning constants up top
  assets/data/world.json   country outlines for the globe, stamps and passport map
  assets/screens/     app screens (590×1278, from peregrinoApp/redesign/prototype/screens)
  assets/photos/      illustrations cropped from the prototype's photo grid (luggage tags, tiles)
  assets/flags/       round flags for the passport's visited page (from the app's FlagKit)
  assets/phone-frame.webp  the same device frame PocaPal uses
```

## Run locally
```
python3 dev-server.py 5174 peregrino
# → http://localhost:5174
```

## The page, top to bottom

| Section | What it does |
|---|---|
| **The journey** (`#story`) | Scroll story 1. The globe rises out of the bottom of the hero, flies a year of trips while the countries fill in and a stamp lands on each arrival, then shrinks into the phone's own globe on the Statistics screen. |
| **Today** | The "new country detected" card pops out of the phone; the Austria stamp thumps down on a loop. |
| **Passport** (`#passport`) | Scroll story 2. A 3D passport: the cover opens on the data page (counting up), the visited flags fill in, a leaf turns and twelve stamps land on the spread. The copy beside it changes with each beat. |
| **Tickets** | A printer that prints the next journey. Pick Flight / Train / Ferry / Bus / Event and the old ticket drops out as the new one feeds. Planned / Booked / Used restyles it (pencilled in, countdown, stub torn and inked). Cycles on its own until someone clicks. |
| **Statistics** | A dark band; figures count up on reveal and again when you pick a year. *All time* quotes the journey's own distance, so the numbers agree. |
| **Journal** | Trips as luggage tags swaying on strings around the phone. |
| **Places, events, photos** | A snapping rail of phones with arrows and dots. |
| **More** | Bento tiles: Flighty share, Schengen ring, enamel pins, globe layers, photos, calendar, Pinpoint. |
| CTA, FAQ, footer | Same shape as PocaPal's. |

## The globe

Drawn straight onto a canvas, no library. `world.json` is the app's own
`countries.geojson` cut down to outer rings at 0.1° (≈38 KB gzipped). Every
point is kept as a unit vector so a rotation is a handful of multiplies, and a
ring point that falls behind the globe is pushed out to the limb, with a run of
them drawn as an arc along the limb. That keeps countries cut by the horizon
clean instead of folding back across the face.

Colours are sampled off the app's own render (`stats.jpg`), so when the live
globe hands over to the screenshot there is no jump. Where it lands is
`SHOT_GLOBE` in `app.js`, measured off that screenshot: centre at 50% / 27.9%
of the screen, radius 41% of its width. Re-measure if you swap the shot, and
point `T.END` at whatever the new one faces.

## Tuning the journey

**`LEGS` in `app.js`** is the trip: each leg flies city to city and, on
arrival, fills `fill` (ISO3 codes) and pops a stamp for `stamp`. Codes with no
outline on the map (Monaco, Vatican, Hong Kong) still count, they just have
nothing to paint. Legs share the journey's span by distance, so a long haul
takes longer, though not proportionally. The camera follows the plane and
pulls back on long legs.

**`T` in `app.js`** holds the beats as scroll progress across `#story`:

| key | what it controls |
|---|---|
| `heroOut` | the headline fading out |
| `rise` | the globe coming up from the bottom and centring |
| `journey` | the span the legs share |
| `settle` | the phone rising and the globe shrinking into it |
| `swap` | the live globe fading to the screenshot under it |
| `outro` | the closing line |

The length of the run is the `height` of `.story` in `styles.css` (`640vh`).

## Tuning the passport

`PP` in `app.js` holds its beats as progress across `#passport` (`open`,
`count`, `flags`, `turn`, `stamps`, `beats`). The page size is `--pw` on
`.pp-art`; everything inside the book is sized off it, so the book scales as
one piece. The leaves turn in their own 3D (perspective on `.book-body`) but
the spread is flat, so `z-index` decides which leaf is on top: on the right,
earlier leaves sit higher; on the left, later ones do.

`PP_STAMPS` is which stamps land, six per page in landing order. Stamps come
from `STAMP` (name in the country's own language, shape, ink, continent,
date), drawn as SVG through one shared `#ink` filter in `index.html` that
roughens the edges and knocks a little ink out. The silhouette inside is the
country's largest ring from `world.json`.

## Reduced motion

Under `prefers-reduced-motion` both scroll stories collapse to a calm layout:
the hero shows a still of the finished globe behind the phone, the passport
opens straight to its stamps, and the printer swaps tickets without feeding.

## Deploy

`firebase.json` now declares two hosting targets, `pocapal` (`public/`) and
`peregrino` (`peregrino/`). Map each to its Firebase Hosting site once:

```
firebase target:apply hosting pocapal   <pocapal-site-id>
firebase target:apply hosting peregrino <peregrino-site-id>
firebase deploy --only hosting:peregrino
```
