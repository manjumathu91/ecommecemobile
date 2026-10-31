

import React from 'react';

import {
  FlatList,
  RefreshControl,
  Text,
  View,
  StyleSheet,
} from 'react-native';

import Animated, {
  FadeIn,
  FadeInDown,
} from 'react-native-reanimated';

import { MaterialCommunityIcons } from '@expo/vector-icons';

import { wishlistApi } from '@/api/services';

import {
  CustomButton,
  EmptyState,
  ErrorMessage,
  ProductCard,
  ProductGridSkeleton,
} from '@/components';

import {
  colors,
  typography,
  spacing,
  radius,
  shadows,
  motion,
} from '@/constants/theme';

import { useCart } from '@/context/CartContext';
import { useWishlist } from '@/context/WishlistContext';
import { useFetch } from '@/hooks/useFetch';
import { useNav } from '@/navigation/hooks';

// ======================================================
// VELORA PREMIUM WISHLIST SCREEN
// ======================================================

export default function WishlistScreen() {

  const nav = useNav();

  const { ids, toggle } = useWishlist();

  const { add } = useCart();

  // ====================================================
  // WISHLIST API
  // ====================================================

  const list = useFetch(
    wishlistApi.list,
    [],
    { refetchOnFocus: true },
  );

  // ====================================================
  // LOADING STATE
  // ====================================================

  if (list.loading) {
    return (
      <View style={styles.container}>

        <Animated.View
          entering={FadeIn.duration(400)}
          style={styles.loadingHeader}
        >
          <Text style={styles.pageTitle}>
            My Wishlist
          </Text>

          <Text style={styles.subtitle}>
            Your favourite products are waiting here
          </Text>
        </Animated.View>

        <ProductGridSkeleton />

      </View>
    );
  }

  // ====================================================
  // ERROR STATE
  // ====================================================

  if (list.error || !list.data) {
    return (
      <View style={styles.container}>
        <ErrorMessage
          message={
            list.error ?? 'Could not load wishlist'
          }
          onRetry={list.reload}
        />
      </View>
    );
  }

  // ====================================================
  // FILTER WISHLIST ITEMS
  // ====================================================

  // Shared wishlist IDs update immediately when
  // the customer removes an item.

  const items = list.data.filter(
    (item) => ids.has(item.product.id),
  );

  // ====================================================
  // MOVE TO CART
  // ====================================================

  const moveToCart = async (productId: number) => {

    if (await add(productId, 1)) {

      await toggle(productId);

    }
  };

  // ====================================================
  // EMPTY WISHLIST
  // ====================================================

  if (!items.length) {

    return (
      <View style={styles.container}>

        <Animated.View
          entering={FadeInDown.duration(450)}
          style={styles.loadingHeader}
        >

          <Text style={styles.pageTitle}>
            My Wishlist
          </Text>

          <Text style={styles.subtitle}>
            Your favourite shopping collection
          </Text>

        </Animated.View>

        <Animated.View
          entering={FadeInDown.delay(150).duration(500)}
          style={styles.emptyContainer}
        >
          <EmptyState
            icon="heart-outline"
            title="Your wishlist is empty"
            subtitle="Save your favourite products by tapping the heart icon."
            actionLabel="Browse Products"
            onAction={() =>
              nav.navigate('ProductList', {
                title: 'All Products',
              })
            }
          />
        </Animated.View>

      </View>
    );
  }

  // ====================================================
  // WISHLIST HEADER
  // ====================================================

  const header = (

    <Animated.View
      entering={FadeInDown.duration(450)}
      style={styles.header}
    >

      <View style={styles.headerTop}>

        <View style={styles.headingContainer}>

          <Text style={styles.pageTitle}>
            Your Favourites
          </Text>

          <Text style={styles.subtitle}>
            Products you love, all in one place.
          </Text>

        </View>

        {/* Wishlist Count */}

        <View style={styles.countBadge}>

          <MaterialCommunityIcons
            name="heart"
            size={22}
            color={colors.primary}
          />

          <Text style={styles.countText}>
            {items.length}
          </Text>

        </View>

      </View>

      {/* Wishlist Summary */}

      <View style={styles.summaryCard}>

        <View style={styles.summaryIcon}>
          <MaterialCommunityIcons
            name="heart-multiple"
            size={25}
            color={colors.primary}
          />
        </View>

        <View style={styles.summaryTextContainer}>

          <Text style={styles.summaryTitle}>
            Your Saved Collection
          </Text>

          <Text style={styles.summarySubtitle}>
            Keep your favourite products close.
          </Text>

        </View>

        <MaterialCommunityIcons
          name="leaf"
          size={26}
          color={colors.secondary}
        />

      </View>

      {/* Product count */}

      <View style={styles.sectionHeader}>

        <Text style={styles.sectionTitle}>
          Saved Products
        </Text>

        <Text style={styles.sectionCount}>
          {items.length} items
        </Text>

      </View>

    </Animated.View>
  );

  // ====================================================
  // MAIN WISHLIST UI
  // ====================================================

  return (

    <View style={styles.container}>

      <FlatList
        data={items}
        numColumns={2}
        keyExtractor={(item) => String(item.id)}

        ListHeaderComponent={header}

        contentContainerStyle={styles.listContent}

        columnWrapperStyle={styles.columnWrapper}

        showsVerticalScrollIndicator={false}

        refreshControl={
          <RefreshControl
            refreshing={list.refreshing}
            onRefresh={list.refresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }

        renderItem={({ item, index }) => (

          <View style={styles.gridItem}>

            {/* Product Card */}

            <ProductCard
              product={item.product}
              index={index}
              width="100%"
              onPress={() =>
                nav.navigate('ProductDetail', {
                  id: item.product.id,
                })
              }
            />

            {/* Move to Cart Button */}

            <Animated.View
              entering={FadeInDown
                .delay(Math.min(index, 6) * 55)
                .duration(motion.duration.smooth)}
              style={styles.cartButtonContainer}
            >

              <CustomButton
                label="Move to Cart"
                mode="contained"
                icon="cart-arrow-right"
                disabled={!item.product.in_stock}
                onPress={() =>
                  moveToCart(item.product.id)
                }
                style={styles.moveButton}
              />

            </Animated.View>

          </View>

        )}

        ListFooterComponent={
          <Animated.View
            entering={FadeIn.delay(300)}
            style={styles.footer}
          >
            <MaterialCommunityIcons
              name="leaf"
              size={23}
              color={colors.secondary}
            />

            <Text style={styles.footerText}>
              Keep discovering with VELORA
            </Text>

          </Animated.View>
        }
      />

    </View>
  );
}

// ======================================================
// VELORA PREMIUM WISHLIST STYLES
// ======================================================

const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },

  // Loading header

  loadingHeader: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },

  // Main header

  header: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },

  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },

  headingContainer: {
    flex: 1,
  },

  pageTitle: {
    color: colors.primaryDark,
    fontSize: typography.fontSize.xxl,
    fontWeight: '800',
    letterSpacing: 0.3,
  },

  subtitle: {
    color: colors.muted,
    fontSize: typography.fontSize.sm,
    lineHeight: typography.lineHeight.normal,
    marginTop: spacing.xs,
  },

  // Wishlist count

  countBadge: {
    minWidth: 58,
    minHeight: 54,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.primaryLight,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
  },

  countText: {
    color: colors.primaryDark,
    fontSize: typography.fontSize.xl,
    fontWeight: '800',
  },

  // Summary card

  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceGreen,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    marginTop: spacing.lg,
    padding: spacing.md,
    gap: spacing.md,
    ...shadows.small,
  },

  summaryIcon: {
    width: 45,
    height: 45,
    backgroundColor: colors.primaryLight,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },

  summaryTextContainer: {
    flex: 1,
  },

  summaryTitle: {
    color: colors.primaryDark,
    fontSize: typography.fontSize.md,
    fontWeight: '800',
  },

  summarySubtitle: {
    color: colors.muted,
    fontSize: typography.fontSize.xs,
    marginTop: 3,
    lineHeight: typography.lineHeight.normal,
  },

  // Section header

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.xs,
  },

  sectionTitle: {
    color: colors.text,
    fontSize: typography.fontSize.lg,
    fontWeight: '800',
  },

  sectionCount: {
    color: colors.primary,
    fontSize: typography.fontSize.sm,
    fontWeight: '700',
  },

  // Product grid

  listContent: {
    paddingHorizontal: spacing.xs,
    paddingBottom: spacing.xxl,
  },

  columnWrapper: {
    justifyContent: 'space-between',
  },

  gridItem: {
    width: '50%',
    paddingHorizontal: 3,
    paddingBottom: spacing.md,
  },

  // Move to cart button

  cartButtonContainer: {
    marginTop: spacing.xs,
    paddingHorizontal: 3,
  },

  moveButton: {
    borderRadius: radius.md,
    minHeight: 46,
    justifyContent: 'center',
  },

  // Footer

  footer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.xs,
  },

  footerText: {
    color: colors.muted,
    fontSize: typography.fontSize.xs,
    fontWeight: '600',
  },

  // Empty state

  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },

});
