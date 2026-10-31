import React from 'react';
import { Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '@/constants/theme';
import CustomButton from './CustomButton';

interface Props {
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export default function EmptyState({ icon, title, subtitle, actionLabel, onAction }: Props) {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
      <MaterialCommunityIcons name={icon} size={72} color={colors.border} />
      <Text style={{ fontSize: 18, fontWeight: '600', color: colors.text, marginTop: 12 }}>{title}</Text>
      {subtitle && <Text style={{ color: colors.muted, textAlign: 'center', marginTop: 6 }}>{subtitle}</Text>}
      {actionLabel && onAction && <CustomButton label={actionLabel} onPress={onAction} style={{ marginTop: 16 }} />}
    </View>
  );
}
