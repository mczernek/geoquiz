# Design

One vivid look, no light/dark modes. Tokens: `src/theme.ts`.

- **Background:** plain diagonal gradient, violet `#5B0CFF` → magenta `#F500E6` (inspired by the brief's wavy
  purple artwork, kept plain).
- **Globe:** ocean radial gradient `#46C2FF` → `#1B3BD6`, cyan atmosphere glow, limb shading and a specular
  highlight for depth; land sunny yellow `#FFD84D`, borders deep purple; graticule faint white.
  Highlight pink `#FF3D9A`, correct mint `#21E6A0`, wrong red `#FF4D6D`. Home: unselected continents lavender,
  learned countries mint, partly learned orange.
- **Brand:** the Globik wordmark tops Home and closes Account; logo, icons and voice in `docs/brand.md`.
- **Type:** Nunito 600–800 for text; Fredoka Bold only in the wordmark (decision 016).
- **Surfaces:** white cards (radius 28) for questions; translucent violet glass panels on the gradient; pill buttons
  (yellow primary, white secondary). Everything squishes when pressed.
- **Layout:** max content width 720; phones portrait-first; the globe takes the free space between header and panel.

## Motion & haptics

The globe carries the celebration (fly-to, confetti); the card stays calm: short fades and lifts, no overshoot.
Haptics are Pulsar presets picked by character (decision 012).

Account → Haptics: On / Off (default On) silences every haptic below. The choice is remembered on the device, not
synced (decision 025), and is hidden on the web where the browser can't vibrate.

| Moment                      | Motion                                                                          | Haptic (native / web) |
| --------------------------- | ------------------------------------------------------------------------------- | --------------------- |
| Press a button              | squish (spring to 0.94)                                                         | peck / softTap        |
| Toggle a chip / pick a flag | squish                                                                          | flick / softTap       |
| Tap a country on the globe  | —                                                                               | ping / tap            |
| Tap the sea                 | —                                                                               | thud / softTap        |
| Correct                     | globe flies to the country, confetti burst; card fades up (240 ms), score bumps | coinDrop / bounce     |
| Wrong                       | short shake, globe frames both countries                                        | wobble / deflate      |
| "I don't know"              | globe flies to the answer                                                       | exhale / unwind       |
| "I was right" (override)    | card turns green, confetti                                                      | rebound / connect     |
| Card learned                | star badge fades in                                                             | ascent / skip         |
| Streak of 5                 | streak counter jumps, toast                                                     | fanfare / knockout    |
| Streak of 10, 20, …         | same                                                                            | triumph / finale      |
| Screen change               | the globe glides into the new screen's slot, panels slide up                    | —                     |
