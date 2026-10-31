

import React, { useEffect, useState } from 'react';

import {
  
  Pressable,
  ScrollView,
  Text,
  View,
  StyleSheet,
} from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';

import Animated, {
  FadeIn,
  FadeInDown,
} from 'react-native-reanimated';

import { TextInput } from 'react-native-paper';

import { addressApi, orderApi } from '@/api/services';

import {
  AddressCard,
  CustomButton,
  EmptyState,
  ErrorMessage,
  LoadingIndicator,
  PriceSummary,
} from '@/components';

import {
  colors,
  typography,
  spacing,
  radius,
  shadows,
} from '@/constants/theme';

import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import { useToast } from '@/context/ToastContext';

import { useFetch } from '@/hooks/useFetch';
import { useNav } from '@/navigation/hooks';

import { payOnline } from '@/services/razorpay';

import type { PaymentMethod } from '@/types';

import { errorMessage } from '@/utils/forms';
import { formatINR } from '@/utils/format';

// ======================================================
// PAYMENT METHODS
// ======================================================

const METHODS: {
  value: PaymentMethod;
  title: string;
  text: string;
  icon: string;
}[] = [
  {
    value: 'RAZORPAY',
    title: 'Pay Online',
    text: 'UPI, debit/credit card, net banking via Razorpay',
    icon: 'credit-card-outline',
  },
  {
    value: 'COD',
    title: 'Cash on Delivery',
    text: 'Pay in cash when your order arrives',
    icon: 'cash',
  },
];

// ======================================================
// SECTION HEADING
// ======================================================

function SectionTitle({
  n,
  title,
  subtitle,
}: {
  n: number;
  title: string;
  subtitle?: string;
}) {
  return (
    <Animated.View
      entering={FadeInDown.duration(350)}
      style={styles.sectionHeading}
    >
      <View style={styles.sectionNumber}>
        <Text style={styles.sectionNumberText}>
          {n}
        </Text>
      </View>

      <View style={styles.sectionHeadingText}>
        <Text style={styles.sectionTitle}>
          {title}
        </Text>

        {!!subtitle && (
          <Text style={styles.sectionSubtitle}>
            {subtitle}
          </Text>
        )}
      </View>
    </Animated.View>
  );
}

// ======================================================
// PAYMENT METHOD CARD
// ======================================================

function PaymentMethodCard({
  method,
  selected,
  onPress,
  index,
}: {
  method: (typeof METHODS)[number];
  selected: boolean;
  onPress: () => void;
  index: number;
}) {
  return (
    <Animated.View
      entering={FadeInDown
        .delay(index * 100)
        .duration(400)}
    >
      <Pressable
        onPress={onPress}
        accessibilityRole="radio"
        accessibilityState={{ selected }}
        style={({ pressed }) => [
          styles.paymentCard,
          selected && styles.paymentCardSelected,
          pressed && styles.paymentCardPressed,
        ]}
      >
        <View
          style={[
            styles.paymentIcon,
            selected && styles.paymentIconSelected,
          ]}
        >
          <MaterialCommunityIcons
            name={method.icon as any}
            size={27}
            color={
              selected
                ? colors.primary
                : colors.muted
            }
          />
        </View>

        <View style={styles.paymentTextContainer}>
          <Text
            style={[
              styles.paymentTitle,
              selected && styles.paymentTitleSelected,
            ]}
          >
            {method.title}
          </Text>

          <Text style={styles.paymentDescription}>
            {method.text}
          </Text>
        </View>

        <MaterialCommunityIcons
          name={
            selected
              ? 'radiobox-marked'
              : 'radiobox-blank'
          }
          size={25}
          color={
            selected
              ? colors.primary
              : colors.muted
          }
        />
      </Pressable>
    </Animated.View>
  );
}

// ======================================================
// VELORA CHECKOUT SCREEN
// ======================================================

