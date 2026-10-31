

import React, { useCallback, useLayoutEffect } from 'react';

import {
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  View,
  StyleSheet,
} from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';

import Animated, {
  FadeInDown,
  FadeInUp,
} from 'react-native-reanimated';

import { SafeAreaView } from 'react-native-safe-area-context';

import { notificationApi } from '@/api/services';

import {
  EmptyState,
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
import { useNav } from '@/navigation/hooks';

import type { AppNotification } from '@/types';

import { formatDateTime } from '@/utils/format';

// ======================================================
// NOTIFICATION ICONS
// ======================================================

const ICONS: Record<AppNotification['type'], string> = {

  ORDER: 'package-variant',

  PAYMENT: 'credit-card-outline',

  SHIPPING: 'truck-delivery',

  DELIVERY: 'home-check',

  SYSTEM: 'bell-outline',

};

// ======================================================
// NOTIFICATION COLORS
// ======================================================

const ICON_COLORS: Record<
  AppNotification['type'],
  string
> = {

  ORDER: colors.primary,

  PAYMENT: colors.success,

  SHIPPING: colors.info,

  DELIVERY: colors.secondary,

  SYSTEM: colors.gold,

};

// ======================================================
// NOTIFICATIONS SCREEN
// ======================================================

export default function NotificationsScreen() {

  const nav = useNav();

  const list = useFetch(
    notificationApi.list,
    [],
    { refetchOnFocus: true }
  );

  // ====================================================
  // MARK ALL AS READ
  // ====================================================

  const markAll = useCallback(async () => {

    try {

      await notificationApi.readAll();

      list.setData((d) =>
        d && {
          ...d,
          unread_count: 0,
          results: d.results.map((n) => ({
            ...n,
            is_read: true,
          })),
        }
      );

    } catch {

      // Keep the current notification state
      // when the API request fails.

    }

  }, [list.setData]);

  // ====================================================
  // HEADER ACTION
  // ====================================================

  useLayoutEffect(() => {

    nav.setOptions({

      headerRight: () => (

        <Pressable
          onPress={markAll}
          hitSlop={12}
          style={styles.headerAction}
        >

          <MaterialCommunityIcons
            name="check-all"
            size={20}
            color={colors.primary}
          />

          <Text style={styles.headerActionText}>
            Mark all read
          </Text>

        </Pressable>

      ),

    });

  }, [nav, markAll]);

  // ====================================================
  // OPEN NOTIFICATION
  // ====================================================

  const open = async (notification: AppNotification) => {

    if (!notification.is_read) {

      list.setData((d) =>
        d && {
          ...d,

          unread_count: Math.max(
            0,
            d.unread_count - 1
          ),

          results: d.results.map((n) =>
            n.id === notification.id
              ? { ...n, is_read: true }
              : n
          ),

        }
      );

      notificationApi
        .read(notification.id)
        .catch(() => {});

    }

    // Navigate to related order

    if (notification.order) {

      nav.navigate('OrderDetail', {
        id: notification.order,
      });

    }

  };

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
          message={
            list.error ??
            'Could not load notifications'
          }
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

        keyExtractor={(notification) =>
          String(notification.id)
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
        // LIST HEADER
        // ==============================================

        ListHeaderComponent={

          <Animated.View
            entering={FadeInDown.duration(
              motion.duration.smooth
            )}
            style={styles.header}
          >

            <View style={styles.headingRow}>

              <View style={styles.headingContent}>

                <Text style={styles.eyebrow}>
                  STAY UPDATED
                </Text>

                <Text style={styles.title}>
                  Notifications
                </Text>

                <Text style={styles.subtitle}>
                  Your latest orders and account updates.
                </Text>

              </View>

              <View style={styles.headerIcon}>

                <MaterialCommunityIcons
                  name="bell-outline"
                  size={30}
                  color={colors.primary}
                />

              </View>

            </View>

            {/* UNREAD COUNT */}

            <View style={styles.summaryCard}>

              <View style={styles.summaryIcon}>

                <MaterialCommunityIcons
                  name="email-outline"
                  size={23}
                  color={colors.primary}
                />

              </View>

              <View style={styles.summaryTextContainer}>

                <Text style={styles.summaryNumber}>
                  {list.data.unread_count}
                </Text>

                <Text style={styles.summaryLabel}>
                  Unread notifications
                </Text>

              </View>

              <View style={styles.liveBadge}>

                <View style={styles.liveDot} />

                <Text style={styles.liveText}>
                  UPDATES
                </Text>

              </View>

            </View>

            <Text style={styles.sectionTitle}>
              Recent Activity
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
              icon="bell-outline"
              title="No notifications"
              subtitle="Order and payment updates will appear here."
            />

          </Animated.View>

        }

        // ==============================================
        // NOTIFICATION ITEM
        // ==============================================

        renderItem={({ item, index }) => (

          <Animated.View
            entering={FadeInDown
              .delay(Math.min(index * 60, 360))
              .duration(motion.duration.smooth)}
          >

            <Pressable
              onPress={() => open(item)}
              style={({ pressed }) => [

                styles.notificationCard,

                item.is_read
                  ? styles.readCard
                  : styles.unreadCard,

                pressed && styles.pressedCard,

              ]}
            >

              {/* ICON */}

              <View
                style={[
                  styles.notificationIcon,

                  {
                    backgroundColor: item.is_read
                      ? colors.surfaceSoft
                      : colors.primaryLight,
                  },

                ]}
              >

                <MaterialCommunityIcons
                  name={ICONS[item.type] as any}
                  size={27}
                  color={
                    ICON_COLORS[item.type] ??
                    colors.primary
                  }
                />

              </View>

              {/* CONTENT */}

              <View style={styles.notificationContent}>

                <View style={styles.titleRow}>

                  <Text
                    numberOfLines={2}
                    style={[
                      styles.notificationTitle,
                      !item.is_read &&
                        styles.unreadTitle,
                    ]}
                  >
                    {item.title}
                  </Text>

                  {!item.is_read && (

                    <View style={styles.unreadDot} />

                  )}

                </View>

                <Text
                  style={styles.notificationMessage}
                >
                  {item.message}
                </Text>

                {/* DATE */}

                <View style={styles.dateRow}>

                  <MaterialCommunityIcons
                    name="clock-outline"
                    size={14}
                    color={colors.muted}
                  />

                  <Text style={styles.dateText}>
                    {formatDateTime(item.created_at)}
                  </Text>

                </View>

                {/* ORDER INDICATOR */}

                {item.order && (

                  <View style={styles.orderLink}>

                    <MaterialCommunityIcons
                      name="package-variant"
                      size={15}
                      color={colors.primary}
                    />

                    <Text style={styles.orderLinkText}>
                      View order details
                    </Text>

                    <MaterialCommunityIcons
                      name="chevron-right"
                      size={17}
                      color={colors.primary}
                    />

                  </View>

                )}

              </View>

            </Pressable>

          </Animated.View>

        )}

        // ==============================================
        // FOOTER
        // ==============================================

        ListFooterComponent={

          list.data.results.length > 0 ? (

            <Text style={styles.footerText}>
              You're all caught up with your recent updates.
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
    backgroundColor: colors.bg,
    justifyContent: 'center',
  },

  listContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
  },

  emptyListContent: {
    flexGrow: 1,
  },

  // Header action

  headerAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: spacing.sm,
  },

  headerActionText: {
    color: colors.primary,
    fontSize: typography.fontSize.xs,
    fontWeight: '700',
  },

  // Page heading

  header: {
    marginBottom: spacing.lg,
  },

  headingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },

  headingContent: {
    flex: 1,
  },

  eyebrow: {
    color: colors.secondary,
    fontSize: typography.fontSize.xs,
    fontWeight: '800',
    letterSpacing: 2,
    marginBottom: spacing.xs,
  },

  title: {
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

  headerIcon: {
    width: 58,
    height: 58,
    borderRadius: radius.lg,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.md,
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

  summaryTextContainer: {
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

  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceGreen,
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
    color: colors.primaryDark,
    fontSize: 10,
    fontWeight: '800',
  },

  // Section heading

  sectionTitle: {
    color: colors.text,
    fontSize: typography.fontSize.lg,
    fontWeight: '800',
    marginBottom: spacing.md,
  },

  // Notification cards

  notificationCard: {
    flexDirection: 'row',
    padding: spacing.md,
    borderRadius: radius.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    gap: spacing.md,
  },

  readCard: {
    backgroundColor: colors.card,
    borderColor: colors.border,
  },

  unreadCard: {
    backgroundColor: colors.surfaceGreen,
    borderColor: colors.borderStrong,
  },

  pressedCard: {
    opacity: 0.85,
    transform: [{ scale: motion.cardScale }],
  },

  // Notification icon

  notificationIcon: {
    width: 50,
    height: 50,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Notification content

  notificationContent: {
    flex: 1,
    minWidth: 0,
  },

  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },

  notificationTitle: {
    flex: 1,
    color: colors.text,
    fontSize: typography.fontSize.md,
    fontWeight: '600',
    lineHeight: typography.lineHeight.normal,
  },

  unreadTitle: {
    color: colors.primaryDark,
    fontWeight: '800',
  },

  notificationMessage: {
    color: colors.textSecondary,
    fontSize: typography.fontSize.sm,
    lineHeight: typography.lineHeight.relaxed,
    marginTop: spacing.xs,
  },

  unreadDot: {
    width: 9,
    height: 9,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    marginTop: 7,
  },

  // Date and time

  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },

  dateText: {
    color: colors.muted,
    fontSize: typography.fontSize.xs,
  },

  // Order link

  orderLink: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginTop: spacing.md,
    gap: spacing.xs,
  },

  orderLinkText: {
    color: colors.primary,
    fontSize: typography.fontSize.xs,
    fontWeight: '700',
  },

  // Empty state

  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
  },

  // Footer

  footerText: {
    textAlign: 'center',
    color: colors.muted,
    fontSize: typography.fontSize.xs,
    paddingVertical: spacing.lg,
  },

});
