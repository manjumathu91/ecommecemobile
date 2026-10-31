import React from 'react';
import { Text, View } from 'react-native';
import { colors } from '@/constants/theme';
import { formatINR } from '@/utils/format';

interface Row {
  label: string;
  value: string | number;
  negative?: boolean;
  free?: boolean;
  bold?: boolean;
}

export default function PriceSummary({ rows }: { rows: Row[] }) {
  return (
    <View style={{ backgroundColor: '#fff', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: colors.border }}>
      {rows.map((r, i) => (
        <View key={r.label} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, ...(r.bold && i > 0 ? { borderTopWidth: 1, borderTopColor: colors.border, marginTop: 6, paddingTop: 10 } : {}) }}>
          <Text style={{ color: r.bold ? colors.text : colors.muted, fontWeight: r.bold ? '700' : '400', fontSize: r.bold ? 16 : 14 }}>{r.label}</Text>
          <Text style={{ color: r.negative || r.free ? colors.success : colors.text, fontWeight: r.bold ? '700' : '500', fontSize: r.bold ? 16 : 14 }}>
            {r.free && Number(r.value) === 0 ? 'FREE' : `${r.negative ? '- ' : ''}${formatINR(r.value)}`}
          </Text>
        </View>
      ))}
    </View>
  );
}
