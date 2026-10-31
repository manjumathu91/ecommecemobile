

import React from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import Animated, {
  FadeInDown,
  FadeIn,
} from 'react-native-reanimated';

import {
  colors,
  spacing,
  typography,
} from '@/constants/theme';

interface AuthLayoutProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

export default function AuthLayout({
  title,
  subtitle,
  children,
}: AuthLayoutProps) {
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>

          {/* VELORA Brand Logo */}
          <Animated.View
            entering={FadeIn.duration(500)}
            style={styles.brandContainer}
          >
            <Image
              source={require('../../../assets/images/velora-logo.png')}
              style={styles.logo}
              resizeMode="contain"
              accessibilityLabel="VELORA brand logo"
            />
          </Animated.View>

          {/* Page Heading */}
          <Animated.View
            entering={FadeInDown.delay(150).duration(450)}
            style={styles.headingContainer}
          >
            <Text style={styles.title}>
              {title}
            </Text>

            {!!subtitle && (
              <Text style={styles.subtitle}>
                {subtitle}
              </Text>
            )}
          </Animated.View>

          {/* Form Content */}
          <Animated.View
            entering={FadeInDown.delay(250).duration(500)}
            style={styles.formContainer}
          >
            {children}
          </Animated.View>

          {/* Footer */}
          <Animated.View
            entering={FadeIn.delay(500)}
            style={styles.footer}
          >
            <Text style={styles.footerText}>
              Powered by VELORA
            </Text>
          </Animated.View>

        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },

  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
  },

  content: {
    width: '100%',
    maxWidth: 460,
    alignSelf: 'center',
  },

  brandContainer: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },

  logo: {
    width: 190,
    height: 190,
  },

  headingContainer: {
    marginBottom: spacing.xl,
  },

  title: {
    fontSize: typography.fontSize.title,
    fontWeight: typography.fontWeight.bold,
    color: colors.primaryDark,
    textAlign: 'center',
  },

  subtitle: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.regular,
    color: colors.muted,
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: typography.lineHeight.relaxed,
  },

  formContainer: {
    width: '100%',
  },

  footer: {
    marginTop: spacing.xxl,
    alignItems: 'center',
  },

  footerText: {
    fontSize: typography.fontSize.xs,
    color: colors.muted,
    fontWeight: typography.fontWeight.medium,
  },
});
