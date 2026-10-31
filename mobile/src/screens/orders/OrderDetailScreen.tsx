

import React, { useState } from 'react';

import {
  Image,
  RefreshControl,
  ScrollView,
  Text,
  View,
  StyleSheet,
} from 'react-native';

import Animated, {
  FadeInDown,
  FadeInUp,
} from 'react-native-reanimated';

import { SafeAreaView } from 'react-native-safe-area-context';

import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { orderApi } from '@/api/services';

import {
  ConfirmationDialog,
  CustomButton,
  ErrorMessage,
  LoadingIndicator,
  PriceSummary,
  StatusBadge,
} from '@/components';

import {
  API_URL,
  MEDIA_FALLBACK,
} from '@/constants/config';

import {
  colors,
  typography,
  spacing,
  radius,
  shadows,
  motion,
} from '@/constants/theme';

import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import { useToast } from '@/context/ToastContext';

import { useFetch } from '@/hooks/useFetch';

import type { RootStackParamList } from '@/navigation/types';

import { payOnline } from '@/services/razorpay';

import { errorMessage } from '@/utils/forms';

import {
  formatDate,
  formatDateTime,
  formatINR,
} from '@/utils/format';

import { tokens } from '@/utils/storage';

// ======================================================
// ORDER DETAIL SCREEN
// ======================================================

