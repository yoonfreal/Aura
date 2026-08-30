import { useState } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type TeamOption = {
  id: string;
  name: string;
  memberCount: number;
  totalValue: number;
};

type TeamJoinModalProps = {
  visible: boolean;
  teams: TeamOption[];
  goalValue: number;
  goalUnit: string;
  onClose: () => void;
  onJoinTeam: (teamId: string) => void;
  onCreateTeam: (name: string) => void;
};

export function TeamJoinModal({
  visible,
  teams,
  goalValue,
  goalUnit,
  onClose,
  onJoinTeam,
  onCreateTeam,
}: TeamJoinModalProps) {
  const [newTeamName, setNewTeamName] = useState('');

  function handleCreate() {
    if (!newTeamName.trim()) return;
    onCreateTeam(newTeamName.trim());
    setNewTeamName('');
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>Join a Team</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={22} color="#0D1829" />
            </TouchableOpacity>
          </View>

          <FlatList
            data={teams}
            keyExtractor={(item) => item.id}
            ListEmptyComponent={
              <Text style={styles.emptyText}>No teams yet — be the first to create one</Text>
            }
            renderItem={({ item }) => {
              const progressPct = goalValue > 0 ? Math.min(100, (item.totalValue / goalValue) * 100) : 0;
              return (
                <View style={styles.teamRow}>
                  <View style={styles.teamRowTop}>
                    <View>
                      <Text style={styles.teamName}>{item.name}</Text>
                      <Text style={styles.teamMeta}>
                        {item.memberCount} {item.memberCount === 1 ? 'member' : 'members'}
                      </Text>
                    </View>
                    <TouchableOpacity style={styles.joinBtn} onPress={() => onJoinTeam(item.id)}>
                      <Text style={styles.joinBtnText}>Join</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.progressTrack}>
                    <View style={[styles.progressFill, { width: `${progressPct}%` }]} />
                  </View>
                  <View style={styles.progressRow}>
                    <Text style={styles.progressLabel}>
                      {item.totalValue.toLocaleString()} / {goalValue.toLocaleString()} {goalUnit}
                    </Text>
                    <Text style={styles.progressPct}>{Math.round(progressPct)}%</Text>
                  </View>
                </View>
              );
            }}
            style={styles.list}
          />

          <View style={styles.createRow}>
            <TextInput
              style={styles.input}
              placeholder="New team name"
              value={newTeamName}
              onChangeText={setNewTeamName}
            />
            <TouchableOpacity style={styles.createBtn} onPress={handleCreate}>
              <Text style={styles.createBtnText}>Create</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 32,
    maxHeight: '75%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: { fontSize: 17, fontWeight: '800', color: '#0D1829' },
  list: { marginBottom: 12 },
  emptyText: { color: '#9CA3AF', fontSize: 13, textAlign: 'center', paddingVertical: 20 },
  teamRow: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F4F8',
  },
  teamRowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  teamName: { fontSize: 14, fontWeight: '700', color: '#0D1829' },
  teamMeta: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#E5E9F0',
    marginTop: 10,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: '#D97706',
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  progressLabel: { fontSize: 11, color: '#6B7280', fontWeight: '600' },
  progressPct: { fontSize: 11, fontWeight: '800', color: '#D97706' },
  joinBtn: {
    backgroundColor: '#1B2B4B',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  joinBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  createRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  input: {
    flex: 1,
    backgroundColor: '#F2F6F9',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0D1829',
  },
  createBtn: {
    backgroundColor: '#F5B800',
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createBtnText: { color: '#1B2B4B', fontWeight: '800', fontSize: 13 },
});
