# PocaPal, product page

Static single page. No build step, no backend. `public/` is the whole site.

```
public/
  index.html            structure + all copy, and the feature rail's artwork (inline SVG)
  styles.css            all styling (dark story → light body, magenta accent)
  app.js                scroll choreography; tuning constants at the top
  assets/cards/         card artwork
  assets/phone-frame.webp the phone frame (hero + both blades)
  assets/fonts/         the Events card's font subset (Archivo, OFL)
tools/
  build-preview.py      one-page build for sharing as a claude.ai artifact (not deployed)
```

Everything is front end: plain HTML, CSS and JS, no framework, no build step
and no backend, so `public/` deploys to Firebase Hosting (or any static host)
exactly as it is.

## The phone frame

`assets/phone-frame.webp` is a device render with a **transparent screen
cut-out**, so the fake app UI sits behind it and the bezel and Dynamic Island
overlap it the way they would on a real handset.

All of the geometry lives in custom properties on `:root`, measured off the
artwork:

- **`--screen-*` / `--screen-r`**, the cut-out (left 5.10%, top 2.37%,
  89.80% × 95.27%). The radius is set a hair *tighter* than the real one so no
  gap shows at the corners.
- **`--body-*` / `--body-r`**, the handset's outer silhouette (left 2.11%,
  top 0.73%, 95.78% × 98.53%). An opaque slab is drawn on exactly this, so
  cards passing behind can't show through the frame's own anti-aliased edge,
  and the drop shadow and glow hug the real outline rather than an
  approximation of it. `--device-body` is its colour, sampled off the frame's
  own edge so the one-pixel fringe is invisible.
- **`--frame-ar`**, the image's aspect ratio. `.phone-wrap`'s width and
  height must match it.

To swap in a different device, replace the file and re-measure, load it into
a canvas and walk the alpha channel: outward from the centre for the cut-out,
inward from the edges for the silhouette. Then update the `:root` block and the
three `<img>` tags. Nothing else needs to change.

## Run locally
```
python3 -m http.server 5173 --directory public
# → http://localhost:5173
```

## Deploy to Firebase Hosting (free tier)
```
npm i -g firebase-tools
firebase login
firebase use --add            # pick/create your project
firebase deploy --only hosting
```

## Sharing a preview

`tools/build-preview.py` writes a copy of the page to `dist/preview/` with
`styles.css` and `app.js` inlined and the document skeleton stripped, which is
the shape the claude.ai artifact viewer wants. Publish that page with
`public/assets/` alongside it at the same relative paths. It reads `public/`
and never changes it; Firebase does not need it.

## Motion

All of the movement outside the hero story sits behind a `.motion` class on
`<html>`, which a one-line script in the `<head>` adds before first paint
unless the visitor has asked for reduced motion. Without it (no script,
reduced motion) every section renders complete and still, so nothing is ever
left invisible waiting for an observer.

There are two kinds:

- **Reveals** are timed and play once. A `[data-reveal]` group gets `.in` when
  it comes into view. Headlines marked `data-lines` are split at their `<br>`s
  into `.ln > .ln-in` and each line rises out of its own mask; everything else
  in the group marked `.rv` fades up after them. JS gives each piece its place
  in the sequence as `--d`, a beat per headline line and a short step for
  anything else, so the copy under a headline follows its last line up.
  Keep `<br>`s at the top level of a split headline, never inside a span.
- **Scrubs** are tied to the scroll position and play backwards when you scroll
  back. A `[data-scrub]` element gets `--e`: 0 as its top crosses the bottom of
  the screen, 1 once its middle is just past the middle, already eased. CSS
  reads it. Only elements near the screen are measured, and a scrub element's
  own box must never be moved by its own CSS (move its children instead) or the
  value would chase itself. That is why the Players scrub sits on the art
  column rather than on the stage it turns.

What each part does:

