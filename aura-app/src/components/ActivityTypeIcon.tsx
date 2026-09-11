import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import type { ActivityTypeOption } from '@/lib/posts';

type Props = {
  activityType: ActivityTypeOption;
  size: number;
  color: string;
};

export function ActivityTypeIcon({ activityType, size, color }: Props) {
  if (activityType.iconSet === 'material') {
    return <MaterialCommunityIcons name={activityType.icon} size={size} color={color} />;
  }
  return <Ionicons name={activityType.icon} size={size} color={color} />;
}
