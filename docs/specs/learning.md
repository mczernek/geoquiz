# Learning

## Cards

A card is a (mode, country) pair: `flag:PL`, `capital:PL`, `map:PL`. Modes: **Flags**, **Capitals**, **Map**. The
pool is every selected mode × every country of the selected continents (at least one of each is always selected).

## Scheduling (decision 008)

| Answer                   | New box         | Asked again after                                   |
| ------------------------ | --------------- | --------------------------------------------------- |
| correct, first time ever | 3 (learned)     | 1 day                                               |
| correct                  | box + 1 (max 5) | 2 min, 20 min, 1 day, 4 days, 14 days for boxes 1–5 |
| wrong or "I don't know"  | 0               | 4 other cards                                       |

Next card, in order: due cards (lowest box, most overdue first, a little random among the top 3); a new card if
fewer than 7 cards are being learned; the learning card due soonest; any new card; the card due soonest. The last 4
asked cards are skipped when the pool is big enough.

**Learned** = box ≥ 3. Home shows learned/total per mode for the selected continents and how many cards are due.

## Questions

| Mode     | Variant         | Prompt                               | Answer                                                     |
| -------- | --------------- | ------------------------------------ | ---------------------------------------------------------- |
| Flags    | flag-pick       | "Which is the flag of **Poland**?"   | one of 4 flags (others preferably from the same continent) |
| Flags    | flag-name       | a flag                               | type the country                                           |
| Capitals | capital-of      | "What is the capital of **Poland**?" | type the capital                                           |
| Capitals | capital-country | "**Warsaw** is the capital of…"      | type the country                                           |
| Map      | map-name        | country highlighted on the globe     | type the country                                           |
| Map      | map-locate      | "Find **Poland** on the globe"       | tap it (any tap on the globe answers)                      |

Flags: boxes 0–1 pick 70% of the time, later 30%. Capitals: 75% capital-of. Map: 50/50.
Every question has **I don't know** (counts as wrong).

Typed answers (decision 013): normalized (case, accents, punctuation, "Saint" = "St", leading "The"), any accepted
spelling, a typo forgiven from 5 letters, two from 9, unless the input is at least as close to another country.

## Globe during a question

| Variant                    | Globe                                                                                   |
| -------------------------- | --------------------------------------------------------------------------------------- |
| map-name                   | flies to the country, highlighted pink with a glowing outline (ring for tiny countries) |
| map-locate                 | centre of the selected continents, zoom 1.15, no highlight, taps answer                 |
| flag-pick, capital-of      | flies to the country, highlighted (the country is in the question)                      |
| flag-name, capital-country | centre of the selected continents, slowly spinning (no hints)                           |

## Answer

The globe flies to the country: green when right, pink when wrong, and the country the user picked or typed (if it
is another country) in red — then both are framed. The card shows the verdict, flag, name, capital(s), continent,
what the user answered, and "Learned!" when the card just reached box 3. **Next** (Enter on the web) continues.
The header shows correct/answered and the current streak.
