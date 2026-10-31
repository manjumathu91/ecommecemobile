

import React, { useCallback, useState } from 'react';

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

import { useFocusEffect } from '@react-navigation/native';
import { formatINR } from '@/utils/format';
import {
  CartItemRow,
  CustomButton,
  EmptyState,
  PriceSummary,
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
import { useNav } from '@/navigation/hooks';

// ======================================================
// VELORA PREMIUM CART SCREEN
// ======================================================

export default function CartScreen() {

  const nav = useNav();

  const {
    cart,
    refresh,
    setQty,
    remove,
  } = useCart();

  const [busyId, setBusyId] = useState<number | null>(null);

  const [refreshing, setRefreshing] = useState(false);

  // ====================================================
  // REFRESH CART WHEN SCREEN GETS FOCUS
  // ====================================================

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  // ====================================================
  // QUANTITY UPDATE
  // ====================================================

  const change = async (
    productId: number,
    quantity: number,
  ) => {

    setBusyId(productId);

    try {
      await setQty(productId, quantity);
    } finally {
      setBusyId(null);
    }
  };

  // ====================================================
  // REMOVE CART ITEM
  // ====================================================

  const removeItem = async (productId: number) => {

    setBusyId(productId);

    try {
      await remove(productId);
    } finally {
      setBusyId(null);
    }
  };

  // ====================================================
  // REFRESH
  // ====================================================

  const handleRefresh = async () => {

    setRefreshing(true);

    try {
      await refresh();
    } finally {
      setRefreshing(false);
    }
  };

  // ====================================================
  // EMPTY CART
  // ====================================================

  if (!cart || cart.items.length === 0) {

    return (
      <View style={styles.container}>

        {/* Empty Cart Header */}

        <Animated.View
          entering={FadeInDown.duration(450)}
          style={styles.emptyHeader}
        >

          <Text style={styles.pageTitle}>
            My Cart
          </Text>

          <Text style={styles.subtitle}>
            Your shopping journey starts here.
          </Text>

        </Animated.View>

        {/* Empty State */}

        <Animated.View
          entering={FadeIn.delay(150).duration(500)}
          style={styles.emptyContainer}
        >

          <EmptyState
            icon="cart-outline"
            title="Your Cart is Empty"
            subtitle="Discover something you love and add it to your shopping cart."
            actionLabel="Start Shopping"
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
  // CART HEADER
  // ====================================================

  const header = (

    <Animated.View
      entering={FadeInDown.duration(450)}
      style={styles.header}
    >

      <View style={styles.headerTop}>

        <View style={styles.headingContainer}>

          <Text style={styles.pageTitle}>
            My Cart
          </Text>

          <Text style={styles.subtitle}>
            Review your selected products.
          </Text>

        </View>

        {/* Cart Count */}

        <View style={styles.countBadge}>

         
         <MaterialCommunityIcons
  name="shopping-outline"
  size={23}
  color={colors.primary}
/>

          <Text style={styles.countNumber}>
            {cart.item_count}
          </Text>

        </View>

      </View>

      {/* Shopping Message */}

      <View style={styles.shoppingCard}>

        <View style={styles.shoppingIcon}>
          
          <MaterialCommunityIcons
  name="shopping-outline"
  size={25}
  color={colors.primary}
/>
        </View>

        <View style={styles.shoppingTextContainer}>

          <Text style={styles.shoppingTitle}>
            Almost Yours!
          </Text>

          <Text style={styles.shoppingSubtitle}>
            Your selected products are ready for checkout.
          </Text>

        </View>

        <MaterialCommunityIcons
          name="leaf"
          size={25}
          color={colors.secondary}
        />

      </View>

      <Text style={styles.sectionTitle}>
        Shopping Items
      </Text>

    </Animated.View>
  );

  // ====================================================
  // CART FOOTER — ORDER SUMMARY
  // ====================================================

  const footer = (

    <Animated.View
      entering={FadeInDown.delay(200).duration(450)}
      style={styles.summaryContainer}
    >

      <View style={styles.summaryHeading}>

        <MaterialCommunityIcons
          name="receipt-text-outline"
          size={24}
          color={colors.primary}
        />

        <Text style={styles.summaryTitle}>
          Order Summary
        </Text>

      </View>

     
     <PriceSummary
  rows={[
    {
      label: `Subtotal (${cart.item_count} items)`,
      value: cart.subtotal,
    },
    {
      label: 'Product Discount',
      value: cart.discount,
      negative: true,
    },
    {
      label: 'Cart Total (before GST & delivery)',
      value: cart.total,
      bold: true,
    },
  ]}
/>
      <View style={styles.secureNote}>

        <MaterialCommunityIcons
          name="shield-check-outline"
          size={20}
          color={colors.success}
        />

        <Text style={styles.secureText}>
          Your shopping details are securely processed.
        </Text>

      </View>

    </Animated.View>
  );

  // ====================================================
  // MAIN CART UI
  // ====================================================

  return (

    <View style={styles.container}>

      <FlatList
        data={cart.items}

        keyExtractor={(item) => String(item.id)}

        ListHeaderComponent={header}

        ListFooterComponent={footer}

        contentContainerStyle={styles.listContent}

        showsVerticalScrollIndicator={false}

        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }

        renderItem={({ item, index }) => (

          <Animated.View
            entering={FadeInDown
              .delay(Math.min(index, 6) * 65)
              .duration(motion.duration.smooth)}
            style={styles.cartItemContainer}
          >

            <CartItemRow
              item={item}

              busy={busyId === item.product.id}

              onQuantity={(quantity) =>
                change(item.product.id, quantity)
              }

              onRemove={() =>
                removeItem(item.product.id)
              }

              onPress={() =>
                nav.navigate('ProductDetail', {
                  id: item.product.id,
                })
              }
            />

          </Animated.View>

        )}

      />

      {/* ==============================================
          STICKY CHECKOUT BUTTON
      ============================================== */}

      <View style={styles.checkoutContainer}>

        <View style={styles.checkoutInfo}>

          <Text style={styles.checkoutLabel}>
            Cart Total
          </Text>

          
           <Text style={styles.checkoutPrice}>
    {formatINR(cart.total)}
  </Text>
        </View>

        <View style={styles.checkoutButtonContainer}>

          <CustomButton
            label="Proceed to Checkout"
            icon="arrow-right"
            onPress={() =>
              nav.navigate('Checkout')
            }
            style={styles.checkoutButton}
          />

        </View>

      </View>

    </View>
  );
}

// ======================================================
// VELORA PREMIUM CART STYLES
// ======================================================

const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },

  // Page header

  header: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },

  emptyHeader: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
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
  },

  subtitle: {
    color: colors.muted,
    fontSize: typography.fontSize.sm,
    lineHeight: typography.lineHeight.normal,
    marginTop: spacing.xs,
  },

  // Cart count

  countBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    minWidth: 60,
    minHeight: 52,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.primaryLight,
    borderRadius: radius.md,
  },

  countNumber: {
    color: colors.primaryDark,
    fontSize: typography.fontSize.xl,
    fontWeight: '800',
  },

  // Shopping message

  shoppingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    marginTop: spacing.lg,
    backgroundColor: colors.surfaceGreen,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    ...shadows.small,
  },

  shoppingIcon: {
    width: 44,
    height: 44,
    backgroundColor: colors.primaryLight,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },

  shoppingTextContainer: {
    flex: 1,
  },

  shoppingTitle: {
    color: colors.primaryDark,
    fontSize: typography.fontSize.md,
    fontWeight: '800',
  },

  shoppingSubtitle: {
    color: colors.muted,
    fontSize: typography.fontSize.xs,
    lineHeight: typography.lineHeight.normal,
    marginTop: 3,
  },

  sectionTitle: {
    color: colors.text,
    fontSize: typography.fontSize.lg,
    fontWeight: '800',
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },

  // List

  listContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.lg,
  },

  cartItemContainer: {
    marginBottom: spacing.md,
  },

  // Order summary

  summaryContainer: {
    padding: spacing.lg,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.small,
  },

  summaryHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },

  summaryTitle: {
    color: colors.primaryDark,
    fontSize: typography.fontSize.xl,
    fontWeight: '800',
  },

  secureNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },

  secureText: {
    flex: 1,
    color: colors.muted,
    fontSize: typography.fontSize.xs,
  },

  // Checkout bottom bar

  checkoutContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    ...shadows.medium,
  },

  checkoutInfo: {
    flex: 1,
    minWidth: 90,
  },

  checkoutLabel: {
    color: colors.muted,
    fontSize: typography.fontSize.xs,
    fontWeight: '600',
  },

  checkoutPrice: {
    color: colors.primaryDark,
    fontSize: typography.fontSize.xl,
    fontWeight: '800',
    marginTop: 3,
  },

  checkoutButtonContainer: {
    flex: 1.5,
  },

  checkoutButton: {
    borderRadius: radius.md,
  },

  // Empty state

  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },

});
