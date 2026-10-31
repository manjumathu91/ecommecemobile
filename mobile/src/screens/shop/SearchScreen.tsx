

import React, { useCallback, useEffect, useState } from 'react';

import {
  Image,
  Pressable,
  ScrollView,
  Text,
  View,
  StyleSheet,
} from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';

import { Chip } from 'react-native-paper';

import Animated, {
  FadeIn,
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';

import { useFocusEffect } from '@react-navigation/native';

import { catalogApi } from '@/api/services';

import {
  EmptyState,
  LoadingIndicator,
  SearchBar,
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

import { useDebounce } from '@/hooks/useDebounce';
import { useFetch } from '@/hooks/useFetch';
import { useNav } from '@/navigation/hooks';

import type { ProductSummary } from '@/types';

import { formatINR } from '@/utils/format';
import { recentSearches } from '@/utils/storage';

// ======================================================
// ANIMATED SEARCH RESULT ITEM
// ======================================================

function SearchResultItem({
  product,
  index,
  onPress,
}: {
  product: ProductSummary;
  index: number;
  onPress: () => void;
}) {

  const [imageUri, setImageUri] = useState(
    product.thumbnail || MEDIA_FALLBACK,
  );

  const [imageFailed, setImageFailed] = useState(false);

  const imageProgress = useSharedValue(0);

  // ====================================================
  // IMAGE FADE + ZOOM
  // ====================================================

  const imageStyle = useAnimatedStyle(() => ({
    opacity: imageProgress.value,

    transform: [
      {
        scale: 1.08 - imageProgress.value * 0.08,
      },
    ],
  }));

  // ====================================================
  // RESET IMAGE
  // ====================================================

  useEffect(() => {

    setImageUri(product.thumbnail || MEDIA_FALLBACK);

    setImageFailed(false);

    imageProgress.value = 0;

  }, [product.thumbnail, imageProgress]);

  // ====================================================
  // IMAGE LOAD
  // ====================================================

  const handleImageLoad = () => {

    imageProgress.value = withTiming(
      1,
      {
        duration: motion.duration.smooth,
      },
    );
  };

  // ====================================================
  // IMAGE ERROR
  // ====================================================

  const handleImageError = () => {

    if (imageUri !== MEDIA_FALLBACK) {

      setImageUri(MEDIA_FALLBACK);

      imageProgress.value = 0;

    } else {

      setImageFailed(true);

    }
  };

  // ====================================================
  // RENDER
  // ====================================================

  return (

    <Animated.View
      entering={FadeInDown
        .delay(Math.min(index, 8) * 55)
        .duration(motion.duration.smooth)}
      style={styles.resultWrapper}
    >

      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`Open ${product.name}`}
        style={({ pressed }) => [
          styles.resultCard,
          pressed && styles.resultPressed,
        ]}
      >

        {/* PRODUCT IMAGE */}

        <View style={styles.imageContainer}>

          {!imageFailed && (
            <View style={styles.imagePlaceholder}>
              <MaterialCommunityIcons
                name="image-outline"
                size={30}
                color={colors.disabled}
              />
            </View>
          )}

          {imageFailed ? (

            <View style={styles.imagePlaceholder}>
              <MaterialCommunityIcons
                name="image-broken-variant"
                size={28}
                color={colors.muted}
              />
            </View>

          ) : (

            <Animated.Image
              source={{ uri: imageUri }}
              style={[
                styles.productImage,
                imageStyle,
              ]}
              resizeMode="cover"
              onLoad={handleImageLoad}
              onError={handleImageError}
              accessibilityLabel={product.name}
            />

          )}

        </View>

        {/* PRODUCT INFORMATION */}

        <View style={styles.productInfo}>

          <Text
            numberOfLines={2}
            style={styles.productName}
          >
            {product.name}
          </Text>

          <Text
            numberOfLines={1}
            style={styles.categoryName}
          >
            {product.category_name}
          </Text>

          <Text style={styles.productPrice}>
            {formatINR(product.effective_price)}
          </Text>

          {!product.in_stock && (
            <Text style={styles.outOfStock}>
              Out of stock
            </Text>
          )}

        </View>

        {/* ARROW */}

        <MaterialCommunityIcons
          name="chevron-right"
          size={25}
          color={colors.primary}
        />

      </Pressable>

    </Animated.View>
  );
}

// ======================================================
// VELORA PREMIUM SEARCH SCREEN
// ======================================================

export default function SearchScreen() {

  const nav = useNav();

  // ====================================================
  // SEARCH STATE
  // ====================================================

  const [q, setQ] = useState('');

  const term = useDebounce(q.trim(), 300);

  const [recent, setRecent] = useState<string[]>([]);

  // ====================================================
  // RECENT SEARCHES
  // ====================================================

  const loadRecent = useCallback(async () => {

    const searches = await recentSearches.get();

    setRecent(searches);

  }, []);

  useFocusEffect(
    useCallback(() => {
      loadRecent();
    }, [loadRecent]),
  );

  // ====================================================
  // PRODUCT SUGGESTIONS API
  // ====================================================

  const suggestions = useFetch<ProductSummary[]>(
    () =>
      term.length >= 2
        ? catalogApi.products({
            search: term,
          }).then((response) =>
            response.results.slice(0, 8),
          )
        : Promise.resolve([]),

    [term],
  );

  // ====================================================
  // SUBMIT SEARCH
  // ====================================================

  const submit = async (text: string) => {

    const searchTerm = text.trim();

    if (!searchTerm) return;

    await recentSearches.add(searchTerm);

    await loadRecent();

    nav.navigate('ProductList', {
      search: searchTerm,
      title: `"${searchTerm}"`,
    });
  };

  // ====================================================
  // OPEN PRODUCT
  // ====================================================

  const openProduct = async (product: ProductSummary) => {

    await recentSearches.add(term);

    await loadRecent();

    nav.navigate('ProductDetail', {
      id: product.id,
    });
  };

  // ====================================================
  // CLEAR RECENT SEARCHES
  // ====================================================

  const clearRecent = async () => {

    await recentSearches.clear();

    setRecent([]);

  };

  // ====================================================
  // RECENT SEARCH SELECT
  // ====================================================

  const selectRecent = (search: string) => {

    setQ(search);

    submit(search);

  };

  // ====================================================
  // MAIN UI
  // ====================================================

  return (

    <View style={styles.container}>

      {/* ==============================================
          SEARCH HEADER
      ============================================== */}

      <Animated.View
        entering={FadeInDown.duration(450)}
        style={styles.header}
      >

        <Text style={styles.pageTitle}>
          Search Products
        </Text>

        <Text style={styles.subtitle}>
          Discover products you will love.
        </Text>

      </Animated.View>

      {/* ==============================================
          SEARCH BAR
      ============================================== */}

      <View style={styles.searchContainer}>

        <SearchBar
          value={q}
          onChangeText={setQ}
          onSubmit={() => submit(q)}
          autoFocus
          placeholder="Search products or categories"
        />

      </View>

      {/* ==============================================
          RECENT SEARCHES
      ============================================== */}

      {term.length < 2 ? (

        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.recentContent}
        >

          {recent.length > 0 ? (

            <Animated.View
              entering={FadeInDown.duration(350)}
            >

              <View style={styles.recentHeader}>

                <View style={styles.recentTitleContainer}>

                  <MaterialCommunityIcons
                    name="history"
                    size={23}
                    color={colors.primary}
                  />

                  <Text style={styles.sectionTitle}>
                    Recent Searches
                  </Text>

                </View>

                <Pressable
                  onPress={clearRecent}
                  hitSlop={10}
                  accessibilityRole="button"
                  accessibilityLabel="Clear recent searches"
                >
                  <Text style={styles.clearText}>
                    Clear All
                  </Text>
                </Pressable>

              </View>

              {/* RECENT SEARCH CHIPS */}

              <View style={styles.recentChips}>

                {recent.map((search, index) => (

                  <Animated.View
                    key={search}
                    entering={FadeIn
                      .delay(Math.min(index, 6) * 50)}
                  >

                    <Chip
                      icon="history"
                      onPress={() => selectRecent(search)}
                      style={styles.recentChip}
                      textStyle={styles.recentChipText}
                    >
                      {search}
                    </Chip>

                  </Animated.View>

                ))}

              </View>

            </Animated.View>

          ) : (

            <Animated.View
              entering={FadeInDown.duration(400)}
              style={styles.searchHint}
            >

              <View style={styles.hintIcon}>
                <MaterialCommunityIcons
                  name="magnify"
                  size={35}
                  color={colors.primary}
                />
              </View>

              <Text style={styles.hintTitle}>
                What are you looking for?
              </Text>

              <Text style={styles.hintText}>
                Search products by name or category.
              </Text>

            </Animated.View>

          )}

          {/* FOOTER */}

          <View style={styles.footer}>

            <MaterialCommunityIcons
              name="leaf"
              size={21}
              color={colors.secondary}
            />

            <Text style={styles.footerText}>
              Discover more with VELORA
            </Text>

          </View>

        </ScrollView>

      ) : suggestions.loading ? (

        // ============================================
        // LOADING
        // ============================================

        <View style={styles.loadingContainer}>

          <LoadingIndicator />

          <Text style={styles.loadingText}>
            Finding products...
          </Text>

        </View>

      ) : !suggestions.data?.length ? (

        // ============================================
        // EMPTY RESULTS
        // ============================================

        <Animated.View
          entering={FadeIn.duration(400)}
          style={styles.emptyContainer}
        >

          <EmptyState
            icon="magnify-close"
            title="No Products Found"
            subtitle={`We could not find anything for "${term}". Try another search.`}
          />

        </Animated.View>

      ) : (

        // ============================================
        // SEARCH RESULTS
        // ============================================

        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.resultsContent}
        >

          {/* RESULTS HEADER */}

          <Animated.View
            entering={FadeInDown.duration(350)}
            style={styles.resultsHeader}
          >

            <View style={styles.resultsHeadingContainer}>

              <Text style={styles.sectionTitle}>
                Search Results
              </Text>

              <Text style={styles.resultsSubtitle}>
                Products matching "{term}"
              </Text>

            </View>

            <View style={styles.resultCountBadge}>

              <Text style={styles.resultCount}>
                {suggestions.data.length}+
              </Text>

            </View>

          </Animated.View>

          {/* PRODUCT RESULTS */}

          {suggestions.data.map((product, index) => (

            <SearchResultItem
              key={product.id}
              product={product}
              index={index}
              onPress={() => openProduct(product)}
            />

          ))}

          {/* SEE ALL RESULTS */}

          <Animated.View
            entering={FadeInDown.delay(300)}
            style={styles.seeAllContainer}
          >

            <Pressable
              onPress={() => submit(q)}
              style={({ pressed }) => [
                styles.seeAllButton,
                pressed && { opacity: 0.8 },
              ]}
            >

              <Text style={styles.seeAllText}>
                See All Results for "{term}"
              </Text>

              <MaterialCommunityIcons
                name="arrow-right"
                size={21}
                color={colors.white}
              />

            </Pressable>

          </Animated.View>

        </ScrollView>

      )}

    </View>
  );
}

