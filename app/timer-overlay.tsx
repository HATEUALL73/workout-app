import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { RestTimer } from '../components/RestTimer';
import { colors } from '../theme/colors';

// Оверлей таймера отдыха поверх экрана тренировки.
// Открывается кнопкой «Отдых» на карточке упражнения с её временем.
export default function TimerOverlay() {
  const router = useRouter();
  const { seconds } = useLocalSearchParams<{ seconds?: string }>();
  const initial = Number(seconds) > 0 ? Number(seconds) : 90;

  const close = () => router.back();

  return (
    <View style={styles.backdrop}>
      {/* Тап по затемнённому фону закрывает оверлей */}
      <Pressable style={StyleSheet.absoluteFill} onPress={close} />
      <View style={styles.card}>
        <RestTimer initialSeconds={initial} autoStart onClose={close} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 24,
  },
  card: {
    width: '100%',
    backgroundColor: colors.background,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.surfaceElevated,
    paddingVertical: 32,
    paddingHorizontal: 24,
  },
});
