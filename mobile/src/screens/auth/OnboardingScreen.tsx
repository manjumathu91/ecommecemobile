

import React, { useEffect, useRef, useState } from 'react';

import {
  Animated as RNAnimated,
  Easing,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, {
  FadeInDown,
  FadeInUp,
} from 'react-native-reanimated';

import { SafeAreaView } from 'react-native-safe-area-context';

import { CustomButton } from '@/components';
import { colors } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';

const SLIDES = [
  {
    icon: 'store-search',
    title: 'Discover Products',
    text: 'Browse categories, search, filter and find exactly what you need.',
  },
  {
    icon: 'credit-card-check',
    title: 'Pay Your Way',
    text: 'Pay securely with UPI, cards or net banking — or choose Cash on Delivery.',
  },
  {
    icon: 'truck-fast',
    title: 'Track Every Order',
    text: 'Follow your parcel from the warehouse to your door in real time.',
  },
] as const;

export default function OnboardingScreen() {
  const { width, height } = useWindowDimensions();
  const { finishOnboarding } = useAuth();

  const [index, setIndex] = useState(0);
  const [skipHovered, setSkipHovered] = useState(false);

  const list = useRef<FlatList<(typeof SLIDES)[number]>>(null);

  const iconScale = useRef(new RNAnimated.Value(1)).current;
  const buttonOpacity = useRef(new RNAnimated.Value(1)).current;

  const last = index === SLIDES.length - 1;

  const slideWidth = width;

  // Entrance animation
  const fadeAnim = useRef(new RNAnimated.Value(0)).current;
  const slideAnim = useRef(new RNAnimated.Value(20)).current;

  const next = () => {
    if (last) {
      finishOnboarding();
      return;
    }

    list.current?.scrollToIndex({
      index: index + 1,
      animated: true,
    });
  };

  const goToSlide = (slideIndex: number) => {
    list.current?.scrollToIndex({
      index: slideIndex,
      animated: true,
    });
  };

  useEffect(() => {
    RNAnimated.parallel([
      RNAnimated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),

      RNAnimated.spring(slideAnim, {
        toValue: 0,
        tension: 45,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();

    return () => {
      fadeAnim.stopAnimation();
      slideAnim.stopAnimation();
    };
  }, [fadeAnim, slideAnim]);

  // Icon hover animation for web
  const handleIconHoverIn = () => {
    if (width <= 0) return;

    RNAnimated.spring(iconScale, {
      toValue: 1.07,
      friction: 6,
      tension: 100,
      useNativeDriver: true,
    }).start();
  };

  const handleIconHoverOut = () => {
    RNAnimated.spring(iconScale, {
      toValue: 1,
      friction: 6,
      tension: 100,
      useNativeDriver: true,
    }).start();
  };

  // Skip hover
  const handleSkipHoverIn = () => {
    setSkipHovered(true);
  };

  const handleSkipHoverOut = () => {
    setSkipHovered(false);
  };

  const webIconHoverHandlers =
    typeof document !== 'undefined'
      ? {
          onMouseEnter: handleIconHoverIn,
          onMouseLeave: handleIconHoverOut,
        }
      : {};

  const webSkipHoverHandlers =
    typeof document !== 'undefined'
      ? {
          onMouseEnter: handleSkipHoverIn,
          onMouseLeave: handleSkipHoverOut,
        }
      : {};

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Top Header */}
      <View style={styles.header}>
        <View style={styles.brandContainer}>
          <Text style={styles.brandName}>VELORA</Text>
          <Text style={styles.brandTagline}>
            Everything You Love, In One Place.
          </Text>
        </View>

        {!last && (
          <Pressable
            {...(webSkipHoverHandlers as any)}
            onPress={finishOnboarding}
            hitSlop={12}
            style={[
              styles.skipButton,
              skipHovered && styles.skipButtonHovered,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Skip onboarding"
          >
            <Text style={styles.skipText}>Skip</Text>
          </Pressable>
        )}
      </View>

      {/* Slides */}
      <FlatList
        ref={list}
        data={SLIDES}
        keyExtractor={(item) => item.title}
        horizontal
        pagingEnabled
        bounces={false}
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        getItemLayout={(_, itemIndex) => ({
          length: slideWidth,
          offset: slideWidth * itemIndex,
          index: itemIndex,
        })}
        onMomentumScrollEnd={(event) => {
          const newIndex = Math.round(
            event.nativeEvent.contentOffset.x / slideWidth
          );

          setIndex(
            Math.max(0, Math.min(newIndex, SLIDES.length - 1))
          );
        }}
        onScrollToIndexFailed={(info) => {
          list.current?.scrollToOffset({
            offset: info.index * slideWidth,
            animated: true,
          });
        }}
        renderItem={({ item, index: slideIndex }) => (
          <View style={[styles.slide, { width: slideWidth }]}>
            <Animated.View
              entering={FadeInUp.delay(100).duration(700).springify()}
              style={[
                styles.illustrationContainer,
                {
                  maxWidth: Math.min(width * 0.72, 290),
                  maxHeight: Math.min(width * 0.72, 290),
                },
              ]}
            >
              {/* Background decoration */}
              <View style={styles.decorCircleOne} />
              <View style={styles.decorCircleTwo} />

              {/* Main Icon */}
              <RNAnimated.View
                {...(webIconHoverHandlers as any)}
                style={[
                  styles.iconCircle,
                  {
                    transform: [{ scale: iconScale }],
                  },
                ]}
              >
                <MaterialCommunityIcons
                  name={item.icon}
                  size={Math.min(width * 0.25, 105)}
                  color={colors.primary}
                />
              </RNAnimated.View>
            </Animated.View>

            {/* Slide Content */}
            <Animated.View
              entering={FadeInDown.delay(250).duration(700)}
              style={styles.contentContainer}
            >
              <View style={styles.stepBadge}>
                <Text style={styles.stepText}>
                  STEP {slideIndex + 1} OF {SLIDES.length}
                </Text>
              </View>

              <Text style={styles.slideTitle}>
                {item.title}
              </Text>

              <Text style={styles.slideDescription}>
                {item.text}
              </Text>
            </Animated.View>

            {/* Slide progress */}
            <View style={styles.progressTextContainer}>
              <Text style={styles.progressText}>
                {String(slideIndex + 1).padStart(2, '0')}
              </Text>

              <View style={styles.progressLine}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${((slideIndex + 1) / SLIDES.length) * 100}%`,
                    },
                  ]}
                />
              </View>

              <Text style={styles.totalSlides}>
                {String(SLIDES.length).padStart(2, '0')}
              </Text>
            </View>
          </View>
        )}
      />

      {/* Pagination Dots */}
      <View style={styles.pagination}>
        {SLIDES.map((slide, i) => (
          <Pressable
            key={slide.title}
            onPress={() => goToSlide(i)}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={`Go to slide ${i + 1}`}
          >
            <View
              style={[
                styles.dot,
                i === index && styles.activeDot,
              ]}
            />
          </Pressable>
        ))}
      </View>

      {/* Bottom Action */}
      <RNAnimated.View
        style={[
          styles.bottomContainer,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <CustomButton
          label={last ? 'Get Started' : 'Next'}
          onPress={next}
        />

        <Text style={styles.bottomHint}>
          {last
            ? 'Your shopping journey starts here.'
            : 'Swipe to explore more'}
        </Text>
      </RNAnimated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },

  header: {
    minHeight: 75,
    paddingHorizontal: 25,
    paddingTop: 12,
    paddingBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  brandContainer: {
    gap: 3,
  },

  brandName: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 3,
    color: colors.primaryDark,
  },

  brandTagline: {
    fontSize: 12,
    color: colors.muted,
    fontWeight: '500',
  },

  skipButton: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: colors.primarySoft,
  },

  skipButtonHovered: {
    backgroundColor: colors.primaryLight,
  },

  skipText: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.primary,
  },

  slide: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingVertical: 10,
  },

  illustrationContainer: {
    width: '100%',
    aspectRatio: 1,
    maxWidth: 290,
    maxHeight: 290,
    backgroundColor: colors.primarySoft,
    borderRadius: 150,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
    marginBottom: 32,

    shadowColor: colors.primaryDark,
    shadowOffset: {
      width: 0,
      height: 12,
    },
    shadowOpacity: 0.1,
    shadowRadius: 22,
    elevation: 5,
  },

  iconCircle: {
    width: '72%',
    height: '72%',
    borderRadius: 150,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    zIndex: 2,
  },

  decorCircleOne: {
    position: 'absolute',
    width: 75,
    height: 75,
    borderRadius: 50,
    backgroundColor: colors.primaryLight,
    top: 15,
    right: 20,
    opacity: 0.8,
  },

  decorCircleTwo: {
    position: 'absolute',
    width: 48,
    height: 48,
    borderRadius: 30,
    backgroundColor: colors.primary,
    bottom: 25,
    left: 20,
    opacity: 0.12,
  },

  contentContainer: {
    width: '100%',
    maxWidth: 500,
    alignItems: 'center',
    paddingHorizontal: 8,
  },

  stepBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.primarySoft,
    marginBottom: 16,
  },

  stepText: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1.5,
    color: colors.primary,
  },

  slideTitle: {
    fontSize: 31,
    fontWeight: '900',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 15,
  },

  slideDescription: {
    fontSize: 18,
    lineHeight: 29,
    fontWeight: '500',
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 440,
  },

  progressTextContainer: {
    width: '65%',
    maxWidth: 300,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 28,
  },

  progressText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '800',
  },

  totalSlides: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '700',
  },

  progressLine: {
    flex: 1,
    height: 5,
    borderRadius: 5,
    backgroundColor: colors.border,
    overflow: 'hidden',
  },

  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 5,
  },

  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 9,
    paddingVertical: 12,
  },

  dot: {
    width: 9,
    height: 9,
    borderRadius: 8,
    backgroundColor: colors.borderStrong,
  },

  activeDot: {
    width: 27,
    backgroundColor: colors.primary,
  },

  bottomContainer: {
    paddingHorizontal: 28,
    paddingTop: 14,
    paddingBottom: 20,
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
  },

  bottomHint: {
    fontSize: 14,
    color: colors.muted,
    textAlign: 'center',
    marginTop: 15,
    fontWeight: '500',
  },
});