export default function CheckoutScreen() {
  const nav = useNav();
  const toast = useToast();

  const { user } = useAuth();

  const { refresh: refreshCart } = useCart();

  // ====================================================
  // ADDRESS API
  // ====================================================

  const addresses = useFetch(
    addressApi.list,
    [],
    { refetchOnFocus: true },
  );

  // ====================================================
  // ADDRESS STATE
  // ====================================================

  const [addressId, setAddressId] =
    useState<number | null>(null);

  // ====================================================
  // PAYMENT STATE
  // ====================================================

  const [method, setMethod] =
    useState<PaymentMethod>('RAZORPAY');

  // ====================================================
  // COUPON STATE
  // ====================================================

  const [couponInput, setCouponInput] = useState('');
  const [coupon, setCoupon] = useState('');
  const [couponError, setCouponError] = useState('');
  const [applying, setApplying] = useState(false);

  // ====================================================
  // ORDER STATE
  // ====================================================

  const [placing, setPlacing] = useState(false);

  // ====================================================
  // CHECKOUT SUMMARY API
  // Address and coupon changes refresh the summary.
  // ====================================================

  const summary = useFetch(
    () => orderApi.summary(addressId!, coupon || undefined),
    [addressId, coupon],
    {
      refetchOnFocus: true,
      enabled: addressId !== null,
    },
  );

  // ====================================================
  // AUTO SELECT DEFAULT ADDRESS
  // ====================================================

  useEffect(() => {
    const list = addresses.data;

    if (!list?.length) {
      setAddressId(null);
      return;
    }

    const selectedAddressExists = list.some(
      (address) => address.id === addressId,
    );

    if (addressId === null || !selectedAddressExists) {
      const selectedAddress =
        list.find((address) => address.is_default) ??
        list[0];

      setAddressId(selectedAddress.id);
    }
  }, [addresses.data, addressId]);

  // ====================================================
  // APPLY COUPON
  // ====================================================

  const applyCoupon = async () => {
    if (!couponInput.trim() || applying) return;

    setApplying(true);
    setCouponError('');

    try {
      const response = await orderApi.validateCoupon(
        couponInput.trim(),
      );

      setCoupon(response.code);

      toast.show(
        `Coupon ${response.code} applied`,
        'success',
      );

    } catch (error) {
      setCouponError(errorMessage(error));

    } finally {
      setApplying(false);
    }
  };

  // ====================================================
  // REMOVE COUPON
  // ====================================================

  const removeCoupon = () => {
    setCoupon('');
    setCouponInput('');
    setCouponError('');
  };

  // ====================================================
  // PLACE ORDER
  // ====================================================

  const placeOrder = async () => {
    if (placing) return;

    if (addressId === null) {
      toast.show(
        'Please select a delivery address',
        'error',
      );
      return;
    }

    if (!summary.data) {
      toast.show(
        'Please wait for the order summary.',
        'error',
      );
      return;
    }

    if (!user) {
      toast.show(
        'Please log in to continue.',
        'error',
      );
      return;
    }
   
    

    setPlacing(true);

    try {
      // ----------------------------------------------
      // CREATE ORDER
      // Backend recalculates all prices and GST.
      // ----------------------------------------------

      const order = await orderApi.checkout({
        address_id: addressId,
        payment_method: method,
        coupon_code: coupon || undefined,
      });

      // ----------------------------------------------
      // CASH ON DELIVERY
      // ----------------------------------------------

      if (method === 'COD') {
        await refreshCart();

        nav.replace('PaymentResult', {
          status: 'success',
          orderId: order.id,
          method,
        });

        return;
      }

      // ----------------------------------------------
      // RAZORPAY PAYMENT
      // Uses the order created by the backend.
      // ----------------------------------------------

      const outcome = await payOnline(
        order.id,
        user,
      );

      // ----------------------------------------------
      // REFRESH CART AFTER SUCCESS
      // ----------------------------------------------

      if (outcome.status === 'success') {
        await refreshCart();
      }

      // ----------------------------------------------
      // PAYMENT RESULT
      // ----------------------------------------------

      nav.replace('PaymentResult', {
        status: outcome.status,
        orderId: order.id,
        reason:
          'reason' in outcome
            ? outcome.reason
            : undefined,
        method,
      });

    } catch (error) {
      console.error(
        '[CHECKOUT] Order or payment error:',
        error,
      );

      toast.show(
        errorMessage(error),
        'error',
      );

      summary.reload();

    } finally {
      setPlacing(false);
    }
  };

  // ====================================================
  // ADDRESS LOADING
  // ====================================================

  if (addresses.loading) {
    return <LoadingIndicator />;
  }

  // ====================================================
  // ADDRESS ERROR
  // ====================================================

  if (addresses.error) {
    return (
      <ErrorMessage
        message={addresses.error}
        onRetry={addresses.reload}
      />
    );
  }

  // ====================================================
  // SUMMARY LOADING
  // Only load after selecting an address.
  // ====================================================

  if (addressId !== null && summary.loading) {
    return <LoadingIndicator />;
  }

  // ====================================================
  // SUMMARY ERROR
  // ====================================================

  if (addressId !== null && summary.error) {
    return (
      <ErrorMessage
        message={summary.error}
        onRetry={summary.reload}
      />
    );
  }

  // ====================================================
  // CHECKOUT DATA
  // ====================================================

  const addressList = addresses.data ?? [];

  const s = summary.data;

  // ====================================================
  // GST BREAKDOWN ROWS
  // ====================================================

  const gstRows = s
    ? s.tax_type === 'INTRA_STATE'
      ? [
          {
            label: 'CGST',
            value: s.cgst_amount,
          },
          {
            label: 'SGST',
            value: s.sgst_amount,
          },
        ]
      : [
          {
            label: 'IGST',
            value: s.igst_amount,
          },
        ]
    : [];

  // ====================================================
  // ORDER PRICE BREAKDOWN
  // ====================================================

  const priceRows = s
    ? [
        {
          label: `Items (${s.item_count})`,
          value: s.original_items_total,
        },

        ...(Number(s.product_discount) > 0
          ? [
              {
                label: 'Product Discount',
                value: s.product_discount,
                negative: true,
              },
            ]
          : []),

        ...(Number(s.coupon_discount) > 0
          ? [
              {
                label: `Coupon ${s.coupon_code}`,
                value: s.coupon_discount,
                negative: true,
              },
            ]
          : []),

        {
          label: 'Delivery',
          value: s.delivery_charge,
        },

        {
          label: 'Taxable Amount',
          value: s.taxable_amount,
        },

        ...gstRows,

        {
          label: 'Total Payable',
          value: s.total_amount,
          bold: true,
        },
      ]
    : [];

  // ====================================================
  // MAIN UI
  // ====================================================

  return (
    <View style={styles.container}>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >

        {/* CHECKOUT HEADER */}

        <Animated.View
          entering={FadeInDown.duration(450)}
          style={styles.pageHeader}
        >
          <View style={styles.pageHeaderIcon}>
            <MaterialCommunityIcons
              name="cart-check"
              size={27}
              color={colors.primary}
            />
          </View>

          <View style={styles.pageHeaderText}>
            <Text style={styles.pageTitle}>
              Secure Checkout
            </Text>

            <Text style={styles.pageSubtitle}>
              Complete your order with VELORA.
            </Text>
          </View>
        </Animated.View>

        {/* STEP 1 — DELIVERY ADDRESS */}

        <SectionTitle
          n={1}
          title="Delivery Address"
          subtitle="Where should we deliver your order?"
        />

        {addressList.length > 0 ? (
          <View style={styles.addressList}>
            {addressList.map((address, index) => (
              <Animated.View
                key={address.id}
                entering={FadeInDown
                  .delay(index * 75)
                  .duration(400)}
              >
                <AddressCard
                  address={address}
                  selected={address.id === addressId}
                  onPress={() => setAddressId(address.id)}
                />
              </Animated.View>
            ))}
          </View>
        ) : (
          <EmptyState
            icon="map-marker-plus-outline"
            title="No Saved Address"
            subtitle="Add your delivery address to continue."
          />
        )}

        <View style={styles.addAddressContainer}>
          <CustomButton
            label="Add New Address"
            mode="outlined"
            icon="plus"
            onPress={() => nav.navigate('AddressForm')}
            style={styles.addAddressButton}
          />
        </View>

        {/* STEP 2 — PAYMENT METHOD */}

        <SectionTitle
          n={2}
          title="Payment Method"
          subtitle="Choose how you want to pay."
        />

        {METHODS.map((payment, index) => (
          <PaymentMethodCard
            key={payment.value}
            method={payment}
            index={index}
            selected={method === payment.value}
            onPress={() => setMethod(payment.value)}
          />
        ))}

        {/* STEP 3 — COUPON */}

        <SectionTitle
          n={3}
          title="Apply Coupon"
          subtitle="Have a discount code? Use it here."
        />

        {coupon ? (
          <Animated.View
            entering={FadeInDown.duration(350)}
            style={styles.appliedCoupon}
          >
            <View style={styles.couponIcon}>
              <MaterialCommunityIcons
                name="ticket-percent"
                size={25}
                color={colors.success}
              />
            </View>

            <View style={styles.appliedCouponText}>
              <Text style={styles.appliedCouponCode}>
                {coupon}
              </Text>

              <Text style={styles.appliedCouponSubtitle}>
                Coupon applied successfully
              </Text>
            </View>

            <Pressable
              onPress={removeCoupon}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Remove coupon"
            >
              <MaterialCommunityIcons
                name="close-circle"
                size={25}
                color={colors.danger}
              />
            </Pressable>
          </Animated.View>
        ) : (
          <Animated.View
            entering={FadeInDown.duration(350)}
            style={styles.couponContainer}
          >
            <View style={styles.couponInputContainer}>
              <TextInput
                mode="outlined"
                label="Enter Coupon Code"
                value={couponInput}
                onChangeText={(text) => {
                  setCouponInput(text.toUpperCase());
                  setCouponError('');
                }}
                autoCapitalize="characters"
                error={!!couponError}
                outlineColor={colors.border}
                activeOutlineColor={colors.primary}
                textColor={colors.text}
                style={styles.couponInput}
                contentStyle={styles.couponInputText}
                left={
                  <TextInput.Icon
                    icon="ticket-percent-outline"
                  />
                }
              />
            </View>

            <CustomButton
              label="Apply"
              mode="contained-tonal"
              onPress={applyCoupon}
              loading={applying}
              disabled={!couponInput.trim() || applying}
              style={styles.applyButton}
            />
          </Animated.View>
        )}

        {!!couponError && (
          <Text style={styles.couponError}>
            {couponError}
          </Text>
        )}

        {/* STEP 4 — ORDER SUMMARY */}

        <SectionTitle
          n={4}
          title="Order Summary"
          subtitle="Review your payment before placing the order."
        />

        {s ? (
          <Animated.View
            entering={FadeInDown.delay(200).duration(450)}
            style={styles.summaryCard}
          >
            <View style={styles.summaryHeader}>
              <MaterialCommunityIcons
                name="receipt-text-outline"
                size={25}
                color={colors.primary}
              />

              <Text style={styles.summaryTitle}>
                Payment Breakdown
              </Text>
            </View>

            <PriceSummary rows={priceRows} />

            <View style={styles.taxNote}>
              <MaterialCommunityIcons
                name="information-outline"
                size={18}
                color={colors.primary}
              />

              <Text style={styles.taxNoteText}>
                {s.tax_type === 'INTRA_STATE'
                  ? 'CGST and SGST apply to this Tamil Nadu delivery.'
                  : 'IGST applies to this interstate delivery.'}
              </Text>
            </View>

            <View style={styles.secureNote}>
              <MaterialCommunityIcons
                name="shield-check"
                size={20}
                color={colors.success}
              />

             
             <Text style={styles.secureText}>
  GST, coupon discounts and delivery charges
  will be calculated at checkout.
</Text>
            </View>
          </Animated.View>
        ) : (
          <View style={styles.noSummaryCard}>
            <MaterialCommunityIcons
              name="map-marker-outline"
              size={30}
              color={colors.muted}
            />

            <Text style={styles.noSummaryTitle}>
              Select a delivery address
            </Text>

            <Text style={styles.noSummaryText}>
              Your GST and payment breakdown will appear after selecting an address.
            </Text>
          </View>
        )}

        <View style={{ height: spacing.lg }} />

      </ScrollView>

      {/* STICKY CHECKOUT BUTTON */}

      <Animated.View
        entering={FadeIn.duration(350)}
        style={styles.bottomCheckout}
      >
        <View style={styles.bottomTotalContainer}>
          <Text style={styles.bottomTotalLabel}>
            Total Amount
          </Text>

          <Text style={styles.bottomTotal}>
            {s ? formatINR(s.total_amount) : '—'}
          </Text>
        </View>

        <View style={styles.placeOrderButton}>
          <CustomButton
            label={
              placing
                ? 'Processing...'
                : method === 'COD'
                  ? 'Place Order'
                  : 'Pay & Place Order'
            }
            icon={
              method === 'COD'
                ? 'check-circle-outline'
                : 'lock-check'
            }
            onPress={placeOrder}
            loading={placing}
            disabled={
              addressId === null ||
              !s ||
              summary.loading ||
              placing
            }
            style={styles.checkoutButton}
          />
        </View>
      </Animated.View>

    </View>
  );
}

