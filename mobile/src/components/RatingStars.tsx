import React from 'react';
import { Pressable, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '@/constants/theme';

interface Props {
  value: number;
  size?: number;
  onChange?: (v: number) => void;
}

export default function RatingStars({ value, size = 16, onChange }: Props) {
  return (
    <View style={{ flexDirection: 'row' }}>
      {[1, 2, 3, 4, 5].map((n) => {
        const icon = value >= n ? 'star' : value >= n - 0.5 ? 'star-half-full' : 'star-outline';
        const star = <MaterialCommunityIcons name={icon} size={size} color={colors.accent} />;
        return onChange ? (
          <Pressable key={n} onPress={() => onChange(n)} hitSlop={6}>{star}</Pressable>
        ) : (
          <View key={n}>{star}</View>
        );
      })}
    </View>
  );
}
