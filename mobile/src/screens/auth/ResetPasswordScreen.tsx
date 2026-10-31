

import React, { useEffect, useRef, useState } from 'react';

import {
  Animated,
  Easing,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { authApi } from '@/api/services';
import { CustomButton, FormInput } from '@/components';
import { useToast } from '@/context/ToastContext';
import { colors } from '@/constants/theme';
import type { RootStackParamList } from '@/navigation/types';
import { errorMessage } from '@/utils/forms';
import { ResetForm, resetSchema } from '@/validation/schemas';

import AuthLayout from './AuthLayout';

type Props = NativeStackScreenProps<
  RootStackParamList,
  'ResetPassword'
>;

export default function ResetPasswordScreen({ navigation }: Props) {
  const toast = useToast();

  const [formError, setFormError] = useState('');
  const [isHovered, setIsHovered] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<ResetForm>({
    resolver: zodResolver(resetSchema),
    defaultValues: {
      uid: '',
      token: '',
      new_password: '',
    },
  });

  // Entrance animation
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(25)).current;
  const scaleAnim = useRef(new Animated.Value(0.97)).current;

  // Hover animation
  const hoverScale = useRef(new Animated.Value(1)).current;

  const useNativeDriver = Platform.OS !== 'web';

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 700,
        easing: Easing.out(Easing.ease),
        useNativeDriver,
      }),

      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 45,
        friction: 8,
        useNativeDriver,
      }),

      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 45,
        friction: 8,
        useNativeDriver,
      }),
    ]).start();

    return () => {
      fadeAnim.stopAnimation();
      slideAnim.stopAnimation();
      scaleAnim.stopAnimation();
    };
  }, [fadeAnim, slideAnim, scaleAnim, useNativeDriver]);

  // Hover in
  const handleHoverIn = () => {
    if (Platform.OS !== 'web') return;

    setIsHovered(true);

    Animated.spring(hoverScale, {
      toValue: 1.015,
      friction: 7,
      tension: 100,
      useNativeDriver: false,
    }).start();
  };

  // Hover out
  const handleHoverOut = () => {
    if (Platform.OS !== 'web') return;

    setIsHovered(false);

    Animated.spring(hoverScale, {
      toValue: 1,
      friction: 7,
      tension: 100,
      useNativeDriver: false,
    }).start();
  };

  // Reset password
  const onSubmit = handleSubmit(async (values) => {
    setFormError('');

    try {
      await authApi.resetPassword(
        values.uid.trim(),
        values.token.trim(),
        values.new_password
      );

      toast.show(
        'Password updated successfully. Please log in.',
        'success'
      );

      navigation.navigate('Login');
    } catch (error) {
      const message = errorMessage(
        error,
        'Unable to reset password. Please check your UID and token.'
      );

      setFormError(message);
      toast.show(message, 'error');
    }
  });

  const webHoverHandlers =
    Platform.OS === 'web'
      ? {
          onMouseEnter: handleHoverIn,
          onMouseLeave: handleHoverOut,
        }
      : {};

  const animatedCardStyle = {
    opacity: fadeAnim,
    transform: [
      { translateY: slideAnim },
      {
        scale: Animated.multiply(scaleAnim, hoverScale),
      },
    ],
  };

  return (
    <AuthLayout
      title="Reset Password"
      subtitle="Create a new password and get back to shopping with VELORA."
    >
      <Animated.View
        {...(webHoverHandlers as any)}
        style={[
          styles.card,
          isHovered && styles.cardHovered,
          animatedCardStyle,
        ]}
      >
        {/* Reset Icon */}
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>🔐</Text>
        </View>

        {/* Heading */}
        <Text style={styles.heading}>
          Create New Password
        </Text>

        <Text style={styles.description}>
          Enter the UID and token received in your password reset
          email. Then choose a secure new password for your account.
        </Text>

        {/* Email Instructions */}
        <View style={styles.infoContainer}>
          <Text style={styles.infoIcon}>ⓘ</Text>
          <Text style={styles.infoText}>
            Copy the UID and token carefully from your reset email.
          </Text>
        </View>

        {/* Reset Form */}
        <View style={styles.formContainer}>
          <FormInput
            control={control}
            name="uid"
            label="User ID (UID)"
          />

          <FormInput
            control={control}
            name="token"
            label="Reset Token"
          />

          <FormInput
            control={control}
            name="new_password"
            label="New Password"
            secure
          />
        </View>

        {/* Error Message */}
        {!!formError && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>
              {formError}
            </Text>
          </View>
        )}

        {/* Reset Button */}
        <CustomButton
          label="Reset Password"
          onPress={onSubmit}
          loading={isSubmitting}
        />

        {/* Divider */}
        <View style={styles.divider} />

        {/* Back to Login */}
        <Pressable
          onPress={() => navigation.navigate('Login')}
          style={({ pressed }) => [
            styles.loginButton,
            pressed && styles.pressed,
          ]}
          accessibilityRole="button"
        >
          <Text style={styles.loginText}>
            Already have an account?
            {' '}
            <Text style={styles.loginLink}>
              Sign in
            </Text>
          </Text>
        </Pressable>

        {/* Footer */}
        <Text style={styles.footer}>
          VELORA · Everything You Love, In One Place.
        </Text>
      </Animated.View>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    backgroundColor: colors.card,
    borderRadius: 22,
    padding: 24,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: 8,

    shadowColor: '#064E3B',
    shadowOffset: {
      width: 0,
      height: 7,
    },
    shadowOpacity: 0.07,
    shadowRadius: 18,
    elevation: 3,
  },

  cardHovered: {
    borderColor: colors.primary,
    shadowOpacity: 0.15,
    shadowRadius: 23,
    elevation: 6,
  },

  iconContainer: {
    width: 70,
    height: 70,
    borderRadius: 23,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 20,
  },

  icon: {
    fontSize: 34,
  },

  heading: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 12,
  },

  description: {
    fontSize: 17,
    lineHeight: 26,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 22,
  },

  infoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 14,
    marginBottom: 22,
  },

  infoIcon: {
    fontSize: 22,
    color: colors.primary,
    fontWeight: '800',
    marginRight: 10,
  },

  infoText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
    color: colors.textSecondary,
    fontWeight: '500',
  },

  formContainer: {
    gap: 8,
    marginBottom: 20,
  },

  errorContainer: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    borderWidth: 1,
    borderRadius: 10,
    padding: 13,
    marginBottom: 16,
  },

  errorText: {
    color: colors.danger,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '600',
  },

  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 22,
  },

  loginButton: {
    alignSelf: 'center',
    paddingVertical: 8,
  },

  loginText: {
    color: colors.textSecondary,
    fontSize: 15,
    textAlign: 'center',
  },

  loginLink: {
    color: colors.primary,
    fontWeight: '800',
  },

  pressed: {
    opacity: 0.65,
  },

  footer: {
    fontSize: 13,
    color: colors.muted,
    textAlign: 'center',
    marginTop: 22,
  },
});
