

import React, { useState } from 'react';

import {
  Text,
  View,
  StyleSheet,
} from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';

import Animated, {
  FadeIn,
  FadeInDown,
  ZoomIn,
} from 'react-native-reanimated';

import { SafeAreaView } from 'react-native-safe-area-context';

import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { CustomButton } from '@/components';

import {
  colors,
  typography,
  spacing,
  radius,
  shadows,
  motion,
} from '@/constants/theme';

import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';

import type { RootStackParamList } from '@/navigation/types';

import { payOnline } from '@/services/razorpay';

import { errorMessage } from '@/utils/forms';

// ======================================================
// PAYMENT STATUS CONFIGURATION
// ======================================================

const VIEW: Record<
  string,
  {
    icon: string;
    color: string;
    background: string;
    title: string;
    subtitle: string;
  }
> = {

  success: {
    icon: 'check-circle',
    color: colors.success,
    background: colors.successLight,
    title: 'Order placed!',
    subtitle: 'Your order has been successfully confirmed.',
  },

  pending: {
    icon: 'clock-outline',
    color: colors.warning,
    background: colors.warningLight,
    title: 'Payment pending',
    subtitle: 'We are waiting for payment confirmation.',
  },

  failed: {
    icon: 'close-circle',
    color: colors.danger,
    background: colors.dangerLight,
    title: 'Payment failed',
    subtitle: 'Your payment could not be completed.',
  },

  cancelled: {
    icon: 'cancel',
    color: colors.warning,
    background: colors.warningLight,
    title: 'Payment cancelled',
    subtitle: 'The payment process was cancelled.',
  },

  unavailable: {
    icon: 'cellphone-off',
    color: colors.warning,
    background: colors.warningLight,
    title: 'Online payment unavailable',
    subtitle: 'Online payment could not be started.',
  },

};

// ======================================================
// PAYMENT RESULT SCREEN
// ======================================================

