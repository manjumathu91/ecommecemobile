import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '@/constants/theme';
import type { Address } from '@/types';

interface Props {
  address: Address;
  selected?: boolean;
  onPress?: () => void;
  actions?: React.ReactNode;
}

export default function AddressCard({ address: a, selected, onPress, actions }: Props) {
  return (
    <Pressable onPress={onPress} style={{ backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 10, borderWidth: 2, borderColor: selected ? colors.primary : colors.border }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        {onPress && <MaterialCommunityIcons name={selected ? 'radiobox-marked' : 'radiobox-blank'} size={22} color={selected ? colors.primary : colors.muted} style={{ marginRight: 8 }} />}
        <Text style={{ fontWeight: '700', color: colors.text, flex: 1 }}>{a.full_name}</Text>
        {a.is_default && (
          <View style={{ backgroundColor: '#EEF2FF', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 }}>
            <Text style={{ color: colors.primary, fontSize: 11, fontWeight: '600' }}>DEFAULT</Text>
          </View>
        )}
      </View>
      <Text style={{ color: colors.muted, marginTop: 4 }}>{a.house_number}, {a.street}</Text>
      <Text style={{ color: colors.muted }}>{a.city}, {a.state} - {a.postal_code}</Text>
      <Text style={{ color: colors.muted }}>Phone: {a.phone}</Text>
      {!!a.delivery_instructions && <Text style={{ color: colors.muted, fontStyle: 'italic' }}>Note: {a.delivery_instructions}</Text>}
      {actions}
    </Pressable>
  );
}
