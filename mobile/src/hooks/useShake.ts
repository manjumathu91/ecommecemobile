import { useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';

/** Horizontal shake used to signal a failed submit (login/register errors). */
export function useShake() {
  const x = useSharedValue(0);
  const style = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  const shake = () => {
    x.value = withSequence(
      withTiming(-10, { duration: 50 }), withTiming(10, { duration: 80 }),
      withTiming(-8, { duration: 80 }), withTiming(8, { duration: 80 }), withTiming(0, { duration: 50 }),
    );
  };
  return { style, shake };
}
