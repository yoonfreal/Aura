import { useEffect, useState } from 'react';
import { Modal, View, Text, TouchableOpacity, FlatList, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Open1v1Challenge } from '@/lib/challenges';

type ChallengeFriendModalProps = {
  visible: boolean;
  friendName: string;
  challenges: Open1v1Challenge[];
  loading: boolean;
  onClose: () => void;
  onConfirm: (challengeId: string) => void;
};

// Two-step sheet: pick which open 1v1 challenge to race the friend in, then an explicit
// confirm step before actually inviting them — the opponent is already fixed (whoever
// posted), so unlike OpponentPickerModal this only needs to ask "which challenge", and it
// must not fire the invite on the same tap that picks the challenge.
export function ChallengeFriendModal({
  visible,
  friendName,
  challenges,
  loading,
  onClose,
  onConfirm,
}: ChallengeFriendModalProps) {
  const [selected, setSelected] = useState<Open1v1Challenge | null>(null);

  useEffect(() => {
    if (!visible) setSelected(null);
  }, [visible]);

  function handleClose() {
    setSelected(null);
    onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          {selected ? (
            <>
              <View style={styles.header}>
                <Text style={styles.title}>Confirm challenge</Text>
                <TouchableOpacity onPress={handleClose}>
                  <Ionicons name="close" size={22} color="#0D1829" />
                </TouchableOpacity>
              </View>

              <View style={styles.confirmCard}>
                <Text style={styles.confirmIcon}>{selected.icon}</Text>
                <Text style={styles.confirmTitle}>{selected.title}</Text>
                <Text style={styles.confirmMeta}>
                  {selected.goalValue.toLocaleString()} {selected.goalUnit} · {selected.xpReward} XP
                </Text>
              </View>

              <Text style={styles.confirmQuestion}>
                Challenge <Text style={styles.confirmName}>{friendName}</Text> to a 1v1 race in this challenge?
              </Text>

              <View style={styles.confirmActions}>
                <TouchableOpacity style={styles.backBtn} onPress={() => setSelected(null)}>
                  <Text style={styles.backBtnText}>Back</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.confirmBtn} onPress={() => onConfirm(selected.id)}>
                  <Text style={styles.confirmBtnText}>Challenge</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <>
              <View style={styles.header}>
                <Text style={styles.title}>Challenge {friendName}</Text>
                <TouchableOpacity onPress={handleClose}>
                  <Ionicons name="close" size={22} color="#0D1829" />
                </TouchableOpacity>
              </View>
              <Text style={styles.subtitle}>Pick a 1v1 challenge to race them in</Text>

              {loading ? (
                <ActivityIndicator color="#1B2B4B" style={{ marginVertical: 24 }} />
              ) : (
                <FlatList
                  data={challenges}
                  keyExtractor={(item) => item.id}
                  style={styles.list}
                  ListEmptyComponent={<Text style={styles.emptyText}>No open 1v1 challenges right now.</Text>}
                  renderItem={({ item }) => (
                    <TouchableOpacity style={styles.row} onPress={() => setSelected(item)}>
                      <Text style={styles.rowIcon}>{item.icon}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.rowTitle}>{item.title}</Text>
                        <Text style={styles.rowMeta}>
                          {item.goalValue.toLocaleString()} {item.goalUnit} · {item.xpReward} XP
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={18} color="#C0C8D4" />
                    </TouchableOpacity>
                  )}
                />
              )}
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  sheet: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 20,
    maxHeight: '75%',
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  title: { fontSize: 17, fontWeight: '800', color: '#0D1829' },
  subtitle: { fontSize: 13, color: '#8A9BB0', marginBottom: 12 },
  list: { maxHeight: 320 },
  emptyText: { color: '#9CA3AF', fontSize: 13, textAlign: 'center', paddingVertical: 24 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F4F8',
  },
  rowIcon: { fontSize: 22 },
  rowTitle: { fontSize: 14, fontWeight: '700', color: '#0D1829' },
  rowMeta: { fontSize: 12, color: '#8A9BB0', marginTop: 2 },

  confirmCard: {
    alignItems: 'center',
    backgroundColor: '#F0F4F8',
    borderRadius: 16,
    paddingVertical: 20,
    marginTop: 12,
    marginBottom: 16,
  },
  confirmIcon: { fontSize: 32 },
  confirmTitle: { fontSize: 16, fontWeight: '800', color: '#0D1829', marginTop: 6 },
  confirmMeta: { fontSize: 12, color: '#8A9BB0', marginTop: 4 },
  confirmQuestion: { fontSize: 14, color: '#374151', textAlign: 'center', lineHeight: 20, marginBottom: 20 },
  confirmName: { fontWeight: '800', color: '#0D1829' },
  confirmActions: { flexDirection: 'row', gap: 10 },
  backBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  backBtnText: { fontSize: 14, fontWeight: '700', color: '#0D1829' },
  confirmBtn: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 12, backgroundColor: '#1B2B4B' },
  confirmBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
});
