import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { timeAgo } from '@/lib/posts';
import type { AppNotification } from '@/lib/notifications';

type NotificationsModalProps = {
  visible: boolean;
  notifications: AppNotification[];
  loading: boolean;
  onClose: () => void;
  onPressNotification: (
    notification: AppNotification
  ) => void;
};

export function NotificationsModal({
  visible,
  notifications,
  loading,
  onClose,
  onPressNotification,
}: NotificationsModalProps) {
  function getIcon(
    notification: AppNotification
  ): keyof typeof Ionicons.glyphMap {
    switch (notification.type) {
      case 'reaction':
        return 'heart';

      case 'comment':
        return 'chatbubble';

      case 'post':
        return 'add-circle';

      case 'friend_request':
        return 'person-add';

      case 'challenge_invite':
        return 'trophy';

      case 'challenge_response':
        if (notification.responseStatus === 'declined') return 'close-circle';
        if (notification.responseStatus === 'joined') return 'people';
        return 'checkmark-circle';

      case 'challenge_complete':
        return 'ribbon';

      case 'challenge_ending_soon':
        return 'hourglass';

      case 'streak_reminder':
        return 'flame';

      case 'team_invite':
        return 'people';

      case 'admin_warning':
        return 'warning';

      case 'announcement':
        return 'megaphone';

      default:
        return 'notifications';
    }
  }

  function getMessage(
    notification: AppNotification
  ): string {
    switch (notification.type) {
      case 'reaction':
        return 'liked your post';

      case 'comment':
        return 'commented on your post';

      case 'post':
        return 'shared a new post';

      case 'friend_request':
        return 'sent you a friend request';

      case 'challenge_invite':
        return 'invited you to a challenge';

      case 'challenge_response':
        if (notification.responseStatus === 'declined') return 'declined your challenge invite';
        if (notification.responseStatus === 'accepted') return 'accepted your challenge invite';
        if (notification.responseStatus === 'joined') return 'joined your team';
        return 'responded to your challenge';

      case 'challenge_complete':
        return 'completed a challenge';

      case 'challenge_ending_soon':
        return 'have a challenge ending soon';

      case 'streak_reminder':
        return 'are about to lose your streak';

      case 'team_invite':
        return 'invited you to a team';

      case 'admin_warning':
        return 'sent you a warning';

      case 'announcement':
        return 'posted an announcement';

      default:
        return 'sent you a notification';
    }
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.sheet}>

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>
              Notifications
            </Text>

            <TouchableOpacity
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Ionicons
                name="close"
                size={22}
                color="#0D1829"
              />
            </TouchableOpacity>
          </View>

          {loading ? (

            <ActivityIndicator
              color="#1B2B4B"
              style={{
                marginVertical: 24,
              }}
            />

          ) : (

            <FlatList
              data={notifications}
              keyExtractor={(item) =>
                item.id
              }
              style={styles.list}
              showsVerticalScrollIndicator={
                false
              }

              ListEmptyComponent={
                <Text
                  style={
                    styles.emptyText
                  }
                >
                  No notifications yet.
                </Text>
              }

              renderItem={({
                item,
              }) => (

                <TouchableOpacity
                  style={[
                    styles.row,
                    !item.read &&
                      styles.unreadRow,
                  ]}
                  onPress={() =>
                    onPressNotification(
                      item
                    )
                  }
                  activeOpacity={0.7}
                >

                  {/* Icon */}
                  <View
                    style={[
                      styles.dot,
                      item.type === 'admin_warning' && styles.warningDot,
                    ]}
                  >
                    <Ionicons
                      name={getIcon(
                        item
                      )}
                      size={15}
                      color={item.type === 'admin_warning' ? '#B45309' : '#1B2B4B'}
                    />
                  </View>


                  {/* Notification text */}
                  <View
                    style={{
                      flex: 1,
                    }}
                  >

                    <Text
                      style={
                        styles.rowText
                      }
                    >

                      <Text
                        style={
                          styles.rowName
                        }
                      >
                        {item.type === 'challenge_complete' ||
                        item.type === 'challenge_ending_soon' ||
                        item.type === 'streak_reminder'
                          ? 'You'
                          : item.actorName}
                      </Text>

                      {' '}

                      {getMessage(item)}

                      {item.previewText
                        ? `: "${item.previewText}"`
                        : ''}

                    </Text>


                    <Text
                      style={
                        styles.rowTime
                      }
                    >
                      {timeAgo(
                        item.createdAt
                      )}
                    </Text>

                  </View>


                  {/* Unread indicator */}
                  {!item.read && (
                    <View
                      style={
                        styles.unreadDot
                      }
                    />
                  )}

                </TouchableOpacity>
              )}
            />

          )}

        </View>
      </View>
    </Modal>
  );
}


const styles =
  StyleSheet.create({

    backdrop: {
      flex: 1,
      backgroundColor:
        'rgba(0,0,0,0.4)',
      justifyContent:
        'flex-end',
    },


    sheet: {
      backgroundColor:
        '#fff',

      borderTopLeftRadius:
        24,

      borderTopRightRadius:
        24,

      paddingHorizontal:
        20,

      paddingTop:
        20,

      paddingBottom:
        32,

      maxHeight:
        '75%',
    },


    header: {
      flexDirection:
        'row',

      justifyContent:
        'space-between',

      alignItems:
        'center',

      marginBottom:
        16,
    },


    title: {
      fontSize:
        17,

      fontWeight:
        '800',

      color:
        '#0D1829',
    },


    list: {
      maxHeight:
        380,
    },


    emptyText: {
      color:
        '#9CA3AF',

      fontSize:
        13,

      textAlign:
        'center',

      paddingVertical:
        24,
    },


    row: {
      flexDirection:
        'row',

      alignItems:
        'center',

      gap: 12,

      paddingVertical:
        12,

      borderBottomWidth:
        1,

      borderBottomColor:
        '#F0F4F8',
    },


    unreadRow: {
      backgroundColor:
        '#FAFCFF',
    },


    dot: {
      width: 32,

      height: 32,

      borderRadius: 16,

      backgroundColor:
        '#EBF2FF',

      alignItems:
        'center',

      justifyContent:
        'center',
    },


    warningDot: {
      backgroundColor:
        '#FEF3C7',
    },


    rowText: {
      fontSize:
        13,

      color:
        '#374151',

      lineHeight:
        18,
    },


    rowName: {
      fontWeight:
        '800',

      color:
        '#0D1829',
    },


    rowTime: {
      fontSize:
        11,

      color:
        '#9CA3AF',

      marginTop:
        2,
    },


    unreadDot: {
      width: 8,

      height: 8,

      borderRadius: 4,

      backgroundColor:
        '#DC2626',
    },

  });