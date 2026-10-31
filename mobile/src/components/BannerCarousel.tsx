

import React, { useEffect, useState } from 'react';

import {
  FlatList,
  Pressable,
  Text,
  View,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';

import Animated, {
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { MaterialCommunityIcons } from '@expo/vector-icons';

import {
  colors,
  typography,
  radius,
  spacing,
  shadows,
  motion,
} from '@/constants/theme';

import { MEDIA_FALLBACK } from '@/constants/config';

import type { Banner } from '@/types';

// ======================================================
// BANNER SLIDE PROPS
// ======================================================

interface BannerSlideProps {
  banner: Banner;
  width: number;
  index: number;
  onPress: () => void;
}

// ======================================================
// VELORA ANIMATED BANNER SLIDE
// ======================================================

function BannerSlide({
  banner,
  width,
  index,
  onPress,
}: BannerSlideProps) {

  const [imageUri, setImageUri] = useState(
    banner.image || MEDIA_FALLBACK,
  );

  const [imageFailed, setImageFailed] = useState(false);

  const imageProgress = useSharedValue(0);

  const cardScale = useSharedValue(1);

  // ----------------------------------------------------
  // IMAGE FADE + ZOOM
  // ----------------------------------------------------

  const imageAnimatedStyle = useAnimatedStyle(() => ({
    opacity: imageProgress.value,

    transform: [
      {
        scale: 1.06 - imageProgress.value * 0.06,
      },
    ],
  }));

  // ----------------------------------------------------
  // CARD PRESS ANIMATION
  // ----------------------------------------------------

  const cardAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      {
        scale: cardScale.value,
      },
    ],
  }));

  // ----------------------------------------------------
  // RESET IMAGE WHEN BANNER CHANGES
  // ----------------------------------------------------

  useEffect(() => {
    setImageUri(banner.image || MEDIA_FALLBACK);
    setImageFailed(false);
    imageProgress.value = 0;
  }, [banner.image, imageProgress]);

  // ----------------------------------------------------
  // IMAGE LOADED
  // ----------------------------------------------------

  const handleImageLoad = () => {
    imageProgress.value = withTiming(
      1,
      {
        duration: motion.duration.smooth,
      },
    );
  };

  // ----------------------------------------------------
  // IMAGE ERROR
  // ----------------------------------------------------

  const handleImageError = () => {
    if (imageUri !== MEDIA_FALLBACK) {
      setImageUri(MEDIA_FALLBACK);
      imageProgress.value = 0;
      setImageFailed(false);
    } else {
      setImageFailed(true);
    }
  };

  // ----------------------------------------------------
  // PRESS ANIMATION
  // ----------------------------------------------------

  const handlePressIn = () => {
    cardScale.value = withSpring(
      motion.pressScale,
      motion.spring.gentle,
    );
  };

  const handlePressOut = () => {
    cardScale.value = withSpring(
      1,
      motion.spring.smooth,
    );
  };

  // ----------------------------------------------------
  // RENDER
  // ----------------------------------------------------

  return (
    <Animated.View
      entering={FadeInDown
        .delay(Math.min(index, 4) * 70)
        .duration(motion.duration.smooth)}
      style={[
        {
          width,
          paddingHorizontal: spacing.lg,
        },
        shadows.medium,
        cardAnimatedStyle,
      ]}
    >

      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        accessibilityRole="button"
        accessibilityLabel={
          `Open banner ${banner.title}`
        }
        style={styles.bannerCard}
      >

        {/* ==========================================
            BANNER IMAGE
        ========================================== */}

        <View style={styles.imageContainer}>

          {/* IMAGE PLACEHOLDER */}

          {!imageFailed && (
            <View
              pointerEvents="none"
              style={styles.imagePlaceholder}
            >
              <MaterialCommunityIcons
                name="image-outline"
                size={40}
                color={colors.primary}
              />
            </View>
          )}

          {/* ACTUAL IMAGE */}

          {imageFailed ? (

            <View style={styles.imagePlaceholder}>
              <MaterialCommunityIcons
                name="image-broken-variant"
                size={35}
                color={colors.muted}
              />

              <Text style={styles.errorText}>
                Image unavailable
              </Text>
            </View>

          ) : (

            <Animated.Image
              source={{ uri: imageUri }}
              style={[
                styles.bannerImage,
                imageAnimatedStyle,
              ]}
              resizeMode="cover"
              onLoad={handleImageLoad}
              onError={handleImageError}
              accessibilityLabel={banner.title}
            />

          )}

          {/* ========================================
              TITLE OVERLAY
          ======================================== */}

          {!!banner.title && (
            <View style={styles.titleOverlay}>
              <Text
                numberOfLines={2}
                style={styles.bannerTitle}
              >
                {banner.title}
              </Text>
            </View>
          )}

        </View>

      </Pressable>

    </Animated.View>
  );
}

