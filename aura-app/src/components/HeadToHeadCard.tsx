import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import type { ChallengeWithStatus } from '@/lib/challenges';

type HeadToHeadCardProps = {
  challenge: ChallengeWithStatus;
  myName: string;
  onInvite: () => void;
  onAccept: () => void;
  onDecline: () => void;
  onCancel: () => void;
  onClaim: () => void;
  onPlayAgain: () => void;
};

function daysLeft(endDate: string): number {
  const diffMs = new Date(endDate).getTime() - Date.now();
  return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
}

export function HeadToHeadCard({
  challenge,
  myName,
  onInvite,
  onAccept,
  onDecline,
  onCancel,
  onClaim,
  onPlayAgain,
}: HeadToHeadCardProps) {
  const participation = challenge.participation;
  const opponent = challenge.opponent;
  const mine = participation?.currentValue ?? 0;
  const opponentValue = opponent?.currentValue ?? 0;
  // Each racer's own bar fills toward the goal independently — not one bar split by
  // share of the combined total, which made a lead look identical whether both racers
  // were crawling along or both already near the finish.
  const myGoalPct = Math.min(100, (mine / challenge.goalValue) * 100);
  const opponentGoalPct = Math.min(100, (opponentValue / challenge.goalValue) * 100);

  // A 1v1 participation row always has an opponent_id from the moment it's created — the
  // only way to end up with participation but no resolvable opponent is a declined pairing
  // whose other side got deleted out from under it (declining can only ever delete the
  // decliner's own row — RLS only lets a row's own user touch it, not the row across the
  // pairing). Rather than falling through to the active-race UI with a "?" for opponent,
  // this is treated exactly like never having engaged with the challenge at all — the same
  // "Invite an Opponent" card either way.
  if (!participation || !opponent) {
    return (
      <View style={styles.card}>
        <View style={styles.oneVOneBadge}>
          <Text style={styles.oneVOneBadgeText}>1V1</Text>
        </View>
        <View style={styles.emptyAvatarRow}>
          <View style={styles.emptyAvatarSlot}>
            <Text style={styles.avatarText}>{myName.charAt(0).toUpperCase()}</Text>
          </View>
          <View style={styles.vsBadge}>
            <Text style={styles.vsBadgeText}>VS</Text>
          </View>
          <View style={[styles.emptyAvatarSlot, styles.emptyAvatarSlotOpen]}>
            <Ionicons name="person-add-outline" size={18} color="#9CA3AF" />
          </View>
        </View>

        <Text style={styles.title}>{challenge.title}</Text>
        <Text style={styles.subtitle}>
          {challenge.description ?? `Reach ${challenge.goalValue.toLocaleString()} ${challenge.goalUnit} first`}
        </Text>

        <View style={styles.rewardPill}>
          <MaterialCommunityIcons name="trophy" size={13} color="#8A6D00" />
          <Text style={styles.rewardPillText}>Winner gets +{challenge.xpReward} XP</Text>
        </View>

        <TouchableOpacity style={styles.joinBtn} onPress={onInvite}>
          <Ionicons name="person-add" size={16} color="#fff" />
          <Text style={styles.joinBtnText}>Invite an Opponent</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (participation.status === 'pending') {
    return (
      <View style={styles.card}>
        <View style={styles.inviteBadgeRow}>
          <View style={styles.inviteBadge}>
            <Ionicons name="flash" size={11} color="#F5B800" />
            <Text style={styles.inviteBadgeText}>NEW CHALLENGE</Text>
          </View>
        </View>

        <View style={styles.avatarRow}>
          <View style={[styles.avatar, { backgroundColor: '#1E4D8C' }]}>
            <Text style={styles.avatarText}>
              {opponent ? opponent.name.charAt(0).toUpperCase() : '?'}
            </Text>
          </View>
          <Text style={styles.vsText}>VS</Text>
          <View style={[styles.avatar, { backgroundColor: '#065F46' }]}>
            <Text style={styles.avatarText}>{myName.charAt(0).toUpperCase()}</Text>
          </View>
        </View>

        <Text style={styles.title}>{opponent ? opponent.name : 'Someone'} challenged you!</Text>
        <Text style={styles.subtitle}>{challenge.title}</Text>

        <View style={styles.rewardPill}>
          <MaterialCommunityIcons name="trophy" size={13} color="#8A6D00" />
          <Text style={styles.rewardPillText}>Winner gets +{challenge.xpReward} XP</Text>
        </View>

        <View style={styles.inviteActions}>
          <TouchableOpacity style={styles.declineBtn} onPress={onDecline}>
            <Ionicons name="close" size={16} color="#DC2626" />
            <Text style={styles.declineBtnText}>Decline</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.acceptBtn} onPress={onAccept}>
            <Ionicons name="checkmark" size={16} color="#fff" />
            <Text style={styles.acceptBtnText}>Accept</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (opponent?.status === 'pending') {
    return (
      <View style={styles.card}>
        <View style={styles.avatarRow}>
          <View style={[styles.avatar, { backgroundColor: '#065F46' }]}>
            <Text style={styles.avatarText}>{myName.charAt(0).toUpperCase()}</Text>
          </View>
          <Text style={styles.vsText}>VS</Text>
          <View style={styles.resultAvatarWrap}>
            <View style={styles.pendingBadge}>
              <Ionicons name="time" size={12} color="#fff" />
            </View>
            <View style={[styles.avatar, styles.avatarPending, { backgroundColor: '#1E4D8C' }]}>
              <Text style={styles.avatarText}>{opponent.name.charAt(0).toUpperCase()}</Text>
            </View>
          </View>
        </View>

        <View style={styles.pendingPill}>
          <Ionicons name="hourglass-outline" size={13} color="#8A6D00" />
          <Text style={styles.pendingPillText}>Waiting for {opponent.name} to accept</Text>
        </View>

        <Text style={styles.goalCaption}>{challenge.description ?? challenge.title}</Text>

        <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
          <Ionicons name="close-circle-outline" size={14} color="#DC2626" />
          <Text style={styles.cancelBtnText}>Cancel Invite</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (participation.completed) {
    const iWon = mine >= challenge.goalValue;
    const opponentWon = (opponent?.currentValue ?? 0) >= challenge.goalValue;
    return (
      <View style={styles.card}>
        <View style={styles.matchupRow}>
          <View style={styles.matchupSide}>
            <View style={styles.resultAvatarWrap}>
              {iWon && (
                <View style={styles.crownBadge}>
                  <MaterialCommunityIcons name="crown" size={13} color="#F5B800" />
                </View>
              )}
              <View style={[styles.avatar, { backgroundColor: '#065F46' }]}>
                <Text style={styles.avatarText}>{myName.charAt(0).toUpperCase()}</Text>
              </View>
            </View>
            <Text style={styles.matchupName} numberOfLines={1}>
              {myName}
            </Text>
          </View>

          <Text style={[styles.vsText, styles.vsCenterOffset]}>VS</Text>

          <View style={styles.matchupSide}>
            <View style={styles.resultAvatarWrap}>
              {opponentWon && (
                <View style={styles.crownBadge}>
                  <MaterialCommunityIcons name="crown" size={13} color="#F5B800" />
                </View>
              )}
              <View style={[styles.avatar, { backgroundColor: '#1E4D8C' }]}>
                <Text style={styles.avatarText}>
                  {opponent ? opponent.name.charAt(0).toUpperCase() : '?'}
                </Text>
              </View>
            </View>
            <Text style={styles.matchupName} numberOfLines={1}>
              {opponent ? opponent.name : 'Opponent'}
            </Text>
          </View>
        </View>

        <Text style={styles.goalCaption}>{challenge.description ?? challenge.title}</Text>

        {iWon && !participation.claimed ? (
          <TouchableOpacity style={styles.claimBanner} onPress={onClaim} activeOpacity={0.85}>
            <View style={styles.claimIconCircle}>
              <MaterialCommunityIcons name="trophy-award" size={17} color="#15803D" />
            </View>
            <Text style={styles.claimBannerText}>Claim Reward</Text>
            <View style={styles.claimXpPill}>
              <Text style={styles.claimXpPillText}>+{challenge.xpReward} XP</Text>
            </View>
          </TouchableOpacity>
        ) : iWon ? (
          <View style={styles.winnerBanner}>
            <View style={styles.trophyCircle}>
              <MaterialCommunityIcons name="trophy" size={15} color="#fff" />
            </View>
            <Text style={styles.winnerTitle}>Victory!</Text>
            <Text style={styles.xpText}>+{challenge.xpReward} XP</Text>
          </View>
        ) : opponentWon ? (
          <View style={styles.loserBanner}>
            <View style={styles.loserIconCircle}>
              <MaterialCommunityIcons name="trophy" size={15} color="#94A3B8" />
            </View>
            <View style={styles.loserTextWrap}>
              <Text style={styles.loserTitle}>{opponent?.name} won this round</Text>
              <Text style={styles.loserSubtitle}>Better luck next time!</Text>
            </View>
          </View>
        ) : (
          <Text style={styles.endedText}>This 1v1 has ended.</Text>
        )}

        {challenge.badgeName && (
          <View style={styles.badgePreviewPill}>
            <MaterialCommunityIcons name="medal-outline" size={12} color="#6D28D9" />
            <Text style={styles.badgePreviewText}>
              {challenge.badgeIcon ? `${challenge.badgeIcon} ` : ''}
              {challenge.badgeName}
            </Text>
          </View>
        )}

        {participation.claimed && (
          <TouchableOpacity style={styles.playAgainBtn} onPress={onPlayAgain}>
            <Ionicons name="refresh" size={15} color="#1B2B4B" />
            <Text style={styles.playAgainBtnText}>Play Again</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <View style={styles.oneVOneBadge}>
        <Text style={styles.oneVOneBadgeText}>1V1</Text>
      </View>
      <View style={styles.avatarRow}>
        <View style={[styles.avatar, { backgroundColor: '#065F46' }]}>
          <Text style={styles.avatarText}>{myName.charAt(0).toUpperCase()}</Text>
        </View>
        <Text style={styles.vsText}>VS</Text>
        <View style={[styles.avatar, { backgroundColor: '#1E4D8C' }]}>
          <Text style={styles.avatarText}>
            {opponent ? opponent.name.charAt(0).toUpperCase() : '?'}
          </Text>
        </View>
      </View>

      <Text style={styles.subtitle}>{challenge.description ?? challenge.title}</Text>

      {challenge.badgeName && (
        <View style={styles.badgePreviewPill}>
          <MaterialCommunityIcons name="medal-outline" size={12} color="#6D28D9" />
          <Text style={styles.badgePreviewText}>
            {challenge.badgeIcon ? `${challenge.badgeIcon} ` : ''}
            {challenge.badgeName}
          </Text>
        </View>
      )}

      <View style={styles.racerProgress}>
        <View style={styles.racerProgressHeader}>
          <Text style={styles.racerProgressName}>You</Text>
          <Text style={styles.racerProgressValue}>
            {mine.toLocaleString()} / {challenge.goalValue.toLocaleString()}
          </Text>
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${myGoalPct}%`, backgroundColor: '#065F46' }]} />
        </View>
      </View>

      <View style={styles.racerProgress}>
        <View style={styles.racerProgressHeader}>
          <Text style={styles.racerProgressName}>{opponent ? opponent.name : 'Waiting…'}</Text>
          <Text style={styles.racerProgressValue}>
            {opponentValue.toLocaleString()} / {challenge.goalValue.toLocaleString()}
          </Text>
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${opponentGoalPct}%`, backgroundColor: '#1E4D8C' }]} />
        </View>
      </View>

      <Text style={styles.footerText}>
        Ends in {daysLeft(challenge.endDate)} day{daysLeft(challenge.endDate) === 1 ? '' : 's'}.
        Winner will get +{challenge.xpReward} Xp
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1.5,
    borderColor: '#DC2626',
    borderRadius: 14,
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: '#fff',
  },
  oneVOneBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: '#DC2626',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
    zIndex: 1,
  },
  oneVOneBadgeText: { color: '#fff', fontWeight: '800', fontSize: 9, letterSpacing: 0.3 },
  avatarRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 },
  avatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  vsText: { fontWeight: '800', color: '#0D1829', fontSize: 12 },
  resultAvatarWrap: { position: 'relative' },
  crownBadge: {
    position: 'absolute',
    top: -8,
    left: '50%',
    marginLeft: -9,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  avatarPending: {
    opacity: 0.5,
  },
  pendingBadge: {
    position: 'absolute',
    top: -5,
    right: -3,
    width: 17,
    height: 17,
    borderRadius: 9,
    backgroundColor: '#F5B800',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
    borderWidth: 2,
    borderColor: '#fff',
  },
  pendingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: 5,
    backgroundColor: '#FFF8E1',
    borderWidth: 1,
    borderColor: '#F5D77A',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginTop: 11,
  },
  pendingPillText: { color: '#8A6D00', fontWeight: '700', fontSize: 11 },
  matchupRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
    gap: 12,
  },
  matchupSide: {
    alignItems: 'center',
    width: 76,
  },
  matchupName: {
    marginTop: 5,
    fontSize: 11,
    fontWeight: '700',
    color: '#0D1829',
    textAlign: 'center',
  },
  vsCenterOffset: {
    marginTop: 11,
  },
  goalCaption: {
    textAlign: 'center',
    fontSize: 10.5,
    color: '#9CA3AF',
    fontWeight: '600',
    marginTop: 8,
  },
  subtitle: { textAlign: 'center', color: '#6B7280', fontSize: 11, fontWeight: '600', marginTop: 8 },
  progressTrack: {
    height: 6,
    borderRadius: 4,
    backgroundColor: '#E5E9F0',
    marginTop: 9,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: '#DC2626', borderRadius: 4 },
  racerProgress: { marginTop: 8 },
  racerProgressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 3,
  },
  racerProgressName: { fontSize: 11, color: '#374151', fontWeight: '700' },
  racerProgressValue: { fontSize: 11, color: '#9CA3AF', fontWeight: '600' },
  footerText: {
    textAlign: 'center',
    fontSize: 10.5,
    color: '#9CA3AF',
    marginTop: 9,
    fontWeight: '600',
  },
  winnerBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 9,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 11,
    gap: 7,
    backgroundColor: '#1B2B4B',
  },
  claimBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 9,
    paddingVertical: 10,
    paddingHorizontal: 11,
    borderRadius: 12,
    gap: 8,
    backgroundColor: '#16A34A',
    shadowColor: '#15803D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 5,
  },
  claimIconCircle: {
    width: 25,
    height: 25,
    borderRadius: 13,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  claimBannerText: { flex: 1, color: '#fff', fontWeight: '800', fontSize: 12.5 },
  claimXpPill: {
    backgroundColor: 'rgba(255,255,255,0.22)',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 20,
  },
  claimXpPillText: { color: '#fff', fontWeight: '800', fontSize: 11 },
  trophyCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#F5B800',
    alignItems: 'center',
    justifyContent: 'center',
  },
  winnerTitle: {
    flex: 1,
    fontSize: 12.5,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.2,
  },
  xpText: {
    color: '#F5B800',
    fontWeight: '800',
    fontSize: 12,
  },
  loserBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 9,
    paddingVertical: 10,
    paddingHorizontal: 11,
    borderRadius: 12,
    gap: 8,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  loserIconCircle: {
    width: 25,
    height: 25,
    borderRadius: 13,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  loserTextWrap: { flex: 1 },
  loserTitle: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#334155',
  },
  loserSubtitle: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#94A3B8',
    marginTop: 2,
  },
  endedText: {
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    color: '#9CA3AF',
    marginTop: 11,
  },
  // Same pill styling as ChallengeCard's badgePreviewPill (individual/team) — kept
  // identical (colors, icon, sizes) so the badge looks the same across all challenge
  // types and states, just re-centered here since this card's content is center-aligned.
  badgePreviewPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: 4,
    backgroundColor: '#EDE9FE',
    borderWidth: 1,
    borderColor: '#C4B5FD',
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginTop: 10,
  },
  badgePreviewText: { fontSize: 10.5, fontWeight: '800', color: '#6D28D9' },
  emptyAvatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 11,
  },
  emptyAvatarSlot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#065F46',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyAvatarSlotOpen: {
    backgroundColor: '#F2F6F9',
    borderWidth: 2,
    borderColor: '#D6DEE8',
    borderStyle: 'dashed',
  },
  vsBadge: {
    width: 23,
    height: 23,
    borderRadius: 12,
    backgroundColor: '#1B2B4B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  vsBadgeText: { color: '#F5B800', fontWeight: '800', fontSize: 10 },
  title: {
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '800',
    color: '#0D1829',
    marginTop: 9,
  },
  rewardPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: 5,
    backgroundColor: '#FFF8E1',
    borderWidth: 1,
    borderColor: '#F5D77A',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginTop: 9,
  },
  rewardPillText: { color: '#8A6D00', fontWeight: '800', fontSize: 11 },
  joinBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    backgroundColor: '#1B2B4B',
    borderRadius: 10,
    paddingVertical: 10,
    marginTop: 12,
  },
  joinBtnText: { color: '#fff', fontWeight: '800', fontSize: 12 },
  inviteActions: { flexDirection: 'row', gap: 7, marginTop: 12 },
  inviteBadgeRow: { alignItems: 'center', marginBottom: 11 },
  inviteBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#1B2B4B',
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 20,
  },
  inviteBadgeText: { color: '#F5B800', fontWeight: '800', fontSize: 9, letterSpacing: 0.5 },
  declineBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    borderWidth: 1.5,
    borderColor: '#DC2626',
    borderRadius: 10,
    paddingVertical: 9,
  },
  declineBtnText: { color: '#DC2626', fontWeight: '800', fontSize: 12 },
  acceptBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: '#1B2B4B',
    borderRadius: 10,
    paddingVertical: 9,
  },
  acceptBtnText: { color: '#fff', fontWeight: '800', fontSize: 12 },
  cancelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    alignSelf: 'center',
    marginTop: 11,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#FCA5A5',
    backgroundColor: '#FEF2F2',
  },
  cancelBtnText: { color: '#DC2626', fontWeight: '700', fontSize: 11 },
  playAgainBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    alignSelf: 'center',
    marginTop: 11,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#1B2B4B',
  },
  playAgainBtnText: { color: '#1B2B4B', fontWeight: '700', fontSize: 11 },
});
