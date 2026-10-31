

import React, { useEffect, useRef, useState } from 'react';

import {
  FlatList,
  Pressable,
  ScrollView,
  Text,
  View,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';

import {
  Dialog,
  List,
  Portal,
  TextInput,
} from 'react-native-paper';

import Animated, {
  FadeIn,
  FadeInDown,
  FadeInRight,
  ZoomIn,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import type {
  NativeStackScreenProps,
} from '@react-navigation/native-stack';

import { catalogApi } from '@/api/services';

import {
  CustomButton,
  ErrorMessage,
  LoadingIndicator,
  ProductCard,
  QuantityStepper,
  RatingStars,
  SectionHeader,
} from '@/components';

import { MEDIA_FALLBACK } from '@/constants/config';

import {
  colors,
  typography,
  spacing,
  radius,
  shadows,
  motion,
} from '@/constants/theme';

import { useCart } from '@/context/CartContext';
import { useToast } from '@/context/ToastContext';
import { useWishlist } from '@/context/WishlistContext';

import { useFetch } from '@/hooks/useFetch';

import type {
  RootStackParamList,
} from '@/navigation/types';

import { errorMessage } from '@/utils/forms';

import {
  formatDate,
  formatINR,
} from '@/utils/format';

import { recentlyViewed } from '@/utils/storage';

// ======================================================
// ANIMATED PRODUCT GALLERY IMAGE
// ======================================================

function GalleryImage({
  uri,
  title,
  width,
  height,
}: {
  uri: string;
  title: string;
  width: number;
  height: number;
}) {

  const [imageUri, setImageUri] = useState(
    uri || MEDIA_FALLBACK,
  );

  const [imageFailed, setImageFailed] = useState(false);

  const progress = useSharedValue(0);

  const imageStyle = useAnimatedStyle(() => ({
    opacity: progress.value,

    transform: [
      {
        scale: 1.07 - progress.value * 0.07,
      },
    ],
  }));

  useEffect(() => {
    setImageUri(uri || MEDIA_FALLBACK);
    setImageFailed(false);
    progress.value = 0;
  }, [uri, progress]);

  const handleLoad = () => {
    progress.value = withTiming(
      1,
      {
        duration: motion.duration.smooth,
      },
    );
  };

  const handleError = () => {
    if (imageUri !== MEDIA_FALLBACK) {
      setImageUri(MEDIA_FALLBACK);
      progress.value = 0;
    } else {
      setImageFailed(true);
    }
  };

  return (
    <Animated.View
      entering={FadeIn.duration(350)}
      style={[
        styles.gallerySlide,
        {
          width,
          height,
        },
      ]}
    >

      {/* Image placeholder */}

      {!imageFailed && (
        <View style={styles.galleryPlaceholder}>
          <MaterialCommunityIcons
            name="image-outline"
            size={46}
            color={colors.disabled}
          />
        </View>
      )}

      {imageFailed ? (

        <View style={styles.galleryPlaceholder}>
          <MaterialCommunityIcons
            name="image-broken-variant"
            size={40}
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
            styles.galleryImage,
            imageStyle,
          ]}
          resizeMode="contain"
          onLoad={handleLoad}
          onError={handleError}
          accessibilityLabel={title}
        />

      )}

    </Animated.View>
  );
}

// ======================================================
// ANIMATED GALLERY DOT
// ======================================================

function GalleryDot({
  active,
}: {
  active: boolean;
}) {

  const progress = useSharedValue(active ? 1 : 0);

  const animatedStyle = useAnimatedStyle(() => ({
    width: 8 + progress.value * 18,
    opacity: 0.55 + progress.value * 0.45,
  }));

  useEffect(() => {
    progress.value = withTiming(
      active ? 1 : 0,
      { duration: motion.duration.normal },
    );
  }, [active, progress]);

  return (
    <Animated.View
      style={[
        styles.galleryDot,
        {
          backgroundColor: active
            ? colors.primary
            : colors.borderStrong,
        },
        animatedStyle,
      ]}
    />
  );
}

// ======================================================
// VELORA PRODUCT DETAIL SCREEN
// ======================================================