// ======================================================
// ANIMATED PAGINATION DOT
// ======================================================

function PaginationDot({
  active,
}: {
  active: boolean;
}) {

  const progress = useSharedValue(active ? 1 : 0);

  const dotAnimatedStyle = useAnimatedStyle(() => ({
    width: 7 + progress.value * 17,
    opacity: 0.55 + progress.value * 0.45,
  }));

  useEffect(() => {
    progress.value = withTiming(
      active ? 1 : 0,
      {
        duration: motion.duration.normal,
      },
    );
  }, [active, progress]);

  return (
    <Animated.View
      style={[
        styles.dot,
        {
          backgroundColor: active
            ? colors.primary
            : colors.borderStrong,
        },
        dotAnimatedStyle,
      ]}
    />
  );
}

// ======================================================
// VELORA PREMIUM BANNER CAROUSEL
// ======================================================

export default function BannerCarousel({
  banners,
  onPress,
}: {
  banners: Banner[];
  onPress: (banner: Banner) => void;
}) {

  const { width } = useWindowDimensions();

  const ref = React.useRef<FlatList<Banner>>(null);

  const [index, setIndex] = useState(0);

  const indexRef = React.useRef(0);

  // ----------------------------------------------------
  // RESET INDEX WHEN BANNER LIST CHANGES
  // ----------------------------------------------------

  useEffect(() => {
    if (index >= banners.length) {
      indexRef.current = 0;
      setIndex(0);

      ref.current?.scrollToOffset({
        offset: 0,
        animated: false,
      });
    }
  }, [banners.length, index]);

  // ----------------------------------------------------
  // AUTO SLIDE — EVERY 4 SECONDS
  // ----------------------------------------------------

  useEffect(() => {
    if (banners.length < 2 || width <= 0) {
      return undefined;
    }

    const timer = setInterval(() => {

      const nextIndex =
        (indexRef.current + 1) % banners.length;

      indexRef.current = nextIndex;

      setIndex(nextIndex);

      ref.current?.scrollToOffset({
        offset: nextIndex * width,
        animated: true,
      });

    }, 4000);

    return () => clearInterval(timer);

  }, [banners.length, width]);

  // ----------------------------------------------------
  // MANUAL SWIPE
  // ----------------------------------------------------

  const handleScrollEnd = (
    event: {
      nativeEvent: {
        contentOffset: {
          x: number;
        };
      };
    },
  ) => {

    const nextIndex = Math.max(
      0,
      Math.min(
        banners.length - 1,
        Math.round(
          event.nativeEvent.contentOffset.x / width,
        ),
      ),
    );

    indexRef.current = nextIndex;

    setIndex(nextIndex);
  };

  // ----------------------------------------------------
  // NO BANNERS
  // ----------------------------------------------------

  if (!banners.length) return null;

  // ----------------------------------------------------
  // RENDER
  // ----------------------------------------------------

  return (
    <View style={styles.container}>

      {/* ============================================
          BANNER LIST
      ============================================ */}

      <FlatList
        ref={ref}
        data={banners}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(banner) => String(banner.id)}
        onMomentumScrollEnd={handleScrollEnd}
        getItemLayout={(_, i) => ({
          length: width,
          offset: width * i,
          index: i,
        })}
        removeClippedSubviews={false}
        renderItem={({ item, index: itemIndex }) => (
          <BannerSlide
            banner={item}
            width={width}
            index={itemIndex}
            onPress={() => onPress(item)}
          />
        )}
      />

      {/* ============================================
          ANIMATED PAGINATION DOTS
      ============================================ */}

      {banners.length > 1 && (
        <View style={styles.pagination}>

          {banners.map((banner, i) => (
            <PaginationDot
              key={banner.id}
              active={i === index}
            />
          ))}

        </View>
      )}

    </View>
  );
}

// ======================================================
// PREMIUM BANNER STYLES
// ======================================================

const styles = StyleSheet.create({

  container: {
    width: '100%',
    marginTop: spacing.sm,
  },

  bannerCard: {
    width: '100%',
    height: 190,
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: colors.primaryLight,
  },

  imageContainer: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: colors.surfaceSoft,
  },

  imagePlaceholder: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.surfaceSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },

  bannerImage: {
    width: '100%',
    height: '100%',
  },

  // Banner title

  titleOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: 'rgba(6, 78, 59, 0.78)',
  },

  bannerTitle: {
    color: colors.white,
    fontSize: typography.fontSize.lg,
    fontWeight: '800',
    lineHeight: typography.lineHeight.relaxed,
  },

  errorText: {
    color: colors.muted,
    fontSize: typography.fontSize.xs,
    marginTop: spacing.xs,
  },

  // Pagination

  pagination: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
    gap: 5,
  },

  dot: {
    height: 7,
    borderRadius: radius.pill,
  },

});
