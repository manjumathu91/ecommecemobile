import React from 'react';
import { Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '@/constants/theme';
import CustomButton from './CustomButton';

export default function ErrorMessage({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <MaterialCommunityIcons name="cloud-alert" size={56} color={colors.danger} />
      <Text style={{ color: colors.text, fontSize: 16, textAlign: 'center', marginVertical: 12 }}>{message}</Text>
      {onRetry && <CustomButton label="Try again" mode="outlined" onPress={onRetry} />}
    </View>
  );
}
