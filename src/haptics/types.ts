/** Haptic moments of the app (docs/specs/design.md → Haptics). */
export interface Haptics {
  /** Toggling a chip, choosing an option. */
  select: () => void;
  /** Pressing a button. */
  press: () => void;
  /** A right answer. */
  correct: () => void;
  /** A wrong answer: a gentle correction, not an alarm. */
  wrong: () => void;
  /** "I don't know": the answer is shown. */
  reveal: () => void;
  /** The user counted a "wrong" answer as right. */
  override: () => void;
  /** A card reached "learned". */
  learned: () => void;
  /** Every 5 correct answers in a row. */
  streak: () => void;
  /** Every 10 in a row: bigger than `streak`. */
  bigStreak: () => void;
  /** Tapping a country on the globe (answering, exploring). */
  globeTap: () => void;
  /** Tapping the sea where a country was expected. */
  globeMiss: () => void;
}
