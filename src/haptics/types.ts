/** Haptic moments of the app (docs/specs/design.md → Haptics). */
export interface Haptics {
  /** Toggling a chip, choosing an option. */
  select: () => void;
  /** Pressing a button. */
  press: () => void;
  correct: () => void;
  wrong: () => void;
  /** A card reached "learned". */
  learned: () => void;
  /** Every 5 correct answers in a row. */
  streak: () => void;
  /** Tapping the globe to answer. */
  globeTap: () => void;
}
