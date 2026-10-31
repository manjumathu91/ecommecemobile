

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

import {
  useForm,
} from 'react-hook-form';

import { authApi } from '@/api/services';

import {
  CustomButton,
  FormInput,
} from '@/components';

import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { useNav } from '@/navigation/hooks';

import {
  colors,
  typography,
  spacing,
  radius,
  shadows,
  motion,
} from '@/constants/theme';

import {
  applyServerErrors,
  errorMessage,
} from '@/utils/forms';

import {
  ProfileForm,
  profileSchema,
} from '@/validation/schemas';

// ======================================================
// EDIT PROFILE SCREEN
// ======================================================

export default function EditProfileScreen() {

  const { user, setUser } = useAuth();

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
  } = useForm<ProfileForm>({

    resolver: zodResolver(profileSchema),

    defaultValues: {

      first_name: user?.first_name ?? '',

      last_name: user?.last_name ?? '',

      phone: user?.phone ?? '',

    },

  });

  // ====================================================
  // SAVE PROFILE
  // ====================================================

  const onSubmit = handleSubmit(async (v) => {

    try {

      const updatedUser = await authApi.updateProfile({

        first_name: v.first_name,

        last_name: v.last_name ?? '',

        phone: v.phone ?? '',

      });

      setUser(updatedUser);

      toast.show(
        'Profile updated successfully',
        'success'
      );

      nav.goBack();

    } catch (e) {

      if (
        !applyServerErrors(
          e,
          setError,
          ['first_name', 'last_name', 'phone']
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
              ACCOUNT SETTINGS
            </Text>

            <Text style={styles.title}>
              Edit Profile
            </Text>

            <Text style={styles.subtitle}>
              Keep your personal information up to date for a better shopping experience.
            </Text>

          </Animated.View>

          {/* ============================================
              PROFILE INFORMATION CARD
          ============================================ */}

          <Animated.View
            entering={FadeInDown
              .delay(150)
              .duration(motion.duration.smooth)}
            style={styles.formCard}
          >

            {/* SECTION HEADING */}

            <View style={styles.sectionHeader}>

              <View style={styles.sectionIcon}>

                <Text style={styles.sectionIconText}>
                  01
                </Text>

              </View>

              <View style={styles.sectionHeading}>

                <Text style={styles.sectionTitle}>
                  Personal Information
                </Text>

                <Text style={styles.sectionSubtitle}>
                  Update your name and contact details.
                </Text>

              </View>

            </View>

            {/* FORM INPUTS */}

            <View style={styles.fieldGroup}>

              <FormInput
                control={control}
                name="first_name"
                label="First name"
                autoCapitalize="words"
              />

              <FormInput
                control={control}
                name="last_name"
                label="Last name"
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
              INFORMATION NOTE
          ============================================ */}

          <Animated.View
            entering={FadeInDown
              .delay(300)
              .duration(motion.duration.smooth)}
            style={styles.infoCard}
          >

            <Text style={styles.infoTitle}>
              Keep your details updated
            </Text>

            <Text style={styles.infoText}>
              Your contact information helps us communicate important order and delivery updates.
            </Text>

          </Animated.View>

          {/* ============================================
              SAVE BUTTON
          ============================================ */}

          <Animated.View
            entering={FadeInDown
              .delay(400)
              .duration(motion.duration.smooth)}
            style={styles.buttonContainer}
          >

            <CustomButton
              label="Save Changes"
              icon="check"
              onPress={onSubmit}
              loading={isSubmitting}
              style={styles.saveButton}
            />

            <Text style={styles.helperText}>
              Review your information before saving.
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

  sectionIconText: {
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
    lineHeight: typography.lineHeight.normal,
    marginTop: 3,
  },

  fieldGroup: {
    gap: spacing.sm,
  },

  // Information card

  infoCard: {
    backgroundColor: colors.surfaceGreen,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    padding: spacing.lg,
    marginBottom: spacing.xl,
  },

  infoTitle: {
    color: colors.primaryDark,
    fontSize: typography.fontSize.md,
    fontWeight: '800',
    marginBottom: spacing.xs,
  },

  infoText: {
    color: colors.textSecondary,
    fontSize: typography.fontSize.sm,
    lineHeight: typography.lineHeight.relaxed,
  },

  // Save button

  buttonContainer: {
    marginTop: spacing.sm,
  },

  saveButton: {
    marginBottom: spacing.md,
  },

  helperText: {
    color: colors.muted,
    fontSize: typography.fontSize.xs,
    textAlign: 'center',
  },

});
