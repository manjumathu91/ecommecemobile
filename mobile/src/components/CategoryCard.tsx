

import React, { useEffect, useState } from 'react';

import {
  Pressable,
  Text,
  View,
  StyleSheet,
} from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';

import Animated, {
  FadeInRight,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import {
  colors,
  typography,
  radius,
  spacing,
  shadows,
  motion,
} from '@/constants/theme';

import type { Category } from '@/types';

// ======================================================
// PROPS
// ======================================================

interface Props {
  category: Category;
  onPress: () => void;
  index?: number;
}

// ======================================================
// VELORA PREMIUM CATEGORY CARD
// ======================================================

export default function CategoryCard({
  category,
  onPress,
  index = 0,
}: Props) {

  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);

  // ====================================================
  // ANIMATION VALUES
  // ====================================================

  const imageProgress = useSharedValue(0);
  const cardScale = useSharedValue(1);

  // ====================================================
  // IMAGE FADE + ZOOM
  // ====================================================

  const imageAnimatedStyle = useAnimatedStyle(() => ({
    opacity: imageProgress.value,

    transform: [
      {
        scale: 1.1 - imageProgress.value * 0.1,
      },
    ],
  }));

  // ====================================================
  // CARD PRESS ANIMATION
  // ====================================================

  const cardAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      {
        scale: cardScale.value,
      },
    ],
  }));

  // ====================================================
  // RESET IMAGE WHEN CATEGORY CHANGES
  // ====================================================

  useEffect(() => {
    setImageLoaded(false);
    setImageFailed(false);
    imageProgress.value = 0;
  }, [category.image, imageProgress]);

  // ====================================================
  // IMAGE LOADED
  // ====================================================

  const handleImageLoad = () => {
    setImageLoaded(true);

    imageProgress.value = withTiming(
      1,
      {
        duration: motion.duration.slow,
      },
    );
  };

  // ====================================================
  // IMAGE ERROR
  // ====================================================

  const handleImageError = () => {
    setImageFailed(true);
    setImageLoaded(false);
  };

  // ====================================================
  // PRESS ANIMATION
  // ====================================================

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

  // ====================================================
  // RENDER
  // ====================================================

  return (
    <Animated.View
      entering={FadeInRight
        .delay(Math.min(index, 8) * 65)
        .duration(motion.duration.smooth)}
      style={[
        styles.container,
        cardAnimatedStyle,
      ]}
    >

      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        accessibilityRole="button"
        accessibilityLabel={`Browse ${category.name} category`}
        style={styles.pressable}
      >

        {/* ==========================================
            CATEGORY IMAGE
        ========================================== */}

        <View style={styles.imageContainer}>

          {/* IMAGE PLACEHOLDER */}

          {(!imageLoaded || imageFailed || !category.image) && (
            <View
              pointerEvents="none"
              style={styles.imagePlaceholder}
            >
              <MaterialCommunityIcons
                name={
                  imageFailed
                    ? 'image-broken-variant'
                    : 'shape-outline'
                }
                size={32}
                color={colors.primary}
              />
            </View>
          )}

          {/* CATEGORY IMAGE */}

          {!!category.image && !imageFailed && (
            <Animated.Image
              source={{ uri: category.image }}
              style={[
                styles.categoryImage,
                imageAnimatedStyle,
              ]}
              resizeMode="cover"
              onLoad={handleImageLoad}
              onError={handleImageError}
              accessibilityLabel={category.name}
            />
          )}

        </View>

        {/* ==========================================
            CATEGORY NAME
        ========================================== */}

        <Text
          numberOfLines={2}
          style={styles.categoryName}
        >
          {category.name}
        </Text>

      </Pressable>

    </Animated.View>
  );
}

// ======================================================
// PREMIUM VELORA CATEGORY STYLES
// ======================================================

const styles = StyleSheet.create({

  container: {
    width: 92,
    marginRight: spacing.sm,
    alignItems: 'center',
  },

  pressable: {
    width: '100%',
    alignItems: 'center',
  },

  // Category image circle

  imageContainer: {
    width: 76,
    height: 76,
    borderRadius: radius.pill,
    backgroundColor: colors.primaryLight,
    borderWidth: 2,
    borderColor: colors.border,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    ...shadows.small,
  },

  // Image placeholder

  imagePlaceholder: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Actual category image

  categoryImage: {
    width: '100%',
    height: '100%',
  },

  // Category title

  categoryName: {
    color: colors.primaryDark,
    fontSize: typography.fontSize.sm,
    fontWeight: '700',
    lineHeight: typography.lineHeight.normal,
    textAlign: 'center',
    marginTop: spacing.sm,
    minHeight: 42,
    paddingHorizontal: 2,
  },

});
