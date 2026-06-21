import { useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { RestTimer } from '../../components/RestTimer';
import { colors } from '../../theme/colors';

// Вкладка «Таймер». Если открыта от кнопки отдыха — стартовое время приходит
// в параметре seconds, иначе по умолчанию 90с.
export default function TimerScreen() {
  const { seconds } = useLocalSearchParams<{ seconds?: string }>();
  const initial = Number(seconds) > 0 ? Number(seconds) : 90;

  return (
    <View style={styles.container}>
      <RestTimer key={initial} initialSeconds={initial} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
});
