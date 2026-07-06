import "../../global.css";

import { useEffect, useState } from 'react';
import { Stack, router, useRootNavigationState } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { supabase } from '@/lib/supabase';
import { xpForLevel } from '@/lib/level';
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
};

async function fetchAndSetUser(
  authUser: { id: string; email?: string; user_metadata?: Record<string, unknown> },
  setUser: ReturnType<typeof useUserStore.getState>['setUser'],
): Promise<boolean> {
  const userId = authUser.id;
  const email = authUser.email ?? '';

  let { data, error } = await supabase
    .from('profiles')
    .select('id, username, first_name, last_name, level, xp, streak_days, role, onboarding_completed')
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
      .select('id, username, first_name, last_name, level, xp, streak_days, role, onboarding_completed')
      .eq('id', userId)
      .single());
  }

  if (error) {
    console.error('fetchAndSetUser: could not load profile', userId, error);
    return true;
  }

  const profile = data as ProfileRow | null;
  if (!profile) return true;

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

  return profile.onboarding_completed ?? false;
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
          const onboardingCompleted = await fetchAndSetUser(session.user, setUser);
          setPendingRedirect(onboardingCompleted ? '/(tabs)' : '/(onboarding)');
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
