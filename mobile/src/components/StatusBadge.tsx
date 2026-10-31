import React from 'react';
import { Text, View } from 'react-native';
import { colors } from '@/constants/theme';

const TONES: Record<string, string> = {
  DELIVERED: colors.success, PAID: colors.success, SUCCESS: colors.success,
  CANCELLED: colors.danger, FAILED: colors.danger,
  PENDING_PAYMENT: colors.warning, PENDING: colors.warning, REFUND_PENDING: colors.warning,
};

export default function StatusBadge({ status, label }: { status: string; label?: string }) {
  const tone = TONES[status] ?? colors.primary;
  return (
    <View style={{ backgroundColor: tone + '1A', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start' }}>
      <Text style={{ color: tone, fontSize: 12, fontWeight: '700' }}>{label ?? status.replace(/_/g, ' ')}</Text>
    </View>
  );
}