// ======================================================
// VELORA PREMIUM CHECKOUT STYLES
// ======================================================

const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },

  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
  },

  // Page heading

  pageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },

  pageHeaderIcon: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },

  pageHeaderText: {
    flex: 1,
  },

  pageTitle: {
    color: colors.primaryDark,
    fontSize: typography.fontSize.xxl,
    fontWeight: '800',
  },

  pageSubtitle: {
    color: colors.muted,
    fontSize: typography.fontSize.sm,
    lineHeight: typography.lineHeight.normal,
    marginTop: 3,
  },

  // Section headings

  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xl,
    marginBottom: spacing.md,
    gap: spacing.md,
  },

  sectionNumber: {
    width: 34,
    height: 34,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.small,
  },

  sectionNumberText: {
    color: colors.white,
    fontSize: typography.fontSize.md,
    fontWeight: '800',
  },

  sectionHeadingText: {
    flex: 1,
  },

  sectionTitle: {
    color: colors.primaryDark,
    fontSize: typography.fontSize.lg,
    fontWeight: '800',
  },

  sectionSubtitle: {
    color: colors.muted,
    fontSize: typography.fontSize.xs,
    marginTop: 3,
  },

  // Address list

  addressList: {
    gap: spacing.sm,
  },

  addAddressContainer: {
    marginTop: spacing.sm,
  },

  addAddressButton: {
    borderColor: colors.primary,
    borderRadius: radius.md,
  },

  // Payment card

  paymentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    padding: spacing.md,
    borderRadius: radius.lg,
    marginBottom: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    gap: spacing.md,
    ...shadows.small,
  },

  paymentCardSelected: {
    backgroundColor: colors.surfaceGreen,
    borderColor: colors.primary,
    borderWidth: 2,
  },

  paymentCardPressed: {
    opacity: 0.8,
  },

  paymentIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },

  paymentIconSelected: {
    backgroundColor: colors.primaryLight,
  },

  paymentTextContainer: {
    flex: 1,
  },

  paymentTitle: {
    color: colors.text,
    fontSize: typography.fontSize.md,
    fontWeight: '800',
  },

  paymentTitleSelected: {
    color: colors.primaryDark,
  },

  paymentDescription: {
    color: colors.muted,
    fontSize: typography.fontSize.xs,
    lineHeight: typography.lineHeight.normal,
    marginTop: spacing.xs,
  },

  // Coupon

  couponContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },

  couponInputContainer: {
    flex: 1,
  },

  couponInput: {
    backgroundColor: colors.card,
  },

  couponInputText: {
    fontSize: typography.fontSize.md,
  },

  applyButton: {
    marginTop: 5,
  },

  couponError: {
    color: colors.danger,
    fontSize: typography.fontSize.sm,
    marginTop: spacing.sm,
  },

  appliedCoupon: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.primarySoft,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.primaryLight,
    gap: spacing.md,
  },

  couponIcon: {
    width: 43,
    height: 43,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },

  appliedCouponText: {
    flex: 1,
  },

  appliedCouponCode: {
    color: colors.success,
    fontSize: typography.fontSize.md,
    fontWeight: '800',
  },

  appliedCouponSubtitle: {
    color: colors.muted,
    fontSize: typography.fontSize.xs,
    marginTop: 3,
  },

  // Summary

  summaryCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.small,
  },

  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },

  summaryTitle: {
    color: colors.primaryDark,
    fontSize: typography.fontSize.lg,
    fontWeight: '800',
  },

  taxNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.primarySoft,
    borderRadius: radius.md,
  },

  taxNoteText: {
    flex: 1,
    color: colors.primaryDark,
    fontSize: typography.fontSize.xs,
    lineHeight: typography.lineHeight.normal,
  },

  noSummaryCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },

  noSummaryTitle: {
    color: colors.primaryDark,
    fontSize: typography.fontSize.md,
    fontWeight: '800',
    textAlign: 'center',
  },

  noSummaryText: {
    color: colors.muted,
    fontSize: typography.fontSize.sm,
    textAlign: 'center',
    lineHeight: typography.lineHeight.normal,
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
    lineHeight: typography.lineHeight.normal,
  },

  // Sticky bottom checkout

  bottomCheckout: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    paddingBottom: spacing.lg,
    gap: spacing.md,
    ...shadows.medium,
  },

  bottomTotalContainer: {
    flex: 1,
  },

  bottomTotalLabel: {
    color: colors.muted,
    fontSize: typography.fontSize.xs,
    fontWeight: '600',
  },

  bottomTotal: {
    color: colors.primaryDark,
    fontSize: typography.fontSize.xl,
    fontWeight: '800',
    marginTop: 3,
  },

  placeOrderButton: {
    flex: 1.5,
  },

  checkoutButton: {
    borderRadius: radius.md,
  },

});
