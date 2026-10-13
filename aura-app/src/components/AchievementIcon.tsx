import { Text, type TextStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type Props = {
  icon: string;
  size: number;
  color: string;
  emojiStyle?: TextStyle;
};

export function AchievementIcon({ icon, size, color, emojiStyle }: Props) {
  if (icon in Ionicons.glyphMap) {
    return <Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={size} color={color} />;
  }
  return <Text style={emojiStyle}>{icon}</Text>;
}
