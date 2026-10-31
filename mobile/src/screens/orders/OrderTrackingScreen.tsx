

import React from 'react';

import {
  RefreshControl,
  ScrollView,
  Text,
  View,
  StyleSheet,
} from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';

import Animated, {
  FadeInDown,
  FadeInUp,
  ZoomIn,
} from 'react-native-reanimated';

import { SafeAreaView } from 'react-native-safe-area-context';

import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { orderApi } from '@/api/services';

import {
  ErrorMessage,
  LoadingIndicator,
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

import type { RootStackParamList } from '@/navigation/types';

import {
  formatDate,
  formatDateTime,
} from '@/utils/format';

// ======================================================
// TRACKING STAGE ICONS
// ======================================================

const STAGE_ICONS: Record<string, string> = {

  PLACED: 'clipboard-check-outline',

  CONFIRMED: 'check-decagram-outline',

  PROCESSING: 'cog-outline',

  SHIPPED: 'truck-outline',

  OUT_FOR_DELIVERY: 'bike-fast',

  DELIVERED: 'home-heart',

};

// ======================================================
// ORDER TRACKING SCREEN
// ======================================================

export default function OrderTrackingScreen({

  route,

}: NativeStackScreenProps<RootStackParamList, 'OrderTracking'>) {

  const { id } = route.params;

  // Automatically checks backend every 20 seconds.
  // Pull-to-refresh is also available.

  const t = useFetch(
    () => orderApi.tracking(id),
    [id],
    { pollMs: 20000 }
  );

  // ====================================================
  // LOADING STATE
  // ====================================================

  if (t.loading) {

    return (

      <SafeAreaView style={styles.stateContainer}>

        <LoadingIndicator />

      </SafeAreaView>

    );

  }

  // ====================================================
  // ERROR STATE
  // ====================================================

  if (t.error || !t.data) {

    return (

      <SafeAreaView style={styles.stateContainer}>

        <ErrorMessage
          message={t.error ?? 'Could not load tracking'}
          onRetry={t.reload}
        />

      </SafeAreaView>

    );

  }

  const d = t.data;

  // ====================================================
  // MAIN UI
  // ====================================================

  return (

    <SafeAreaView
      style={styles.container}
      edges={['bottom']}
    >

      <ScrollView

        showsVerticalScrollIndicator={false}

        contentContainerStyle={styles.scrollContent}

        refreshControl={

          <RefreshControl
            refreshing={t.refreshing}
            onRefresh={t.refresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />

        }

      >

        {/* ============================================
            PAGE HEADER
        ============================================ */}

        <Animated.View
          entering={FadeInDown.duration(
            motion.duration.smooth
          )}
          style={styles.header}
        >

          <Text style={styles.eyebrow}>
            DELIVERY UPDATES
          </Text>

          <Text style={styles.title}>
            Track Your Order
          </Text>

          <Text style={styles.subtitle}>
            Follow your order journey from placement to delivery.
          </Text>

        </Animated.View>

        {/* ============================================
            ORDER INFORMATION
        ============================================ */}

        <Animated.View
          entering={FadeInDown.delay(100)}
          style={styles.orderCard}
        >

          <View style={styles.orderIcon}>

            <MaterialCommunityIcons
              name="package-variant"
              size={29}
              color={colors.primary}
            />

          </View>

          <View style={styles.orderInfo}>

            <Text style={styles.orderLabel}>
              ORDER NUMBER
            </Text>

            <Text style={styles.orderNumber}>
              {d.order_number}
            </Text>

          </View>

          <View style={styles.liveBadge}>

            <View style={styles.liveDot} />

            <Text style={styles.liveText}>
              LIVE
            </Text>

          </View>

        </Animated.View>

        {/* ============================================
            ESTIMATED DELIVERY
        ============================================ */}

        {!d.is_cancelled &&
          !d.awaiting_payment &&
          d.estimated_delivery && (

          <Animated.View
            entering={FadeInDown.delay(180)}
            style={styles.estimatedCard}
          >

            <View style={styles.estimatedIcon}>

              <MaterialCommunityIcons
                name="truck-delivery"
                size={30}
                color={colors.primary}
              />

            </View>

            <View style={styles.estimatedContent}>

              <Text style={styles.estimatedLabel}>
                ESTIMATED DELIVERY
              </Text>

              <Text style={styles.estimatedDate}>
                {formatDate(d.estimated_delivery)}
              </Text>

            </View>

          </Animated.View>

        )}

        {/* ============================================
            CANCELLED STATE
        ============================================ */}

        {d.is_cancelled && (

          <Animated.View
            entering={ZoomIn.duration(400)}
            style={styles.cancelledCard}
          >

            <View style={styles.cancelledIcon}>

              <MaterialCommunityIcons
                name="close-circle"
                size={43}
                color={colors.danger}
              />

            </View>

            <Text style={styles.cancelledTitle}>
              Order Cancelled
            </Text>

            <Text style={styles.cancelledMessage}>
              This order was cancelled. Its delivery tracking is no longer active.
            </Text>

          </Animated.View>

        )}

        {/* ============================================
            AWAITING PAYMENT STATE
        ============================================ */}

        {d.awaiting_payment && (

          <Animated.View
            entering={FadeInDown.duration(400)}
            style={styles.pendingCard}
          >

            <View style={styles.pendingIcon}>

              <MaterialCommunityIcons
                name="clock-alert-outline"
                size={32}
                color={colors.warning}
              />

            </View>

            <View style={styles.pendingContent}>

              <Text style={styles.pendingTitle}>
                Waiting for Payment
              </Text>

              <Text style={styles.pendingMessage}>
                Tracking starts once your payment is confirmed.
              </Text>

            </View>

          </Animated.View>

        )}

        {/* ============================================
            DELIVERY PROGRESS
        ============================================ */}

        {!d.is_cancelled && !d.awaiting_payment && (

          <Animated.View
            entering={FadeInDown.delay(250)}
            style={styles.timelineCard}
          >

            <View style={styles.timelineHeader}>

              <Text style={styles.sectionTitle}>
                Delivery Progress
              </Text>

              <View style={styles.progressBadge}>

                <MaterialCommunityIcons
                  name="progress-check"
                  size={16}
                  color={colors.primary}
                />

                <Text style={styles.progressText}>
                  {d.status.replace(/_/g, ' ')}
                </Text>

              </View>

            </View>

            {/* TIMELINE */}

            {d.stages.map((stage, index) => {

              const last =
                index === d.stages.length - 1;

              const nextDone =
                !last &&
                d.stages[index + 1].completed;

              const tone = stage.completed
                ? colors.success
                : colors.border;

              const icon =
                stage.completed
                  ? 'check'
                  : STAGE_ICONS[stage.status] ?? 'circle-outline';

              return (

                <Animated.View
                  key={stage.status}
                  entering={FadeInUp
                    .delay(Math.min(index * 90, 450))
                    .duration(motion.duration.smooth)}
                  style={styles.stageRow}
                >

                  {/* TIMELINE ICON AND CONNECTOR */}

                  <View style={styles.timelineColumn}>

                    <Animated.View
                      entering={
                        stage.current
                          ? ZoomIn.delay(300 + index * 70)
                          : undefined
                      }
                      style={[
                        styles.stageIcon,

                        stage.completed
                          ? styles.completedIcon
                          : stage.current
                            ? styles.currentIcon
                            : styles.upcomingIcon,
                      ]}
                    >

                      <MaterialCommunityIcons
                        name={icon as any}
                        size={19}
                        color={
                          stage.completed
                            ? colors.white
                            : stage.current
                              ? colors.primary
                              : colors.muted
                        }
                      />

                    </Animated.View>

                    {!last && (

                      <View
                        style={[
                          styles.connector,

                          {
                            backgroundColor: nextDone
                              ? colors.success
                              : tone,
                          },
                        ]}
                      />

                    )}

                  </View>

                  {/* STAGE INFORMATION */}

                  <View
                    style={[
                      styles.stageContent,
                      {
                        paddingBottom: last
                          ? 0
                          : spacing.xl,
                      },
                    ]}
                  >

                    <Text
                      style={[
                        styles.stageTitle,

                        stage.current &&
                          styles.currentStageTitle,

                        stage.completed &&
                          styles.completedStageTitle,
                      ]}
                    >
                      {stage.label}
                    </Text>

                    {!!stage.timestamp && (

                      <Text style={styles.stageDate}>
                        {formatDateTime(stage.timestamp)}
                      </Text>

                    )}

                    {stage.current &&
                      d.status !== 'DELIVERED' && (

                      <View style={styles.currentLabel}>

                        <View style={styles.currentDot} />

                        <Text style={styles.currentLabelText}>
                          Current Status
                        </Text>

                      </View>

                    )}

                    {!stage.completed &&
                      !stage.current && (

                      <Text style={styles.upcomingText}>
                        Upcoming
                      </Text>

                    )}

                  </View>

                </Animated.View>

              );

            })}

          </Animated.View>

        )}

        {/* ============================================
            STATUS HISTORY
        ============================================ */}

        <Animated.View
          entering={FadeInDown.delay(350)}
          style={styles.historySection}
        >

          <View style={styles.historyHeader}>

            <Text style={styles.sectionTitle}>
              Status History
            </Text>

            <MaterialCommunityIcons
              name="history"
              size={22}
              color={colors.primary}
            />

          </View>

          {d.history.length === 0 ? (

            <View style={styles.emptyHistory}>

              <Text style={styles.emptyHistoryText}>
                No status history available yet.
              </Text>

            </View>

          ) : (

            [...d.history].reverse().map((item, index) => (

              <Animated.View
                key={`${item.created_at}-${index}`}
                entering={FadeInUp
                  .delay(Math.min(index * 70, 350))}
                style={styles.historyItem}
              >

                <View style={styles.historyDotColumn}>

                  <View style={styles.historyDot} />

                  {index !== d.history.length - 1 && (

                    <View style={styles.historyConnector} />

                  )}

                </View>

                <View style={styles.historyContent}>

                  <Text style={styles.historyTitle}>
                    {item.status.replace(/_/g, ' ')}
                  </Text>

                  <Text style={styles.historyDate}>
                    {formatDateTime(item.created_at)}
                  </Text>

                  {!!item.note && (

                    <Text style={styles.historyNote}>
                      {item.note}
                    </Text>

                  )}

                </View>

              </Animated.View>

            ))

          )}

        </Animated.View>

        {/* ============================================
            FOOTER
        ============================================ */}

        <Animated.View
          entering={FadeInDown.delay(450)}
          style={styles.footer}
        >

          <MaterialCommunityIcons
            name="package-variant"
            size={19}
            color={colors.secondary}
          />

          <Text style={styles.footerText}>
            VELORA • Your order, every step of the way.
          </Text>

        </Animated.View>

      </ScrollView>

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

  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxxl,
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

  title: {
    color: colors.primaryDark,
    fontSize: typography.fontSize.xxl,
    fontWeight: '800',
  },

  subtitle: {
    color: colors.muted,
    fontSize: typography.fontSize.sm,
    lineHeight: typography.lineHeight.relaxed,
    marginTop: spacing.sm,
  },

  // Order card

  orderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.md,
    marginBottom: spacing.md,
    ...shadows.small,
  },

  orderIcon: {
    width: 50,
    height: 50,
    borderRadius: radius.md,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },

  orderInfo: {
    flex: 1,
  },

  orderLabel: {
    color: colors.muted,
    fontSize: typography.fontSize.xs,
    fontWeight: '700',
    letterSpacing: 1,
  },

  orderNumber: {
    color: colors.primaryDark,
    fontSize: typography.fontSize.md,
    fontWeight: '800',
    marginTop: 3,
  },

  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.successLight,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    gap: 5,
  },

  liveDot: {
    width: 7,
    height: 7,
    borderRadius: radius.pill,
    backgroundColor: colors.success,
  },

  liveText: {
    color: colors.success,
    fontSize: 10,
    fontWeight: '800',
  },

  // Estimated delivery

  estimatedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceGreen,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    padding: spacing.lg,
    gap: spacing.md,
    marginBottom: spacing.lg,
  },

  estimatedIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },

  estimatedContent: {
    flex: 1,
  },

  estimatedLabel: {
    color: colors.muted,
    fontSize: typography.fontSize.xs,
    fontWeight: '700',
  },

  estimatedDate: {
    color: colors.primaryDark,
    fontSize: typography.fontSize.lg,
    fontWeight: '800',
    marginTop: spacing.xs,
  },

  // Cancelled card

  cancelledCard: {
    backgroundColor: colors.dangerLight,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: '#FECACA',
    padding: spacing.xl,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },

  cancelledIcon: {
    marginBottom: spacing.md,
  },

  cancelledTitle: {
    color: colors.danger,
    fontSize: typography.fontSize.xl,
    fontWeight: '800',
  },

  cancelledMessage: {
    color: colors.danger,
    fontSize: typography.fontSize.sm,
    textAlign: 'center',
    lineHeight: typography.lineHeight.relaxed,
    marginTop: spacing.sm,
  },

  // Pending payment

  pendingCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.warningLight,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: '#FDE68A',
    padding: spacing.lg,
    gap: spacing.md,
    marginBottom: spacing.lg,
  },

  pendingIcon: {
    marginTop: 2,
  },

  pendingContent: {
    flex: 1,
  },

  pendingTitle: {
    color: '#92400E',
    fontSize: typography.fontSize.md,
    fontWeight: '800',
  },

  pendingMessage: {
    color: '#92400E',
    fontSize: typography.fontSize.sm,
    lineHeight: typography.lineHeight.relaxed,
    marginTop: spacing.xs,
  },

  // Timeline card

  timelineCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.xl,
    ...shadows.small,
  },

  timelineHeader: {
    marginBottom: spacing.xl,
    gap: spacing.sm,
  },

  sectionTitle: {
    color: colors.primaryDark,
    fontSize: typography.fontSize.lg,
    fontWeight: '800',
  },

  progressBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.primaryLight,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    gap: 5,
  },

  progressText: {
    color: colors.primaryDark,
    fontSize: typography.fontSize.xs,
    fontWeight: '700',
  },

  // Timeline stage

  stageRow: {
    flexDirection: 'row',
  },

  timelineColumn: {
    width: 38,
    alignItems: 'center',
  },

  stageIcon: {
    width: 34,
    height: 34,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },

  completedIcon: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },

  currentIcon: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },

  upcomingIcon: {
    backgroundColor: colors.card,
    borderColor: colors.border,
  },

  connector: {
    width: 3,
    flex: 1,
    minHeight: 34,
    marginVertical: 3,
  },

  stageContent: {
    flex: 1,
    paddingLeft: spacing.md,
  },

  stageTitle: {
    color: colors.muted,
    fontSize: typography.fontSize.md,
    fontWeight: '600',
    lineHeight: typography.lineHeight.normal,
  },

  currentStageTitle: {
    color: colors.primaryDark,
    fontWeight: '800',
  },

  completedStageTitle: {
    color: colors.text,
    fontWeight: '700',
  },

  stageDate: {
    color: colors.muted,
    fontSize: typography.fontSize.xs,
    marginTop: spacing.xs,
  },

  currentLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.sm,
  },

  currentDot: {
    width: 7,
    height: 7,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
  },

  currentLabelText: {
    color: colors.primary,
    fontSize: typography.fontSize.xs,
    fontWeight: '800',
  },

  upcomingText: {
    color: colors.muted,
    fontSize: typography.fontSize.xs,
    marginTop: spacing.xs,
  },

  // Status history

  historySection: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    ...shadows.small,
  },

  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },

  historyItem: {
    flexDirection: 'row',
    minHeight: 66,
  },

  historyDotColumn: {
    width: 25,
    alignItems: 'center',
  },

  historyDot: {
    width: 11,
    height: 11,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    marginTop: 4,
  },

  historyConnector: {
    width: 2,
    flex: 1,
    backgroundColor: colors.border,
    marginTop: 4,
  },

  historyContent: {
    flex: 1,
    paddingLeft: spacing.sm,
    paddingBottom: spacing.lg,
  },

  historyTitle: {
    color: colors.text,
    fontSize: typography.fontSize.sm,
    fontWeight: '800',
  },

  historyDate: {
    color: colors.muted,
    fontSize: typography.fontSize.xs,
    marginTop: spacing.xs,
  },

  historyNote: {
    color: colors.textSecondary,
    fontSize: typography.fontSize.sm,
    lineHeight: typography.lineHeight.normal,
    marginTop: spacing.xs,
  },

  emptyHistory: {
    paddingVertical: spacing.lg,
  },

  emptyHistoryText: {
    color: colors.muted,
    fontSize: typography.fontSize.sm,
    textAlign: 'center',
  },

  // Footer

  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xl,
  },

  footerText: {
    color: colors.muted,
    fontSize: typography.fontSize.xs,
    fontWeight: '600',
  },

});
