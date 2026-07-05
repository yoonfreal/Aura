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
  members: RosterMember[];
  onClose: () => void;
};

export function TeamRosterModal({
  visible,
  teamName,
  goalUnit,
  members,
  onClose,
}: TeamRosterModalProps) {
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

          <FlatList
            data={members}
            keyExtractor={(item) => item.userId}
            renderItem={({ item }) => (
              <View style={styles.memberRow}>
                <Text style={styles.memberName}>{item.name}</Text>
                <Text style={styles.memberValue}>
                  {item.currentValue.toLocaleString()} {goalUnit}
                </Text>
              </View>
            )}
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
  memberRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F4F8',
  },
  memberName: { fontSize: 14, fontWeight: '700', color: '#0D1829' },
  memberValue: { fontSize: 13, color: '#6B7280', fontWeight: '600' },
});
