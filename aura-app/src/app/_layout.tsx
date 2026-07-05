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
};

async function fetchAndSetUser(
  userId: string,
  email: string,
  setUser: ReturnType<typeof useUserStore.getState>['setUser'],
) {
  const { data } = await supabase
    .from('profiles')
    .select('id, username, first_name, last_name, level, xp, streak_days')
    .eq('id', userId)
    .single();

  const profile = data as ProfileRow | null;
  if (!profile) return;

  setUser({
    id: profile.id,
    email,
    username: profile.username,
    xp: profile.xp ?? 0,
    level: profile.level ?? 1,
    streak: profile.streak_days ?? 0,
    xpForNextLevel: xpForLevel((profile.level ?? 1) + 1),
  });
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
          await fetchAndSetUser(session.user.id, session.user.email ?? '', setUser);
          setPendingRedirect('/(tabs)');
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
