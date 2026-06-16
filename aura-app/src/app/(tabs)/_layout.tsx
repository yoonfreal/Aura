import { Tabs } from 'expo-router';
import { TabBar } from '@/components/TabBar';

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: '#F2F6F9' } }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="rank" />
      <Tabs.Screen name="challenges" />
      <Tabs.Screen name="social" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}
