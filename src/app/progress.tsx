import { router } from 'expo-router';
import { View } from 'react-native';

import { Text } from '@/ui/Text';
import { Button } from '@/ui/Button';

export default function ProgressScreen() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>Progress</Text>
      <Button title="Back" onPress={() => router.back()} />
    </View>
  );
}
