

import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Platform,
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
import type { RootStackParamList } from '@/navigation/types';
import { errorMessage } from '@/utils/forms';
import { ForgotForm, forgotSchema } from '@/validation/schemas';

import AuthLayout from './AuthLayout';
import { colors } from '@/constants/theme';

type Props = NativeStackScreenProps<
  RootStackParamList,
  'ForgotPassword'
>;

export default function ForgotPasswordScreen({ navigation }: Props) {
  const toast = useToast();

  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<ForgotForm>({
    resolver: zodResolver(forgotSchema),
    defaultValues: {
      email: '',
    },
  });

  // Entrance animation
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(25)).current;
  const scaleAnim = useRef(new Animated.Value(0.97)).current;

  // Hover animation
  const hoverScale = useRef(new Animated.Value(1)).current;
  const hoverElevation = useRef(new Animated.Value(0)).current;

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

  const handleHoverIn = () => {
    if (Platform.OS !== 'web') return;

    Animated.parallel([
      Animated.spring(hoverScale, {
        toValue: 1.015,
        friction: 7,
        tension: 100,
        useNativeDriver: false,
      }),
      Animated.spring(hoverElevation, {
        toValue: 1,
        friction: 7,
        tension: 100,
        useNativeDriver: false,
      }),
    ]).start();
  };

  const handleHoverOut = () => {
    if (Platform.OS !== 'web') return;

    Animated.parallel([
      Animated.spring(hoverScale, {
        toValue: 1,
        friction: 7,
        tension: 100,
        useNativeDriver: false,
      }),
      Animated.spring(hoverElevation, {
        toValue: 0,
        friction: 7,
        tension: 100,
        useNativeDriver: false,
      }),
    ]).start();
  };

  const onSubmit = handleSubmit(async (values) => {
    try {
      const email = values.email.trim().toLowerCase();

      await authApi.forgotPassword(email);

      toast.show(
        'If that email exists, we have sent reset instructions.',
        'success'
      );

      navigation.navigate('ResetPassword');
    } catch (error) {
      toast.show(errorMessage(error), 'error');
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
    { scale: Animated.multiply(scaleAnim, hoverScale) },
  ],
};
      

  return (
    <AuthLayout
      title="Forgot password?"
      subtitle="Don't worry! We'll help you get back into your account."
    >
      <Animated.View
        {...(webHoverHandlers as any)}
        style={[styles.card, animatedCardStyle]}
      >
        {/* Animated Icon */}
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>✉</Text>
        </View>

        {/* Heading */}
        <Text style={styles.heading}>
          Reset your password
        </Text>

        <Text style={styles.description}>
          Enter the email address associated with your VELORA account.
          We will send you instructions to reset your password.
        </Text>

        {/* Email Form */}
        <View style={styles.formContainer}>
          <FormInput
            control={control}
            name="email"
            label="Email address"
            keyboardType="email-address"
          />
        </View>

        {/* Submit Button */}
        <CustomButton
          label="Send Reset Instructions"
          onPress={onSubmit}
          loading={isSubmitting}
        />

        {/* Divider */}
        <View style={styles.divider} />

        {/* Existing Code Button */}
        <CustomButton
          label="I already have a reset code"
          mode="text"
          onPress={() => navigation.navigate('ResetPassword')}
          style={styles.codeButton}
        />

        {/* Footer Information */}
        <Text style={styles.footerText}>
          Remember your password?
          {' '}
          <Text
            style={styles.loginText}
            onPress={() => navigation.navigate('Login')}
          >
            Sign in
          </Text>
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
    overflow: 'hidden',
  },

  iconContainer: {
    width: 68,
    height: 68,
    borderRadius: 22,
    backgroundColor: colors.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 20,
  },

  icon: {
    fontSize: 34,
    color: colors.primary,
    fontWeight: '700',
  },

  heading: {
    fontSize: 25,
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
    marginBottom: 25,
  },

  formContainer: {
    marginBottom: 20,
  },

  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 18,
  },

  codeButton: {
    marginTop: 2,
  },

  footerText: {
    fontSize: 16,
    lineHeight: 24,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 20,
  },

  loginText: {
    color: colors.primary,
    fontWeight: '800',
  },
});
