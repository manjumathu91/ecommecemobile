

import React from 'react';

import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  View,
  StyleSheet,
} from 'react-native';

import Animated, {
  FadeInDown,
} from 'react-native-reanimated';

import { SafeAreaView } from 'react-native-safe-area-context';

import { zodResolver } from '@hookform/resolvers/zod';

import { useForm } from 'react-hook-form';

import { MaterialCommunityIcons } from '@expo/vector-icons';

import { authApi } from '@/api/services';

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

import { useNav } from '@/navigation/hooks';

import {
  applyServerErrors,
  errorMessage,
} from '@/utils/forms';

import {
  ChangePasswordForm,
  changePasswordSchema,
} from '@/validation/schemas';

// ======================================================
// CHANGE PASSWORD SCREEN
// ======================================================

export default function ChangePasswordScreen() {

  const toast = useToast();

  const nav = useNav();

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
  } = useForm<ChangePasswordForm>({

    resolver: zodResolver(changePasswordSchema),

    defaultValues: {
      old_password: '',
      new_password: '',
      confirm: '',
    },

  });

  // ====================================================
  // UPDATE PASSWORD
  // ====================================================

  const onSubmit = handleSubmit(async (v) => {

    try {

      await authApi.changePassword(
        v.old_password,
        v.new_password
      );

      toast.show(
        'Password changed successfully',
        'success'
      );

      nav.goBack();

    } catch (e) {

      if (
        !applyServerErrors(
          e,
          setError,
          ['old_password', 'new_password']
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
              HEADER
          ============================================ */}

          <Animated.View
            entering={FadeInDown.duration(
              motion.duration.smooth
            )}
            style={styles.header}
          >

            <Text style={styles.eyebrow}>
              ACCOUNT SECURITY
            </Text>

            <Text style={styles.title}>
              Change Password
            </Text>

            <Text style={styles.subtitle}>
              Create a new password to keep your VELORA account secure.
            </Text>

          </Animated.View>

          {/* ============================================
              SECURITY INFORMATION
          ============================================ */}

          <Animated.View
            entering={FadeInDown
              .delay(100)
              .duration(motion.duration.smooth)}
            style={styles.securityCard}
          >

            <View style={styles.securityIcon}>

              <MaterialCommunityIcons
                name="shield-lock-outline"
                size={29}
                color={colors.primary}
              />

            </View>

            <View style={styles.securityContent}>

              <Text style={styles.securityTitle}>
                Protect your account
              </Text>

              <Text style={styles.securityText}>
                Use a strong password that you do not use on other websites.
              </Text>

            </View>

          </Animated.View>

          {/* ============================================
              PASSWORD FORM
          ============================================ */}

          <Animated.View
            entering={FadeInDown
              .delay(200)
              .duration(motion.duration.smooth)}
            style={styles.formCard}
          >

            {/* SECTION HEADER */}

            <View style={styles.sectionHeader}>

              <View style={styles.sectionIcon}>

                <MaterialCommunityIcons
                  name="lock-outline"
                  size={24}
                  color={colors.primary}
                />

              </View>

              <View style={styles.sectionHeading}>

                <Text style={styles.sectionTitle}>
                  Password Details
                </Text>

                <Text style={styles.sectionSubtitle}>
                  Enter your current and new password.
                </Text>

              </View>

            </View>

            {/* CURRENT PASSWORD */}

            <View style={styles.fieldGroup}>

              <FormInput
                control={control}
                name="old_password"
                label="Current password"
                secure
              />

              {/* NEW PASSWORD */}

              <FormInput
                control={control}
                name="new_password"
                label="New password"
                secure
              />

              {/* CONFIRM PASSWORD */}

              <FormInput
                control={control}
                name="confirm"
                label="Confirm new password"
                secure
              />

            </View>

          </Animated.View>

          {/* ============================================
              PASSWORD TIPS
          ============================================ */}

          <Animated.View
            entering={FadeInDown
              .delay(300)
              .duration(motion.duration.smooth)}
            style={styles.tipsCard}
          >

            <View style={styles.tipsHeading}>

              <MaterialCommunityIcons
                name="lightbulb-outline"
                size={22}
                color={colors.gold}
              />

              <Text style={styles.tipsTitle}>
                Password tips
              </Text>

            </View>

            <View style={styles.tipRow}>

              <MaterialCommunityIcons
                name="check-circle"
                size={17}
                color={colors.success}
              />

              <Text style={styles.tipText}>
                Use a password that is difficult to guess.
              </Text>

            </View>

            <View style={styles.tipRow}>

              <MaterialCommunityIcons
                name="check-circle"
                size={17}
                color={colors.success}
              />

              <Text style={styles.tipText}>
                Avoid reusing your old password.
              </Text>

            </View>

            <View style={styles.tipRow}>

              <MaterialCommunityIcons
                name="check-circle"
                size={17}
                color={colors.success}
              />

              <Text style={styles.tipText}>
                Make sure both new password fields match.
              </Text>

            </View>

          </Animated.View>

          {/* ============================================
              UPDATE BUTTON
          ============================================ */}

          <Animated.View
            entering={FadeInDown
              .delay(400)
              .duration(motion.duration.smooth)}
            style={styles.buttonContainer}
          >

            <CustomButton
              label="Update Password"
              icon="lock-check"
              onPress={onSubmit}
              loading={isSubmitting}
              style={styles.updateButton}
            />

            <Text style={styles.helperText}>
              Your password will be updated securely.
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

  // Main screen

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
    lineHeight: typography.lineHeight.relaxed,
    marginTop: spacing.sm,
  },

  // Security card

  securityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceGreen,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    gap: spacing.md,
  },

  securityIcon: {
    width: 50,
    height: 50,
    borderRadius: radius.md,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },

  securityContent: {
    flex: 1,
  },

  securityTitle: {
    color: colors.primaryDark,
    fontSize: typography.fontSize.md,
    fontWeight: '800',
    marginBottom: spacing.xs,
  },

  securityText: {
    color: colors.textSecondary,
    fontSize: typography.fontSize.xs,
    lineHeight: typography.lineHeight.normal,
  },

  // Form card

  formCard: {
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
    gap: spacing.md,
    marginBottom: spacing.xl,
  },

  sectionIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
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
    lineHeight: typography.lineHeight.normal,
    marginTop: 3,
  },

  fieldGroup: {
    gap: spacing.sm,
  },

  // Password tips

  tipsCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.xl,
  },

  tipsHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },

  tipsTitle: {
    color: colors.text,
    fontSize: typography.fontSize.md,
    fontWeight: '800',
  },

  tipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },

  tipText: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: typography.fontSize.sm,
    lineHeight: typography.lineHeight.normal,
  },

  // Update button

  buttonContainer: {
    marginTop: spacing.xs,
  },

  updateButton: {
    marginBottom: spacing.md,
  },

  helperText: {
    color: colors.muted,
    fontSize: typography.fontSize.xs,
    textAlign: 'center',
  },

});
