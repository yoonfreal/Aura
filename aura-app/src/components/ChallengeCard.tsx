import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { ChallengeWithStatus } from '@/lib/challenges';

type ChallengeCardProps = {
  challenge: ChallengeWithStatus;
  onJoinIndividual: () => void;
  onOpenTeamPicker: () => void;
  onViewTeam: () => void;
  onInviteFriend: () => void;
  onClaim: () => void;
  onAcceptTeamInvite: () => void;
  onDeclineTeamInvite: () => void;
};

const TYPE_LABEL: Record<ChallengeWithStatus['type'], string> = {
  individual: 'Individual',
  '1v1': '1v1',
  team: 'Team',
};

// Driven by the actual challenge type, not the free-text category — category is optional
// and admin-set (e.g. "Sport"), so it can't be relied on to tell you what kind of
// challenge this is. Type always can.
function typeColor(type: ChallengeWithStatus['type']): string {
  if (type === 'individual') return '#16A34A';
  if (type === 'team') return '#D97706';
  return '#DC2626';
}

export function ChallengeCard({
  challenge,
  onJoinIndividual,
  onOpenTeamPicker,
  onViewTeam,
  onInviteFriend,
  onClaim,
  onAcceptTeamInvite,
  onDeclineTeamInvite,
}: ChallengeCardProps) {
  const isTeam = challenge.type === 'team';
  const myTeam = isTeam
    ? challenge.teams.find((t) => t.id === challenge.participation?.teamId)
    : undefined;

  const currentValue = isTeam ? (myTeam?.totalValue ?? 0) : (challenge.participation?.currentValue ?? 0);
  const progressPct = Math.min(100, (currentValue / challenge.goalValue) * 100);
  const isCompleted = isTeam ? currentValue >= challenge.goalValue : (challenge.participation?.completed ?? false);
  const isClaimed = challenge.participation?.claimed ?? false;
  const canClaim = !isTeam && isCompleted && !isClaimed;
  // A team invite isn't "joined" until accepted — pending/declined rows don't count.
  const hasJoined = isTeam
    ? challenge.participation?.status === 'accepted'
    : !!challenge.participation;
  const isPendingTeamInvite = isTeam && challenge.participation?.status === 'pending';
  const inviterName = myTeam?.members.find((m) => m.userId === challenge.participation?.opponentId)?.name;
  const accent = typeColor(challenge.type);
  const showCategoryTag = challenge.category && challenge.category.toLowerCase() !== challenge.type;

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.titleRow}>
          <View style={styles.iconCircle}>
            <Text style={styles.icon}>{challenge.icon}</Text>
          </View>
          <Text style={styles.title} numberOfLines={1}>
            {challenge.title}
          </Text>
        </View>
        <View style={styles.tagGroup}>
          {showCategoryTag && (
            <View style={styles.categoryPill}>
              <Text style={styles.categoryText}>{challenge.category}</Text>
            </View>
          )}
          <View style={[styles.typePill, { backgroundColor: accent }]}>
            <Text style={styles.typeText}>{TYPE_LABEL[challenge.type]}</Text>
          </View>
        </View>
      </View>

      {challenge.description && <Text style={styles.description}>{challenge.description}</Text>}

      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progressPct}%`, backgroundColor: accent }]} />
      </View>
      <View style={styles.progressRow}>
        <Text style={styles.progressLabel}>
          {currentValue.toLocaleString()} / {challenge.goalValue.toLocaleString()} {challenge.goalUnit}
        </Text>
        <Text style={[styles.progressPct, { color: accent }]}>{Math.round(progressPct)}%</Text>
      </View>
      <View style={styles.metaRow}>
        <Text style={styles.rewardText}>🏆 {challenge.xpReward.toLocaleString()} XP reward</Text>
        {!isTeam && !hasJoined && (
          <Text style={styles.progressHint}>Progress comes from daily missions ({challenge.goalUnit})</Text>
        )}
      </View>

      {isPendingTeamInvite && (
        <View style={styles.inviteBanner}>
          <Text style={styles.inviteBannerText}>
            {inviterName ?? 'Someone'} invited you to join {myTeam?.name ?? 'their team'}
          </Text>
        </View>
      )}

      <View style={styles.footerRow}>
        {isPendingTeamInvite ? (
          <View style={styles.inviteActions}>
            <TouchableOpacity style={styles.declineBtn} onPress={onDeclineTeamInvite}>
              <Text style={styles.declineBtnText}>Decline</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.acceptBtn} onPress={onAcceptTeamInvite}>
              <Text style={styles.acceptBtnText}>Accept</Text>
            </TouchableOpacity>
          </View>
        ) : isTeam ? (
          <>
            {hasJoined ? (
              <TouchableOpacity onPress={onInviteFriend}>
                <Text style={styles.linkText}>Invite friend</Text>
              </TouchableOpacity>
            ) : (
              <View />
            )}
            <View style={styles.footerActions}>
              {hasJoined && (
                <TouchableOpacity style={styles.outlineBtn} onPress={onViewTeam}>
                  <Text style={styles.outlineBtnText}>View Team</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={hasJoined ? styles.pillDisabled : styles.pillActive}
                onPress={hasJoined ? undefined : onOpenTeamPicker}
                disabled={hasJoined}
              >
                <Text style={hasJoined ? styles.pillDisabledText : styles.pillActiveText}>
                  {hasJoined ? 'Joined' : 'Join'}
                </Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <>
            {isClaimed ? <Text style={styles.linkText}>Completed</Text> : <View />}
            <TouchableOpacity
              style={canClaim ? styles.claimBtn : hasJoined ? styles.pillDisabled : styles.pillActive}
              onPress={canClaim ? onClaim : hasJoined ? undefined : onJoinIndividual}
              disabled={hasJoined && !canClaim}
            >
              <Text
                style={
                  canClaim
                    ? styles.claimBtnText
                    : hasJoined
                      ? styles.pillDisabledText
                      : styles.pillActiveText
                }
              >
                {canClaim ? 'Claim Reward' : isClaimed ? 'Completed' : hasJoined ? 'Joined' : 'Join'}
              </Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 3,
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 1, flex: 1 },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F2F6F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: { fontSize: 18 },
  title: { fontSize: 15, fontWeight: '800', color: '#0D1829', flexShrink: 1, letterSpacing: -0.2 },
  tagGroup: { flexDirection: 'row', alignItems: 'center', gap: 6, marginLeft: 8 },
  categoryPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    backgroundColor: '#F2F6F9',
  },
  categoryText: { fontSize: 11, fontWeight: '700', color: '#6B7280' },
  typePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  typeText: { fontSize: 11, fontWeight: '800', color: '#fff' },
  description: { fontSize: 12, color: '#6B7280', marginTop: 10, lineHeight: 17 },
  progressTrack: {
    height: 9,
    borderRadius: 5,
    backgroundColor: '#E5E9F0',
    marginTop: 14,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 5 },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  progressLabel: { fontSize: 12, color: '#6B7280', fontWeight: '600' },
  progressPct: { fontSize: 12, fontWeight: '800' },
  metaRow: { marginTop: 8, gap: 3 },
  rewardText: { fontSize: 12, fontWeight: '700', color: '#8A6D00' },
  progressHint: { fontSize: 11, color: '#9CA3AF', fontWeight: '500' },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
  },
  footerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  linkText: { fontSize: 13, fontWeight: '700', color: '#2563EB' },
  outlineBtn: {
    borderWidth: 1.5,
    borderColor: '#1B2B4B',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
  },
  outlineBtnText: { color: '#1B2B4B', fontWeight: '700', fontSize: 12 },
  pillActive: {
    backgroundColor: '#1B2B4B',
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 10,
    shadowColor: '#1B2B4B',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  pillActiveText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  pillDisabled: {
    backgroundColor: '#E5E9F0',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  pillDisabledText: { color: '#9CA3AF', fontWeight: '700', fontSize: 12 },
  claimBtn: {
    backgroundColor: '#16A34A',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    shadowColor: '#15803D',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  claimBtnText: { color: '#fff', fontWeight: '800', fontSize: 12 },
  inviteBanner: {
    backgroundColor: '#FFF8E1',
    borderWidth: 1,
    borderColor: '#F5D77A',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginTop: 12,
  },
  inviteBannerText: { fontSize: 12, fontWeight: '700', color: '#8A6D00' },
  inviteActions: { flexDirection: 'row', gap: 8, flex: 1 },
  declineBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: '#DC2626',
    borderRadius: 10,
    paddingVertical: 9,
    alignItems: 'center',
  },
  declineBtnText: { color: '#DC2626', fontWeight: '800', fontSize: 13 },
  acceptBtn: {
    flex: 1,
    backgroundColor: '#1B2B4B',
    borderRadius: 10,
    paddingVertical: 9,
    alignItems: 'center',
  },
  acceptBtnText: { color: '#fff', fontWeight: '800', fontSize: 13 },
});
