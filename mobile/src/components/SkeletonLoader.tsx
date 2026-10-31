import React, { useEffect } from 'react';
import { DimensionValue, StyleProp, View, ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

interface Props {
  width?: DimensionValue;
  height?: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}

/** Pulsing placeholder shown while data loads. */
export default function SkeletonLoader({ width = '100%', height = 16, radius = 8, style }: Props) {
  const opacity = useSharedValue(0.4);
  useEffect(() => {
    opacity.value = withRepeat(withTiming(1, { duration: 800 }), -1, true);
  }, [opacity]);
  const anim = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return <Animated.View style={[{ width, height, borderRadius: radius, backgroundColor: '#E2E8F0' }, anim, style]} />;
}

export function ProductGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', padding: 8 }}>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={{ width: '50%', padding: 6 }}>
          <SkeletonLoader height={150} radius={12} />
          <SkeletonLoader height={14} style={{ marginTop: 8 }} />
          <SkeletonLoader height={14} width="60%" style={{ marginTop: 6 }} />
        </View>
      ))}
    </View>
  );
}
