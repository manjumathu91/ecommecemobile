import React from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import { IconButton } from 'react-native-paper';
import { MEDIA_FALLBACK } from '@/constants/config';
import { colors } from '@/constants/theme';
import type { CartItem } from '@/types';
import { formatINR } from '@/utils/format';
import QuantityStepper from './QuantityStepper';

interface Props {
  item: CartItem;
  busy?: boolean;
  onQuantity: (q: number) => void;
  onRemove: () => void;
  onPress: () => void;
}

export default function CartItemRow({ item, busy, onQuantity, onRemove, onPress }: Props) {
  const p = item.product;
  return (
    <View style={{ flexDirection: 'row', backgroundColor: '#fff', borderRadius: 12, padding: 10, marginBottom: 10, borderWidth: 1, borderColor: colors.border }}>
      <Pressable onPress={onPress}>
        <Image source={{ uri: p.thumbnail ?? MEDIA_FALLBACK }} style={{ width: 84, height: 84, borderRadius: 10, backgroundColor: '#F1F5F9' }} />
      </Pressable>
      <View style={{ flex: 1, marginLeft: 12 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text numberOfLines={2} style={{ flex: 1, fontWeight: '600', color: colors.text }}>{p.name}</Text>
          <IconButton icon="trash-can-outline" size={20} iconColor={colors.danger} onPress={onRemove} style={{ margin: -6 }} />
        </View>
        <Text style={{ color: colors.muted, fontSize: 12 }}>{formatINR(p.effective_price)} each</Text>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
          <QuantityStepper value={item.quantity} max={p.stock} onChange={onQuantity} disabled={busy} />
          <Text style={{ fontWeight: '700', color: colors.text }}>{formatINR(item.line_total)}</Text>
        </View>
        {item.quantity >= p.stock && <Text style={{ color: colors.warning, fontSize: 11, marginTop: 2 }}>Maximum available quantity</Text>}
      </View>
    </View>
  );
}
