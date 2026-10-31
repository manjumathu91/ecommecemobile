import React from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import { Button } from 'react-native-paper';

interface Props {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  mode?: 'contained' | 'outlined' | 'text' | 'contained-tonal';
  icon?: string;
  danger?: boolean;
  style?: StyleProp<ViewStyle>;
}

export default function CustomButton({ label, onPress, loading, disabled, mode = 'contained', icon, danger, style }: Props) {
  return (
    <Button
      mode={mode}
      onPress={onPress}
      loading={loading}
      disabled={disabled || loading}
      icon={icon}
      buttonColor={danger && mode === 'contained' ? '#DC2626' : undefined}
      textColor={danger && mode !== 'contained' ? '#DC2626' : undefined}
      contentStyle={{ paddingVertical: 6 }}
      style={[{ borderRadius: 12 }, style]}
    >
      {label}
    </Button>
  );
}
