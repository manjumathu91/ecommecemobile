import React from 'react';
import { Text, View } from 'react-native';
import { IconButton } from 'react-native-paper';
import { colors } from '@/constants/theme';

interface Props {
  value: number;
  max: number;
  onChange: (v: number) => void;
  disabled?: boolean;
}

export default function QuantityStepper({ value, max, onChange, disabled }: Props) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: 10 }}>
      <IconButton icon="minus" size={16} disabled={disabled || value <= 1} onPress={() => onChange(value - 1)} />
      <Text style={{ minWidth: 24, textAlign: 'center', fontWeight: '600' }}>{value}</Text>
      <IconButton icon="plus" size={16} disabled={disabled || value >= max} onPress={() => onChange(value + 1)} />
    </View>
  );
}
