import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { isChallengeExpired, type ChallengeWithStatus } from '@/lib/challenges';

type ChallengeCardProps = {
  challenge: ChallengeWithStatus;
  onOpenTeamPicker: () => void;
  onViewTeam: () => void;
  onInviteFriend: () => void;
  onClaim: () => void;
  onAcceptTeamInvite: () => void;
  onDeclineTeamInvite: () => void;
  highlighted?: boolean;
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
  onOpenTeamPicker,
  onViewTeam,
  onInviteFriend,
  onClaim,
  onAcceptTeamInvite,
  onDeclineTeamInvite,
  highlighted,
}: ChallengeCardProps) {
  const isTeam = challenge.type === 'team';
  const myTeam = isTeam
    ? challenge.teams.find((t) => t.id === challenge.participation?.teamId)
    : undefined;

  const currentValue = isTeam ? (myTeam?.totalValue ?? 0) : (challenge.participation?.currentValue ?? 0);
  const progressPct = Math.min(100, (currentValue / challenge.goalValue) * 100);
  const isCompleted = isTeam ? currentValue >= challenge.goalValue : (challenge.participation?.completed ?? false);
  const isClaimed = challenge.participation?.claimed ?? false;
  // Team deadlines are shared on the team itself, since the goal is collective.
  // Individual challenges have no personal deadline anymore (everyone auto-enrolls and
  // shares the challenge's own end date instead).
  const expiresAt = isTeam ? (myTeam?.expiresAt ?? null) : `${challenge.endDate}T23:59:59`;
  const isExpired = isChallengeExpired(challenge);
  const daysLeft = expiresAt ? Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86400000) : null;
  // "No limit" individual/1v1 challenges still have a real (far-future) end date under the
  // hood, so anything absurdly far out just means there's effectively no deadline to show.
  const isNoLimit = daysLeft !== null && daysLeft > 365;
  // A team invite isn't "joined" until accepted — pending/declined rows don't count.
  const hasJoined = isTeam
    ? challenge.participation?.status === 'accepted'
    : !!challenge.participation;
  const canClaim = hasJoined && isCompleted && !isClaimed && !isExpired;
  const isPendingTeamInvite = isTeam && challenge.participation?.status === 'pending';
  const isDeclinedTeamInvite = isTeam && challenge.participation?.status === 'declined';
  const inviterName = myTeam?.members.find((m) => m.userId === challenge.participation?.opponentId)?.name;
  const accent = typeColor(challenge.type);
  const showCategoryTag = challenge.category && challenge.category.toLowerCase() !== challenge.type;

  const earnedBadge =
    isClaimed && challenge.badgeName ? (
      <View style={styles.badgePill}>
        <Text style={styles.badgePillText}>
          {challenge.badgeIcon ? `${challenge.badgeIcon} ` : ''}
          {challenge.badgeName}
        </Text>
      </View>
    ) : (
      <Text style={styles.linkText}>Completed</Text>
    );

  return (
    <View style={[styles.card, highlighted && styles.cardHighlighted]}>
      <View style={styles.headerRow}>
        <View style={styles.titleRow}>
          <View style={styles.iconCircle}>
            <Text style={styles.icon}>{challenge.icon}</Text>
          </View>
          <Text style={styles.title} numberOfLines={1}>
            {challenge.title}
          </Text>
          <View style={styles.rewardPill}>
            <MaterialCommunityIcons name="lightning-bolt" size={11} color="#F5B800" />
            <Text style={styles.rewardPillText}>{challenge.xpReward.toLocaleString()} XP</Text>
          </View>
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

      {challenge.badgeName && (
        <View style={styles.badgePreviewPill}>
          <MaterialCommunityIcons name="medal-outline" size={12} color="#6D28D9" />
          <Text style={styles.badgePreviewText}>
            {challenge.badgeIcon ? `${challenge.badgeIcon} ` : ''}
            {challenge.badgeName}
          </Text>
        </View>
      )}

      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progressPct}%`, backgroundColor: accent }]} />
      </View>
      <View style={styles.progressRow}>
        <Text style={styles.progressLabel}>
          {currentValue.toLocaleString()} / {challenge.goalValue.toLocaleString()} {challenge.goalUnit}
        </Text>
        <Text style={[styles.progressPct, { color: accent }]}>{Math.round(progressPct)}%</Text>
      </View>
      {hasJoined && !isCompleted && expiresAt && !isNoLimit && (
        <View style={styles.metaRow}>
          <Text style={isExpired ? styles.expiredText : styles.progressHint}>
            {isExpired ? 'Expired — no XP for this attempt' : `${daysLeft} day${daysLeft === 1 ? '' : 's'} left to finish`}
          </Text>
        </View>
      )}

      {isPendingTeamInvite && (
        <View style={styles.inviteBanner}>
          <Text style={styles.inviteBannerText}>
            {inviterName ?? 'Someone'} invited you to join {myTeam?.name ?? 'their team'}
          </Text>
        </View>
      )}

      {isDeclinedTeamInvite && (
        <View style={styles.declinedBanner}>
          <Text style={styles.declinedBannerText}>
            You declined the invite to join {myTeam?.name ?? 'this team'}
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
        ) : isDeclinedTeamInvite ? (
          <View style={styles.pillDisabled}>
            <Text style={styles.pillDisabledText}>Declined</Text>
          </View>
        ) : isTeam ? (
          <>
            {hasJoined && !isCompleted ? (
              <TouchableOpacity onPress={onInviteFriend}>
                <Text style={styles.linkText}>Invite friend</Text>
              </TouchableOpacity>
            ) : isClaimed ? (
              earnedBadge
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
                style={canClaim ? styles.claimBtn : hasJoined ? styles.pillDisabled : styles.pillActive}
                onPress={canClaim ? onClaim : hasJoined ? undefined : onOpenTeamPicker}
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
                  {canClaim
                    ? 'Claim Reward'
                    : isClaimed
                      ? 'Completed'
                      : isExpired
                        ? 'Expired'
                        : hasJoined
                          ? 'Joined'
                          : 'Join'}
                </Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <>
            {isClaimed ? earnedBadge : <View />}
            {canClaim ? (
              <TouchableOpacity style={styles.claimBtn} onPress={onClaim}>
                <Text style={styles.claimBtnText}>Claim Reward</Text>
              </TouchableOpacity>
            ) : isExpired ? (
              <View style={styles.pillDisabled}>
                <Text style={styles.pillDisabledText}>Expired</Text>
              </View>
            ) : (
              <View />
            )}
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 13,
    marginHorizontal: 16,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 5,
    elevation: 2,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  cardHighlighted: {
    borderColor: '#F5B800',
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1, flex: 1 },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F2F6F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: { fontSize: 15 },
  title: { fontSize: 14, fontWeight: '800', color: '#0D1829', flexShrink: 1, letterSpacing: -0.2 },
  tagGroup: { flexDirection: 'row', alignItems: 'center', gap: 6, marginLeft: 8 },
  categoryPill: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 20,
    backgroundColor: '#F2F6F9',
  },
  categoryText: { fontSize: 10, fontWeight: '700', color: '#6B7280' },
  typePill: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 20,
  },
  typeText: { fontSize: 10, fontWeight: '800', color: '#fff' },
  description: { fontSize: 11.5, color: '#6B7280', marginTop: 8, lineHeight: 16 },
  badgePreviewPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    backgroundColor: '#EDE9FE',
    borderWidth: 1,
    borderColor: '#C4B5FD',
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginTop: 8,
  },
  badgePreviewText: { fontSize: 10.5, fontWeight: '800', color: '#6D28D9' },
  rewardPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#FFF8E1',
    borderWidth: 1,
    borderColor: '#F5D77A',
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
    flexShrink: 0,
  },
  rewardPillText: { fontSize: 10.5, fontWeight: '800', color: '#8A6D00' },
  progressTrack: {
    height: 7,
    borderRadius: 4,
    backgroundColor: '#E5E9F0',
    marginTop: 10,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 4 },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  progressLabel: { fontSize: 11, color: '#6B7280', fontWeight: '600' },
  progressPct: { fontSize: 11, fontWeight: '800' },
  metaRow: { marginTop: 6, gap: 3 },
  progressHint: { fontSize: 10.5, color: '#9CA3AF', fontWeight: '500' },
  expiredText: { fontSize: 10.5, color: '#DC2626', fontWeight: '700' },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 11,
  },
  footerActions: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  linkText: { fontSize: 12, fontWeight: '700', color: '#2563EB' },
  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8E1',
    borderWidth: 1,
    borderColor: '#F5D77A',
    borderRadius: 20,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  badgePillText: { fontSize: 11, fontWeight: '800', color: '#8A6D00' },
  outlineBtn: {
    borderWidth: 1.5,
    borderColor: '#1B2B4B',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 9,
  },
  outlineBtnText: { color: '#1B2B4B', fontWeight: '700', fontSize: 11 },
  pillActive: {
    backgroundColor: '#1B2B4B',
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 9,
    shadowColor: '#1B2B4B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 3,
  },
  pillActiveText: { color: '#fff', fontWeight: '700', fontSize: 11 },
  pillDisabled: {
    backgroundColor: '#E5E9F0',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 9,
  },
  pillDisabledText: { color: '#9CA3AF', fontWeight: '700', fontSize: 11 },
  claimBtn: {
    backgroundColor: '#16A34A',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 9,
    shadowColor: '#15803D',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 4,
  },
  claimBtnText: { color: '#fff', fontWeight: '800', fontSize: 11 },
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
  declinedBanner: {
    backgroundColor: '#F2F6F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginTop: 12,
  },
  declinedBannerText: { fontSize: 12, fontWeight: '700', color: '#6B7280' },
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
