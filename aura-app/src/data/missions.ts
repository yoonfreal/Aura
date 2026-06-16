import type { Mission } from '@/types';

export const defaultMissions: Mission[] = [
  {
    id: '1',
    title: 'Walk 5,000 steps',
    xpReward: 50,
    goalValue: 5000,
    goalUnit: 'steps',
    icon: '🦶',
    currentValue: 5120,
    completed: true,
  },
  {
    id: '2',
    title: 'Burn 400 Calories',
    xpReward: 70,
    goalValue: 400,
    goalUnit: 'calories',
    icon: '🏋️',
    currentValue: 153,
    completed: false,
  },
  {
    id: '3',
    title: '30 min basketball',
    xpReward: 70,
    goalValue: 30,
    goalUnit: 'minutes',
    icon: '🏀',
    currentValue: 0,
    completed: false,
  },
  {
    id: '4',
    title: 'Run 30 min',
    xpReward: 50,
    goalValue: 30,
    goalUnit: 'minutes',
    icon: '🏃',
    currentValue: 0,
    completed: false,
  },
];
