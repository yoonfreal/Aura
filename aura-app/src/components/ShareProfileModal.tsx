import { useRef, useState } from 'react';
import { Modal, View, Text, TouchableOpacity, FlatList, StyleSheet, ActivityIndicator, Share, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Copy, Download, MessageCircle, Share2 } from 'lucide-react-native';
import QRCode from 'react-native-qrcode-svg';
import * as Clipboard from 'expo-clipboard';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system/legacy';

import { fetchAcceptedFriends, type FriendEntry } from '@/lib/friends';
import { getOrCreateDirectConversation, sendMessage } from '@/lib/chat';
import { buildProfileLink } from '@/lib/profileLink';

const BG = '#F0F4F8';
const CARD = '#FFFFFF';
const BORDER = '#E3E7F0';
const TEXT_DARK = '#1E2430';
const TEXT_MUTED = '#8A93A6';
const NAVY = '#1B2B4B';
const GOLD = '#F5B800';

const AVATAR_COLORS = ['#1E4D8C', '#4A5568', '#744210', '#065F46', '#5B21B6', '#831843', '#1E3A5F', '#3D2B1F'];

function avatarColorFor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

type Step = 'share' | 'pickFriend';

export function ShareProfileModal({
  visible,
  userId,
  username,
  onClose,
}: {
  visible: boolean;
  userId: string;
  username: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const qrRef = useRef<{ toDataURL: (callback: (data: string) => void) => void } | null>(null);

  const [step, setStep] = useState<Step>('share');
  const [downloading, setDownloading] = useState(false);
  const [friends, setFriends] = useState<FriendEntry[]>([]);
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [sendingTo, setSendingTo] = useState<string | null>(null);

  const link = buildProfileLink(userId);

  function handleClose() {
    setStep('share');
    onClose();
  }

  async function handleCopyLink() {
    await Clipboard.setStringAsync(link);
    Alert.alert('Copied', 'Your profile link was copied to the clipboard.');
  }

  async function handleDownload() {
    if (downloading) return;
    setDownloading(true);
    try {
      const permission = await MediaLibrary.requestPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission needed', 'Allow photo access to save your QR code.');
        return;
      }

      const base64 = await new Promise<string>((resolve, reject) => {
        qrRef.current?.toDataURL((data) => (data ? resolve(data) : reject(new Error('No QR data'))));
      });

      const fileUri = `${FileSystem.cacheDirectory}aura-qr-${Date.now()}.png`;
      await FileSystem.writeAsStringAsync(fileUri, base64, { encoding: FileSystem.EncodingType.Base64 });
      await MediaLibrary.saveToLibraryAsync(fileUri);
      Alert.alert('Saved', 'Your QR code was saved to Photos.');
    } catch {
      Alert.alert('Could not save', 'Please try again.');
    } finally {
      setDownloading(false);
    }
  }

  async function handleSendTo() {
    try {
      await Share.share({ message: `Add me on AUra! ${link}` });
    } catch {
      // User dismissed the native share sheet — nothing to do.
    }
  }

  function openFriendPicker() {
    setStep('pickFriend');
    setLoadingFriends(true);
    fetchAcceptedFriends(userId)
      .then(setFriends)
      .catch(() => setFriends([]))
      .finally(() => setLoadingFriends(false));
  }

  async function handleSendToFriend(friend: FriendEntry) {
    if (sendingTo) return;
    setSendingTo(friend.id);
    try {
      const conversationId = await getOrCreateDirectConversation(userId, friend.id);
      await sendMessage(conversationId, userId, `Add me on AUra! ${link}`);
      handleClose();
      router.push({ pathname: '/chat/[id]', params: { id: conversationId, name: friend.name } });
    } catch (err) {
      Alert.alert('Could not send', (err as { message?: string })?.message ?? 'Please try again.');
    } finally {
      setSendingTo(null);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={() => (step === 'pickFriend' ? setStep('share') : handleClose())}
            activeOpacity={0.7}
          >
            <ArrowLeft size={22} color={TEXT_DARK} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{step === 'share' ? 'Share Profile' : 'Send To'}</Text>
          <View style={{ width: 40 }} />
        </View>

        {step === 'share' ? (
          <View style={styles.shareBody}>
            <View style={styles.qrCard}>
              <View style={styles.qrAvatar}>
                <Text style={styles.qrAvatarText}>{username.charAt(0).toUpperCase()}</Text>
              </View>
              <Text style={styles.qrName}>{username}</Text>
              <Text style={styles.qrHandle}>@{username}</Text>

              <View style={styles.qrWrap}>
                <QRCode value={link} size={190} backgroundColor="#FFFFFF" color={NAVY} getRef={(c) => (qrRef.current = c)} />
              </View>
            </View>

            <View style={styles.actionsRow}>
              <TouchableOpacity style={styles.actionBtn} activeOpacity={0.75} onPress={handleCopyLink}>
                <View style={styles.actionIconWrap}>
                  <Copy size={20} color={NAVY} />
                </View>
                <Text style={styles.actionLabel}>Copy Link</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionBtn} activeOpacity={0.75} onPress={handleDownload} disabled={downloading}>
                <View style={styles.actionIconWrap}>
                  {downloading ? <ActivityIndicator size="small" color={NAVY} /> : <Download size={20} color={NAVY} />}
                </View>
                <Text style={styles.actionLabel}>Download</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionBtn} activeOpacity={0.75} onPress={openFriendPicker}>
                <View style={styles.actionIconWrap}>
                  <MessageCircle size={20} color={NAVY} />
                </View>
                <Text style={styles.actionLabel}>Send in Chat</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionBtn} activeOpacity={0.75} onPress={handleSendTo}>
                <View style={styles.actionIconWrap}>
                  <Share2 size={20} color={NAVY} />
                </View>
                <Text style={styles.actionLabel}>Send To</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : loadingFriends ? (
          <ActivityIndicator style={{ marginTop: 40 }} color={GOLD} />
        ) : friends.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>Add friends first to send them your profile.</Text>
          </View>
        ) : (
          <FlatList
            data={friends}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.row}
                activeOpacity={0.7}
                disabled={sendingTo === item.id}
                onPress={() => handleSendToFriend(item)}
              >
                <View style={[styles.rowAvatar, { backgroundColor: avatarColorFor(item.id) }]}>
                  <Text style={styles.rowAvatarText}>{item.name.charAt(0).toUpperCase()}</Text>
                </View>
                <Text style={styles.rowName} numberOfLines={1}>
                  {item.name}
                </Text>
                {sendingTo === item.id && <ActivityIndicator size="small" color={GOLD} />}
              </TouchableOpacity>
            )}
          />
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: TEXT_DARK },

  shareBody: { flex: 1, paddingHorizontal: 24, paddingTop: 8 },
  qrCard: {
    backgroundColor: NAVY,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: GOLD,
    alignItems: 'center',
    paddingTop: 28,
    paddingBottom: 24,
    paddingHorizontal: 20,
  },
  qrAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: GOLD,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  qrAvatarText: { color: NAVY, fontSize: 24, fontWeight: '800' },
  qrName: { color: '#FFFFFF', fontSize: 20, fontWeight: '800' },
  qrHandle: { color: '#B9C4DA', fontSize: 13, marginTop: 2, marginBottom: 20 },
  qrWrap: { backgroundColor: '#FFFFFF', padding: 14, borderRadius: 16 },

  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 28,
  },
  actionBtn: { alignItems: 'center', gap: 8, flex: 1 },
  actionIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: CARD,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0B1220',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  actionLabel: { fontSize: 11, fontWeight: '700', color: TEXT_DARK, textAlign: 'center' },

  list: { paddingHorizontal: 16, paddingBottom: 24 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 8,
    gap: 12,
  },
  rowAvatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  rowAvatarText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  rowName: { flex: 1, fontSize: 15, fontWeight: '700', color: TEXT_DARK },

  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  emptyText: { fontSize: 13, color: TEXT_MUTED, textAlign: 'center', lineHeight: 19 },
});
