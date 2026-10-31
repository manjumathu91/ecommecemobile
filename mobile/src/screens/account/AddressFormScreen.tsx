

import React from 'react';

import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Switch,
  Text,
  View,
  StyleSheet,
} from 'react-native';

import Animated, {
  FadeInDown,
} from 'react-native-reanimated';

import { SafeAreaView } from 'react-native-safe-area-context';

import { zodResolver } from '@hookform/resolvers/zod';

import {
  Controller,
  useForm,
} from 'react-hook-form';

import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { addressApi } from '@/api/services';

import {
  CustomButton,
  FormInput,
} from '@/components';

import {
  colors,
  typography,
  spacing,
  radius,
  shadows,
  motion,
} from '@/constants/theme';

import { useToast } from '@/context/ToastContext';

import type { RootStackParamList } from '@/navigation/types';

import {
  applyServerErrors,
  errorMessage,
} from '@/utils/forms';

import {
  AddressForm,
  addressSchema,
} from '@/validation/schemas';

// ======================================================
// ADDRESS FORM SCREEN
// ======================================================

export default function AddressFormScreen({

  route,
  navigation,

}: NativeStackScreenProps<RootStackParamList, 'AddressForm'>) {

  const editing = route.params?.address;

  const toast = useToast();

  // ====================================================
  // FORM SETUP
  // ====================================================

  const {
    control,
    handleSubmit,
    setError,
    formState: {
      isSubmitting,
    },
  } = useForm<AddressForm>({

    resolver: zodResolver(addressSchema),

    defaultValues: {

      full_name: editing?.full_name ?? '',

      phone: editing?.phone ?? '',

      house_number: editing?.house_number ?? '',

      street: editing?.street ?? '',

      city: editing?.city ?? '',

      state: editing?.state ?? '',

      postal_code: editing?.postal_code ?? '',

      delivery_instructions:
        editing?.delivery_instructions ?? '',

      is_default: editing?.is_default ?? false,

    },

  });

  // ====================================================
  // SUBMIT FORM
  // ====================================================

  const onSubmit = handleSubmit(async (v) => {

    const body = {
      ...v,
      delivery_instructions: v.delivery_instructions ?? '',
    };

    try {

      if (editing) {

        await addressApi.update(editing.id, body);

      } else {

        await addressApi.create(body);

      }

      toast.show(
        editing
          ? 'Address updated successfully'
          : 'Address saved successfully',
        'success'
      );

      navigation.goBack();

    } catch (e) {

      if (
        !applyServerErrors(
          e,
          setError,
          Object.keys(body)
        )
      ) {

        toast.show(errorMessage(e), 'error');

      }

    }

  });

  // ====================================================
  // MAIN UI
  // ====================================================

  return (

    <SafeAreaView
      style={styles.container}
      edges={['bottom']}
    >

      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={
          Platform.OS === 'ios'
            ? 'padding'
            : undefined
        }
      >

        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scrollContent}
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
              DELIVERY DETAILS
            </Text>

            <Text style={styles.title}>
              {editing
                ? 'Edit Address'
                : 'Add New Address'}
            </Text>

            <Text style={styles.subtitle}>
              {editing
                ? 'Update your delivery information.'
                : 'Add your address for a smooth delivery experience.'}
            </Text>

          </Animated.View>

          {/* ============================================
              PERSONAL INFORMATION
          ============================================ */}

          <Animated.View
            entering={FadeInDown
              .delay(100)
              .duration(motion.duration.smooth)}
            style={styles.section}
          >

            <View style={styles.sectionHeader}>

              <View style={styles.sectionNumber}>
                <Text style={styles.sectionNumberText}>
                  01
                </Text>
              </View>

              <View style={styles.sectionHeading}>
                <Text style={styles.sectionTitle}>
                  Personal Information
                </Text>

                <Text style={styles.sectionSubtitle}>
                  Who should receive the order?
                </Text>
              </View>

            </View>

            <View style={styles.fieldGroup}>

              <FormInput
                control={control}
                name="full_name"
                label="Full name"
                autoCapitalize="words"
              />

              <FormInput
                control={control}
                name="phone"
                label="Phone number"
                keyboardType="phone-pad"
              />

            </View>

          </Animated.View>

          {/* ============================================
              ADDRESS DETAILS
          ============================================ */}

          <Animated.View
            entering={FadeInDown
              .delay(200)
              .duration(motion.duration.smooth)}
            style={styles.section}
          >

            <View style={styles.sectionHeader}>

              <View style={styles.sectionNumber}>
                <Text style={styles.sectionNumberText}>
                  02
                </Text>
              </View>

              <View style={styles.sectionHeading}>
                <Text style={styles.sectionTitle}>
                  Delivery Address
                </Text>

                <Text style={styles.sectionSubtitle}>
                  Enter your complete delivery location.
                </Text>
              </View>

            </View>

            <View style={styles.fieldGroup}>

              <FormInput
                control={control}
                name="house_number"
                label="House / Flat Number"
              />

              <FormInput
                control={control}
                name="street"
                label="Street / Area"
                autoCapitalize="words"
              />

              <View style={styles.twoColumnRow}>

                <View style={styles.halfField}>

                  <FormInput
                    control={control}
                    name="city"
                    label="City"
                    autoCapitalize="words"
                  />

                </View>

                <View style={styles.halfField}>

                  <FormInput
                    control={control}
                    name="state"
                    label="State"
                    autoCapitalize="words"
                  />

                </View>

              </View>

              <FormInput
                control={control}
                name="postal_code"
                label="PIN Code"
                keyboardType="number-pad"
              />

            </View>

          </Animated.View>

          {/* ============================================
              DELIVERY INSTRUCTIONS
          ============================================ */}

          <Animated.View
            entering={FadeInDown
              .delay(300)
              .duration(motion.duration.smooth)}
            style={styles.section}
          >

            <View style={styles.sectionHeader}>

              <View style={styles.sectionNumber}>
                <Text style={styles.sectionNumberText}>
                  03
                </Text>
              </View>

              <View style={styles.sectionHeading}>
                <Text style={styles.sectionTitle}>
                  Delivery Instructions
                </Text>

                <Text style={styles.sectionSubtitle}>
                  Optional information for the delivery partner.
                </Text>
              </View>

            </View>

            <View style={styles.fieldGroup}>

              <FormInput
                control={control}
                name="delivery_instructions"
                label="Additional instructions (optional)"
                autoCapitalize="sentences"
                multiline
              />

            </View>

          </Animated.View>

          {/* ============================================
              DEFAULT ADDRESS SETTING
          ============================================ */}

          <Animated.View
            entering={FadeInDown
              .delay(400)
              .duration(motion.duration.smooth)}
            style={styles.defaultCard}
          >

            <View style={styles.defaultTextContainer}>

              <Text style={styles.defaultTitle}>
                Set as default address
              </Text>

              <Text style={styles.defaultSubtitle}>
                Use this address automatically during checkout.
              </Text>

            </View>

            <Controller
              control={control}
              name="is_default"
              render={({ field: { value, onChange } }) => (

                <Switch
                  value={value}
                  onValueChange={onChange}
                  trackColor={{
                    false: colors.borderStrong,
                    true: colors.primaryLight,
                  }}
                  thumbColor={
                    value
                      ? colors.primary
                      : colors.white
                  }
                />

              )}
            />

          </Animated.View>

          {/* ============================================
              SAVE BUTTON
          ============================================ */}

          <Animated.View
            entering={FadeInDown
              .delay(500)
              .duration(motion.duration.smooth)}
            style={styles.submitContainer}
          >

            <CustomButton
              label={
                editing
                  ? 'Save Changes'
                  : 'Save Address'
              }
              icon="check"
              onPress={onSubmit}
              loading={isSubmitting}
              style={styles.submitButton}
            />

            <Text style={styles.helperText}>
              Please check your details before saving.
            </Text>

          </Animated.View>

        </ScrollView>

      </KeyboardAvoidingView>

    </SafeAreaView>

  );

}

