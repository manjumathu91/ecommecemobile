

import React, { useCallback, useRef } from 'react';

import {
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  View,
  StyleSheet,
} from 'react-native';

import Animated, {
  FadeInDown,
  FadeInUp,
} from 'react-native-reanimated';

import { SafeAreaView } from 'react-native-safe-area-context';

import { MaterialCommunityIcons } from '@expo/vector-icons';

import { useFocusEffect } from '@react-navigation/native';

import { orderApi } from '@/api/services';

import {
  EmptyState,
  ErrorMessage,
  LoadingIndicator,
  StatusBadge,
} from '@/components';

import {
  colors,
  typography,
  spacing,
  radius,
  shadows,
  motion,
} from '@/constants/theme';

import { usePaginated } from '@/hooks/usePaginated';

import { useNav } from '@/navigation/hooks';

import {
  formatDate,
  formatINR,
} from '@/utils/format';

// ======================================================
// ORDER LIST SCREEN
// ======================================================

export default function OrderListScreen() {

  const nav = useNav();

  // ====================================================
  // PAGINATED ORDERS
  // ====================================================

  const list = usePaginated(
    (page) => orderApi.list(page),
    []
  );

  const first = useRef(true);

  // ====================================================
  // REFRESH WHEN SCREEN GETS FOCUS
  // ====================================================

  useFocusEffect(

    useCallback(() => {

      if (first.current) {

        first.current = false;

      } else {

        // Refresh order status when returning to this screen.

        list.refresh();

      }

    }, [])

  ); // eslint-disable-line react-hooks/exhaustive-deps

  // ====================================================
  // LOADING STATE
  // ====================================================

  if (list.loading) {

    return (

      <SafeAreaView style={styles.stateContainer}>

        <LoadingIndicator />

      </SafeAreaView>

    );

  }

  // ====================================================
  // ERROR STATE
  // ====================================================

  if (list.error && !list.items.length) {

    return (

      <SafeAreaView style={styles.stateContainer}>

        <ErrorMessage
          message={list.error}
          onRetry={list.reload}
        />

      </SafeAreaView>

    );

  }

  // ====================================================
  // MAIN UI
  // ====================================================

  return (

    <SafeAreaView
      style={styles.container}
      edges={['bottom']}
    >

      <FlatList

        data={list.items}

        keyExtractor={(order) =>
          String(order.id)
        }

        showsVerticalScrollIndicator={false}

        contentContainerStyle={[
          styles.listContent,
          !list.items.length && styles.emptyListContent,
        ]}

        // ==============================================
        // PULL TO REFRESH
        // ==============================================

        refreshControl={

          <RefreshControl
            refreshing={list.refreshing}
            onRefresh={list.refresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />

        }

        // ==============================================
        // PAGINATION
        // ==============================================

        onEndReached={list.loadMore}

        onEndReachedThreshold={0.4}

        // ==============================================
        // HEADER
        // ==============================================

        ListHeaderComponent={

          <Animated.View
            entering={FadeInDown.duration(
              motion.duration.smooth
            )}
            style={styles.header}
          >

            <Text style={styles.eyebrow}>
              YOUR PURCHASES
            </Text>

            <View style={styles.headingRow}>

              <View style={styles.headingContent}>

                <Text style={styles.title}>
                  My Orders
                </Text>

                <Text style={styles.subtitle}>
                  View and manage your recent purchases.
                </Text>

              </View>

              <View style={styles.headerIcon}>

                <MaterialCommunityIcons
                  name="package-variant"
                  size={31}
                  color={colors.primary}
                />

              </View>

            </View>

            {/* ORDER COUNT */}

            <View style={styles.summaryCard}>

              <View style={styles.summaryIcon}>

                <MaterialCommunityIcons
                  name="receipt"
                  size={23}
                  color={colors.primary}
                />

              </View>

              <View style={styles.summaryContent}>

                <Text style={styles.summaryNumber}>
                  {list.items.length}
                </Text>

                <Text style={styles.summaryLabel}>
                  Orders loaded
                </Text>

              </View>

              <Text style={styles.summaryHint}>
                Tap an order to view details
              </Text>

            </View>

            <Text style={styles.sectionTitle}>
              Recent Orders
            </Text>

          </Animated.View>

        }

        // ==============================================
        // EMPTY STATE
        // ==============================================

        ListEmptyComponent={

          <Animated.View
            entering={FadeInUp.duration(400)}
            style={styles.emptyContainer}
          >

            <EmptyState
              icon="package-variant"
              title="No orders yet"
              subtitle="When you place an order it will show up here."
              actionLabel="Start shopping"
              onAction={() =>
                nav.navigate('ProductList', {
                  title: 'All products',
                })
              }
            />

          </Animated.View>

        }

        // ==============================================
        // ORDER ITEM
        // ==============================================

        renderItem={({ item: order, index }) => (

          <Animated.View
            entering={FadeInDown
              .delay(Math.min(index * 65, 350))
              .duration(motion.duration.smooth)}
          >

            <Pressable

              onPress={() =>
                nav.navigate('OrderDetail', {
                  id: order.id,
                })
              }

              style={({ pressed }) => [

                styles.orderCard,

                pressed && styles.pressedCard,

              ]}

            >

              {/* ORDER NUMBER AND AMOUNT */}

              <View style={styles.cardTopRow}>

                <View style={styles.orderInfo}>

                  <Text style={styles.orderLabel}>
                    ORDER NUMBER
                  </Text>

                  <Text style={styles.orderNumber}>
                    {order.order_number}
                  </Text>

                </View>

                <View style={styles.amountContainer}>

                  <Text style={styles.amountLabel}>
                    Total Amount
                  </Text>

                  <Text style={styles.amount}>
                    {formatINR(order.total_amount)}
                  </Text>

                </View>

              </View>

              <View style={styles.divider} />

              {/* ORDER DETAILS */}

              <View style={styles.detailsRow}>

                {/* DATE */}

                <View style={styles.detailItem}>

                  <View style={styles.detailIcon}>

                    <MaterialCommunityIcons
                      name="calendar-outline"
                      size={17}
                      color={colors.primary}
                    />

                  </View>

                  <View style={styles.detailContent}>

                    <Text style={styles.detailLabel}>
                      Order Date
                    </Text>

                    <Text style={styles.detailValue}>
                      {formatDate(order.created_at)}
                    </Text>

                  </View>

                </View>

                {/* ITEM COUNT */}

                <View style={styles.detailItem}>

                  <View style={styles.detailIcon}>

                    <MaterialCommunityIcons
                      name="package-variant"
                      size={17}
                      color={colors.primary}
                    />

                  </View>

                  <View style={styles.detailContent}>

                    <Text style={styles.detailLabel}>
                      Items
                    </Text>

                    <Text style={styles.detailValue}>
                      {order.item_count}{' '}
                      {order.item_count === 1 ? 'Item' : 'Items'}
                    </Text>

                  </View>

                </View>

              </View>

              <View style={styles.divider} />

              {/* PAYMENT AND STATUS */}

              <View style={styles.cardFooter}>

                <View style={styles.paymentMethod}>

                  <MaterialCommunityIcons
                    name={
                      order.payment_method === 'COD'
                        ? 'cash'
                        : 'credit-card-outline'
                    }
                    size={19}
                    color={colors.primary}
                  />

                  <Text style={styles.paymentText}>
                    {order.payment_method === 'COD'
                      ? 'Cash on Delivery'
                      : 'Online Payment'}
                  </Text>

                </View>

                <StatusBadge
                  status={order.status}
                  label={order.status_label}
                />

              </View>

              {/* VIEW DETAILS */}

              <View style={styles.viewDetails}>

                <Text style={styles.viewDetailsText}>
                  View Order Details
                </Text>

                <MaterialCommunityIcons
                  name="chevron-right"
                  size={20}
                  color={colors.primary}
                />

              </View>

            </Pressable>

          </Animated.View>

        )}

        // ==============================================
        // FOOTER
        // ==============================================

        ListFooterComponent={

          list.items.length > 0 ? (

            <Text style={styles.footerText}>
              Your VELORA order history is available here.
            </Text>

          ) : null

        }

      />

    </SafeAreaView>

  );

}

// ======================================================
// STYLES
// ======================================================

const styles = StyleSheet.create({

  // Main screen

  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },

  stateContainer: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: colors.bg,
  },

  listContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
  },

  emptyListContent: {
    flexGrow: 1,
  },

  // Header

  header: {
    marginBottom: spacing.lg,
  },

  eyebrow: {
    color: colors.secondary,
    fontSize: typography.fontSize.xs,
    fontWeight: '800',
    letterSpacing: 2,
    marginBottom: spacing.sm,
  },

  headingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },

  headingContent: {
    flex: 1,
  },

  title: {
    color: colors.primaryDark,
    fontSize: typography.fontSize.xxl,
    fontWeight: '800',
  },

  subtitle: {
    color: colors.muted,
    fontSize: typography.fontSize.sm,
    lineHeight: typography.lineHeight.relaxed,
    marginTop: spacing.xs,
  },

  headerIcon: {
    width: 60,
    height: 60,
    borderRadius: radius.lg,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Summary

  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.md,
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
    ...shadows.small,
  },

  summaryIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },

  summaryContent: {
    flex: 1,
  },

  summaryNumber: {
    color: colors.primaryDark,
    fontSize: typography.fontSize.xl,
    fontWeight: '800',
  },

  summaryLabel: {
    color: colors.muted,
    fontSize: typography.fontSize.xs,
    marginTop: 2,
  },

  summaryHint: {
    maxWidth: 105,
    color: colors.primary,
    fontSize: typography.fontSize.xs,
    fontWeight: '600',
    textAlign: 'right',
    lineHeight: typography.lineHeight.normal,
  },

  sectionTitle: {
    color: colors.primaryDark,
    fontSize: typography.fontSize.lg,
    fontWeight: '800',
    marginBottom: spacing.md,
  },

  // Order card

  orderCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.small,
  },

  pressedCard: {
    opacity: 0.85,
    transform: [
      { scale: motion.cardScale },
    ],
  },

  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
  },

  orderInfo: {
    flex: 1,
  },

  orderLabel: {
    color: colors.muted,
    fontSize: typography.fontSize.xs,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: spacing.xs,
  },

  orderNumber: {
    color: colors.primaryDark,
    fontSize: typography.fontSize.md,
    fontWeight: '800',
  },

  amountContainer: {
    alignItems: 'flex-end',
  },

  amountLabel: {
    color: colors.muted,
    fontSize: typography.fontSize.xs,
    marginBottom: 3,
  },

  amount: {
    color: colors.primaryDark,
    fontSize: typography.fontSize.lg,
    fontWeight: '800',
  },

  divider: {
    height: 1,
    backgroundColor: colors.divider,
    marginVertical: spacing.md,
  },

  // Order details

  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },

  detailItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minWidth: 0,
  },

  detailIcon: {
    width: 34,
    height: 34,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },

  detailContent: {
    flex: 1,
    minWidth: 0,
  },

  detailLabel: {
    color: colors.muted,
    fontSize: typography.fontSize.xs,
  },

  detailValue: {
    color: colors.text,
    fontSize: typography.fontSize.xs,
    fontWeight: '700',
    marginTop: 3,
  },

  // Footer row

  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.md,
  },

  paymentMethod: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },

  paymentText: {
    color: colors.textSecondary,
    fontSize: typography.fontSize.xs,
    fontWeight: '700',
  },

  // View details

  viewDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },

  viewDetailsText: {
    color: colors.primary,
    fontSize: typography.fontSize.xs,
    fontWeight: '800',
  },

  // Empty state

  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },

  // Footer

  footerText: {
    color: colors.muted,
    fontSize: typography.fontSize.xs,
    textAlign: 'center',
    paddingVertical: spacing.lg,
  },

});
