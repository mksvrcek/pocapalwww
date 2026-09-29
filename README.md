# PocaPal, product page

Static single page. No build step, no backend. `public/` is the whole site.

```
public/
  index.html            structure + all copy
  styles.css            all styling (dark story → light body, magenta accent)
  app.js                scroll choreography; tuning constants at the top
  assets/cards/         placeholder card artwork (SVG)
  assets/features/      placeholder artwork for the feature rail (SVG)
  assets/phone-frame.webp the phone frame (hero + both blades)
```

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
- **`.scene-pair`** (Wishlist), a second phone turned off-axis behind the
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

## The feature rail

The horizontally scrolling section near the bottom (`.rail-sec`) is a plain
`overflow-x: auto` list with CSS scroll snapping, the arrows just call
`scrollBy` and grey themselves out at the ends. Its `scroll-padding-inline`
matches the track's padding so the first card lines up with the heading rather
than the viewport edge; without it the browser snaps the card to the very edge.

Cards, copy and artwork all live in `index.html`, add or remove `<li
class="rail-card">` entries freely, the arrows adapt.

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
