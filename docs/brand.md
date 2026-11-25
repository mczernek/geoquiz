# Globik brand

## Name and line

**Globik** — Polish for "little globe": friendly, short, and easy to say in English too. Always one word, capital G
in running text, lowercase in the wordmark.

| Language | Tagline                  |
| -------- | ------------------------ |
| English  | Learn the world by heart |
| Polish   | Poznaj świat na pamięć   |

Store subtitle ideas: "Flags, capitals and maps on a 3D globe" / "Flagi, stolice i mapy na globusie 3D".

## Logo

- **Mark:** the app's own globe (Europe and Africa facing, yellow land, purple borders, blue ocean) wrapped by a
  tilted white orbit, with a pink spark riding the near side of the orbit: the spark is "you", travelling the world.
  The orbit's far half passes behind the globe.
- **Wordmark:** "globik" in Fredoka Bold, white, with the mark standing in for the "o" (`src/ui/Logo.tsx`). On
  screen the mark rolls in with a spring when the logo appears.
- **Clear space:** at least the globe's radius around the mark. Don't recolor the globe, flatten the orbit, or put the
  white wordmark on anything lighter than the purple gradient.
- **Sources:** everything is generated, not drawn: `scripts/build-icons.ts` renders the mark from the globe renderer
  (`src/globe`) into SVG (`design/icon/`), and `pnpm icons` rasterizes the app icon, Android adaptive layers
  (foreground, background, monochrome), splash, favicon, `assets/images/brand-mark.png` (the wordmark's "o") and
  the Play Store icon and feature graphics (`store/play/graphics`).

## Colour

| Role        | Value                                         |
| ----------- | --------------------------------------------- |
| Background  | gradient violet `#5B0CFF` → magenta `#F500E6` |
| Land / CTA  | sunny yellow `#FFD84D`                        |
| Ocean       | `#46C2FF` → `#1B3BD6`                         |
| Spark / hot | pink `#FF3D9A`                                |
| Ink         | deep purple `#2A0A5E`                         |
| Correct     | mint `#21E6A0`                                |
| Wrong       | red `#FF4D6D`                                 |

Full colours only, one look (no light/dark variants). Tokens: `src/theme.ts`.

## Type

- **Wordmark:** Fredoka Bold, only for "globik".
- **Everything else:** Nunito: ExtraBold for titles, Bold for headings, labels and buttons, SemiBold for body text.
  Fredoka can't be used for text: it lacks Polish letters (ą ć ę ń ś ź ż; decision 016).

## Voice

Short, warm, encouraging; a friend quizzing you, not a teacher grading you. Celebrate ("Correct!", "🔥 5 in a
row!"), never scold ("Not quite", "Here it is"). Polish uses the informal "ty" and avoids gendered verb forms
("Twoje postępy przejdą razem z tobą", not "nauczyłeś się").
