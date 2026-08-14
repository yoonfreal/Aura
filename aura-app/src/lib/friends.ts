import { supabase } from '@/lib/supabase';

type FriendshipRow = {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: 'pending' | 'accepted';
};

type ProfileNameRow = {
  id: string;
  username: string | null;
  first_name: string | null;
  last_name: string | null;
  level: number | null;
  xp?: number | null;
};

export type FriendRequestEntry = { id: string; userId: string; name: string; level: number };
export type FriendRelation = 'none' | 'friends' | 'sent' | 'incoming';
export type FriendSearchResult = {
  id: string;
  name: string;
  level: number;
  relation: FriendRelation;
  requestId?: string;
};

function displayName(p: ProfileNameRow | undefined): string {
  if (!p) return 'Unknown';
  return p.username || `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim() || 'Unknown';
}

async function fetchRequests(
  userId: string,
  direction: 'incoming' | 'sent',
): Promise<FriendRequestEntry[]> {
  const column = direction === 'incoming' ? 'addressee_id' : 'requester_id';
  const otherColumn = direction === 'incoming' ? 'requester_id' : 'addressee_id';

  const { data, error } = await supabase
    .from('friendships')
    .select(`id, ${otherColumn}`)
    .eq(column, userId)
    .eq('status', 'pending');
  if (error) throw error;

  const rows = (data ?? []) as unknown as { id: string; [key: string]: string }[];
  if (rows.length === 0) return [];

  const otherIds = rows.map((r) => r[otherColumn]);
  const { data: profilesData } = await supabase
    .from('profiles')
    .select('id, username, first_name, last_name, level')
    .in('id', otherIds);
  const profileById = new Map(((profilesData ?? []) as ProfileNameRow[]).map((p) => [p.id, p]));

  return rows.map((r) => {
    const profile = profileById.get(r[otherColumn]);
    return { id: r.id, userId: r[otherColumn], name: displayName(profile), level: profile?.level ?? 1 };
  });
}

export function fetchIncomingRequests(userId: string): Promise<FriendRequestEntry[]> {
  return fetchRequests(userId, 'incoming');
}

export function fetchSentRequests(userId: string): Promise<FriendRequestEntry[]> {
  return fetchRequests(userId, 'sent');
}

// Powers the notification badge on the friends icon — counts only *unseen* incoming
// requests, not all pending ones, so the badge clears once the user opens the Friends
// screen and reappears (from 1) only for requests that arrive after that.
export async function countIncomingRequests(userId: string): Promise<number> {
  const { count } = await supabase
    .from('friendships')
    .select('id', { count: 'exact', head: true })
    .eq('addressee_id', userId)
    .eq('status', 'pending')
    .eq('seen', false);
  return count ?? 0;
}

// Called when the Friends screen loads — marks every currently-pending incoming request
// as seen so the badge clears, without touching requests that arrive afterward.
export async function markIncomingRequestsSeen(userId: string): Promise<void> {
  const { error } = await supabase
    .from('friendships')
    .update({ seen: true })
    .eq('addressee_id', userId)
    .eq('status', 'pending')
    .eq('seen', false);
  if (error) throw error;
}

export async function searchUsersToAdd(query: string, userId: string): Promise<FriendSearchResult[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const { data: profilesData } = await supabase
    .from('profiles')
    .select('id, username, first_name, last_name, level')
    .or(`username.ilike.%${trimmed}%,first_name.ilike.%${trimmed}%,last_name.ilike.%${trimmed}%`)
    .neq('id', userId)
    .limit(20);

  const results = (profilesData ?? []) as ProfileNameRow[];
  if (results.length === 0) return [];

  const { data: existing } = await supabase
    .from('friendships')
    .select('id, requester_id, addressee_id, status')
    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);

  const friendships = (existing ?? []) as FriendshipRow[];

  const withRelation = results.map((p) => {
    const match = friendships.find((f) => f.requester_id === p.id || f.addressee_id === p.id);
    let relation: FriendRelation = 'none';
    if (match) {
      relation = match.status === 'accepted' ? 'friends' : match.requester_id === userId ? 'sent' : 'incoming';
    }
    return { id: p.id, name: displayName(p), level: p.level ?? 1, relation, requestId: match?.id };
  });

  // People who already added you surface first — they're the most actionable result.
  return withRelation.sort((a, b) => (a.relation === 'incoming' ? 0 : 1) - (b.relation === 'incoming' ? 0 : 1));
}

export async function sendFriendRequest(requesterId: string, addresseeId: string): Promise<void> {
  const { error } = await supabase
    .from('friendships')
    .insert({ requester_id: requesterId, addressee_id: addresseeId, status: 'pending' });
  if (error) throw error;
}

export async function acceptFriendRequest(requestId: string): Promise<void> {
  const { error } = await supabase.from('friendships').update({ status: 'accepted' }).eq('id', requestId);
  if (error) throw error;
}

export async function cancelFriendRequest(requestId: string): Promise<void> {
  const { error } = await supabase.from('friendships').delete().eq('id', requestId);
  if (error) throw error;
}

export type FriendSuggestion = { id: string; name: string; level: number; mutualCount: number };

// "People you may know": ranks by mutual friend count first, like most social apps, then
// tops up with a general pool (highest XP — fits the fitness-competition angle) so the
// section is never empty, since almost everyone has zero mutual friends at first.
export async function fetchSuggestedFriends(userId: string, limit = 20): Promise<FriendSuggestion[]> {
  const { data: myFriendships } = await supabase
    .from('friendships')
    .select('requester_id, addressee_id, status')
    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);

  const myRelations = (myFriendships ?? []) as FriendshipRow[];
  const excludeIds = new Set<string>([userId]);
  const myFriendIds: string[] = [];
  for (const f of myRelations) {
    const otherId = f.requester_id === userId ? f.addressee_id : f.requester_id;
    excludeIds.add(otherId);
    if (f.status === 'accepted') myFriendIds.push(otherId);
  }

  const mutualCountById = new Map<string, number>();
  if (myFriendIds.length > 0) {
    const { data: friendsOfFriends } = await supabase
      .from('friendships')
      .select('requester_id, addressee_id')
      .eq('status', 'accepted')
      .or(`requester_id.in.(${myFriendIds.join(',')}),addressee_id.in.(${myFriendIds.join(',')})`);

    for (const f of (friendsOfFriends ?? []) as FriendshipRow[]) {
      for (const candidate of [f.requester_id, f.addressee_id]) {
        if (excludeIds.has(candidate)) continue;
        mutualCountById.set(candidate, (mutualCountById.get(candidate) ?? 0) + 1);
      }
    }
  }

  const rankedMutualIds = [...mutualCountById.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([id]) => id);

  const suggestionIds = new Set(rankedMutualIds);

  if (suggestionIds.size < limit) {
    const { data: pool } = await supabase
      .from('profiles')
      .select('id')
      .order('xp', { ascending: false })
      .limit(limit + excludeIds.size + suggestionIds.size);

    for (const row of (pool ?? []) as { id: string }[]) {
      if (suggestionIds.size >= limit) break;
      if (excludeIds.has(row.id) || suggestionIds.has(row.id)) continue;
      suggestionIds.add(row.id);
    }
  }

  if (suggestionIds.size === 0) return [];

  const { data: profilesData } = await supabase
    .from('profiles')
    .select('id, username, first_name, last_name, level')
    .in('id', [...suggestionIds]);
  const profileById = new Map(((profilesData ?? []) as ProfileNameRow[]).map((p) => [p.id, p]));

  return [...suggestionIds].map((id) => {
    const profile = profileById.get(id);
    return { id, name: displayName(profile), level: profile?.level ?? 1, mutualCount: mutualCountById.get(id) ?? 0 };
  });
}

export type FriendLeaderboardEntry = { rank: number; userId: string; name: string; level: number; xp: number };

// Includes the current user alongside their accepted friends, ranked together by XP —
// mirrors the Overall/Weekly leaderboard shape so rank.tsx can reuse the same row renderer.
export async function fetchFriendsLeaderboard(userId: string): Promise<FriendLeaderboardEntry[]> {
  const { data: friendshipsData } = await supabase
    .from('friendships')
    .select('requester_id, addressee_id, status')
    .eq('status', 'accepted')
    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);

  const friendIds = ((friendshipsData ?? []) as FriendshipRow[]).map((f) =>
    f.requester_id === userId ? f.addressee_id : f.requester_id,
  );

  const { data: profilesData, error } = await supabase
    .from('profiles')
    .select('id, username, first_name, last_name, level, xp')
    .in('id', [userId, ...friendIds]);
  if (error) throw error;

  return ((profilesData ?? []) as ProfileNameRow[])
    .map((p) => ({ userId: p.id, name: displayName(p), level: p.level ?? 1, xp: p.xp ?? 0 }))
    .sort((a, b) => b.xp - a.xp)
    .map((entry, i) => ({ ...entry, rank: i + 1 }));
}
