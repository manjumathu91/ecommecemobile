

import React, { useEffect, useRef, useState } from 'react';

import {
  ActivityIndicator,
  Pressable,
  Text,
  View,
  StyleSheet,
} from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';

import Animated, {
  FadeInUp,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { MEDIA_FALLBACK } from '@/constants/config';

import {
  colors,
  radius,
  spacing,
  shadows,
  motion,
} from '@/constants/theme';

import { useWishlist } from '@/context/WishlistContext';
import { useCart } from '@/context/CartContext';

import type { ProductSummary } from '@/types';

import { formatINR } from '@/utils/format';

import RatingStars from './RatingStars';

interface Props {
  product: ProductSummary;
  onPress: () => void;
  index?: number;
  width?: number | `${number}%`;
}

export default function ProductCard({
  product: p,
  onPress,
  index = 0,
  width = '100%',
}: Props) {

  // Contexts
  const { has, toggle } = useWishlist();
  const { add } = useCart();

  const liked = has(p.id);

  // Image state
  const [imageUri, setImageUri] = useState(
    p.thumbnail || MEDIA_FALLBACK,
  );

  const [imageFailed, setImageFailed] = useState(false);

  // Cart state
  const [isAdding, setIsAdding] = useState(false);

  // Hover state
  const [isHovered, setIsHovered] = useState(false);

  // Animation values
  const imageProgress = useSharedValue(0);
  const cardScale = useSharedValue(1);
  const hoverProgress = useSharedValue(0);
  const heartScale = useSharedValue(1);

  const previousLiked = useRef(liked);

  // Image animation
  const imageAnimatedStyle = useAnimatedStyle(() => ({
    opacity: imageProgress.value,
    transform: [
      {
        scale: 1.08 - imageProgress.value * 0.08,
      },
    ],
  }));

  // Card hover and press animation
  const cardAnimatedStyle = useAnimatedStyle(() => {

    const hoverScale =
      1 + hoverProgress.value * 0.025;

    return {
      transform: [
        {
          translateY: -5 * hoverProgress.value,
        },
        {
          scale: cardScale.value * hoverScale,
        },
      ],
    };
  });

  // Wishlist heart animation
  const heartAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      {
        scale: heartScale.value,
      },
    ],
  }));

  // Reset image when product changes
  useEffect(() => {
    setImageUri(p.thumbnail || MEDIA_FALLBACK);
    setImageFailed(false);
    imageProgress.value = 0;
  }, [p.thumbnail, imageProgress]);

  // Wishlist animation
  useEffect(() => {

    if (previousLiked.current !== liked) {

      previousLiked.current = liked;

      heartScale.value = withSequence(
        withSpring(1.3, motion.spring.bouncy),
        withSpring(1, motion.spring.smooth),
      );
    }

  }, [liked, heartScale]);

  // Image loaded
  const handleImageLoad = () => {
    imageProgress.value = withTiming(1, {
      duration: motion.duration.slow,
    });
  };

  // Image error
  const handleImageError = () => {

    if (imageUri !== MEDIA_FALLBACK) {
      setImageUri(MEDIA_FALLBACK);
      imageProgress.value = 0;
      setImageFailed(false);
    } else {
      setImageFailed(true);
    }

  };

  // Wishlist action
  const handleWishlist = () => {
    toggle(p.id);
  };

  // Add to cart
  const handleAddToCart = async () => {

    if (!p.in_stock || isAdding) {
      return;
    }

    setIsAdding(true);

    try {
      await add(p.id, 1);
    } finally {
      setIsAdding(false);
    }
  };

  // Web hover in
  const handleHoverIn = () => {

    setIsHovered(true);

    hoverProgress.value = withSpring(
      1,
      motion.spring.gentle,
    );
  };

  // Web hover out
  const handleHoverOut = () => {

    setIsHovered(false);

    hoverProgress.value = withSpring(
      0,
      motion.spring.smooth,
    );
  };

  // Mobile press in
  const handlePressIn = () => {

    cardScale.value = withSpring(
      motion.pressScale,
      motion.spring.gentle,
    );
  };

  // Mobile press out
  const handlePressOut = () => {

    cardScale.value = withSpring(
      1,
      motion.spring.smooth,
    );
  };

  return (

    <Animated.View

      {...({
        onMouseEnter: handleHoverIn,
        onMouseLeave: handleHoverOut,
      } as any)}

      entering={FadeInUp
        .delay(Math.min(index, 8) * 65)
        .duration(motion.duration.smooth)}

      style={[
        {
          width,
          padding: 6,
        },
        isHovered ? shadows.medium : shadows.small,
        cardAnimatedStyle,
      ]}

    >

      <View
        style={[
          styles.card,
          isHovered && styles.cardHovered,
        ]}
      >

        {/* PRODUCT DETAILS PRESS AREA */}

        <Pressable

          onPress={onPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}

          accessibilityRole="button"
          accessibilityLabel={`View ${p.name}`}

          style={styles.productPressArea}

        >

          {/* PRODUCT IMAGE */}

          <View style={styles.imageContainer}>

            {!imageFailed && (
              <View
                pointerEvents="none"
                style={styles.imagePlaceholder}
              >
                <MaterialCommunityIcons
                  name="image-outline"
                  size={38}
                  color={colors.disabled}
                />
              </View>
            )}

            {imageFailed ? (

              <View style={styles.imagePlaceholder}>

                <MaterialCommunityIcons
                  name="image-broken-variant"
                  size={36}
                  color={colors.muted}
                />

                <Text style={styles.imageErrorText}>
                  Image unavailable
                </Text>

              </View>

            ) : (

              <Animated.Image
                source={{ uri: imageUri }}
                style={[
                  styles.productImage,
                  imageAnimatedStyle,
                ]}
                resizeMode="cover"
                onLoad={handleImageLoad}
                onError={handleImageError}
                accessibilityLabel={p.name}
              />

            )}

            {/* DISCOUNT BADGE */}

            {p.discount_percent > 0 && (
              <View style={styles.discountBadge}>
                <Text style={styles.discountText}>
                  {p.discount_percent}% OFF
                </Text>
              </View>
            )}

            {/* OUT OF STOCK */}

            {!p.in_stock && (
              <View style={styles.outOfStockOverlay}>
                <Text style={styles.outOfStockText}>
                  Out of Stock
                </Text>
              </View>
            )}

          </View>

          {/* PRODUCT INFORMATION */}

          <View style={styles.detailsContainer}>

            <Text
              numberOfLines={2}
              style={styles.productName}
            >
              {p.name}
            </Text>

            {/* RATING */}

            {p.review_count > 0 && (
              <View style={styles.ratingRow}>
                <RatingStars
                  value={Number(p.avg_rating)}
                  size={14}
                />

                <Text style={styles.reviewCount}>
                  ({p.review_count})
                </Text>
              </View>
            )}

            {/* PRICE */}

            <View style={styles.priceRow}>

              <Text style={styles.currentPrice}>
                {formatINR(p.effective_price)}
              </Text>

              {!!p.discount_price && (
                <Text style={styles.oldPrice}>
                  {formatINR(p.price)}
                </Text>
              )}

            </View>

            {/* LOW STOCK */}

            {p.is_low_stock && p.in_stock && (
              <Text style={styles.lowStock}>
                Only {p.stock} left
              </Text>
            )}

          </View>

        </Pressable>

        {/* WISHLIST BUTTON */}

        <Pressable
          onPress={handleWishlist}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={
            liked
              ? 'Remove from wishlist'
              : 'Add to wishlist'
          }
          style={({ pressed }) => [
            styles.wishlistButton,
            pressed && styles.wishlistPressed,
          ]}
        >

          <Animated.View style={heartAnimatedStyle}>

            <MaterialCommunityIcons
              name={liked ? 'heart' : 'heart-outline'}
              size={23}
              color={
                liked
                  ? colors.danger
                  : colors.primaryDark
              }
            />

          </Animated.View>

        </Pressable>

        {/* ADD TO CART BUTTON */}

        <View style={styles.addCartContainer}>

          <Pressable
            onPress={handleAddToCart}
            disabled={!p.in_stock || isAdding}
            accessibilityRole="button"
            accessibilityLabel={
              !p.in_stock
                ? 'Product out of stock'
                : 'Add product to cart'
            }
            style={({ pressed }) => [
              styles.addCartButton,

              !p.in_stock && styles.addCartDisabled,

              pressed &&
                p.in_stock &&
                !isAdding &&
                styles.addCartPressed,
            ]}
          >

            {isAdding ? (

              <ActivityIndicator
                size="small"
                color={colors.white}
              />

            ) : (

              <MaterialCommunityIcons
                name={
                  p.in_stock
                    ? 'cart-plus'
                    : 'cart-off'
                }
                size={21}
                color={
                  p.in_stock
                    ? colors.white
                    : colors.muted
                }
              />

            )}

            <Text
              style={[
                styles.addCartText,
                !p.in_stock && styles.addCartDisabledText,
              ]}
            >
              {isAdding
                ? 'Adding...'
                : p.in_stock
                  ? 'Add to Cart'
                  : 'Out of Stock'}
            </Text>

          </Pressable>

        </View>

      </View>

    </Animated.View>

  );
}