export default function PaymentResultScreen({

  route,
  navigation,

}: NativeStackScreenProps<RootStackParamList, 'PaymentResult'>) {

  const {
    status,
    orderId,
    reason,
    method,
  } = route.params;

  const { user } = useAuth();

  const toast = useToast();

  const [busy, setBusy] = useState(false);

  // ====================================================
  // STATUS CONFIG
  // ====================================================

  const v = VIEW[status];

  const ok =
    status === 'success' ||
    status === 'pending';

  // ====================================================
  // STATUS MESSAGE
  // ====================================================

  const message =
    status === 'success'

      ? method === 'COD'
        ? 'Pay in cash when your order arrives. We will keep you posted.'
        : 'Your payment was received and your order is confirmed.'

      : status === 'pending'

        ? 'The bank has not confirmed your payment yet. You will get a notification as soon as it does. There is no need to pay again.'

        : (reason || 'Something went wrong with the payment.')
          + ' Your order is saved. You can retry the payment from My Orders.';

  // ====================================================
  // RETRY PAYMENT
  // ====================================================

  const retry = async () => {

    if (busy) return;

    if (!user) {
      toast.show('Please login again to retry payment.', 'error');
      return;
    }

    setBusy(true);

    try {

      const o = await payOnline(orderId, user);

      navigation.replace('PaymentResult', {
        status: o.status,
        orderId,
        reason: 'reason' in o ? o.reason : undefined,
        method: 'RAZORPAY',
      });

    } catch (e) {

      toast.show(errorMessage(e), 'error');

    } finally {

      setBusy(false);

    }
  };

  // ====================================================
  // VIEW ORDER
  // ====================================================

  const viewOrder = () => {

    navigation.replace('OrderDetail', {
      id: orderId,
    });

  };

  // ====================================================
  // CONTINUE SHOPPING
  // ====================================================

  const continueShopping = () => {

    navigation.replace('Tabs');

  };

  // ====================================================
  // MAIN UI
  // ====================================================

  return (

    <SafeAreaView style={styles.container}>

      <View style={styles.content}>

        {/* ============================================
            STATUS ICON
        ============================================ */}

        <Animated.View
          entering={ZoomIn.duration(500)}
          style={[
            styles.iconOuter,
            {
              backgroundColor: v.background,
            },
          ]}
        >

          <View
            style={[
              styles.iconInner,
              {
                borderColor: v.color,
              },
            ]}
          >

            <MaterialCommunityIcons
              name={v.icon as any}
              size={82}
              color={v.color}
            />

          </View>

        </Animated.View>

        {/* ============================================
            STATUS TITLE
        ============================================ */}

        <Animated.View
          entering={FadeInDown
            .delay(250)
            .duration(motion.duration.smooth)}
          style={styles.headingContainer}
        >

          <Text style={styles.title}>
            {v.title}
          </Text>

          <Text style={styles.subtitle}>
            {v.subtitle}
          </Text>

        </Animated.View>

        {/* ============================================
            ORDER INFORMATION CARD
        ============================================ */}

        <Animated.View
          entering={FadeInDown
            .delay(400)
            .duration(motion.duration.smooth)}
          style={styles.orderCard}
        >

          <View style={styles.orderIconContainer}>

            <MaterialCommunityIcons
              name="cart-check"
              size={27}
              color={colors.primary}
            />

          </View>

          <View style={styles.orderInfo}>

            <Text style={styles.orderLabel}>
              Order Number
            </Text>

            <Text style={styles.orderNumber}>
              #{orderId}
            </Text>

          </View>

          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor: v.background,
              },
            ]}
          >

            <Text
              style={[
                styles.statusText,
                {
                  color: v.color,
                },
              ]}
            >
              {status.toUpperCase()}
            </Text>

          </View>

        </Animated.View>

        {/* ============================================
            INFORMATION MESSAGE
        ============================================ */}

        <Animated.View
          entering={FadeInDown
            .delay(500)
            .duration(motion.duration.smooth)}
          style={styles.messageCard}
        >

          <MaterialCommunityIcons
            name="information-outline"
            size={22}
            color={colors.primary}
          />

          <Text style={styles.messageText}>
            {message}
          </Text>

        </Animated.View>

        {/* ============================================
            PAYMENT METHOD
        ============================================ */}

        {method && (

          <Animated.View
            entering={FadeIn.delay(600)}
            style={styles.paymentMethod}
          >

            <MaterialCommunityIcons
              name={
                method === 'COD'
                  ? 'cash'
                  : 'credit-card-outline'
              }
              size={21}
              color={colors.muted}
            />

            <Text style={styles.paymentMethodText}>
              Payment method: {method === 'COD' ? 'Cash on Delivery' : method}
            </Text>

          </Animated.View>

        )}

        {/* ============================================
            ACTION BUTTONS
        ============================================ */}

        <Animated.View
          entering={FadeInDown
            .delay(650)
            .duration(motion.duration.smooth)}
          style={styles.actions}
        >

          {/* RETRY PAYMENT */}

          {!ok && status !== 'unavailable' && (

            <CustomButton
              label="Retry Payment"
              icon="refresh"
              onPress={retry}
              loading={busy}
              style={styles.button}
            />

          )}

          {/* VIEW ORDER */}

          <CustomButton
            label="View Order"
            icon="package-variant"
            mode={ok ? 'contained' : 'outlined'}
            onPress={viewOrder}
            style={styles.button}
          />

          {/* CONTINUE SHOPPING */}

          <CustomButton
            label="Continue Shopping"
            icon="shopping-outline"
            mode="text"
            onPress={continueShopping}
            style={styles.button}
          />

        </Animated.View>

      </View>

      {/* ==============================================
          FOOTER
      ============================================== */}

      <Animated.View
        entering={FadeIn.delay(800)}
        style={styles.footer}
      >

        <MaterialCommunityIcons
          name="leaf"
          size={19}
          color={colors.secondary}
        />

        <Text style={styles.footerText}>
          Thank you for shopping with VELORA
        </Text>

      </Animated.View>

    </SafeAreaView>
  );
}

// ======================================================
// STYLES
// ======================================================

const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingHorizontal: spacing.lg,
  },

  content: {
    flex: 1,
    justifyContent: 'center',
  },

  // Status icon

  iconOuter: {
    width: 142,
    height: 142,
    alignSelf: 'center',
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },

  iconInner: {
    width: 116,
    height: 116,
    borderRadius: radius.pill,
    backgroundColor: colors.card,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.medium,
  },

  // Heading

  headingContainer: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },

  title: {
    color: colors.primaryDark,
    fontSize: typography.fontSize.xxl,
    fontWeight: '800',
    textAlign: 'center',
  },

  subtitle: {
    color: colors.muted,
    fontSize: typography.fontSize.sm,
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: typography.lineHeight.normal,
  },

  // Order information

  orderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.md,
    ...shadows.small,
  },

  orderIconContainer: {
    width: 52,
    height: 52,
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
    fontWeight: '600',
  },

  orderNumber: {
    color: colors.primaryDark,
    fontSize: typography.fontSize.lg,
    fontWeight: '800',
    marginTop: 3,
  },

  statusBadge: {
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },

  statusText: {
    fontSize: 11,
    fontWeight: '800',
  },

  // Message

  messageCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.surfaceGreen,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    padding: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.md,
  },

  messageText: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: typography.fontSize.sm,
    lineHeight: typography.lineHeight.relaxed,
  },

  // Payment method

  paymentMethod: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },

  paymentMethodText: {
    color: colors.muted,
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
  },

  // Actions

  actions: {
    marginTop: spacing.sm,
    gap: spacing.sm,
  },

  button: {
    marginBottom: spacing.xs,
  },

  // Footer

  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
    gap: spacing.sm,
  },

  footerText: {
    color: colors.muted,
    fontSize: typography.fontSize.xs,
    fontWeight: '600',
  },

});
