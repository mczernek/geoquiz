# Explore

A study screen with no questions: Home → compass button (`/explore`).

- Tap (click on the web) any country on the globe: it turns pink and the card shows its flag, name, capital(s),
  continent and how far each topic (flags, capitals, map) is learned. Tapping the sea clears it. The camera doesn't
  move on a tap; the globe stays free to spin and zoom.
- Search: type any part of a country's or capital's name, in English or Polish, accents optional
  (`src/domain/search.ts`). Names starting with the text come first, then later words, then capitals. Picking a
  result (or Enter for the first one) selects it and flies the globe there.
- Tiny countries are tappable through their markers, as in the map questions.
