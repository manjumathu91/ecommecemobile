

import React, { useEffect, useRef, useState } from 'react';

import {
  Animated as RNAnimated,
  Easing,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import Animated from 'react-native-reanimated';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { CustomButton, FormInput } from '@/components';
import { colors } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useShake } from '@/hooks/useShake';
import type { RootStackParamList } from '@/navigation/types';
import { errorMessage } from '@/utils/forms';
import { LoginForm, loginSchema } from '@/validation/schemas';

import AuthLayout from './AuthLayout';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

export default function LoginScreen({ navigation }: Props) {
  const { login } = useAuth();
  const { style: shakeStyle, shake } = useShake();

  const [formError, setFormError] = useState('');
  const [isHovered, setIsHovered] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  // Entrance animation
  const fadeAnim = useRef(new RNAnimated.Value(0)).current;
  const slideAnim = useRef(new RNAnimated.Value(25)).current;
  const scaleAnim = useRef(new RNAnimated.Value(0.97)).current;

  // Web hover animation
  const hoverScale = useRef(new RNAnimated.Value(1)).current;

  const useNativeDriver = Platform.OS !== 'web';

  useEffect(() => {
    RNAnimated.parallel([
      RNAnimated.timing(fadeAnim, {
        toValue: 1,
        duration: 700,
        easing: Easing.out(Easing.ease),
        useNativeDriver,
      }),

      RNAnimated.spring(slideAnim, {
        toValue: 0,
        tension: 45,
        friction: 8,
        useNativeDriver,
      }),

      RNAnimated.spring(scaleAnim, {
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

    RNAnimated.spring(hoverScale, {
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

    RNAnimated.spring(hoverScale, {
      toValue: 1,
      friction: 7,
      tension: 100,
      useNativeDriver: false,
    }).start();
  };

  // Login
  const onSubmit = handleSubmit(
    async (values) => {
      setFormError('');

      try {
        const email = values.email.trim().toLowerCase();

        await login(email, values.password);
      } catch (error) {
        console.error('[LOGIN] Login failed:', error);

        const message = errorMessage(error, 'Login failed');

        setFormError(message);
        shake();
      }
    },
    () => {
      shake();
    }
  );

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
        scale: RNAnimated.multiply(scaleAnim, hoverScale),
      },
    ],
  };

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Log in to continue shopping with VELORA."
    >
      <RNAnimated.View
        {...(webHoverHandlers as any)}
        style={[
          styles.card,
          isHovered && styles.cardHovered,
          animatedCardStyle,
        ]}
      >
        {/* Login Icon */}
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>🔐</Text>
        </View>

        {/* Welcome Text */}
        <Text style={styles.heading}>
          Sign in to your account
        </Text>

        <Text style={styles.description}>
          Enter your registered email and password to continue
          shopping.
        </Text>

        {/* Login Form - Shake Animation */}
        <Animated.View style={shakeStyle}>
          <View style={styles.inputContainer}>
            <FormInput
              control={control}
              name="email"
              label="Email address"
              keyboardType="email-address"
            />

            <FormInput
              control={control}
              name="password"
              label="Password"
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

          {/* Login Button */}
          <CustomButton
            label="Log In"
            onPress={onSubmit}
            loading={isSubmitting}
          />
        </Animated.View>

        {/* Forgot Password */}
        <Pressable
          onPress={() => navigation.navigate('ForgotPassword')}
          style={({ pressed }) => [
            styles.forgotButton,
            pressed && styles.pressed,
          ]}
          accessibilityRole="button"
        >
          <Text style={styles.forgotText}>
            Forgot password?
          </Text>
        </Pressable>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Register Link */}
        <View style={styles.registerContainer}>
          <Text style={styles.registerText}>
            New to VELORA?
          </Text>

          <Pressable
            onPress={() => navigation.navigate('Register')}
            style={({ pressed }) => [
              styles.registerLink,
              pressed && styles.pressed,
            ]}
            accessibilityRole="button"
          >
            <Text style={styles.registerLinkText}>
              Create an account
            </Text>
          </Pressable>
        </View>

        {/* Footer */}
        <Text style={styles.footer}>
          Everything You Love, In One Place.
        </Text>
      </RNAnimated.View>
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
    shadowOpacity: 0.16,
    shadowRadius: 24,
    elevation: 6,
  },

  iconContainer: {
    width: 68,
    height: 68,
    borderRadius: 22,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 20,
  },

  icon: {
    fontSize: 32,
  },

  heading: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 10,
  },

  description: {
    fontSize: 17,
    lineHeight: 26,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 26,
  },

  inputContainer: {
    gap: 8,
  },

  errorContainer: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    borderWidth: 1,
    borderRadius: 10,
    padding: 13,
    marginTop: 8,
    marginBottom: 16,
  },

  errorText: {
    color: colors.danger,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '600',
  },

  forgotButton: {
    alignSelf: 'flex-end',
    marginTop: 18,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },

  forgotText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '700',
  },

  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 22,
  },

  registerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
  },

  registerText: {
    color: colors.textSecondary,
    fontSize: 16,
  },

  registerLink: {
    padding: 5,
  },

  registerLinkText: {
    color: colors.primary,
    fontSize: 17,
    fontWeight: '800',
  },

  pressed: {
    opacity: 0.65,
  },

  footer: {
    fontSize: 14,
    color: colors.muted,
    textAlign: 'center',
    marginTop: 24,
    fontStyle: 'italic',
  },
});
