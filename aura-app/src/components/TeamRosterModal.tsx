import { Modal, View, Text, TouchableOpacity, FlatList, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type RosterMember = {
  userId: string;
  name: string;
  currentValue: number;
};

type TeamRosterModalProps = {
  visible: boolean;
  teamName: string;
  goalUnit: string;
  goalValue: number;
  members: RosterMember[];
  currentUserId?: string;
  onClose: () => void;
};

const AVATAR_COLORS = [
  '#1E4D8C', '#4A5568', '#744210', '#065F46',
  '#5B21B6', '#831843', '#1E3A5F', '#3D2B1F',
];

export function TeamRosterModal({
  visible,
  teamName,
  goalUnit,
  goalValue,
  members,
  currentUserId,
  onClose,
}: TeamRosterModalProps) {
  const teamTotal = members.reduce((sum, m) => sum + m.currentValue, 0);
  const ranked = [...members].sort((a, b) => b.currentValue - a.currentValue);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>{teamName}</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={22} color="#0D1829" />
            </TouchableOpacity>
          </View>

          <Text style={styles.subheading}>
            Team total: {teamTotal.toLocaleString()} / {goalValue.toLocaleString()} {goalUnit}
          </Text>

          <FlatList
            data={ranked}
            keyExtractor={(item) => item.userId}
            renderItem={({ item, index }) => {
              const share = teamTotal > 0 ? item.currentValue / teamTotal : 0;
              const isCurrentUser = item.userId === currentUserId;
              return (
                <View style={[styles.memberRow, isCurrentUser && styles.memberRowCurrent]}>
                  <Text style={styles.rankNumber}>{index + 1}</Text>
                  <View
                    style={[styles.avatar, { backgroundColor: AVATAR_COLORS[index % AVATAR_COLORS.length] }]}
                  >
                    <Text style={styles.avatarText}>{item.name.charAt(0).toUpperCase()}</Text>
                  </View>
                  <View style={styles.memberInfo}>
                    <Text style={styles.memberName}>{item.name}</Text>
                    <View style={styles.shareTrack}>
                      <View style={[styles.shareFill, { width: `${Math.round(share * 100)}%` }]} />
                    </View>
                  </View>
                  <View style={styles.memberValueCol}>
                    <Text style={styles.memberValue}>
                      {item.currentValue.toLocaleString()} {goalUnit}
                    </Text>
                    <Text style={styles.memberShare}>{Math.round(share * 100)}% of team</Text>
                  </View>
                </View>
              );
            }}
          />
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
    marginBottom: 12,
  },
  title: { fontSize: 17, fontWeight: '800', color: '#0D1829' },
  subheading: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
    marginBottom: 10,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F4F8',
  },
  memberRowCurrent: {
    backgroundColor: '#EBF2FF',
    borderRadius: 12,
    paddingHorizontal: 8,
  },
  rankNumber: {
    width: 20,
    fontSize: 13,
    fontWeight: '700',
    color: '#9CA3AF',
    textAlign: 'center',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 6,
    marginRight: 10,
  },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  memberInfo: { flex: 1, marginRight: 10 },
  memberName: { fontSize: 14, fontWeight: '700', color: '#0D1829' },
  shareTrack: {
    height: 5,
    borderRadius: 3,
    backgroundColor: '#E5E9F0',
    marginTop: 6,
    overflow: 'hidden',
  },
  shareFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: '#2563EB',
  },
  memberValueCol: { alignItems: 'flex-end' },
  memberValue: { fontSize: 13, color: '#0D1829', fontWeight: '700' },
  memberShare: { fontSize: 11, color: '#9CA3AF', fontWeight: '600', marginTop: 2 },
});
