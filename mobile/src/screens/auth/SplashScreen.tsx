

import React, { useEffect } from 'react';

import {
  Image,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import Animated, {
  Easing,
  FadeInDown,
  ZoomIn,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import {
  colors,
  motion,
  typography,
  spacing,
} from '@/constants/theme';

export default function SplashScreen() {
  // Continuous logo animation
  const pulse = useSharedValue(0);

  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1, {
          duration: 1400,
          easing: Easing.inOut(Easing.ease),
        }),
        withTiming(0, {
          duration: 1400,
          easing: Easing.inOut(Easing.ease),
        }),
      ),
      -1,
      false
    );

    return () => {
      cancelAnimation(pulse);
    };
  }, [pulse]);

  const logoAnimationStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          scale: 1 + pulse.value * 0.025,
        },
        {
          translateY: -pulse.value * 5,
        },
      ],
    };
  });

  return (
    <View style={styles.container}>
      {/* Decorative Background */}
      <View style={styles.decorCircleTop} />
      <View style={styles.decorCircleBottom} />

      {/* Brand Logo */}
      <Animated.View
        entering={ZoomIn.duration(motion.duration.smooth)}
        style={[
          styles.logoContainer,
          logoAnimationStyle,
        ]}
      >
        <Image
          source={require('../../../assets/images/velora-logo.png')}
          style={styles.logo}
          resizeMode="contain"
          accessibilityLabel="VELORA - Everything You Love, In One Place"
        />
      </Animated.View>

      {/* Welcome Content */}
      <Animated.View
        entering={FadeInDown
          .delay(450)
          .duration(motion.duration.smooth)}
        style={styles.footer}
      >
        <View style={styles.accentLine} />

        <Text style={styles.welcomeText}>
          Welcome to VELORA
        </Text>

        <Text style={styles.subtitle}>
          Your Everyday Shopping Destination
        </Text>

        <Text style={styles.tagline}>
          Everything You Love, In One Place.
        </Text>
      </Animated.View>

      {/* Bottom Brand Detail */}
      <Animated.Text
        entering={FadeInDown.delay(750).duration(700)}
        style={styles.bottomText}
      >
        MADE FOR YOUR EVERYDAY
      </Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    overflow: 'hidden',
  },

  decorCircleTop: {
    position: 'absolute',
    width: 230,
    height: 230,
    borderRadius: 120,
    backgroundColor: colors.primarySoft,
    top: -100,
    right: -90,
    opacity: 0.8,
  },

  decorCircleBottom: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 150,
    backgroundColor: colors.surfaceGreen,
    bottom: -150,
    left: -120,
    opacity: 0.9,
  },

  logoContainer: {
    width: '100%',
    maxWidth: 360,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  logo: {
    width: '100%',
    height: '100%',
  },

  footer: {
    position: 'absolute',
    bottom: 100,
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    width: '100%',
  },

  accentLine: {
    width: 48,
    height: 4,
    borderRadius: 5,
    backgroundColor: colors.gold,
    marginBottom: 22,
  },

  welcomeText: {
    color: colors.primaryDark,
    fontSize: typography.fontSize.xxl,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: 0.5,
  },

  subtitle: {
    color: colors.textSecondary,
    fontSize: typography.fontSize.md,
    fontWeight: '600',
    marginTop: spacing.md,
    textAlign: 'center',
  },

  tagline: {
    color: colors.muted,
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
    marginTop: spacing.sm,
    textAlign: 'center',
    letterSpacing: 0.4,
  },

  bottomText: {
    position: 'absolute',
    bottom: 30,
    color: colors.muted,
    fontSize: typography.fontSize.xs,
    fontWeight: '700',
    letterSpacing: 2,
    textAlign: 'center',
  },
});