export default function ProductDetailScreen({
  route,
  navigation,
}: NativeStackScreenProps<
  RootStackParamList,
  'ProductDetail'
>) {

  const { id } = route.params;

  const { width } = useWindowDimensions();

  const toast = useToast();

  const { add } = useCart();

  const { has, toggle } = useWishlist();

  // ====================================================
  // API
  // ====================================================

  const product = useFetch(
    () => catalogApi.product(id),
    [id],
  );

  const reviews = useFetch(
    () => catalogApi.reviews(id),
    [id],
  );

  // ====================================================
  // STATE
  // ====================================================

  const [qty, setQty] = useState(1);

  const [adding, setAdding] = useState(false);

  const [imgIndex, setImgIndex] = useState(0);

  const [reviewOpen, setReviewOpen] = useState(false);

  const [rating, setRating] = useState(5);

  const [comment, setComment] = useState('');

  const [saving, setSaving] = useState(false);

  const [descriptionOpen, setDescriptionOpen] = useState(true);

  const [reviewsOpen, setReviewsOpen] = useState(false);

  // ====================================================
  // ANIMATION VALUES
  // ====================================================

  const heartScale = useSharedValue(1);

  const buttonScale = useSharedValue(1);

  const previousLiked = useRef(false);

  const liked = product.data
    ? has(product.data.id)
    : false;

  const heartStyle = useAnimatedStyle(() => ({
    transform: [{ scale: heartScale.value }],
  }));

  const buttonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  // ====================================================
  // PRODUCT DATA
  // ====================================================

  const p = product.data;

  // ====================================================
  // RECENTLY VIEWED
  // ====================================================

  useEffect(() => {
    if (!p) return;

    const {
  related,
  description,
  ...summary
} = p;

recentlyViewed.add({
  ...summary,
  thumbnail:
    p.thumbnail ||
    p.images?.[0]?.image ||
    MEDIA_FALLBACK,
});
    
    setQty(1);
    setImgIndex(0);
  }, [p?.id]);

  // ====================================================
  // WISHLIST ANIMATION
  // ====================================================

  useEffect(() => {
    if (previousLiked.current !== liked) {

      previousLiked.current = liked;

      heartScale.value = withSequence(
        withSpring(1.35, motion.spring.bouncy),
        withSpring(1, motion.spring.smooth),
      );
    }
  }, [liked, heartScale]);

  // ====================================================
  // LOADING
  // ====================================================

  if (product.loading) {
    return <LoadingIndicator />;
  }

  // ====================================================
  // ERROR
  // ====================================================

  if (product.error || !p) {
    return (
      <ErrorMessage
        message={
          product.error ?? 'Product not found'
        }
        onRetry={product.reload}
      />
    );
  }

  // ====================================================
  // PRODUCT IMAGES
  // ====================================================

  const images = p.images.length
    ? p.images.map((image) => image.image)
    : [p.thumbnail ?? MEDIA_FALLBACK];

  const galleryHeight = Math.min(
    width * 0.95,
    410,
  );

  // ====================================================
  // ADD TO CART
  // ====================================================

  const addToCart = async () => {

    if (!p.in_stock || adding) return;

    setAdding(true);

    try {

      await add(p.id, qty);

      toast.show(
        'Product added to cart!',
        'success',
      );

    } catch (e) {

      toast.show(
        errorMessage(e, 'Could not add product to cart'),
        'error',
      );

    } finally {

      setAdding(false);

    }
  };

  // ====================================================
  // SUBMIT REVIEW
  // ====================================================

  const submitReview = async () => {

    setSaving(true);

    try {

      await catalogApi.saveReview(
        p.id,
        rating,
        comment.trim(),
      );

      toast.show(
        'Thanks for your review!',
        'success',
      );

      setReviewOpen(false);

      setComment('');
      setRating(5);

      reviews.reload();
      product.refresh();

    } catch (e) {

      toast.show(
        errorMessage(e),
        'error',
      );

    } finally {

      setSaving(false);

    }
  };

  // ====================================================
  // WISHLIST ACTION
  // ====================================================

  const handleWishlist = () => {
    toggle(p.id);
  };

  // ====================================================
  // GALLERY INDEX
  // ====================================================

  const handleGalleryScroll = (
    event: {
      nativeEvent: {
        contentOffset: {
          x: number;
        };
      };
    },
  ) => {

    const newIndex = Math.round(
      event.nativeEvent.contentOffset.x / width,
    );

    setImgIndex(
      Math.max(0, Math.min(images.length - 1, newIndex)),
    );
  };

  // ====================================================
  // UI
  // ====================================================

  return (

    <View style={styles.container}>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: spacing.lg,
        }}
      >

        {/* ============================================
            PRODUCT IMAGE GALLERY
        ============================================ */}

        <View style={styles.galleryContainer}>

          <FlatList
            data={images}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            keyExtractor={(uri, index) =>
              `${index}-${uri}`
            }
            onMomentumScrollEnd={handleGalleryScroll}
            getItemLayout={(_, index) => ({
              length: width,
              offset: width * index,
              index,
            })}
            renderItem={({ item }) => (
              <GalleryImage
                uri={item}
                title={p.name}
                width={width}
                height={galleryHeight}
              />
            )}
          />

          {/* Gallery image count */}

          {images.length > 1 && (
            <View style={styles.imageCount}>
              <MaterialCommunityIcons
                name="image-multiple-outline"
                size={15}
                color={colors.white}
              />

              <Text style={styles.imageCountText}>
                {imgIndex + 1}/{images.length}
              </Text>
            </View>
          )}

          {/* Wishlist button */}

          <Pressable
            onPress={handleWishlist}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={
              liked
                ? 'Remove from wishlist'
                : 'Add to wishlist'
            }
            style={styles.wishlistButton}
          >

            <Animated.View style={heartStyle}>

              <MaterialCommunityIcons
                name={
                  liked ? 'heart' : 'heart-outline'
                }
                size={27}
                color={
                  liked
                    ? colors.danger
                    : colors.primaryDark
                }
              />

            </Animated.View>

          </Pressable>

          {/* Pagination */}

          {images.length > 1 && (
            <View style={styles.pagination}>
              {images.map((image, index) => (
                <GalleryDot
                  key={`${index}-${image}`}
                  active={index === imgIndex}
                />
              ))}
            </View>
          )}

          {/* Discount badge */}

          {p.discount_percent > 0 && (
            <Animated.View
              entering={ZoomIn.duration(350)}
              style={styles.galleryDiscount}
            >
              <Text style={styles.galleryDiscountText}>
                {p.discount_percent}% OFF
              </Text>
            </Animated.View>
          )}

        </View>

        {/* ============================================
            PRODUCT INFORMATION
        ============================================ */}

        <Animated.View
          entering={FadeInDown.delay(100).duration(450)}
          style={styles.productInfo}
        >

          {/* Category */}

          <Text style={styles.categoryName}>
            {p.category_name}
          </Text>

          {/* Product name */}

          <Text style={styles.productName}>
            {p.name}
          </Text>

          {/* Rating */}

          <View style={styles.ratingRow}>

            <RatingStars
              value={Number(p.avg_rating)}
              size={19}
            />

            <Text style={styles.ratingText}>
              {p.review_count > 0
                ? `${Number(p.avg_rating).toFixed(1)} (${p.review_count} reviews)`
                : 'No reviews yet'}
            </Text>

          </View>

          {/* Price */}

          <View style={styles.priceRow}>

            <Text style={styles.currentPrice}>
              {formatINR(p.effective_price)}
            </Text>

            {!!p.discount_price && (
              <>
                <Text style={styles.oldPrice}>
                  {formatINR(p.price)}
                </Text>

                <View style={styles.savingsBadge}>
                  <Text style={styles.savingsText}>
                    Save {p.discount_percent}%
                  </Text>
                </View>
              </>
            )}

          </View>

          {/* Stock Status */}

          <View
            style={[
              styles.stockBadge,
              {
                backgroundColor: !p.in_stock
                  ? colors.dangerLight
                  : p.is_low_stock
                    ? colors.warningLight
                    : colors.successLight,
              },
            ]}
          >

            <MaterialCommunityIcons
              name={
                !p.in_stock
                  ? 'close-circle'
                  : 'check-circle'
              }
              size={19}
              color={
                !p.in_stock
                  ? colors.danger
                  : p.is_low_stock
                    ? colors.warning
                    : colors.success
              }
            />

            <Text
              style={[
                styles.stockText,
                {
                  color: !p.in_stock
                    ? colors.danger
                    : p.is_low_stock
                      ? colors.warning
                      : colors.success,
                },
              ]}
            >
              {!p.in_stock
                ? 'Out of Stock'
                : p.is_low_stock
                  ? `Only ${p.stock} left in stock`
                  : 'In Stock'}
            </Text>

          </View>

        </Animated.View>

        {/* ============================================
            DESCRIPTION
        ============================================ */}

        <Animated.View
          entering={FadeInDown.delay(200).duration(450)}
          style={styles.accordionContainer}
        >

          <List.Accordion
            title="Product Description"
            titleStyle={styles.accordionTitle}
            titleNumberOfLines={2}
            expanded={descriptionOpen}
            onPress={() =>
              setDescriptionOpen(!descriptionOpen)
            }
            left={() => (
              <List.Icon
                icon="text-box-outline"
                color={colors.primary}
              />
            )}
            style={styles.accordion}
          >

            <Text style={styles.descriptionText}>
              {p.description || 'No description provided.'}
            </Text>

          </List.Accordion>

        </Animated.View>

        {/* ============================================
            CUSTOMER REVIEWS
        ============================================ */}

        <Animated.View
          entering={FadeInDown.delay(300).duration(450)}
          style={styles.accordionContainer}
        >

          <List.Accordion
            title={`Customer Reviews (${p.review_count})`}
            titleStyle={styles.accordionTitle}
            expanded={reviewsOpen}
            onPress={() =>
              setReviewsOpen(!reviewsOpen)
            }
            left={() => (
              <List.Icon
                icon="star-outline"
                color={colors.primary}
              />
            )}
            style={styles.accordion}
          >

            <View style={styles.reviewsContent}>

              {reviews.data?.results.length ? (

                reviews.data.results.map((review) => (

                  <View
                    key={review.id}
                    style={styles.reviewItem}
                  >

                    <View style={styles.reviewHeader}>

                      <Text style={styles.reviewerName}>
                        {review.user_name}
                      </Text>

                      <Text style={styles.reviewDate}>
                        {formatDate(review.created_at)}
                      </Text>

                    </View>

                    <RatingStars
                      value={review.rating}
                      size={16}
                    />

                    {!!review.comment && (
                      <Text style={styles.reviewComment}>
                        {review.comment}
                      </Text>
                    )}

                  </View>

                ))

              ) : (

                <Text style={styles.noReviews}>
                  Be the first to review this product.
                </Text>

              )}

              <CustomButton
                label="Write a Review"
                mode="outlined"
                icon="star-outline"
                onPress={() => setReviewOpen(true)}
                style={{
                  marginTop: spacing.md,
                }}
              />

            </View>

          </List.Accordion>

        </Animated.View>

        {/* ============================================
            RELATED PRODUCTS
        ============================================ */}

        {p.related.length > 0 && (

          <Animated.View
            entering={FadeInDown.delay(400).duration(450)}
            style={styles.relatedContainer}
          >

            <SectionHeader
              title="You May Also Like"
            />

            <FlatList
              horizontal
              data={p.related}
              keyExtractor={(item) => String(item.id)}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{
                paddingHorizontal: spacing.sm,
              }}
              renderItem={({ item, index }) => (
                <ProductCard
                  product={item}
                  width={176}
                  index={index}
                  onPress={() =>
                    navigation.push('ProductDetail', {
                      id: item.id,
                    })
                  }
                />
              )}
            />

          </Animated.View>

        )}

      </ScrollView>

      {/* ==============================================
          STICKY BOTTOM ADD TO CART
      ============================================== */}

      <View style={styles.bottomBar}>

        {p.in_stock && (

          <View style={styles.quantityContainer}>

            <QuantityStepper
              value={qty}
              max={p.stock}
              onChange={setQty}
            />

          </View>

        )}

        <Animated.View
          style={[
            styles.addButtonContainer,
            buttonStyle,
          ]}
        >

          <CustomButton
            label={
              p.in_stock
                ? 'Add to Cart'
                : 'Out of Stock'
            }
            icon="cart-plus"
            onPress={addToCart}
            loading={adding}
            disabled={!p.in_stock || adding}
            style={styles.addButton}
          />

        </Animated.View>

      </View>

      {/* ==============================================
          REVIEW DIALOG
      ============================================== */}

      <Portal>

        <Dialog
          visible={reviewOpen}
          onDismiss={() => setReviewOpen(false)}
          style={styles.reviewDialog}
        >

          <Dialog.Title style={styles.dialogTitle}>
            Rate This Product
          </Dialog.Title>

          <Dialog.Content>

            <Text style={styles.dialogSubtitle}>
              Share your shopping experience with us.
            </Text>

            <View style={styles.ratingInput}>
              <RatingStars
                value={rating}
                size={36}
                onChange={setRating}
              />
            </View>

            <TextInput
              mode="outlined"
              label="Your Review (Optional)"
              value={comment}
              onChangeText={setComment}
              multiline
              maxLength={1000}
              outlineColor={colors.border}
              activeOutlineColor={colors.primary}
              textColor={colors.text}
              style={styles.reviewInput}
            />

          </Dialog.Content>

          <Dialog.Actions style={styles.dialogActions}>

            <CustomButton
              label="Cancel"
              mode="text"
              onPress={() => setReviewOpen(false)}
            />

            <CustomButton
              label="Submit Review"
              onPress={submitReview}
              loading={saving}
              disabled={saving}
            />

          </Dialog.Actions>

        </Dialog>

      </Portal>

    </View>
  );
}

