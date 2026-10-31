
import React, { useEffect } from 'react';

import { MaterialCommunityIcons } from '@expo/vector-icons';

import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

type Props = {
  name: string;
  color: string;
  focused: boolean;
};

export default function AnimatedTabIcon({
  name,
  color,
  focused,
}: Props) {

  const progress = useSharedValue(focused ? 1 : 0);

  useEffect(() => {

    progress.value = withSpring(
      focused ? 1 : 0,
      {
        damping: 12,
        stiffness: 180,
        mass: 0.7,
      }
    );

  }, [focused, progress]);

  const animatedStyle = useAnimatedStyle(() => {

    return {

      transform: [
        {
          scale: interpolate(
            progress.value,
            [0, 1],
            [1, 1.18]
          ),
        },
        {
          translateY: interpolate(
            progress.value,
            [0, 1],
            [0, -3]
          ),
        },
      ],

    };

  });

  return (

    <Animated.View style={[animatedStyle]}>

      <MaterialCommunityIcons
        name={name as any}
        size={26}
        color={color}
      />

    </Animated.View>

  );
}