// ======================================================
// STYLES
// ======================================================

const styles = StyleSheet.create({

  // Main container

  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },

  keyboardContainer: {
    flex: 1,
  },

  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxxl,
  },

  // Header

  header: {
    marginBottom: spacing.xl,
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
    letterSpacing: -0.5,
  },

  subtitle: {
    color: colors.muted,
    fontSize: typography.fontSize.sm,
    lineHeight: typography.lineHeight.normal,
    marginTop: spacing.sm,
  },

  // Form sections

  section: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.small,
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
    gap: spacing.md,
  },

  sectionNumber: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },

  sectionNumberText: {
    color: colors.primaryDark,
    fontSize: typography.fontSize.sm,
    fontWeight: '800',
  },

  sectionHeading: {
    flex: 1,
  },

  sectionTitle: {
    color: colors.text,
    fontSize: typography.fontSize.lg,
    fontWeight: '800',
  },

  sectionSubtitle: {
    color: colors.muted,
    fontSize: typography.fontSize.xs,
    marginTop: 3,
    lineHeight: typography.lineHeight.normal,
  },

  fieldGroup: {
    gap: spacing.sm,
  },

  twoColumnRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },

  halfField: {
    flex: 1,
    minWidth: 0,
  },

  // Default address

  defaultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceGreen,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    padding: spacing.lg,
    marginBottom: spacing.xl,
    gap: spacing.md,
  },

  defaultTextContainer: {
    flex: 1,
  },

  defaultTitle: {
    color: colors.primaryDark,
    fontSize: typography.fontSize.md,
    fontWeight: '800',
  },

  defaultSubtitle: {
    color: colors.muted,
    fontSize: typography.fontSize.xs,
    lineHeight: typography.lineHeight.normal,
    marginTop: spacing.xs,
  },

  // Submit section

  submitContainer: {
    marginTop: spacing.xs,
  },

  submitButton: {
    marginBottom: spacing.md,
  },

  helperText: {
    color: colors.muted,
    fontSize: typography.fontSize.xs,
    textAlign: 'center',
  },

});