// ======================================================
// VELORA PREMIUM SEARCH STYLES
// ======================================================

const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },

  // Page heading

  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },

  pageTitle: {
    color: colors.primaryDark,
    fontSize: typography.fontSize.xxl,
    fontWeight: '800',
  },

  subtitle: {
    color: colors.muted,
    fontSize: typography.fontSize.sm,
    marginTop: spacing.xs,
    lineHeight: typography.lineHeight.normal,
  },

  // Search bar

  searchContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.bg,
  },

  // Recent searches

  recentContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
  },

  recentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },

  recentTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },

  sectionTitle: {
    color: colors.primaryDark,
    fontSize: typography.fontSize.lg,
    fontWeight: '800',
  },

  clearText: {
    color: colors.danger,
    fontSize: typography.fontSize.sm,
    fontWeight: '700',
  },

  recentChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },

  recentChip: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.borderStrong,
    borderWidth: 1,
  },

  recentChipText: {
    color: colors.primaryDark,
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
  },

  // Search hint

  searchHint: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: 65,
  },

  hintIcon: {
    width: 76,
    height: 76,
    backgroundColor: colors.primaryLight,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },

  hintTitle: {
    color: colors.primaryDark,
    fontSize: typography.fontSize.lg,
    fontWeight: '800',
    marginTop: spacing.lg,
    textAlign: 'center',
  },

  hintText: {
    color: colors.muted,
    fontSize: typography.fontSize.md,
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: typography.lineHeight.relaxed,
  },

  // Search result image

  resultWrapper: {
    marginBottom: spacing.sm,
  },

  resultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    marginHorizontal: spacing.lg,
    padding: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
    ...shadows.small,
  },

  resultPressed: {
    opacity: 0.8,
    backgroundColor: colors.surfaceGreen,
  },

  imageContainer: {
    width: 82,
    height: 82,
    backgroundColor: colors.surfaceSoft,
    borderRadius: radius.md,
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

  // Result product text

  productInfo: {
    flex: 1,
    justifyContent: 'center',
  },

  productName: {
    color: colors.text,
    fontSize: typography.fontSize.md,
    fontWeight: '700',
    lineHeight: typography.lineHeight.normal,
  },

  categoryName: {
    color: colors.muted,
    fontSize: typography.fontSize.xs,
    marginTop: spacing.xs,
  },

  productPrice: {
    color: colors.primaryDark,
    fontSize: typography.fontSize.lg,
    fontWeight: '800',
    marginTop: spacing.sm,
  },

  outOfStock: {
    color: colors.danger,
    fontSize: typography.fontSize.xs,
    fontWeight: '700',
    marginTop: spacing.xs,
  },

  // Results heading

  resultsContent: {
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
  },

  resultsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },

  resultsHeadingContainer: {
    flex: 1,
  },

  resultsSubtitle: {
    color: colors.muted,
    fontSize: typography.fontSize.sm,
    marginTop: 4,
  },

  resultCountBadge: {
    backgroundColor: colors.primaryLight,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },

  resultCount: {
    color: colors.primaryDark,
    fontSize: typography.fontSize.md,
    fontWeight: '800',
  },

  // See all results

  seeAllContainer: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.md,
  },

  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    padding: spacing.md,
    borderRadius: radius.md,
    gap: spacing.sm,
  },

  seeAllText: {
    color: colors.white,
    fontSize: typography.fontSize.md,
    fontWeight: '700',
  },

  // Empty and loading states

  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
  },

  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },

  loadingText: {
    color: colors.muted,
    fontSize: typography.fontSize.md,
    fontWeight: '600',
  },

  // Footer

  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xxl,
  },

  footerText: {
    color: colors.muted,
    fontSize: typography.fontSize.xs,
    fontWeight: '600',
  },

});
