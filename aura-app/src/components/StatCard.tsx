import { StyleSheet, Text, View } from 'react-native';

interface Props {
  icon: string;
  value: string;
  label: string;
  iconBg: string;
}

export function StatCard({ icon, value, label, iconBg }: Props) {
  return (
    <View style={styles.card}>
      <View style={[styles.iconWrap, { backgroundColor: iconBg }]}>
        <Text style={styles.icon}>{icon}</Text>
      </View>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  icon: {
    fontSize: 16,
  },
  value: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1B2B4B',
    letterSpacing: -0.5,
  },
  label: {
    fontSize: 11,
    color: '#8A9BB0',
    marginTop: 2,
    fontWeight: '500',
  },
});
