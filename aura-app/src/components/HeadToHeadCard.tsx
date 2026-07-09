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
  const total = mine + (opponent?.currentValue ?? 0);
  const myPct = total > 0 ? (mine / total) * 100 : 50;

  if (!participation) {
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

  if (participation.status === 'declined') {
    return (
      <View style={styles.card}>
        <Text style={styles.subtitle}>You declined this 1v1 invite.</Text>
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

  if (opponent?.status === 'declined') {
    return (
      <View style={styles.card}>
        <Text style={styles.subtitle}>{opponent.name} declined your 1v1 invite.</Text>
        <TouchableOpacity style={styles.joinBtn} onPress={onCancel}>
          <Ionicons name="person-add" size={16} color="#fff" />
          <Text style={styles.joinBtnText}>Invite Someone Else</Text>
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

        {iWon && participation.claimed && challenge.badgeName && (
          <View style={styles.earnedBadgePill}>
            <Text style={styles.earnedBadgePillText}>
              {challenge.badgeIcon ? `${challenge.badgeIcon} ` : ''}
              {challenge.badgeName} earned!
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

      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${myPct}%` }]} />
      </View>

      <View style={styles.scoreRow}>
        <View>
          <Text style={styles.scoreLabel}>You</Text>
          <Text style={styles.scoreValue}>{mine.toLocaleString()}</Text>
        </View>
        <View style={styles.scoreRight}>
          <Text style={styles.scoreLabel}>{opponent ? opponent.name : 'Waiting…'}</Text>
          <Text style={styles.scoreValue}>{(opponent?.currentValue ?? 0).toLocaleString()}</Text>
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
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: '#fff',
  },
  oneVOneBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#DC2626',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    zIndex: 1,
  },
  oneVOneBadgeText: { color: '#fff', fontWeight: '800', fontSize: 10, letterSpacing: 0.3 },
  avatarRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16 },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  vsText: { fontWeight: '800', color: '#0D1829', fontSize: 13 },
  resultAvatarWrap: { position: 'relative' },
  crownBadge: {
    position: 'absolute',
    top: -10,
    left: '50%',
    marginLeft: -11,
    width: 22,
    height: 22,
    borderRadius: 11,
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
    top: -6,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
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
    gap: 6,
    backgroundColor: '#FFF8E1',
    borderWidth: 1,
    borderColor: '#F5D77A',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginTop: 14,
  },
  pendingPillText: { color: '#8A6D00', fontWeight: '700', fontSize: 12 },
  matchupRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
    gap: 16,
  },
  matchupSide: {
    alignItems: 'center',
    width: 90,
  },
  matchupName: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: '700',
    color: '#0D1829',
    textAlign: 'center',
  },
  vsCenterOffset: {
    marginTop: 14,
  },
  goalCaption: {
    textAlign: 'center',
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '600',
    marginTop: 10,
  },
  subtitle: { textAlign: 'center', color: '#6B7280', fontSize: 12, fontWeight: '600', marginTop: 10 },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E5E9F0',
    marginTop: 12,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: '#DC2626', borderRadius: 4 },
  scoreRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  scoreRight: { alignItems: 'flex-end' },
  scoreLabel: { fontSize: 12, color: '#9CA3AF', fontWeight: '600' },
  scoreValue: { fontSize: 15, color: '#0D1829', fontWeight: '800', marginTop: 2 },
  footerText: {
    textAlign: 'center',
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 12,
    fontWeight: '600',
  },
  winnerBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    gap: 8,
    backgroundColor: '#1B2B4B',
  },
  claimBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    gap: 10,
    backgroundColor: '#16A34A',
    shadowColor: '#15803D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 5,
  },
  claimIconCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  claimBannerText: { flex: 1, color: '#fff', fontWeight: '800', fontSize: 14 },
  claimXpPill: {
    backgroundColor: 'rgba(255,255,255,0.22)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  claimXpPillText: { color: '#fff', fontWeight: '800', fontSize: 12 },
  trophyCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#F5B800',
    alignItems: 'center',
    justifyContent: 'center',
  },
  winnerTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.2,
  },
  xpText: {
    color: '#F5B800',
    fontWeight: '800',
    fontSize: 13,
  },
  loserBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    gap: 10,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  loserIconCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
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
    fontSize: 14,
    fontWeight: '800',
    color: '#334155',
  },
  loserSubtitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
    marginTop: 2,
  },
  endedText: {
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '600',
    color: '#9CA3AF',
    marginTop: 14,
  },
  earnedBadgePill: {
    alignSelf: 'center',
    backgroundColor: '#FFF8E1',
    borderWidth: 1,
    borderColor: '#F5D77A',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginTop: 10,
  },
  earnedBadgePillText: { color: '#8A6D00', fontWeight: '800', fontSize: 12 },
  emptyAvatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
  },
  emptyAvatarSlot: {
    width: 44,
    height: 44,
    borderRadius: 22,
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
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#1B2B4B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  vsBadgeText: { color: '#F5B800', fontWeight: '800', fontSize: 11 },
  title: {
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '800',
    color: '#0D1829',
    marginTop: 12,
  },
  rewardPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: 6,
    backgroundColor: '#FFF8E1',
    borderWidth: 1,
    borderColor: '#F5D77A',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginTop: 12,
  },
  rewardPillText: { color: '#8A6D00', fontWeight: '800', fontSize: 12 },
  joinBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#1B2B4B',
    borderRadius: 10,
    paddingVertical: 12,
    marginTop: 16,
  },
  joinBtnText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  inviteActions: { flexDirection: 'row', gap: 8, marginTop: 16 },
  inviteBadgeRow: { alignItems: 'center', marginBottom: 14 },
  inviteBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#1B2B4B',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  inviteBadgeText: { color: '#F5B800', fontWeight: '800', fontSize: 10, letterSpacing: 0.5 },
  declineBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderColor: '#DC2626',
    borderRadius: 10,
    paddingVertical: 11,
  },
  declineBtnText: { color: '#DC2626', fontWeight: '800', fontSize: 13 },
  acceptBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#1B2B4B',
    borderRadius: 10,
    paddingVertical: 11,
  },
  acceptBtnText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  cancelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    alignSelf: 'center',
    marginTop: 14,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#FCA5A5',
    backgroundColor: '#FEF2F2',
  },
  cancelBtnText: { color: '#DC2626', fontWeight: '700', fontSize: 12 },
  playAgainBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    alignSelf: 'center',
    marginTop: 14,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#1B2B4B',
  },
  playAgainBtnText: { color: '#1B2B4B', fontWeight: '700', fontSize: 12 },
});
