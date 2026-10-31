

import React from 'react';

import {
  FlatList,
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

import { paymentApi } from '@/api/services';

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

import { useFetch } from '@/hooks/useFetch';

import {
  formatDateTime,
  formatINR,
} from '@/utils/format';

// ======================================================
// PAYMENT HISTORY SCREEN
// ======================================================

export default function PaymentHistoryScreen() {

  const list = useFetch(
    paymentApi.history,
    [],
    { refetchOnFocus: true }
  );

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

  if (list.error || !list.data) {

    return (
      <SafeAreaView style={styles.stateContainer}>
        <ErrorMessage
          message={list.error ?? 'Could not load payments'}
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

        data={list.data.results}

        keyExtractor={(payment) =>
          String(payment.id)
        }

        showsVerticalScrollIndicator={false}

        contentContainerStyle={[
          styles.listContent,
          list.data.results.length === 0 &&
            styles.emptyListContent,
        ]}

        refreshControl={
          <RefreshControl
            refreshing={list.refreshing}
            onRefresh={list.refresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }

        // ==============================================
        // PAGE HEADER
        // ==============================================

        ListHeaderComponent={

          <Animated.View
            entering={FadeInDown.duration(
              motion.duration.smooth
            )}
            style={styles.header}
          >

            <Text style={styles.eyebrow}>
              YOUR TRANSACTIONS
            </Text>

            <View style={styles.headingRow}>

              <View style={styles.headingContent}>

                <Text style={styles.title}>
                  Payment History
                </Text>

                <Text style={styles.subtitle}>
                  View your payment records and transaction details.
                </Text>

              </View>

              <View style={styles.headerIcon}>

                <MaterialCommunityIcons
                  name="credit-card-outline"
                  size={29}
                  color={colors.primary}
                />

              </View>

            </View>

            {/* PAYMENT COUNT */}

            <View style={styles.summaryCard}>

              <View style={styles.summaryIcon}>

                <MaterialCommunityIcons
                  name="receipt"
                  size={23}
                  color={colors.primary}
                />

              </View>

              <View style={styles.summaryContent}>

                <Text style={styles.summaryCount}>
                  {list.data.results.length}
                </Text>

                <Text style={styles.summaryLabel}>
                  Payment transactions
                </Text>

              </View>

            </View>

            <Text style={styles.sectionTitle}>
              Recent Transactions
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
              icon="credit-card-off-outline"
              title="No payments yet"
              subtitle="Your payment transactions will appear here after placing an order."
            />

          </Animated.View>

        }

        // ==============================================
        // PAYMENT CARD
        // ==============================================

        renderItem={({ item: p, index }) => (

          <Animated.View
            entering={FadeInDown
              .delay(Math.min(index * 70, 350))
              .duration(motion.duration.smooth)}
            style={styles.paymentCard}
          >

            {/* ORDER NUMBER & AMOUNT */}

            <View style={styles.cardHeader}>

              <View style={styles.orderInfo}>

                <Text style={styles.orderLabel}>
                  ORDER NUMBER
                </Text>

                <Text style={styles.orderNumber}>
                  {p.order_number}
                </Text>

              </View>

              <View style={styles.amountContainer}>

                <Text style={styles.amountLabel}>
                  Amount
                </Text>

                <Text style={styles.amount}>
                  {formatINR(p.amount)}
                </Text>

              </View>

            </View>

            <View style={styles.divider} />

            {/* PAYMENT METHOD */}

            <View style={styles.detailRow}>

              <View style={styles.detailIcon}>

                <MaterialCommunityIcons
                  name={
                    p.method === 'COD'
                      ? 'cash'
                      : 'credit-card-outline'
                  }
                  size={21}
                  color={colors.primary}
                />

              </View>

              <View style={styles.detailContent}>

                <Text style={styles.detailLabel}>
                  Payment Method
                </Text>

                <Text style={styles.detailValue}>
                  {p.method === 'COD'
                    ? 'Cash on Delivery'
                    : `Razorpay${
                        p.instrument
                          ? ` · ${p.instrument.toUpperCase()}`
                          : ''
                      }`}
                </Text>

              </View>

            </View>

            {/* TRANSACTION ID */}

            {!!p.razorpay_payment_id && (

              <View style={styles.transactionBox}>

                <Text style={styles.transactionLabel}>
                  Transaction ID
                </Text>

                <Text style={styles.transactionValue}>
                  {p.razorpay_payment_id}
                </Text>

              </View>

            )}

            {/* FAILURE REASON */}

            {!!p.failure_reason && p.status !== 'SUCCESS' && (

              <View style={styles.failureBox}>

                <MaterialCommunityIcons
                  name="alert-circle-outline"
                  size={20}
                  color={colors.danger}
                />

                <View style={styles.failureContent}>

                  <Text style={styles.failureLabel}>
                    Payment information
                  </Text>

                  <Text style={styles.failureText}>
                    {p.failure_reason}
                  </Text>

                </View>

              </View>

            )}

            {/* STATUS & DATE */}

            <View style={styles.cardFooter}>

              <View style={styles.statusContainer}>

                <Text style={styles.statusLabel}>
                  STATUS
                </Text>

                <StatusBadge status={p.status} />

              </View>

              <View style={styles.dateContainer}>

                <MaterialCommunityIcons
                  name="clock-outline"
                  size={15}
                  color={colors.muted}
                />

                <Text style={styles.dateText}>
                  {formatDateTime(p.created_at)}
                </Text>

              </View>

            </View>

          </Animated.View>

        )}

        // ==============================================
        // FOOTER
        // ==============================================

        ListFooterComponent={

          list.data.results.length > 0 ? (

            <Text style={styles.footerText}>
              Your VELORA payment records are available here.
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
    width: 58,
    height: 58,
    borderRadius: radius.lg,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Summary card

  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
    gap: spacing.md,
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

  summaryCount: {
    color: colors.primaryDark,
    fontSize: typography.fontSize.xl,
    fontWeight: '800',
  },

  summaryLabel: {
    color: colors.muted,
    fontSize: typography.fontSize.xs,
    marginTop: 2,
  },

  sectionTitle: {
    color: colors.text,
    fontSize: typography.fontSize.lg,
    fontWeight: '800',
    marginBottom: spacing.md,
  },

  // Payment card

  paymentCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.small,
  },

  cardHeader: {
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
    fontSize: typography.fontSize.xl,
    fontWeight: '800',
  },

  divider: {
    height: 1,
    backgroundColor: colors.divider,
    marginVertical: spacing.lg,
  },

  // Payment method

  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },

  detailIcon: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },

  detailContent: {
    flex: 1,
  },

  detailLabel: {
    color: colors.muted,
    fontSize: typography.fontSize.xs,
  },

  detailValue: {
    color: colors.text,
    fontSize: typography.fontSize.sm,
    fontWeight: '700',
    marginTop: 3,
  },

  // Transaction ID

  transactionBox: {
    backgroundColor: colors.surfaceSoft,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },

  transactionLabel: {
    color: colors.muted,
    fontSize: typography.fontSize.xs,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },

  transactionValue: {
    color: colors.textSecondary,
    fontSize: typography.fontSize.xs,
    fontWeight: '600',
  },

  // Failure information

  failureBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.dangerLight,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },

  failureContent: {
    flex: 1,
  },

  failureLabel: {
    color: colors.danger,
    fontSize: typography.fontSize.xs,
    fontWeight: '800',
    marginBottom: spacing.xs,
  },

  failureText: {
    color: colors.danger,
    fontSize: typography.fontSize.sm,
    lineHeight: typography.lineHeight.normal,
  },

  // Footer

  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    paddingTop: spacing.md,
  },

  statusContainer: {
    gap: spacing.xs,
    alignItems: 'flex-start',
  },

  statusLabel: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },

  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },

  dateText: {
    color: colors.muted,
    fontSize: typography.fontSize.xs,
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
