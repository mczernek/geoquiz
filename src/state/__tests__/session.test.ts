jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import { LEARNED_BOX } from '@/domain/scheduler';

import { useProgress } from '../progress';
import { useSession } from '../session';

describe('override ("I was right")', () => {
  beforeEach(() => {
    useProgress.getState().clear();
    useSession.getState().start();
  });

  it('regrades a wrong first answer as a first-try success and restores the streak', () => {
    const { question } = useSession.getState();
    useSession.setState({ streak: 3 });
    useSession.getState().answer({ correct: false, given: 'Narnia' });
    expect(useSession.getState().streak).toBe(0);

    const result = useSession.getState().override();
    expect(result).toMatchObject({ correct: true, overridden: true, learned: true });
    const card = useProgress.getState().cards[question!.key]!;
    expect(card).toMatchObject({ box: LEARNED_BOX, seen: 1, correct: 1, wrong: 0 });
    expect(useSession.getState()).toMatchObject({ streak: 4, correct: 1, answered: 1 });
  });

  it('does nothing after a right answer or twice', () => {
    useSession.getState().answer({ correct: true, given: 'x' });
    expect(useSession.getState().override()).toBeNull();
    useSession.getState().next();
    useSession.getState().answer({ correct: false, given: 'x' });
    expect(useSession.getState().override()).not.toBeNull();
    expect(useSession.getState().override()).toBeNull();
  });
});
