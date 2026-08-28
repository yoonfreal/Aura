import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { Search, ArrowLeft, User } from 'lucide-react-native';
import { useState } from 'react';

const BG = '#F0F4F8';
const CARD = '#FFFFFF';
const BORDER = '#E3E7F0';
const TEXT_DARK = '#1E2430';
const TEXT_MUTED = '#8A93A6';

const FRIEND_AVATAR_COLORS = [
  '#1E4D8C',
  '#4A5568',
  '#744210',
  '#065F46',
  '#5B21B6',
];

export type FriendListEntry = {
  id: string;
  username: string | null;
  first_name: string | null;
  last_name: string | null;
  level?: number | null;
  last_active_date?: string | null;
};

export function FriendListModal({
  visible,
  friends,
  onClose,
  onFriendPress,
}: {
  visible: boolean;
  friends: FriendListEntry[];
  onClose: () => void;
  onFriendPress: (friend: FriendListEntry) => void;
}) {
  const [searchText, setSearchText] = useState('');

  const filteredFriends = friends.filter((friend) => {
    const search = searchText.toLowerCase().trim();

    if (!search) {
      return true;
    }

    const username =
      friend.username?.toLowerCase() ?? '';

    const firstName =
      friend.first_name?.toLowerCase() ?? '';

    const lastName =
      friend.last_name?.toLowerCase() ?? '';

    const fullName =
      `${firstName} ${lastName}`.trim();

    return (
      username.includes(search) ||
      firstName.includes(search) ||
      lastName.includes(search) ||
      fullName.includes(search)
    );
  });

  const getDisplayName = (
    friend: FriendListEntry
  ) => {
    if (friend.username) {
      return friend.username;
    }

    const fullName =
      `${friend.first_name ?? ''} ${
        friend.last_name ?? ''
      }`.trim();

    return fullName || 'Friend';
  };

  const renderFriend = ({
    item,
    index,
  }: {
    item: FriendListEntry;
    index: number;
  }) => {
    const displayName =
      getDisplayName(item);

    return (
      <TouchableOpacity
        style={styles.friendListItem}
        activeOpacity={0.7}
        onPress={() => onFriendPress(item)}
      >
        <View
          style={[
            styles.friendListAvatar,
            {
              backgroundColor:
                FRIEND_AVATAR_COLORS[
                  index %
                    FRIEND_AVATAR_COLORS.length
                ],
            },
          ]}
        >
          <Text style={styles.friendListAvatarText}>
            {displayName
              .charAt(0)
              .toUpperCase()}
          </Text>
        </View>

        <View style={styles.friendListInfo}>
          <Text
            style={styles.friendListName}
            numberOfLines={1}
          >
            {displayName}
          </Text>

          <Text style={styles.friendListLevel}>
            Level {item.level ?? 1}
          </Text>
        </View>

        {item.last_active_date && (
          <View
            style={[
              styles.activeDot,
              {
                backgroundColor:
                  item.last_active_date ===
                  new Date()
                    .toISOString()
                    .split('T')[0]
                    ? '#45A36B'
                    : '#C8CED9',
              },
            ]}
          />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView
        style={styles.friendListContainer}
      >
        {/* Header */}
        <View style={styles.friendListHeader}>
          <TouchableOpacity
            onPress={onClose}
            style={styles.friendBackButton}
            activeOpacity={0.7}
          >
            <ArrowLeft
              size={22}
              color={TEXT_DARK}
            />
          </TouchableOpacity>

          <Text style={styles.friendListTitle}>
            Friends
          </Text>

          <View style={{ width: 40 }} />
        </View>

        {/* Search */}
        <View style={styles.friendSearchContainer}>
          <Search
            size={18}
            color={TEXT_MUTED}
          />

          <TextInput
            style={styles.friendSearchInput}
            placeholder="Search friends"
            placeholderTextColor="#A6ADBB"
            value={searchText}
            onChangeText={setSearchText}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        {/* Friend count */}
        <View style={styles.friendListSectionHeader}>
          <Text style={styles.friendListSectionTitle}>
            Friends
          </Text>

          <Text style={styles.friendListCount}>
            {friends.length}
          </Text>
        </View>

        {/* Friends */}
        {filteredFriends.length > 0 ? (
          <FlatList
            data={filteredFriends}
            keyExtractor={(item) => item.id}
            renderItem={renderFriend}
            contentContainerStyle={
              styles.friendListContent
            }
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          />
        ) : (
          <View style={styles.emptyFriends}>
            <View
              style={styles.emptyFriendIcon}
            >
              <User
                size={28}
                color={TEXT_MUTED}
              />
            </View>

            <Text style={styles.emptyFriendsTitle}>
              {friends.length === 0
                ? 'No friends yet'
                : 'No friends found'}
            </Text>

            <Text style={styles.emptyFriendsText}>
              {friends.length === 0
                ? 'Accepted friends will appear here.'
                : 'Try searching for another friend.'}
            </Text>
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  friendListContainer: {
    flex: 1,
    backgroundColor: BG,
  },

  friendListHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },

  friendBackButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },

  friendListTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: TEXT_DARK,
  },

  friendSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 14,
    marginHorizontal: 16,
    paddingHorizontal: 14,
    height: 46,
  },

  friendSearchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    color: TEXT_DARK,
    height: 46,
  },

  friendListSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 10,
  },

  friendListSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: TEXT_DARK,
  },

  friendListCount: {
    fontSize: 13,
    color: TEXT_MUTED,
    fontWeight: '600',
  },

  friendListContent: {
    paddingHorizontal: 16,
    paddingBottom: 30,
  },

  friendListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 8,
  },

  friendListAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },

  friendListAvatarText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },

  friendListInfo: {
    flex: 1,
    marginLeft: 12,
  },

  friendListName: {
    fontSize: 15,
    fontWeight: '700',
    color: TEXT_DARK,
  },

  friendListLevel: {
    fontSize: 12,
    color: TEXT_MUTED,
    marginTop: 3,
  },

  activeDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    marginRight: 4,
  },

  emptyFriends: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingBottom: 100,
  },

  emptyFriendIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#EEF0F5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },

  emptyFriendsTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: TEXT_DARK,
  },

  emptyFriendsText: {
    fontSize: 13,
    color: TEXT_MUTED,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 19,
  },
});
