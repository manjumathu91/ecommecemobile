

import React, { useState } from 'react';

import {
  ScrollView,
  Pressable,
  Text,
  View,
  StyleSheet,
} from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';

import Animated, {
  FadeInDown,
  ZoomIn,
} from 'react-native-reanimated';

import { SafeAreaView } from 'react-native-safe-area-context';

import { ConfirmationDialog } from '@/components';

import {
  colors,
  typography,
  spacing,
  radius,
  shadows,
  motion,
} from '@/constants/theme';

import { useAuth } from '@/context/AuthContext';

import { useNav } from '@/navigation/hooks';

// ======================================================
// PROFILE ROUTES
// ======================================================

type ProfileRouteName =
  | 'OrderList'
  | 'AddressList'
  | 'Notifications'
  | 'PaymentHistory'
  | 'EditProfile'
  | 'ChangePassword';

// ======================================================
// PROFILE MENU ITEM
// ======================================================

type MenuItem = {
  icon: string;
  title: string;
  subtitle: string;
  to: ProfileRouteName;
};

// ======================================================
// PROFILE SCREEN
// ======================================================

export default function ProfileScreen() {

  const nav = useNav();

  const { user, logout } = useAuth();

  const [confirm, setConfirm] = useState(false);

  // ====================================================
  // CUSTOMER INITIALS
  // ====================================================

  const initials =
    `${user?.first_name?.[0] ?? ''}${user?.last_name?.[0] ?? ''}`
      .toUpperCase() ||
    (user?.email?.[0] ?? '?').toUpperCase();

  // ====================================================
  // CUSTOMER NAME
  // ====================================================

  const fullName =
    [user?.first_name, user?.last_name]
      .filter(Boolean)
      .join(' ') || 'Customer';

  // ====================================================
  // PROFILE MENU DATA
  // ====================================================

  const accountMenu: MenuItem[] = [

    {
      icon: 'package-variant',
      title: 'My Orders',
      subtitle: 'View your orders and delivery status',
      to: 'OrderList',
    },

    {
      icon: 'map-marker-outline',
      title: 'My Addresses',
      subtitle: 'Manage your delivery addresses',
      to: 'AddressList',
    },

    {
      icon: 'bell-outline',
      title: 'Notifications',
      subtitle: 'View your latest updates',
      to: 'Notifications',
    },

    {
      icon: 'credit-card-outline',
      title: 'Payment History',
      subtitle: 'View your payment transactions',
      to: 'PaymentHistory',
    },

  ];

  const settingsMenu: MenuItem[] = [

    {
      icon: 'account-edit-outline',
      title: 'Edit Profile',
      subtitle: 'Update your personal information',
      to: 'EditProfile',
    },

    {
      icon: 'lock-outline',
      title: 'Change Password',
      subtitle: 'Keep your account secure',
      to: 'ChangePassword',
    },

  ];

  // ====================================================
  // NAVIGATION
  // ====================================================

  const openPage = (route: ProfileRouteName) => {

    nav.navigate(route as never);

  };

  // ====================================================
  // LOGOUT
  // ====================================================

  const confirmLogout = () => {

    setConfirm(false);

    logout();

  };

  // ====================================================
  // REUSABLE MENU ROW
  // ====================================================

  const MenuRow = ({
    item,
    index,
  }: {
    item: MenuItem;
    index: number;
  }) => (

    <Animated.View
      entering={FadeInDown
        .delay(Math.min(index * 70, 350))
        .duration(motion.duration.smooth)}
    >

      <Pressable
        onPress={() => openPage(item.to)}
        style={({ pressed }) => [
          styles.menuRow,
          pressed && styles.pressedRow,
        ]}
      >

        <View style={styles.menuIcon}>

          <MaterialCommunityIcons
            name={item.icon as any}
            size={25}
            color={colors.primary}
          />

        </View>

        <View style={styles.menuContent}>

          <Text style={styles.menuTitle}>
            {item.title}
          </Text>

          <Text style={styles.menuSubtitle}>
            {item.subtitle}
          </Text>

        </View>

        <MaterialCommunityIcons
          name="chevron-right"
          size={24}
          color={colors.muted}
        />

      </Pressable>

    </Animated.View>

  );

  // ====================================================
  // MAIN UI
  // ====================================================

  return (

    <SafeAreaView
      style={styles.container}
      edges={['bottom']}
    >

      <ScrollView

        showsVerticalScrollIndicator={false}

        contentContainerStyle={styles.scrollContent}

      >

        {/* ============================================
            PROFILE HEADER
        ============================================ */}

        <Animated.View
          entering={FadeInDown.duration(
            motion.duration.smooth
          )}
          style={styles.profileHeader}
        >

          {/* AVATAR */}

          <Animated.View
            entering={ZoomIn.delay(150).duration(450)}
            style={styles.avatarOuter}
          >

            <View style={styles.avatar}>

              <Text style={styles.avatarText}>
                {initials}
              </Text>

            </View>

            <View style={styles.avatarBadge}>

              <MaterialCommunityIcons
                name="check"
                size={14}
                color={colors.white}
              />

            </View>

          </Animated.View>

          {/* CUSTOMER DETAILS */}

          <Text style={styles.customerName}>
            {fullName}
          </Text>

          {!!user?.email && (

            <View style={styles.contactRow}>

              <MaterialCommunityIcons
                name="email-outline"
                size={17}
                color={colors.muted}
              />

              <Text style={styles.contactText}>
                {user.email}
              </Text>

            </View>

          )}

          {!!user?.phone && (

            <View style={styles.contactRow}>

              <MaterialCommunityIcons
                name="phone-outline"
                size={17}
                color={colors.muted}
              />

              <Text style={styles.contactText}>
                {user.phone}
              </Text>

            </View>

          )}

          {/* PROFILE LABEL */}

          <View style={styles.memberBadge}>

            <MaterialCommunityIcons
              name="account-check-outline"
              size={16}
              color={colors.primary}
            />

            <Text style={styles.memberText}>
              VELORA CUSTOMER
            </Text>

          </View>

        </Animated.View>

        {/* ============================================
            ACCOUNT SECTION
        ============================================ */}

        <Animated.View
          entering={FadeInDown.delay(200)}
          style={styles.section}
        >

          <Text style={styles.sectionTitle}>
            My Account
          </Text>

          <View style={styles.menuCard}>

            {accountMenu.map((item, index) => (

              <View key={item.to}>

                <MenuRow
                  item={item}
                  index={index}
                />

                {index !== accountMenu.length - 1 && (

                  <View style={styles.menuDivider} />

                )}

              </View>

            ))}

          </View>

        </Animated.View>

        {/* ============================================
            SETTINGS SECTION
        ============================================ */}

        <Animated.View
          entering={FadeInDown.delay(350)}
          style={styles.section}
        >

          <Text style={styles.sectionTitle}>
            Account Settings
          </Text>

          <View style={styles.menuCard}>

            {settingsMenu.map((item, index) => (

              <View key={item.to}>

                <MenuRow
                  item={item}
                  index={index + accountMenu.length}
                />

                {index !== settingsMenu.length - 1 && (

                  <View style={styles.menuDivider} />

                )}

              </View>

            ))}

          </View>

        </Animated.View>

        {/* ============================================
            LOGOUT BUTTON
        ============================================ */}

        <Animated.View
          entering={FadeInDown.delay(500)}
          style={styles.logoutContainer}
        >

          <Pressable
            onPress={() => setConfirm(true)}
            style={({ pressed }) => [
              styles.logoutButton,
              pressed && styles.pressedRow,
            ]}
          >

            <View style={styles.logoutIcon}>

              <MaterialCommunityIcons
                name="logout"
                size={24}
                color={colors.danger}
              />

            </View>

            <Text style={styles.logoutText}>
              Log Out
            </Text>

            <MaterialCommunityIcons
              name="chevron-right"
              size={23}
              color={colors.danger}
            />

          </Pressable>

        </Animated.View>

        {/* ============================================
            FOOTER
        ============================================ */}

        <Animated.View
          entering={FadeInDown.delay(600)}
          style={styles.footer}
        >

          <Text style={styles.footerBrand}>
            VELORA
          </Text>

          <Text style={styles.footerTagline}>
            Everything You Love, In One Place.
          </Text>

          <Text style={styles.footerNote}>
            Thank you for being part of VELORA.
          </Text>

        </Animated.View>

      </ScrollView>

      {/* ==============================================
          LOGOUT CONFIRMATION
      ============================================== */}

      <ConfirmationDialog
        visible={confirm}
        title="Log out?"
        message="You will need to log in again to see your orders and cart."
        confirmLabel="Log out"
        danger
        onCancel={() => setConfirm(false)}
        onConfirm={confirmLogout}
      />

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

  scrollContent: {
    paddingBottom: spacing.xxl,
  },

  // Profile header

  profileHeader: {
    alignItems: 'center',
    backgroundColor: colors.card,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xl,
    borderBottomLeftRadius: radius.xl,
    borderBottomRightRadius: radius.xl,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    ...shadows.small,
  },

  avatarOuter: {
    position: 'relative',
    marginBottom: spacing.md,
  },

  avatar: {
    width: 104,
    height: 104,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    borderWidth: 5,
    borderColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.medium,
  },

  avatarText: {
    color: colors.white,
    fontSize: typography.fontSize.display,
    fontWeight: '800',
  },

  avatarBadge: {
    position: 'absolute',
    right: 2,
    bottom: 4,
    width: 29,
    height: 29,
    borderRadius: radius.pill,
    backgroundColor: colors.success,
    borderWidth: 3,
    borderColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },

  customerName: {
    color: colors.primaryDark,
    fontSize: typography.fontSize.xxl,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: spacing.xs,
  },

  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },

  contactText: {
    color: colors.muted,
    fontSize: typography.fontSize.sm,
  },

  memberBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primaryLight,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginTop: spacing.lg,
  },

  memberText: {
    color: colors.primaryDark,
    fontSize: typography.fontSize.xs,
    fontWeight: '800',
    letterSpacing: 1,
  },

  // Sections

  section: {
    marginTop: spacing.xl,
    paddingHorizontal: spacing.lg,
  },

  sectionTitle: {
    color: colors.primaryDark,
    fontSize: typography.fontSize.lg,
    fontWeight: '800',
    marginBottom: spacing.md,
  },

  menuCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    ...shadows.small,
  },

  // Menu rows

  menuRow: {
    minHeight: 78,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    gap: spacing.md,
  },

  pressedRow: {
    opacity: 0.75,
    transform: [
      { scale: motion.pressScale },
    ],
  },

  menuIcon: {
    width: 46,
    height: 46,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },

  menuContent: {
    flex: 1,
  },

  menuTitle: {
    color: colors.text,
    fontSize: typography.fontSize.md,
    fontWeight: '700',
  },

  menuSubtitle: {
    color: colors.muted,
    fontSize: typography.fontSize.xs,
    marginTop: 3,
    lineHeight: typography.lineHeight.normal,
  },

  menuDivider: {
    height: 1,
    backgroundColor: colors.divider,
    marginLeft: 58,
  },

  // Logout

  logoutContainer: {
    marginTop: spacing.xl,
    paddingHorizontal: spacing.lg,
  },

  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.dangerLight,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: '#FECACA',
    padding: spacing.md,
    gap: spacing.md,
  },

  logoutIcon: {
    width: 46,
    height: 46,
    borderRadius: radius.md,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },

  logoutText: {
    flex: 1,
    color: colors.danger,
    fontSize: typography.fontSize.md,
    fontWeight: '800',
  },

  // Footer

  footer: {
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl,
  },

  footerBrand: {
    color: colors.primaryDark,
    fontSize: typography.fontSize.xl,
    fontWeight: '800',
    letterSpacing: 4,
  },

  footerTagline: {
    color: colors.secondary,
    fontSize: typography.fontSize.xs,
    fontWeight: '600',
    marginTop: spacing.xs,
  },

  footerNote: {
    color: colors.muted,
    fontSize: typography.fontSize.xs,
    marginTop: spacing.md,
  },

});