// ======================================================
// VELORA PREMIUM PRODUCT DETAIL STYLES
// ======================================================

const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },

  // Product gallery

  galleryContainer: {
    position: 'relative',
    backgroundColor: colors.surfaceSoft,
  },

  gallerySlide: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceSoft,
    overflow: 'hidden',
  },

  galleryPlaceholder: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceSoft,
  },

  galleryImage: {
    width: '100%',
    height: '100%',
  },

  imageErrorText: {
    fontSize: typography.fontSize.sm,
    color: colors.muted,
    marginTop: spacing.sm,
  },

  // Image counter

  imageCount: {
    position: 'absolute',
    left: spacing.lg,
    top: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(6, 78, 59, 0.8)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
  },

  imageCountText: {
    color: colors.white,
    fontSize: typography.fontSize.xs,
    fontWeight: '700',
  },

  // Wishlist

  wishlistButton: {
    position: 'absolute',
    top: spacing.lg,
    right: spacing.lg,
    width: 48,
    height: 48,
    borderRadius: radius.pill,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.medium,
  },

  // Pagination

  pagination: {
    position: 'absolute',
    bottom: spacing.lg,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },

  galleryDot: {
    height: 8,
    borderRadius: radius.pill,
  },

  // Discount

  galleryDiscount: {
    position: 'absolute',
    bottom: spacing.lg,
    left: spacing.lg,
    backgroundColor: colors.danger,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },

  galleryDiscountText: {
    color: colors.white,
    fontSize: typography.fontSize.sm,
    fontWeight: '800',
  },

  // Product information

  productInfo: {
    padding: spacing.lg,
    backgroundColor: colors.card,
    marginBottom: spacing.sm,
  },

  categoryName: {
    color: colors.secondary,
    fontSize: typography.fontSize.sm,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },

  productName: {
    color: colors.primaryDark,
    fontSize: typography.fontSize.xxl,
    lineHeight: typography.lineHeight.heading,
    fontWeight: '800',
    marginTop: spacing.xs,
  },

  // Rating

  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginTop: spacing.md,
    gap: spacing.sm,
  },

  ratingText: {
    color: colors.muted,
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
  },

  // Price

  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginTop: spacing.lg,
    gap: spacing.sm,
  },

  currentPrice: {
    color: colors.primaryDark,
    fontSize: 29,
    fontWeight: '800',
  },

  oldPrice: {
    color: colors.muted,
    fontSize: typography.fontSize.md,
    textDecorationLine: 'line-through',
  },

  savingsBadge: {
    backgroundColor: colors.successLight,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
  },

  savingsText: {
    color: colors.success,
    fontSize: typography.fontSize.xs,
    fontWeight: '800',
  },

  // Stock

  stockBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
  },

  stockText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '700',
  },

  // Accordions

  accordionContainer: {
    backgroundColor: colors.card,
    marginBottom: spacing.sm,
  },

  accordion: {
    backgroundColor: colors.card,
  },

  accordionTitle: {
    color: colors.primaryDark,
    fontSize: typography.fontSize.lg,
    fontWeight: '700',
  },

  descriptionText: {
    color: colors.textSecondary,
    fontSize: typography.fontSize.md,
    lineHeight: typography.lineHeight.relaxed,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },

  // Reviews

  reviewsContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },

  reviewItem: {
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.sm,
  },

  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },

  reviewerName: {
    flex: 1,
    color: colors.text,
    fontSize: typography.fontSize.md,
    fontWeight: '700',
  },

  reviewDate: {
    color: colors.muted,
    fontSize: typography.fontSize.xs,
  },

  reviewComment: {
    color: colors.textSecondary,
    fontSize: typography.fontSize.md,
    lineHeight: typography.lineHeight.normal,
  },

  noReviews: {
    color: colors.muted,
    fontSize: typography.fontSize.md,
    paddingVertical: spacing.md,
  },

  // Related products

  relatedContainer: {
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },

  // Bottom bar

  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    paddingBottom: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.card,
    gap: spacing.sm,
    ...shadows.medium,
  },

  quantityContainer: {
    minWidth: 115,
  },

  addButtonContainer: {
    flex: 1,
  },

  addButton: {
    flex: 1,
  },

  // Review dialog

  reviewDialog: {
    backgroundColor: colors.card,
    borderRadius: radius.xl,
  },

  dialogTitle: {
    color: colors.primaryDark,
    fontSize: typography.fontSize.xl,
    fontWeight: '800',
  },

  dialogSubtitle: {
    color: colors.muted,
    fontSize: typography.fontSize.sm,
    marginBottom: spacing.lg,
  },

  ratingInput: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },

  reviewInput: {
    backgroundColor: colors.card,
  },

  dialogActions: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },

});