| where | what moves |
|---|---|
| hero | the nav drops in, the headline rises a line at a time, and once the page has loaded the card grid deals itself in, rippling out from its middle (`INTRO_*` in `app.js`) |
| story | the phone arrives tipped back and stands up; the closing line's two lines rise at different rates (`--o`) |
| story → light | as the light sheet slides over, the dark stage sinks back at under half speed and dims (`recede()`) |
| Collection | the phone stands up out of the table while the four cards are dealt onto it, each dropping out of the air above the plane on its own slice of `--e` |
| Cards | the photocard rises into place, drifts a few degrees and turns over half way through its pass, its holo sliding across the front and the back's stickers landing one by one as it comes round; it also follows a drag (see The card blade) |
| carousel | the row slides in from the right; neighbours sit back at 93% and the current slide's phone rises into its window |
| Themes | the back phone starts tucked flat behind the front one and swings out to its angle; picking a theme makes the pair take a small breath |
| Players | the stage swings up into place; switching slides the new player in from the side you're heading towards |
| Events | a second pinned run: the card counts down as the room goes dark, then a stage with TONIGHT on its screen, beams, confetti and a crowd waving lightsticks, then lights up and the next show (see The Events blade) |
| rail | cards arrive one after another, and each illustration plays a short scene (a binder's pockets filling, the scanner sweeping a haul, the spending chart drawing as its total counts up, the ranking podium rising) once in view and again on hover |
| Fanclub | the membership card lifts off the page and turns towards the reader, then floats with a sheen crossing it every few seconds; the members' list fades up in turn |
| CTA | a hand of photocards fans out behind the app icon, which springs in; the fan opens wider on hover |
| FAQ | questions fade up in turn; an answer settles in just behind the opening |

The rail's artwork is inline SVG so its parts can move. Where a piece of the
art already carries a `transform` attribute it is wrapped in a `<g>` that the
animation moves, because a CSS transform would replace the attribute rather
than add to it.

## Layout

Two breakpoints matter. Below 740px, and on any upright screen up to 900px
(an iPad held portrait), the feature blades stack into one centred column so
the art can be big. A phone on its side (over 740px wide but under 520px tall)
keeps two columns, and the story's type comes down with its closing line
dropping its second sentence, so the settled phone still has room.

## The phone, twice over

The hero phone and the two light-section blades share one set of measurements,
declared as custom properties on `:root` (`--screen-*` for the cut-out,
`--body-*` for the outer silhouette). The hero uses `.phone-wrap`, which JS
drives; the blades use `.device`, a plain block you can drop anywhere:

```html
<div class="device">
  <div class="device-screen"> …your mock… </div>
  <img class="device-frame" src="assets/phone-frame.png" alt="">
</div>
```

Re-measure once and both update.

## Scenes

Two blades arrange props around the phone, both under `.scene`:

- **`.scene-lay`** (Collection), photocards resting on the surface the phone
  stands on. They sit inside `.ground`, a single element tilted with
  `rotateX` and `transform-style: preserve-3d`; the cards themselves only ever
  rotate *flat within it*. Tilting each card on its own is what makes them look
  like they are leaning at different angles rather than sharing a table. Their
  `bottom` is a distance into that plane, so higher up reads as further away.
- **`.scene-pair`** (Themes), a second phone turned off-axis behind the
  first. `rotateY` about its own left edge, and deliberately no `rotateZ`,
  which reads as toppling. The pair is centred as a group rather than
  individually: the front phone carries a `margin-left` that offsets the space
  the turned one takes on the right.

## The FAQ

Plain buttons and divs rather than `<details>`, because a details element hides
its content outright when closed and there is nothing there to animate from.
The answer is a grid that goes from `0fr` to `1fr`, which animates its height
without anything having to measure it, and `visibility` keeps the closed text
out of the accessibility tree. Each question carries `aria-expanded`, and the
plus loses its upright stroke to become a minus.

## The item sheet

Clicking any card in the hero opens a detail sheet over a darkened page. On a
desktop it is wide and in two columns: the artwork on the left over a pool of
its own colour, and on the right the name, the state pills, the group and idol,
then the plain facts. The artwork answers the pointer the way the cards outside
do, tilting under it. It borrows the app's look, not its phone proportions.
Below 760px it folds into one column and takes the whole screen. Both sets of
cards are reachable, the grid while it is still at rest and the queue once the
story has played out.

Each item is filed under an id taken from its filename, `poca-04.jpg` is
`POCA-04`. The content lives in `INFO` at the top of `app.js`, one entry per id.
Named products show their name as the title and the rest fall back to the id,
the way the app falls back to "untitled". An entry with no group shows only the
idol block and one with no idol only the group block, which is how soloists and
albums land.

## The phone's two screens

The hero phone holds two pages: the collection filling up, and the themed home
behind it. Over `swipeIn` to `swipeOut`, the last couple of percent of the run,
the collection slides off to the right and the themed one comes in from the
left, the way the app goes back a screen. It is a function of `p` like the rest
of the choreography, so scrolling back up takes it straight the other way.

`kick()` tracks which way the reader is going, because the run only finishes
itself when they stop going forwards: someone scrolling back up to watch it
again must not be dragged to the end.

## The nudge

Stop half way through the story and after 750ms a small "keep scrolling" pill
fades in at the bottom of the stage. The run only makes sense finished, and a
still frame gives no sign that there is more. It hides the moment scrolling
starts again and comes back if the reader stops again. It stays out of the way
at the very top, where the headline already says "scroll", and past `NUDGE_TO`,
where the run finishes itself.

## The hero's endless queue

Once the story has played out, `.marquee` runs a loop of cards behind the
settled phone. The row holds two identical halves and slides `-50% → 0`, and
the spacing between cards is a **margin, not a flex `gap`**, a row of 2N items
has 2N−1 gaps, so half the row width would land half a gap short and the loop
would visibly jump. It only animates while it is on screen.

Hovering a card lifts it to full opacity, tilts it under the pointer and holds
the row still. The hold is a class the pointer handlers set (`.marquee.is-held`)
rather than `:has(img:hover)`, which does not re-evaluate dependably in every
browser while the row is animating. The band's vertical padding is the room a
card grows into: `overflow:hidden` is there to stop a row far wider than the
viewport pushing the page sideways, and without the padding it would clip the
top and bottom off anything that scales up.

The phone's settled size is worked out at runtime from the room between the
closing line and the bottom of the stage, so it stays as large as it can on
tall viewports and shrinks only where it has to.

## The centred carousel

`.deck` is the full-bleed carousel between the two blades. Slides snap to the
*centre*, which is what lets the neighbours peek in at the edges; inactive
slides fade back via `.is-on`.

The leading gap is `padding-left: var(--edge)` on the track and the trailing
gap is a `::after` flex item of the same width, **not** padding. A flex
container's `padding-inline-end` is not counted in the scrollable area when its
children overflow, so with padding on both sides the last slide could never
reach the middle. `--edge` is set from JS on load and resize as half the
leftover width.

The long dot doubles as a timer: the current dot's inner `<i>` runs a linear
`scaleX` animation over the dwell time, restarted whenever the slide changes
and frozen solid while paused. `--deck-dur` is set from the same JS constant
that drives the interval, so the bar and the switch can't drift apart.

It advances every 5.2s while it's on screen, stops when someone scrolls, drags
or hits pause, and never starts under `prefers-reduced-motion`. Dots are built
from the slides, so adding an `<li class="deck-slide">` is all it takes.

## Theme swatches

The Themes blade shows two phones running real app screenshots, and four dots
under them switch which. Each swatch carries `data-theme` (the file prefix),
`data-label` (the artist) and `data-ko` (their Korean name); clicking one swaps
`assets/screens/<theme>1.jpg` into the front phone and `<theme>2.jpg` into the
one behind, and updates the caption.

Each screen holds **two** stacked `<img>`s and the incoming one fades in over
the outgoing one, a true dissolve. Fading a single image out and back in dips
through the empty screen behind it, which reads as a flicker. All eight images
are preloaded on idle and the swap waits on `decode()`, so the fade never
starts on a blank; a token guards against a second click landing mid-fade.

The screenshots are 591x1280, the same aspect as the frame's cut-out
(0.4617 against 0.4619), so they fill it exactly with no cropping. Keep that
ratio if you shoot new ones.

A tinted halo sits behind the pair and picks up the selected bias
(`.scene-glow`, with `--glow-1` / `--glow-2` set per `[data-theme]` on the
scene). Both are registered with `@property` so they fade between themes;
plain custom properties would snap.

Swatch colours are set per theme in `styles.css`
(`.swatch[data-theme="chaewon"]` and friends). They're hand-picked rather than
sampled: the real accents in the app are too close together to tell apart at
20px.

## The Events blade

`#events`, between Players and the feature rail, is the page's second pinned
run, built the same way as the hero: `.live` is the runway (500vh, 430vh on
phones, 380vh on a phone on its side), `.live-track` sticks for its length,
and `drawLive(u, t)` in `app.js` writes every frame from the blade's own
progress, eased toward the scroll position. `u` runs from -1 to 0 while the
blade scrolls up into view (the headline and card rise then, so it never pins
on an empty stage) and 0 to 1 while it is pinned. Only the crowd's sway and
the beams also drift with time `t`, so the room keeps moving while the show
is on and the reader holds still.

It opens on "Every show, counted down." and a line saying what the feature
does. At the night that rolls away and "Four weeks to go. Then, tonight."
rolls in as the payoff. The two headlines share one grid cell, so swapping
them moves nothing.

The beats live in `LV`:

| key | what happens |
|---|---|
| `count` | the NEXT UP card's odometer counts down; each step is shorter than the last, and each takes the room a notch darker (`.live-vig` first, then `.live-dark`) |
| `night` | the last number rolls away, the headline turns over, the card drops to float over the crowd |
| `show` | the stage powers up with TONIGHT on its screen, the beams come on, the crowd rises out of the dark |
| `rain` | confetti comes down |
| `up` / `flip` | the lights come up, the show fades, the crowd sinks, and the card flips over to the next show |
| `after` | the two timeline rows, then the line under them; the card and timeline close up under the shorter headline |

What the counter reads is `COUNTDOWN`, one entry per step. The app's own
screenshot only proves "IN 4 WEEKS"; the days that follow are a guess, so
check them against the app and edit the list. The odometers are built from
it, and the unit only rolls when the word changes.

**The card** is the app's NEXT UP card rebuilt in HTML, measured off
`assets/slides/events.jpg`. Everything in it is sized in `--u`, a hundredth of
its width, with a floor under the smallest labels so they stay readable on a
phone. Its titles and numbers are set in Archivo, self-hosted from
`assets/fonts/` (OFL, licence alongside) and cut down to capitals, digits, the
space and the middle dot, so keep that text in capitals.

**The venue** is `.live-rig`: the LED screen and the stage, placed by
`measureLive()` from the untransformed layout so TONIGHT gets the room between
the headline and the card, with clear air under it. The beams are drawn on a
small canvas behind the screen (`drawBeams`), because six rotating clipped
elements halved a desktop's frame rate.

**The crowd** is drawn on `.live-fx` (`drawFx`), in three bands. The rows at the
horizon are drawn once, whole, into an offscreen canvas and never move. The
middle rows' bodies are drawn once too, but their arms, sticks and lights are
drawn every frame, batched a row at a time, swaying more the nearer they are
(`ROWS`, and `amp` per row). The front rows are drawn whole every frame. Each
light is a sprite cached at the exact size it is drawn at, and the canvas is
capped at about 1.6 million pixels. The confetti is drawn on the same canvas.

**Phones.** The track spans the large viewport and the stage the small one, so
when the toolbars retract the room carries on underneath instead of showing a
strip of paper. Rotating a phone mid-blade changes the runway's height; the
resize handler puts the reader back at the same point of the story.

`.light` clips sideways with `overflow-x: clip`, not `overflow: hidden`: a
hidden overflow makes it a scroll container, and the blade inside could no
longer stick. Browsers without `overflow: clip` (Safari 15 and older) get the
still instead, as do reduced motion and no script: the opening headline, the
card at four weeks, and the timeline under it.

## The card blade

`#cards` is the app's card page: a photocard as a 3D object. `.spin-card`
holds two faces back to back (`backface-visibility: hidden`); the front is a
card photo under a holo layer and a glare, the back a design from the card
designer, built from `.stk` stickers sized in container units of the back.

Section 8e of `app.js` drives it. The turn is the scroll angle (it drifts a
few degrees across the blade's pass and turns over between 45% and 62% of it)
plus a drag offset. Letting go eases the drag offset to the nearest half turn;
a tap, or the Turn it over button, adds one. Each frame JS writes:

| variable | read by |
|---|---|
| `--a` | the turn in degrees: the holo and glare slide with it |
| `--h` | the holo's strength, stronger the further the card is tilted |
| `--b` | how far the back faces the reader: each sticker lands on its own slice of it (`--k`) |
| `--sw` | the shadow's width, narrow when the card is edge on |

Without motion the scroll angle is fixed, the card stands front on, and a drag
or the button still turns it, landing at once.

## The Fanclub

`#fanclub` sits between the rail and the download button. The card is the
membership card the app prints (name and member number on the bottom line),
in CSS; the list under it uses the Fanclub sheet's own titles and lines. The
price isn't on the page, only that it is a one-time purchase with no
subscription, so a price change needs nothing here.

## What the copy promises

The copy was checked against the product review of the app. Keep it in step
when the app changes:

- **Free, with the Fanclub as a one-time purchase.** Fanclub only: statistics,
  batch scan, vinyl, CD and cassette players (Digital is free), theme rotation,
  card effects, custom designs, spinning story videos, more than one photobook,
  and unlimited categories. The page marks these with a footnote under the
  blade (`.fine`) or a tag in the rail (`.tag`).
- **Adding a card**: scan or pick photos, the edges are found and both sides
  cropped, then you pick who's on it. Nothing claims the app recognises the
  group or the version by itself.
- **Albums** come from the Apple Music catalogue, and playback needs Apple
  Music.
- **Events** follows the reviewed redesign: Coming Up fills in birthdays and
  debut anniversaries from the artists you follow, and a ticket becomes a
  memory the day after, with photos, what you brought home and the songs you
  heard. If those ship later than the site, soften the Events lede, its
  closing line and the carousel caption.
- **Platforms**: iPhone and Mac now, iPad on the way.

## The feature rail

The horizontally scrolling section near the bottom (`.rail-sec`) is a plain
`overflow-x: auto` list with CSS scroll snapping, the arrows just call
`scrollBy` and grey themselves out at the ends. Its `scroll-padding-inline`
matches the track's padding so the first card lines up with the heading rather
than the viewport edge; without it the browser snaps the card to the very edge.

Cards, copy and artwork all live in `index.html`, add or remove `<li
class="rail-card">` entries freely, the arrows adapt. The artwork is inline
SVG, and the `sv-*` classes on its parts pick the animation (see Motion). A
figure with `.sv-count` counts up to its `data-to`, between `data-pre` and
`data-suf` (`%` unless given).

## Swapping in real artwork
Drop images into `public/assets/cards/` and edit the `ASSETS` array at the
top of `public/app.js`. Each entry is `{f: 'filename.jpg', r: width/height}`.
That one list feeds the flying cards, the in-phone grid and both screenshots.

Photocards are 55×85mm → `r: 55/85`. Albums are square → `r: 1`.

## Tuning the scroll animation

The cards start in a three-row grid under the headline, which lifts clear as
the headline fades. Then the grid empties **one card at a time, a row at a
time**, top row first, right to left, each card sliding off its own square
onto a single line running out through the right edge. The line rides a 3D
curve: up the right side, back across **behind** the phone, round the left,
then a swoop toward the viewer and into the app.

Each card leaves exactly as the card in front of it goes past: its join point
is the moment its own slot in the line reaches its grid cell. Nothing shuffles
into position first, and because each row is taken right to left, every card
flies out across squares the grid has already given up.

Two things to edit:

**`CURVE` in `app.js`**, the control points of the journey, as fractions of
the viewport: `[x · width, y · height, z · height]`. `z` is depth: negative is
behind the screen plane (small and hazy, and behind the phone), positive is
toward the viewer. The phone sits at `z = 0`. The curve *starts* just past the
right edge, level with the middle grid row, and slightly toward the viewer
that bit of depth is what makes a departing card ride *over* the row still
waiting instead of through it. The run back through the grid is the opening
tangent extended, which is why the middle row barely moves vertically to join
and the outer two drop or lift straight onto it. Points are a Catmull-Rom
spline, so the line passes through every one of them.

The grid is always three rows, so the column count is just the card count over
three, and `fit()` decides how many cards are in play. `baseCols()` is as many
columns as the width can give each one a cell of at least `MIN_CELL`. Only the
widest screens use that number and keep the whole grid between the edges: there
it already fits. Everything narrower runs one column more than it strictly has
room for and lets the outer cards hang off the edges instead, so the grid reads
as part of something larger rather than a block shrunk to fit. The spread is
tied to the column count, so the outer card sits about the same distance from
the edge whether there are three columns or seven.

A phone screen is tall and narrow, so below 760px the grid carries a fourth
row. With three, every card fitted above the fold and the grid had nothing left
to rise from; the fourth waits below the bottom edge and comes up with the rest,
the way it does on a desktop.

The rows sit centred on the viewport at their cruise position, which is why
with three of them the middle one lands exactly on the line the cards leave
along and never has to move vertically to join the queue. `G.riseY`, how far
below that the grid rests, is measured from the headline's own height, so the
top row always starts clear of the text however the copy reflows. Every asset has a card and a matching phone tile built up front and
`fit()` detaches the ones this width cannot carry, so resizing steps between
sets without rebuilding anything. Which cards stay is drawn from the photocards
and from everything else separately, each spread across its own list, so a
nine-card grid keeps the same mix of cards to albums and merch as a
twenty-one-card one.

The rest of the grid lives in `measure()`: `G.rowY` (the row heights), `G.cols`
and `G.cellW`/`G.cellH`.

The grid has to be empty before the phone starts coming in, or the last row is
still flying away over the top of it. A tall narrow screen is where that bites:
the grid is four rows deep and the curve across it is short, so the queue has
much further to run relative to the curve than it does on a desktop. Delaying
the phone does not help, because the head's speed is solved from its own
arrival and the whole thing scales together. A shorter queue does, so
`buildCurve()` tightens `G.spacing` until `gridClearAt()` lands before
`phoneIn`, down to a floor where the cards would start to overlap. A desktop
already clears in time and comes out untouched.

`G.spacing` is the pitch of the cards once they're in the line, and it sits
between two constraints:

- It must stay **wider than `G.cellW`**, or cards within a row depart on top of
  one another. The gap between the two is the departure interval, and
  `chaseLead × spacing` is the flight length, so if departures look abrupt,
  widening the pitch buys room for a longer flight.
- The whole line, `cards.length × spacing`, must stay **shorter than the curve**
  (`G.len`), or the head reaches the phone before the tail has left the grid
  and the phone turns up while cards are still waiting. If you need more cards
  or a wider pitch, lengthen the loop in `CURVE` to match.

**`T` in `app.js`**, the beats, as scroll progress 0→1 across `#story`:

| key | what it controls |
|---|---|
| `heroFadeOut` | when the headline is fully gone, keep it **before** `riseIn`, or the grid rises into text that is still visible |
| `riseIn` / `riseOut` | the grid lifting into the space the headline just left |
| `hold` | nothing leaves the grid until here |
| `chaseLead` | how far ahead of the line's tail, in card slots, a card starts moving, this is the length of the flight, so raise it if departures look abrupt |
| `phoneIn` / `phoneSet` | the phone arriving in the middle |
| `arriveAt` | where the head card is by `phoneSet` (1.0 = landing exactly then) |
| `finishBy` | when the *last* card has been filed |
| `absorbFrom` | the arc fraction where a card peels off and dives into its tile |
| `settleIn` / `outroIn` | the phone easing down, the closing line arriving |
| `persp` | projection distance in px, lower is a more dramatic perspective |

`arriveAt` and `finishBy` are solved for at runtime, so the timing holds on any
viewport rather than needing a per-breakpoint speed.

The length of the whole sequence is the `height` of `.story` in `styles.css`
(currently `660vh`), raise it to slow everything down.
