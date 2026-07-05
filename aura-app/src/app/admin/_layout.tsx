import { Redirect, Stack } from 'expo-router';
import { useUserStore } from '@/store/userStore';

export default function AdminLayout() {
  const user = useUserStore((state) => state.user);

  if (user?.role !== 'admin') {
    return <Redirect href="/(tabs)" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
