import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { colors } from '@/constants/theme';

export default function LoadingIndicator({ fullScreen = true }: { fullScreen?: boolean }) {
  return (
    <View style={fullScreen ? { flex: 1, alignItems: 'center', justifyContent: 'center' } : { padding: 16 }}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}
