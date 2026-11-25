import { Alert, Platform } from 'react-native';

import { currentStrings } from '@/i18n';

/** A yes/no question: the native alert, or the browser's confirm dialog on the web. */
export function confirm(title: string, message: string, action: string): Promise<boolean> {
  if (Platform.OS === 'web') return Promise.resolve(window.confirm(`${title}\n\n${message}`));
  return new Promise((resolve) =>
    Alert.alert(title, message, [
      { text: currentStrings().common.cancel, style: 'cancel', onPress: () => resolve(false) },
      { text: action, style: 'destructive', onPress: () => resolve(true) },
    ]),
  );
}