export default function OrderDetailScreen({

  route,
  navigation,

}: NativeStackScreenProps<RootStackParamList, 'OrderDetail'>) {

  const { id } = route.params;

  const toast = useToast();

  const { user } = useAuth();

  const { refresh: refreshCart } = useCart();

  // ====================================================
  // FETCH ORDER
  // ====================================================

  const order = useFetch(
    () => orderApi.get(id),
    [id],
    { refetchOnFocus: true }
  );

  const [confirmCancel, setConfirmCancel] = useState(false);

  const [busy, setBusy] = useState<
    'cancel' | 'invoice' | 'pay' | null
  >(null);

  // ====================================================
  // LOADING STATE
  // ====================================================

  if (order.loading) {

    return (

      <SafeAreaView style={styles.stateContainer}>

        <LoadingIndicator />

      </SafeAreaView>

    );

  }

  // ====================================================
  // ERROR STATE
  // ====================================================

  if (order.error || !order.data) {

    return (

      <SafeAreaView style={styles.stateContainer}>

        <ErrorMessage
          message={order.error ?? 'Order not found'}
          onRetry={order.reload}
        />

      </SafeAreaView>

    );

  }

  const o = order.data;

  // ====================================================
  // CANCEL ORDER
  // ====================================================

  const cancel = async () => {

    setConfirmCancel(false);

    setBusy('cancel');

    try {

      order.setData(
        await orderApi.cancel(id)
      );

      toast.show(
        'Order cancelled successfully',
        'success'
      );

      refreshCart();

    } catch (e) {

      toast.show(errorMessage(e), 'error');

      order.refresh();

    } finally {

      setBusy(null);

    }

  };

  // ====================================================
  // DOWNLOAD INVOICE
  // ====================================================

  const downloadInvoice = async () => {

    setBusy('invoice');

    try {

      // Refresh expired access token through
      // the authenticated API interceptor.

      await orderApi.get(id);

      const token = await tokens.getAccess();

      if (!token) {
        throw new Error('Please login again to download the invoice.');
      }

      const target =
        `${FileSystem.documentDirectory}invoice-${o.order_number}.pdf`;

      if (!FileSystem.documentDirectory) {
        throw new Error('Invoice storage is unavailable.');
      }

      const res = await FileSystem.downloadAsync(

        `${API_URL}/orders/${id}/invoice/`,

        target,

        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }

      );

      if (res.status !== 200) {

        throw new Error(
          'The invoice could not be generated.'
        );

      }

      if (await Sharing.isAvailableAsync()) {

        await Sharing.shareAsync(
          res.uri,
          {
            mimeType: 'application/pdf',
            UTI: 'com.adobe.pdf',
            dialogTitle: `Invoice ${o.order_number}`,
          }
        );

      } else {

        toast.show(
          `Invoice saved to ${res.uri}`,
          'success'
        );

      }

    } catch (e) {

      toast.show(
        errorMessage(e, 'Could not download the invoice.'),
        'error'
      );

    } finally {

      setBusy(null);

    }

  };

  // ====================================================
  // PAY ONLINE
  // ====================================================

  const payNow = async () => {

    if (!user) {

      toast.show(
        'Please login again to continue payment.',
        'error'
      );

      return;

    }

    setBusy('pay');

    try {

      const outcome = await payOnline(
        o.id,
        user
      );

      navigation.navigate('PaymentResult', {

        status: outcome.status,

        orderId: o.id,

        reason:
          'reason' in outcome
            ? outcome.reason
            : undefined,

        method: 'RAZORPAY',

      });

    } catch (e) {

      toast.show(
        errorMessage(e),
        'error'
      );

    } finally {

      setBusy(null);

    }

  };

  // ====================================================
  // ORDER CONDITIONS
  // ====================================================

  const invoiceReady =
    o.status !== 'PENDING_PAYMENT' &&
    o.status !== 'CANCELLED';

  const showEstimatedDelivery =
    !!o.estimated_delivery &&
    o.status !== 'DELIVERED' &&
    o.status !== 'CANCELLED';

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
            refreshing={order.refreshing}
            onRefresh={order.refresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />

        }

      >

        {/* ============================================
            ORDER HEADER
        ============================================ */}

        <Animated.View
          entering={FadeInDown.duration(
            motion.duration.smooth
          )}
          style={styles.orderHeader}
        >

          <View style={styles.orderTopRow}>

            <View style={styles.orderNumberContainer}>

              <Text style={styles.orderLabel}>
                ORDER NUMBER
              </Text>

              <Text style={styles.orderNumber}>
                {o.order_number}
              </Text>

            </View>

            <StatusBadge
              status={o.status}
              label={o.status_label}
            />

          </View>

          <View style={styles.dateRow}>

            <Text style={styles.dateLabel}>
              Placed on
            </Text>

            <Text style={styles.dateValue}>
              {formatDateTime(o.created_at)}
            </Text>

          </View>

          <View style={styles.divider} />

          {/* PAYMENT STATUS */}

          <View style={styles.paymentRow}>

            <View style={styles.paymentInfo}>

              <Text style={styles.paymentLabel}>
                Payment Method
              </Text>

              <Text style={styles.paymentValue}>
                {o.payment_method === 'COD'
                  ? 'Cash on Delivery'
                  : 'Online Payment'}
              </Text>

            </View>

            <View style={styles.paymentStatus}>

              <Text style={styles.paymentLabel}>
                Payment Status
              </Text>

              <StatusBadge
                status={o.payment_status}
                label={o.payment_status.replace(/_/g, ' ')}
              />

            </View>

          </View>

          {/* ESTIMATED DELIVERY */}

          {showEstimatedDelivery && (

            <View style={styles.deliveryNotice}>

              <Text style={styles.deliveryNoticeTitle}>
                Estimated Delivery
              </Text>

              <Text style={styles.deliveryNoticeDate}>
                {formatDate(o.estimated_delivery)}
              </Text>

            </View>

          )}

          {/* REFUND STATUS */}

          {o.payment_status === 'REFUND_PENDING' && (

            <View style={styles.refundNotice}>

              <Text style={styles.refundText}>
                Your refund is being processed.
              </Text>

            </View>

          )}

        </Animated.View>

        {/* ============================================
            PENDING PAYMENT NOTICE
        ============================================ */}

        {o.status === 'PENDING_PAYMENT' &&
          o.payment_method === 'RAZORPAY' && (

          <Animated.View
            entering={FadeInDown.delay(100)}
            style={styles.pendingCard}
          >

            <View style={styles.pendingHeader}>

              <Text style={styles.pendingTitle}>
                Payment Required
              </Text>

            </View>

            <Text style={styles.pendingDescription}>
              This order is waiting for payment. Unpaid orders are cancelled automatically after a short time.
            </Text>

            <CustomButton
              label="Pay Now"
              icon="credit-card-outline"
              onPress={payNow}
              loading={busy === 'pay'}
            />

          </Animated.View>

        )}

        {/* ============================================
            ORDER ITEMS
        ============================================ */}

        <Animated.View
          entering={FadeInDown.delay(180)}
          style={styles.section}
        >

          <View style={styles.sectionHeader}>

            <Text style={styles.sectionTitle}>
              Order Items
            </Text>

            <Text style={styles.itemCount}>
              {o.items.length} {o.items.length === 1 ? 'Item' : 'Items'}
            </Text>

          </View>

          {o.items.map((item, index) => (

            <Animated.View
              key={item.id}
              entering={FadeInUp
                .delay(Math.min(index * 70, 350))
                .duration(motion.duration.smooth)}
              style={styles.productCard}
            >

              {/* PRODUCT IMAGE */}

              <Image
                source={{
                  uri: item.thumbnail ?? MEDIA_FALLBACK,
                }}
                style={styles.productImage}
              />

              {/* PRODUCT INFORMATION */}

              <View style={styles.productInfo}>

                <Text
                  numberOfLines={2}
                  style={styles.productName}
                >
                  {item.product_name}
                </Text>

                <Text style={styles.productQuantity}>
                  {item.quantity} × {formatINR(item.unit_price)}
                </Text>

              </View>

              {/* LINE TOTAL */}

              <Text style={styles.lineTotal}>
                {formatINR(item.line_total)}
              </Text>

            </Animated.View>

          ))}

        </Animated.View>

        {/* ============================================
            DELIVERY ADDRESS
        ============================================ */}

        <Animated.View
          entering={FadeInDown.delay(250)}
          style={styles.section}
        >

          <Text style={styles.sectionTitle}>
            Delivery Address
          </Text>

          <View style={styles.addressCard}>

            <Text style={styles.shippingName}>
              {o.shipping_name}
            </Text>

            <Text style={styles.shippingAddress}>
              {o.shipping_address}
            </Text>

            <View style={styles.phoneRow}>

              <Text style={styles.phoneLabel}>
                Phone:
              </Text>

              <Text style={styles.phoneValue}>
                {o.shipping_phone}
              </Text>

            </View>

          </View>

        </Animated.View>

        {/* ============================================
            PAYMENT SUMMARY
        ============================================ */}

        <Animated.View
          entering={FadeInDown.delay(320)}
          style={styles.section}
        >

          <Text style={styles.sectionTitle}>
            Payment Summary
          </Text>

          <View style={styles.summaryCard}>

            <PriceSummary

              rows={[

                {
                  label: 'Items',
                  value: o.items_total,
                },

                ...(Number(o.coupon_discount) > 0
                  ? [{
                      label: `Coupon ${o.coupon_code}`,
                      value: o.coupon_discount,
                      negative: true,
                    }]
                  : []),

                {
                  label: 'Delivery',
                  value: o.delivery_charge,
                  free: true,
                },

                {
                  label: 'Total',
                  value: o.total_amount,
                  bold: true,
                },

              ]}

            />

          </View>

        </Animated.View>

        {/* ============================================
            ORDER ACTIONS
        ============================================ */}

        <Animated.View
          entering={FadeInDown.delay(400)}
          style={styles.actions}
        >

          {/* TRACK ORDER */}

          {o.status !== 'CANCELLED' &&
            o.status !== 'PENDING_PAYMENT' && (

            <CustomButton
              label="Track Order"
              icon="map-marker-path"
              onPress={() =>
                navigation.navigate('OrderTracking', {
                  id: o.id,
                })
              }
              style={styles.actionButton}
            />

          )}

          {/* DOWNLOAD INVOICE */}

          {invoiceReady && (

            <CustomButton
              label="Download Invoice (PDF)"
              icon="file-pdf-box"
              mode="outlined"
              onPress={downloadInvoice}
              loading={busy === 'invoice'}
              style={styles.actionButton}
            />

          )}

          {/* CANCEL ORDER */}

          {o.can_cancel && (

            <CustomButton
              label="Cancel Order"
              mode="outlined"
              danger
              onPress={() => setConfirmCancel(true)}
              loading={busy === 'cancel'}
              style={styles.actionButton}
            />

          )}

        </Animated.View>

        {/* ============================================
            FOOTER
        ============================================ */}

        <Animated.View
          entering={FadeInDown.delay(500)}
          style={styles.footer}
        >

          <Text style={styles.footerBrand}>
            VELORA
          </Text>

          <Text style={styles.footerText}>
            Thank you for shopping with us.
          </Text>

        </Animated.View>

      </ScrollView>

      {/* ==============================================
          CANCEL ORDER CONFIRMATION
      ============================================== */}

      <ConfirmationDialog
        visible={confirmCancel}
        title="Cancel this order?"
        message="Items go back to stock. If you already paid online, a refund will be processed."
        confirmLabel="Cancel order"
        danger
        onCancel={() => setConfirmCancel(false)}
        onConfirm={cancel}
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

  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxxl,
  },

  // Order header

  orderHeader: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.small,
  },

  orderTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },

  orderNumberContainer: {
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
    fontSize: typography.fontSize.xl,
    fontWeight: '800',
    marginTop: spacing.xs,
  },

  dateRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.md,
  },

  dateLabel: {
    color: colors.muted,
    fontSize: typography.fontSize.xs,
  },

  dateValue: {
    color: colors.textSecondary,
    fontSize: typography.fontSize.xs,
    fontWeight: '600',
  },

  divider: {
    height: 1,
    backgroundColor: colors.divider,
    marginVertical: spacing.lg,
  },

  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
  },

  paymentInfo: {
    flex: 1,
    gap: spacing.xs,
  },

  paymentStatus: {
    alignItems: 'flex-end',
    gap: spacing.xs,
  },

  paymentLabel: {
    color: colors.muted,
    fontSize: typography.fontSize.xs,
    fontWeight: '600',
  },

  paymentValue: {
    color: colors.text,
    fontSize: typography.fontSize.sm,
    fontWeight: '700',
  },

  // Estimated delivery

  deliveryNotice: {
    backgroundColor: colors.surfaceGreen,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    padding: spacing.md,
    marginTop: spacing.lg,
  },

  deliveryNoticeTitle: {
    color: colors.primaryDark,
    fontSize: typography.fontSize.xs,
    fontWeight: '700',
  },

  deliveryNoticeDate: {
    color: colors.primary,
    fontSize: typography.fontSize.md,
    fontWeight: '800',
    marginTop: spacing.xs,
  },

  // Refund notice

  refundNotice: {
    backgroundColor: colors.warningLight,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.md,
  },

  refundText: {
    color: colors.warning,
    fontSize: typography.fontSize.sm,
    fontWeight: '700',
  },

  // Pending payment

  pendingCard: {
    backgroundColor: colors.warningLight,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: '#FDE68A',
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },

  pendingHeader: {
    marginBottom: spacing.sm,
  },

  pendingTitle: {
    color: '#92400E',
    fontSize: typography.fontSize.lg,
    fontWeight: '800',
  },

  pendingDescription: {
    color: '#92400E',
    fontSize: typography.fontSize.sm,
    lineHeight: typography.lineHeight.relaxed,
    marginBottom: spacing.lg,
  },

  // Sections

  section: {
    marginBottom: spacing.lg,
  },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },

  sectionTitle: {
    color: colors.primaryDark,
    fontSize: typography.fontSize.lg,
    fontWeight: '800',
    marginBottom: spacing.md,
  },

  itemCount: {
    color: colors.muted,
    fontSize: typography.fontSize.xs,
    fontWeight: '600',
  },

  // Product cards

  productCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.md,
    ...shadows.small,
  },

  productImage: {
    width: 76,
    height: 76,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSoft,
  },

  productInfo: {
    flex: 1,
    minWidth: 0,
  },

  productName: {
    color: colors.text,
    fontSize: typography.fontSize.md,
    fontWeight: '700',
    lineHeight: typography.lineHeight.normal,
  },

  productQuantity: {
    color: colors.muted,
    fontSize: typography.fontSize.xs,
    marginTop: spacing.sm,
  },

  lineTotal: {
    color: colors.primaryDark,
    fontSize: typography.fontSize.md,
    fontWeight: '800',
  },

  // Address

  addressCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    ...shadows.small,
  },

  shippingName: {
    color: colors.text,
    fontSize: typography.fontSize.md,
    fontWeight: '800',
    marginBottom: spacing.sm,
  },

  shippingAddress: {
    color: colors.textSecondary,
    fontSize: typography.fontSize.sm,
    lineHeight: typography.lineHeight.relaxed,
  },

  phoneRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.md,
  },

  phoneLabel: {
    color: colors.muted,
    fontSize: typography.fontSize.sm,
  },

  phoneValue: {
    color: colors.text,
    fontSize: typography.fontSize.sm,
    fontWeight: '700',
  },

  // Price summary

  summaryCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.lg,
    ...shadows.small,
  },

  // Action buttons

  actions: {
    marginTop: spacing.sm,
    gap: spacing.sm,
  },

  actionButton: {
    marginBottom: spacing.xs,
  },

  // Footer

  footer: {
    alignItems: 'center',
    paddingTop: spacing.xl,
  },

  footerBrand: {
    color: colors.primaryDark,
    fontSize: typography.fontSize.xl,
    fontWeight: '800',
    letterSpacing: 4,
  },

  footerText: {
    color: colors.muted,
    fontSize: typography.fontSize.xs,
    marginTop: spacing.xs,
  },

});
