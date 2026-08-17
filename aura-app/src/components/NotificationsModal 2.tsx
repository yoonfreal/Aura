import { Modal, View, Text, TouchableOpacity, FlatList, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { timeAgo } from '@/lib/posts';
import type { AppNotification } from '@/lib/notifications';

type NotificationsModalProps = {
  visible: boolean;
  notifications: AppNotification[];
  loading: boolean;
  onClose: () => void;
  onPressNotification: (notification: AppNotification) => void;
};

export function NotificationsModal({
  visible,
  notifications,
  loading,
  onClose,
  onPressNotification,
}: NotificationsModalProps) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>Notifications</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={22} color="#0D1829" />
            </TouchableOpacity>
          </View>

          {loading ? (
            <ActivityIndicator color="#1B2B4B" style={{ marginVertical: 24 }} />
          ) : (
            <FlatList
              data={notifications}
              keyExtractor={(item) => item.id}
              style={styles.list}
              ListEmptyComponent={<Text style={styles.emptyText}>No notifications yet.</Text>}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.row} onPress={() => onPressNotification(item)}>
                  <View style={styles.dot}>
                    <Ionicons name={item.type === 'post' ? 'add-circle' : 'chatbubble'} size={14} color="#1B2B4B" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowText}>
                      <Text style={styles.rowName}>{item.actorName}</Text>{' '}
                      {item.type === 'post' ? 'shared a new post' : 'commented on your post'}
                      {item.previewText ? `: "${item.previewText}"` : ''}
                    </Text>
                    <Text style={styles.rowTime}>{timeAgo(item.createdAt)}</Text>
                  </View>
                  {!item.read && <View style={styles.unreadDot} />}
                </TouchableOpacity>
              )}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 32,
    maxHeight: '75%',
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  title: { fontSize: 17, fontWeight: '800', color: '#0D1829' },
  list: { maxHeight: 380 },
  emptyText: { color: '#9CA3AF', fontSize: 13, textAlign: 'center', paddingVertical: 24 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F4F8',
  },
  dot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EBF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: { fontSize: 13, color: '#374151', lineHeight: 18 },
  rowName: { fontWeight: '800', color: '#0D1829' },
  rowTime: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#DC2626' },
});