// PRODUCT CARD STYLES

const styles = StyleSheet.create({

  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },

  cardHovered: {
    borderColor: colors.primary,
  },

  productPressArea: {
    backgroundColor: colors.card,
  },

  // IMAGE

  imageContainer: {
    width: '100%',
    height: 165,
    backgroundColor: colors.surfaceSoft,
    overflow: 'hidden',
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },

  imagePlaceholder: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceSoft,
  },

  productImage: {
    width: '100%',
    height: '100%',
  },

  imageErrorText: {
    color: colors.muted,
    fontSize: 14,
    marginTop: spacing.xs,
  },

  // DISCOUNT

  discountBadge: {
    position: 'absolute',
    top: 9,
    left: 9,
    backgroundColor: colors.danger,
    borderRadius: radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },

  discountText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '800',
  },

  // WISHLIST

  wishlistButton: {
    position: 'absolute',
    top: 9,
    right: 9,
    zIndex: 5,
    backgroundColor: colors.white,
    borderRadius: radius.pill,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primaryDark,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.12,
    shadowRadius: 5,
    elevation: 4,
  },

  wishlistPressed: {
    backgroundColor: colors.primaryLight,
    transform: [{ scale: 0.92 }],
  },

  // OUT OF STOCK

  outOfStockOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(6, 78, 59, 0.82)',
    paddingVertical: 8,
  },

  outOfStockText: {
    color: colors.white,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '700',
  },

  // DETAILS

  detailsContainer: {
    padding: spacing.md,
    backgroundColor: colors.card,
  },

  productName: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 25,
    minHeight: 50,
  },

  // RATING

  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
  },

  reviewCount: {
    color: colors.muted,
    fontSize: 14,
    marginLeft: 5,
  },

  // PRICE

  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexWrap: 'wrap',
    marginTop: spacing.sm,
    gap: 6,
  },

  currentPrice: {
    color: colors.primaryDark,
    fontSize: 21,
    fontWeight: '800',
  },

  oldPrice: {
    color: colors.muted,
    textDecorationLine: 'line-through',
    fontSize: 15,
  },

  // STOCK

  lowStock: {
    color: colors.warning,
    fontSize: 15,
    fontWeight: '600',
    marginTop: spacing.xs,
  },

  // ADD TO CART

  addCartContainer: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    paddingTop: spacing.xs,
  },

  addCartButton: {
    minHeight: 46,
    width: '100%',
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    paddingHorizontal: 12,
  },

  addCartDisabled: {
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.border,
  },

  addCartPressed: {
    backgroundColor: colors.primaryDark,
    transform: [{ scale: 0.97 }],
  },

  addCartText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '800',
  },

  addCartDisabledText: {
    color: colors.muted,
  },

});
