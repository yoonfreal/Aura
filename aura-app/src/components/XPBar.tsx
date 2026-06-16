import { StyleSheet, View } from 'react-native';

interface Props {
  current: number;
  max: number;
}

export function XPBar({ current, max }: Props) {
  const progress = Math.min(current / max, 1);

  return (
    <View style={styles.track}>
      <View style={[styles.fill, { width: `${progress * 100}%` as `${number}%` }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 8,
    backgroundColor: '#D6E8F5',
    borderRadius: 4,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: '#4A90D9',
    borderRadius: 4,
  },
});
