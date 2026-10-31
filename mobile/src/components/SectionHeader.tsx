import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { colors } from '@/constants/theme';

export default function SectionHeader({ title, onSeeAll }: { title: string; onSeeAll?: () => void }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginTop: 20, marginBottom: 8 }}>
      <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>{title}</Text>
      {onSeeAll && (
        <Pressable onPress={onSeeAll} hitSlop={8}>
          <Text style={{ color: colors.primary, fontWeight: '600' }}>See all</Text>
        </Pressable>
      )}
    </View>
  );
}
