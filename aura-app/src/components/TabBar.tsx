import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

const TABS: {
  name: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconActive: keyof typeof Ionicons.glyphMap;
  label: string;
}[] = [
  { name: 'index',      icon: 'home-outline',      iconActive: 'home',      label: 'Home'       },
  { name: 'rank',       icon: 'bar-chart-outline',  iconActive: 'bar-chart', label: 'Rank'       },
  { name: 'challenges', icon: 'trophy-outline',     iconActive: 'trophy',    label: 'Challenges' },
  { name: 'social',     icon: 'people-outline',     iconActive: 'people',    label: 'Social'     },
  { name: 'profile',    icon: 'person-outline',     iconActive: 'person',    label: 'Profile'    },
];

function TabItem({
  tab,
  focused,
  onPress,
}: {
  tab: (typeof TABS)[0];
  focused: boolean;
  onPress: () => void;
}) {
  const bg = useRef(new Animated.Value(focused ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(bg, {
      toValue: focused ? 1 : 0,
      duration: 180,
      useNativeDriver: false,
    }).start();
  }, [focused]);

  const backgroundColor = bg.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(0,0,0,0)', 'rgba(0,0,0,0.07)'],
  });

  return (
    <TouchableOpacity style={styles.tabItem} onPress={onPress} activeOpacity={0.7}>
      <Animated.View style={[styles.activePill, { backgroundColor }]}>
        <Ionicons
          name={focused ? tab.iconActive : tab.icon}
          size={22}
          color={focused ? '#1B2B4B' : '#9CA3AF'}
        />
        <Text style={[styles.label, focused && styles.labelActive]} numberOfLines={1}>
          {tab.label}
        </Text>
      </Animated.View>
    </TouchableOpacity>
  );
}

export function TabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.wrapper, { paddingBottom: insets.bottom > 0 ? insets.bottom - 4 : 10 }]}>
      <View style={styles.pill}>
        {state.routes.map((route: { key: string; name: string }, index: number) => {
          const tab = TABS[index];
          const focused = state.index === index;

          return (
            <TabItem
              key={route.key}
              tab={tab}
              focused={focused}
              onPress={() => {
                const event = navigation.emit({
                  type: 'tabPress',
                  target: route.key,
                  canPreventDefault: true,
                });
                if (!focused && !event.defaultPrevented) {
                  navigation.navigate(route.name);
                }
              }}
            />
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  pill: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    paddingVertical: 6,
    paddingHorizontal: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 12,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
  },
  activePill: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 8,
    width: '100%',
    gap: 2,
  },
  label: {
    fontSize: 9,
    fontWeight: '500',
    color: '#9CA3AF',
  },
  labelActive: {
    color: '#1B2B4B',
    fontWeight: '700',
  },
});
