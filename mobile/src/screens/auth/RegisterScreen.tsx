

import React, { useState } from 'react';

import {
  Text,
  View,
  StyleSheet,
  Platform,
} from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';

import { zodResolver } from '@hookform/resolvers/zod';

import { useForm } from 'react-hook-form';

import { useNav } from '@/navigation/hooks';

import Animated, {
  FadeInDown,
  ZoomIn,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';

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

import { useAuth } from '@/context/AuthContext';

import { useShake } from '@/hooks/useShake';

import {
  applyServerErrors,
  errorMessage,
} from '@/utils/forms';

import {
  RegisterForm,
  registerSchema,
} from '@/validation/schemas';

import AuthLayout from './AuthLayout';

// ======================================================
// VELORA REGISTER SCREEN
// ======================================================

export default function RegisterScreen() {

  const { register } = useAuth();

  const nav = useNav();

  const { style, shake } = useShake();

  const [formError, setFormError] = useState('');

  const [isHovered, setIsHovered] = useState(false);

  // ====================================================
  // HOVER ANIMATION VALUE
  // ====================================================

  const hoverProgress = useSharedValue(0);

  // ====================================================
  // FORM SETUP + VALIDATION
  // ====================================================

  const {
    control,
    handleSubmit,
    setError,
    formState: {
      isSubmitting,
    },
  } = useForm<RegisterForm>({

    resolver: zodResolver(registerSchema),

    mode: 'onTouched',

    defaultValues: {

      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      password: '',
      confirm: '',

    },

  });

  // ====================================================
  // FORM CARD ANIMATION
  // ====================================================

  const cardAnimatedStyle = useAnimatedStyle(() => ({

    transform: [

      {
        translateY: -3 * hoverProgress.value,
      },

      {
        scale: 1 + hoverProgress.value * 0.005,
      },

    ],

  }));

  // ====================================================
  // WEB HOVER IN
  // ====================================================

  const handleHoverIn = () => {

    if (Platform.OS === 'web') {

      setIsHovered(true);

      hoverProgress.value = withSpring(
        1,
        motion.spring.gentle,
      );

    }

  };

  // ====================================================
  // WEB HOVER OUT
  // ====================================================

  const handleHoverOut = () => {

    if (Platform.OS === 'web') {

      setIsHovered(false);

      hoverProgress.value = withSpring(
        0,
        motion.spring.smooth,
      );

    }

  };

  // ====================================================
  // REGISTER SUBMIT
  // ====================================================

  const onSubmit = handleSubmit(

    async (v) => {

      setFormError('');

      try {

        const normalizedEmail =
          v.email.trim().toLowerCase();

        await register({

          email: normalizedEmail,

          password: v.password,

          first_name: v.first_name.trim(),

          last_name: (v.last_name ?? '').trim(),

          phone: (v.phone ?? '').trim(),

        });

        // Registration successful.
        // Navigate to email verification screen.
        // User will NOT be logged in automatically.

        nav.navigate('VerifyEmail', {

          email: normalizedEmail,

        });

      } catch (e) {

        // Display backend field validation errors.

        if (
          !applyServerErrors(
            e,
            setError,
            [
              'email',
              'password',
              'phone',
              'first_name',
              'last_name',
            ]
          )
        ) {

          setFormError(errorMessage(e));

        }

        shake();

      }

    },

    () => {

      // Zod validation failed.

      setFormError('');

      shake();

    }

  );

  // ====================================================
  // MAIN UI
  // ====================================================

  return (

    <AuthLayout title="Create your account">

      <Animated.View style={style}>

        {/* ============================================
            WELCOME MESSAGE
        ============================================ */}

        <Animated.View
          entering={FadeInDown.duration(
            motion.duration.smooth
          )}
          style={styles.header}
        >

          <Text style={styles.eyebrow}>
            WELCOME TO VELORA
          </Text>

          <Text style={styles.heading}>
            Join VELORA
          </Text>

          <Text style={styles.subtitle}>
            Create your account and discover everything you love.
          </Text>

        </Animated.View>

        {/* ============================================
            REGISTRATION FORM CARD
        ============================================ */}

        <Animated.View

          {...({
            onMouseEnter: handleHoverIn,
            onMouseLeave: handleHoverOut,
          } as any)}

          entering={FadeInDown
            .delay(120)
            .duration(motion.duration.smooth)}

          style={[

            styles.formCard,

            isHovered && styles.formCardHovered,

            cardAnimatedStyle,

          ]}

        >

          {/* ==========================================
              FORM HEADER
          ========================================== */}

          <View style={styles.formHeader}>

            <View style={styles.formIcon}>

              <MaterialCommunityIcons
                name="account-plus-outline"
                size={29}
                color={colors.primary}
              />

            </View>

            <View style={styles.formHeaderText}>

              <Text style={styles.formTitle}>
                Personal Details
              </Text>

              <Text style={styles.formSubtitle}>
                Fill in your information to get started.
              </Text>

            </View>

          </View>

          {/* ==========================================
              FIRST NAME
          ========================================== */}

          <Animated.View
            entering={FadeInDown.delay(180)}
          >

            <FormInput
              control={control}
              name="first_name"
              label="First name"
              autoCapitalize="words"
            />

          </Animated.View>

          {/* ==========================================
              LAST NAME
          ========================================== */}

          <Animated.View
            entering={FadeInDown.delay(230)}
          >

            <FormInput
              control={control}
              name="last_name"
              label="Last name (optional)"
              autoCapitalize="words"
            />

          </Animated.View>

          {/* ==========================================
              EMAIL
          ========================================== */}

          <Animated.View
            entering={FadeInDown.delay(280)}
          >

            <FormInput
              control={control}
              name="email"
              label="Email address"
              keyboardType="email-address"
              autoCapitalize="none"
            />

          </Animated.View>

          {/* ==========================================
              EMAIL VERIFICATION INFORMATION
          ========================================== */}

          <View style={styles.emailInfo}>

            <MaterialCommunityIcons
              name="email-outline"
              size={22}
              color={colors.primary}
            />

            <Text style={styles.emailInfoText}>
              We will send a verification link to your email address. Please verify your email before logging in.
            </Text>

          </View>

          {/* ==========================================
              PHONE
          ========================================== */}

          <Animated.View
            entering={FadeInDown.delay(330)}
          >

            <FormInput
              control={control}
              name="phone"
              label="Phone number (optional)"
              keyboardType="phone-pad"
            />

          </Animated.View>

          {/* ==========================================
              PASSWORD
          ========================================== */}

          <Animated.View
            entering={FadeInDown.delay(380)}
          >

            <FormInput
              control={control}
              name="password"
              label="Password"
              secure
            />

          </Animated.View>

          {/* ==========================================
              CONFIRM PASSWORD
          ========================================== */}

          <Animated.View
            entering={FadeInDown.delay(430)}
          >

            <FormInput
              control={control}
              name="confirm"
              label="Confirm password"
              secure
            />

          </Animated.View>

          {/* ==========================================
              PASSWORD INFORMATION
          ========================================== */}

          <View style={styles.passwordInfo}>

            <MaterialCommunityIcons
              name="shield-lock-outline"
              size={21}
              color={colors.secondary}
            />

            <Text style={styles.passwordInfoText}>
              Choose a strong password and enter the same password in both fields.
            </Text>

          </View>

          {/* ==========================================
              FORM ERROR
          ========================================== */}

          {!!formError && (

            <Animated.View
              entering={ZoomIn.duration(250)}
              style={styles.errorCard}
            >

              <MaterialCommunityIcons
                name="alert-circle-outline"
                size={23}
                color={colors.danger}
              />

              <Text style={styles.errorText}>
                {formError}
              </Text>

            </Animated.View>

          )}

          {/* ==========================================
              REGISTER BUTTON
          ========================================== */}

          <Animated.View
            entering={FadeInDown.delay(480)}
            style={styles.buttonContainer}
          >

            <CustomButton

              label={
                isSubmitting
                  ? 'Creating account...'
                  : 'Create Account'
              }

              icon="account-plus-outline"

              onPress={onSubmit}

              loading={isSubmitting}

              style={styles.registerButton}

            />

          </Animated.View>

          {/* ==========================================
              FOOTER NOTE
          ========================================== */}

          <Text style={styles.footerNote}>
            By creating an account, you agree to keep your account information accurate.
          </Text>

        </Animated.View>

      </Animated.View>

    </AuthLayout>

  );

}

// ======================================================
// STYLES
// ======================================================

const styles = StyleSheet.create({

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

  heading: {
    color: colors.primaryDark,
    fontSize: typography.fontSize.display,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: spacing.sm,
  },

  subtitle: {
    color: colors.muted,
    fontSize: typography.fontSize.md,
    lineHeight: typography.lineHeight.relaxed,
  },

  // Form card

  formCard: {
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    borderWidth: 1.5,
    borderColor: colors.border,
    padding: spacing.lg,
    ...shadows.medium,
  },

  formCardHovered: {
    borderColor: colors.primary,
    backgroundColor: colors.surfaceGreen,
    ...shadows.large,
  },

  // Form header

  formHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },

  formIcon: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },

  formHeaderText: {
    flex: 1,
  },

  formTitle: {
    color: colors.primaryDark,
    fontSize: typography.fontSize.xl,
    fontWeight: '800',
  },

  formSubtitle: {
    color: colors.muted,
    fontSize: typography.fontSize.sm,
    lineHeight: typography.lineHeight.normal,
    marginTop: 4,
  },

  // Email verification information

  emailInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    backgroundColor: colors.surfaceGreen,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },

  emailInfoText: {
    flex: 1,
    color: colors.primaryDark,
    fontSize: typography.fontSize.sm,
    lineHeight: typography.lineHeight.relaxed,
    fontWeight: '600',
  },

  // Password information

  passwordInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    backgroundColor: colors.surfaceSoft,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },

  passwordInfoText: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: typography.fontSize.sm,
    lineHeight: typography.lineHeight.relaxed,
  },

  // Error card

  errorCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    backgroundColor: colors.dangerLight,
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },

  errorText: {
    flex: 1,
    color: colors.danger,
    fontSize: typography.fontSize.md,
    lineHeight: typography.lineHeight.relaxed,
    fontWeight: '600',
  },

  // Button

  buttonContainer: {
    marginTop: spacing.sm,
  },

  registerButton: {
    marginBottom: spacing.md,
  },

  // Footer

  footerNote: {
    color: colors.muted,
    fontSize: typography.fontSize.sm,
    lineHeight: typography.lineHeight.normal,
    textAlign: 'center',
    marginTop: spacing.sm,
  },

});
