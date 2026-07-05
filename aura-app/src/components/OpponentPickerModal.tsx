import { useState } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { searchUsers, type UserSearchResult } from '@/lib/challenges';

type OpponentPickerModalProps = {
  visible: boolean;
  currentUserId: string;
  title?: string;
  onClose: () => void;
  onInvite: (opponentId: string) => void;
};

export function OpponentPickerModal({
  visible,
  currentUserId,
  title = 'Invite an Opponent',
  onClose,
  onInvite,
}: OpponentPickerModalProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<UserSearchResult[]>([]);
  const [searching, setSearching] = useState(false);

  async function handleSearch(text: string) {
    setQuery(text);
    if (!text.trim()) {
      setResults([]);
      return;
    }
    setSearching(true);
    const found = await searchUsers(text, currentUserId);
    setResults(found);
    setSearching(false);
  }

  function handleClose() {
    setQuery('');
    setResults([]);
    onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <TouchableOpacity onPress={handleClose}>
              <Ionicons name="close" size={22} color="#0D1829" />
            </TouchableOpacity>
          </View>

          <TextInput
            style={styles.input}
            placeholder="Search by username"
            autoCapitalize="none"
            value={query}
            onChangeText={handleSearch}
          />

          <FlatList
            data={results}
            keyExtractor={(item) => item.id}
            style={styles.list}
            ListEmptyComponent={
              <Text style={styles.emptyText}>
                {searching ? 'Searching…' : query ? 'No users found' : 'Type a username to search'}
              </Text>
            }
            renderItem={({ item }) => (
              <View style={styles.row}>
                <Text style={styles.name}>{item.name}</Text>
                <TouchableOpacity style={styles.inviteBtn} onPress={() => onInvite(item.id)}>
                  <Text style={styles.inviteBtnText}>Invite</Text>
                </TouchableOpacity>
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
    marginBottom: 16,
  },
  title: { fontSize: 17, fontWeight: '800', color: '#0D1829' },
  input: {
    backgroundColor: '#F2F6F9',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0D1829',
    marginBottom: 12,
  },
  list: { maxHeight: 280 },
  emptyText: { color: '#9CA3AF', fontSize: 13, textAlign: 'center', paddingVertical: 20 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F4F8',
  },
  name: { fontSize: 14, fontWeight: '700', color: '#0D1829' },
  inviteBtn: {
    backgroundColor: '#1B2B4B',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  inviteBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
});
