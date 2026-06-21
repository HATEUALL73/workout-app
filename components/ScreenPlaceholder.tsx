import { StyleSheet, Text, View } from 'react-native';

import { colors } from '../theme/colors';

// Временная заглушка экрана: крупный заголовок по центру.
// Будет заменена реальным содержимым по мере разработки.
type Props = {
  title: string;
};

export function ScreenPlaceholder({ title }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>Экран в разработке</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    padding: 24,
  },
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '700',
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 16,
    marginTop: 8,
  },
});
