
import React, { useEffect, useRef, useState } from 'react';

import {
  SafeAreaView,
  Text,
  View,
  StyleSheet,
} from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';

import Animated, {
  FadeInDown,
  ZoomIn,
} from 'react-native-reanimated';

import type {
  NativeStackScreenProps,
} from '@react-navigation/native-stack';

import { authApi } from '@/api/services';

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

import type {
  RootStackParamList,
} from '@/navigation/types';

import { errorMessage } from '@/utils/forms';

// ======================================================
// VERIFY EMAIL SCREEN
// ======================================================

type Props = NativeStackScreenProps<
  RootStackParamList,
  'VerifyEmail'
>;

type VerificationStatus =
  | 'waiting'
  | 'verifying'
  | 'success'
  | 'error';

export default function VerifyEmailScreen({
  route,
  navigation,
}: Props) {

  const {
    verificationEmail,
    clearVerificationEmail,
  } = useAuth();

  const { email, uid, token } = route.params ?? {};

  const displayEmail = email || verificationEmail || '';

  const [status, setStatus] = useState<VerificationStatus>(
    uid && token ? 'verifying' : 'waiting'
  );

  const [message, setMessage] = useState('');

  const verificationStarted = useRef(false);

  // ====================================================
  // VERIFY EMAIL AUTOMATICALLY
  // ====================================================

  useEffect(() => {

    if (!uid || !token) return;

    if (verificationStarted.current) return;

    verificationStarted.current = true;

    let active = true;

    const verify = async () => {

      setStatus('verifying');

      try {

        const response = await authApi.verifyEmail(
          uid,
          token
        );

        if (!active) return;

        setStatus('success');

        setMessage(response.detail);

        clearVerificationEmail();

      } catch (e) {

        if (!active) return;

        setStatus('error');

        setMessage(
          errorMessage(
            e,
            'Email verification failed. Your link may be invalid or expired.'
          )
        );

      }

    };

    verify();

    return () => {
      active = false;
    };

  }, [uid, token, clearVerificationEmail]);

  // ====================================================
  // GO TO LOGIN
  // ====================================================

  const goToLogin = () => {

    clearVerificationEmail();

    navigation.reset({

      index: 0,

      routes: [
        {
          name: 'Login',
        },
      ],

    });

  };

  // ====================================================
  // MAIN UI
  // ====================================================

  const success = status === 'success';

  const error = status === 'error';

  const verifying = status === 'verifying';

  return (

    <SafeAreaView style={styles.container}>

      <View style={styles.content}>

        {/* ============================================
            STATUS ICON
        ============================================ */}

        <Animated.View
          entering={ZoomIn.duration(450)}
          style={[
            styles.iconContainer,
            {
              backgroundColor: success
                ? colors.successLight
                : error
                  ? colors.dangerLight
                  : colors.primaryLight,
            },
          ]}
        >

          <MaterialCommunityIcons

            name={
              success
                ? 'check-decagram'
                : error
                  ? 'email-alert-outline'
                  : verifying
                    ? 'email-sync-outline'
                    : 'email-check-outline'
            }

            size={76}

            color={
              success
                ? colors.success
                : error
                  ? colors.danger
                  : colors.primary
            }

          />

        </Animated.View>

        {/* ============================================
            HEADING
        ============================================ */}

        <Animated.View
          entering={FadeInDown.delay(200)}
          style={styles.headingContainer}
        >

          <Text style={styles.eyebrow}>
            VELORA ACCOUNT SECURITY
          </Text>

          <Text style={styles.title}>

            {success
              ? 'Email Verified!'
              : error
                ? 'Verification Failed'
                : verifying
                  ? 'Verifying Email'
                  : 'Verify Your Email'}

          </Text>

          <Text style={styles.subtitle}>

            {success
              ? 'Your email address has been verified successfully. You can now log in to your VELORA account.'
              : error
                ? 'We could not verify your email address.'
                : verifying
                  ? 'Please wait while we verify your email address.'
                  : 'We have sent a verification link to your email. Please open that link to activate your account.'}

          </Text>

        </Animated.View>

        {/* ============================================
            EMAIL DETAILS
        ============================================ */}

        {!!displayEmail && (

          <Animated.View
            entering={FadeInDown.delay(300)}
            style={styles.emailCard}
          >

            <MaterialCommunityIcons
              name="email-outline"
              size={24}
              color={colors.primary}
            />

            <View style={styles.emailContent}>

              <Text style={styles.emailLabel}>
                Registered Email
              </Text>

              <Text style={styles.emailText}>
                {displayEmail}
              </Text>

            </View>

          </Animated.View>

        )}

        {/* ============================================
            WAITING INFORMATION
        ============================================ */}

        {status === 'waiting' && (

          <Animated.View
            entering={FadeInDown.delay(400)}
            style={styles.infoCard}
          >

            <MaterialCommunityIcons
              name="information-outline"
              size={22}
              color={colors.primary}
            />

            <Text style={styles.infoText}>
              Check your inbox and spam folder. Open the VELORA verification link to complete registration.
            </Text>

          </Animated.View>

        )}

        {/* ============================================
            ERROR INFORMATION
        ============================================ */}

        {error && (

          <Animated.View
            entering={FadeInDown.delay(350)}
            style={styles.errorCard}
          >

            <MaterialCommunityIcons
              name="alert-circle-outline"
              size={22}
              color={colors.danger}
            />

            <Text style={styles.errorText}>
              {message}
            </Text>

          </Animated.View>

        )}

        {/* ============================================
            SUCCESS INFORMATION
        ============================================ */}

        {success && (

          <Animated.View
            entering={FadeInDown.delay(350)}
            style={styles.successCard}
          >

            <MaterialCommunityIcons
              name="check-circle"
              size={22}
              color={colors.success}
            />

            <Text style={styles.successText}>
              {message || 'Your email is verified. You can now log in.'}
            </Text>

          </Animated.View>

        )}

        {/* ============================================
            VERIFYING INFORMATION
        ============================================ */}

        {verifying && (

          <View style={styles.infoCard}>

            <MaterialCommunityIcons
              name="shield-check-outline"
              size={22}
              color={colors.primary}
            />

            <Text style={styles.infoText}>
              Connecting securely to VELORA.
            </Text>

          </View>

        )}

        {/* ============================================
            LOGIN BUTTON
        ============================================ */}

        {(success || error) && (

          <Animated.View
            entering={FadeInDown.delay(500)}
            style={styles.buttonContainer}
          >

            <CustomButton
              label="Go to Login"
              icon="login"
              onPress={goToLogin}
              style={styles.button}
            />

          </Animated.View>

        )}

        {/* ============================================
            WAITING SCREEN ACTION
        ============================================ */}

        {status === 'waiting' && (

          <Animated.View
            entering={FadeInDown.delay(500)}
            style={styles.buttonContainer}
          >

            <CustomButton
              label="Back to Login"
              icon="arrow-left"
              mode="outlined"
              onPress={goToLogin}
              style={styles.button}
            />

          </Animated.View>

        )}

        {/* ============================================
            FOOTER
        ============================================ */}

        <Animated.View
          entering={FadeInDown.delay(600)}
          style={styles.footer}
        >

          <MaterialCommunityIcons
            name="leaf"
            size={19}
            color={colors.secondary}
          />

          <Text style={styles.footerText}>
            Everything You Love, In One Place.
          </Text>

        </Animated.View>

      </View>

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
  },

  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },

  // Icon

  iconContainer: {
    width: 132,
    height: 132,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: spacing.xl,
    ...shadows.medium,
  },

  // Heading

  headingContainer: {
    alignItems: 'center',
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
    textAlign: 'center',
  },

  subtitle: {
    color: colors.muted,
    fontSize: typography.fontSize.md,
    lineHeight: typography.lineHeight.relaxed,
    textAlign: 'center',
    marginTop: spacing.md,
  },

  // Email card

  emailCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
    marginBottom: spacing.lg,
    ...shadows.small,
  },

  emailContent: {
    flex: 1,
  },

  emailLabel: {
    color: colors.muted,
    fontSize: typography.fontSize.xs,
    fontWeight: '600',
  },

  emailText: {
    color: colors.primaryDark,
    fontSize: typography.fontSize.md,
    fontWeight: '700',
    marginTop: spacing.xs,
  },

  // Information

  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.surfaceGreen,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },

  infoText: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: typography.fontSize.sm,
    lineHeight: typography.lineHeight.relaxed,
  },

  // Error

  errorCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.dangerLight,
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },

  errorText: {
    flex: 1,
    color: colors.danger,
    fontSize: typography.fontSize.sm,
    lineHeight: typography.lineHeight.normal,
    fontWeight: '600',
  },

  // Success

  successCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.successLight,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },

  successText: {
    flex: 1,
    color: colors.success,
    fontSize: typography.fontSize.sm,
    lineHeight: typography.lineHeight.normal,
    fontWeight: '600',
  },

  // Button

  buttonContainer: {
    marginTop: spacing.md,
  },

  button: {
    marginBottom: spacing.md,
  },

  // Footer

  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.xxl,
  },

  footerText: {
    color: colors.muted,
    fontSize: typography.fontSize.xs,
    fontWeight: '600',
  },

});
