jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import { useHapticsStore, whenEnabled } from '../settings';

describe('haptics switch', () => {
  beforeEach(() => useHapticsStore.getState().setEnabled(true));

  it('plays haptics by default and stays silent once switched off', () => {
    const play = jest.fn();
    const haptic = whenEnabled(play);
    haptic();
    useHapticsStore.getState().setEnabled(false);
    haptic();
    expect(play).toHaveBeenCalledTimes(1);
    useHapticsStore.getState().setEnabled(true);
    haptic();
    expect(play).toHaveBeenCalledTimes(2);
  });
});
