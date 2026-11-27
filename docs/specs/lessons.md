# Lessons

A guided way to learn a few countries at a time: Home → **Lessons** (`/lessons`), then a lesson (`/lesson/<id>`).

## Lessons

Each continent is split into lessons of about ten neighbouring countries (`src/domain/lessons.ts`): the continent's
countries are halved along the direction they spread most, again and again, until each part has about ten. Europe,
Africa and Asia get five lessons each, North America two, South America and Oceania one. Ids are
`<continent>-<number>` (`europe-2`).

The Lessons screen has a chip per continent (starting at the first continent selected on Home) and a row per
lesson: its number, flags and country names, and five dots for its steps, or **Done** when all are finished.
The globe frames the continent; lesson progress isn't painted on it.

## Steps

| Step         | What happens                                                                                     |
| ------------ | ------------------------------------------------------------------------------------------------ |
| Countries    | Each country in turn, west to east (along the lesson's spread): flag and name, globe flies there |
| Capitals     | The same, with the capital                                                                       |
| Map quiz     | Flashcards for the map (`map-name` / `map-locate` as in practice)                                |
| Flag quiz    | Flashcards for the flags (`flag-pick` / `flag-name`)                                             |
| Capital quiz | Flashcards for the capitals (`capital-of` / `capital-country`)                                   |

A flashcard round asks the lesson's countries in random order. A right answer drops the country; a wrong one (or
"I don't know") brings it back after 3 others. The round ends when every country was answered right once. "I was
right" works as in practice. Answers grade the same cards as practice (docs/specs/learning.md), so what a lesson
teaches comes back in Play for review.

A finished step is saved on the device (not synced, decision 026) and offers the next unfinished step. A lesson is
done when all five steps are; its last screen frames the lesson's countries (outlined, not graded) and offers the
next lesson. The five step buttons at the top start any step at any time, finished or not, and any lesson can be
opened again. Opening a lesson starts at its first unfinished step (or the first step when it's done).

Enter (web) moves on in the showing steps and after an answer.
