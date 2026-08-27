import "../../global.css";

import { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { Stack, router, useRootNavigationState } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { supabase } from '@/lib/supabase';
import { xpForLevel } from '@/lib/level';
import { ensureActiveToday, updateLastSeen } from '@/lib/api';
import { useUserStore } from '@/store/userStore';

type ProfileRow = {
  id: string;
  username: string;
  first_name: string;
  last_name: string;
  level: number;
  xp: number;
  streak_days: number;
  role: 'user' | 'admin';
  onboarding_completed: boolean;
  suspended: boolean;
};

type FetchUserResult = 'tabs' | 'onboarding' | 'suspended';

async function fetchAndSetUser(
  authUser: { id: string; email?: string; user_metadata?: Record<string, unknown> },
  setUser: ReturnType<typeof useUserStore.getState>['setUser'],
): Promise<FetchUserResult> {
  const userId = authUser.id;
  const email = authUser.email ?? '';

  let { data, error } = await supabase
    .from('profiles')
    .select('id, username, first_name, last_name, level, xp, streak_days, role, onboarding_completed, suspended')
    .eq('id', userId)
    .single();

  if (error?.code === 'PGRST116') {
    // Profile row was never created (trigger or signup upsert didn't run) — self-heal from auth metadata.
    const meta = authUser.user_metadata ?? {};
    await supabase.from('profiles').upsert({
      id: userId,
      username: (meta.username as string) || email.split('@')[0] || `user_${userId.slice(0, 8)}`,
      first_name: (meta.first_name as string) ?? '',
      last_name: (meta.last_name as string) ?? '',
    });

    ({ data, error } = await supabase
      .from('profiles')
      .select('id, username, first_name, last_name, level, xp, streak_days, role, onboarding_completed, suspended')
      .eq('id', userId)
      .single());
  }

  if (error) {
    console.error('fetchAndSetUser: could not load profile', userId, error);
    return 'tabs';
  }

  const profile = data as ProfileRow | null;
  if (!profile) return 'tabs';

  if (profile.suspended) {
    await supabase.auth.signOut();
    return 'suspended';
  }

  ensureActiveToday(userId);
  updateLastSeen(userId);

  setUser({
    id: profile.id,
    email,
    username: profile.username,
    xp: profile.xp ?? 0,
    level: profile.level ?? 1,
    streak: profile.streak_days ?? 0,
    xpForNextLevel: xpForLevel((profile.level ?? 1) + 1),
    role: profile.role ?? 'user',
  });

  return profile.onboarding_completed ? 'tabs' : 'onboarding';
}

export default function RootLayout() {
  const { setUser, clearUser } = useUserStore();
  const navigationState = useRootNavigationState();
  const [pendingRedirect, setPendingRedirect] = useState<string | null>(null);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (
          (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') &&
          session?.user
        ) {
          const result = await fetchAndSetUser(session.user, setUser);
          if (result === 'suspended') {
            Alert.alert('Account Suspended', 'Your account has been suspended. Contact support for more information.');
            setPendingRedirect('/(auth)/signup');
          } else {
            setPendingRedirect(result === 'tabs' ? '/(tabs)' : '/(onboarding)');
          }
        } else if (
          event === 'SIGNED_OUT' ||
          (event === 'INITIAL_SESSION' && !session)
        ) {
          clearUser();
          setPendingRedirect('/(auth)/signup');
        }
      },
    );

    return () => subscription.unsubscribe();
  }, []);

  // Keeps last_seen_at fresh while the app stays open, not just at launch — otherwise
  // someone who's been on the app for 10 minutes would show as "Offline" to admin.
  useEffect(() => {
    const interval = setInterval(() => {
      const userId = useUserStore.getState().user?.id;
      if (userId) updateLastSeen(userId);
    }, 2 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!navigationState?.key || !pendingRedirect) return;
    router.replace(pendingRedirect as any);
    setPendingRedirect(null);
  }, [navigationState?.key, pendingRedirect]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar hidden />
      <Stack screenOptions={{ headerShown: false }} />
    </GestureHandlerRootView>
  );
}
