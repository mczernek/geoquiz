# Design

One vivid look, no light/dark modes. Tokens: `src/theme.ts`.

- **Background:** plain diagonal gradient, violet `#5B0CFF` → magenta `#F500E6` (inspired by the brief's wavy
  purple artwork, kept plain).
- **Globe:** ocean radial gradient `#46C2FF` → `#1B3BD6`, cyan atmosphere glow, limb shading and a specular
  highlight for depth; land sunny yellow `#FFD84D`, borders deep purple; graticule faint white.
  Highlight pink `#FF3D9A`, correct mint `#21E6A0`, wrong red `#FF4D6D`. Home: unselected continents lavender,
  learned countries mint, partly learned orange.
- **Brand:** the Globik wordmark tops Home and closes Account; logo, icons and voice in `docs/brand.md`.
- **Type:** Fredoka (400–700).
- **Surfaces:** white cards (radius 28) for questions; translucent violet glass panels on the gradient; pill buttons
  (yellow primary, white secondary). Everything squishes when pressed.
- **Layout:** max content width 720; phones portrait-first; the globe takes the free space between header and panel.

## Motion & haptics

| Moment                      | Motion                                                                              | Haptic (native / web)           |
| --------------------------- | ----------------------------------------------------------------------------------- | ------------------------------- |
| Press a button              | squish (spring to 0.94)                                                             | impactLight / softTap           |
| Toggle a chip / pick a flag | squish                                                                              | selection / softTap             |
| Tap the globe to answer     | —                                                                                   | impactMedium / tap              |
| Correct                     | globe flies to the country, card pops in with a bounce, confetti burst, score bumps | notificationSuccess / doubleTap |
| Wrong                       | card shakes, globe frames both countries                                            | notificationError / reject      |
| Card learned                | star badge springs in                                                               | bloom / bounce                  |
| Streak of 5, 10, …          | streak counter jumps, flame glows                                                   | fanfare / finale                |
| Screen change               | the globe glides into the new screen's slot, panels slide up                        | —                               |
