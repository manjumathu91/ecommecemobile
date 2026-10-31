

import React, { useState } from 'react';

import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';

import Animated, {
  FadeIn,
  FadeOut,
  SlideInLeft,
  SlideOutLeft,
} from 'react-native-reanimated';

import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { RootStackParamList } from '@/navigation/types';

import {
  colors,
  spacing,
  radius,
  typography,
} from '@/constants/theme';

import {
  ConfirmationDialog,
} from '@/components';

import { useAuth } from '@/context/AuthContext';

// ======================================================
// PROPS
// ======================================================

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList>;
  onClose: () => void;
};

// ======================================================
// MENU ITEM TYPE
// ======================================================

type MenuItem = {
  label: string;
  icon: string;
  action: () => void;
};

// ======================================================
// CUSTOMER DRAWER
// ======================================================

export default function CustomerDrawer({
  navigation,
  onClose,
}: Props) {

  const { logout } = useAuth();

  const [confirmLogout, setConfirmLogout] = useState(false);

  // ====================================================
  // CLOSE DRAWER AND EXECUTE ACTION
  // ====================================================

  const go = (action: () => void) => {
    onClose();
    action();
  };

  // ====================================================
  // BOTTOM TAB NAVIGATION
  // ====================================================

  const openTab = (
    screen: 'Home' | 'Wishlist' | 'Cart' | 'Profile',
  ) => {
    go(() =>
      navigation.navigate('Tabs', { screen })
    );
  };

  // ====================================================
  // SHOP MENU ITEMS
  // ====================================================

  const mainItems: MenuItem[] = [

    {
      label: 'Home',
      icon: 'home-outline',
      action: () => openTab('Home'),
    },

    {
      label: 'Shop All Products',
      icon: 'shopping-outline',
      action: () =>
        go(() =>
          navigation.navigate('ProductList', {
            title: 'All Products',
          })
        ),
    },

    {
      label: 'Search Products',
      icon: 'magnify',
      action: () =>
        go(() => navigation.navigate('Search')),
    },

    {
      label: 'My Wishlist',
      icon: 'heart-outline',
      action: () => openTab('Wishlist'),
    },

    {
      label: 'My Cart',
      icon: 'cart-outline',
      action: () => openTab('Cart'),
    },

  ];

  // ====================================================
  // ACCOUNT MENU ITEMS
  // ====================================================

  const accountItems: MenuItem[] = [

    {
      label: 'My Orders',
      icon: 'package-variant-closed',
      action: () =>
        go(() => navigation.navigate('OrderList')),
    },

    {
      label: 'My Addresses',
      icon: 'map-marker-outline',
      action: () =>
        go(() => navigation.navigate('AddressList')),
    },

    {
      label: 'Payment History',
      icon: 'credit-card-outline',
      action: () =>
        go(() => navigation.navigate('PaymentHistory')),
    },

    {
      label: 'Notifications',
      icon: 'bell-outline',
      action: () =>
        go(() => navigation.navigate('Notifications')),
    },

    {
      label: 'My Profile',
      icon: 'account-outline',
      action: () => openTab('Profile'),
    },

  ];

  // ====================================================
  // REUSABLE MENU ITEM
  // ====================================================

  const renderItem = (item: MenuItem) => (

    <Pressable
      key={item.label}
      onPress={item.action}
      accessibilityRole="button"
      accessibilityLabel={item.label}
      style={({ pressed }) => [

        styles.menuItem,

        pressed && styles.menuItemPressed,

      ]}
    >

      <MaterialCommunityIcons
        name={item.icon as any}
        size={25}
        color={colors.primary}
      />

      <Text style={styles.menuLabel}>
        {item.label}
      </Text>

      <MaterialCommunityIcons
        name="chevron-right"
        size={21}
        color={colors.placeholder}
      />

    </Pressable>

  );

  // ====================================================
  // LOGOUT ACTION
  // ====================================================

  const handleLogout = () => {

    setConfirmLogout(false);

    onClose();

    logout();

  };

  // ====================================================
  // MAIN UI
  // ====================================================

  return (

    <Animated.View
      entering={FadeIn.duration(180)}
      exiting={FadeOut.duration(160)}
      style={styles.overlay}
    >

      {/* ==============================================
          BACKDROP
      ============================================== */}

      <Pressable
        style={styles.backdrop}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="Close navigation menu"
      />

      {/* ==============================================
          LEFT SIDE DRAWER
      ============================================== */}

      <Animated.View
        entering={SlideInLeft.duration(250)}
        exiting={SlideOutLeft.duration(200)}
        style={styles.drawer}
      >

        {/* ============================================
            BRAND HEADER
        ============================================ */}

        <View style={styles.brandHeader}>

          <View style={styles.brandTopRow}>

            <View style={styles.logoMark}>

              <Text style={styles.logoLetter}>
                V
              </Text>

            </View>

            <View style={styles.brandTextContainer}>

              <Text style={styles.brandName}>
                VELORA
              </Text>

              <Text style={styles.tagline}>
                Everything You Love, In One Place.
              </Text>

            </View>

            <Pressable
              onPress={onClose}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Close menu"
            >

              <MaterialCommunityIcons
                name="close"
                size={26}
                color={colors.white}
              />

            </Pressable>

          </View>

          <Text style={styles.welcomeText}>
            Welcome to VELORA
          </Text>

        </View>

        {/* ============================================
            SCROLLABLE MENU
        ============================================ */}

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >

          {/* SHOP */}

          <Text style={styles.sectionTitle}>
            SHOP
          </Text>

          {mainItems.map(renderItem)}

          <View style={styles.divider} />

          {/* MY ACCOUNT */}

          <Text style={styles.sectionTitle}>
            MY ACCOUNT
          </Text>

          {accountItems.map(renderItem)}

          {/* ==========================================
              LOGOUT SECTION
          ========================================== */}

          <View style={styles.logoutDivider} />

          <Text style={styles.sectionTitle}>
            ACCOUNT
          </Text>

          <Pressable
            onPress={() => setConfirmLogout(true)}
            accessibilityRole="button"
            accessibilityLabel="Logout"
            style={({ pressed }) => [

              styles.logoutItem,

              pressed && styles.logoutItemPressed,

            ]}
          >

            <View style={styles.logoutIconContainer}>

              <MaterialCommunityIcons
                name="logout"
                size={23}
                color={colors.danger}
              />

            </View>

            <Text style={styles.logoutLabel}>
              Logout
            </Text>

            <MaterialCommunityIcons
              name="chevron-right"
              size={21}
              color={colors.danger}
            />

          </Pressable>

        </ScrollView>

        {/* ============================================
            FOOTER
        ============================================ */}

        <View style={styles.footer}>

          <MaterialCommunityIcons
            name="leaf"
            size={19}
            color={colors.secondary}
          />

          <Text style={styles.footerText}>
            Shop Beautifully. Live Better.
          </Text>

        </View>

      </Animated.View>

      {/* ==============================================
          LOGOUT CONFIRMATION DIALOG
      ============================================== */}

      <ConfirmationDialog
        visible={confirmLogout}
        title="Log out?"
        message="Are you sure you want to log out of your VELORA account?"
        confirmLabel="Log out"
        danger
        onCancel={() => setConfirmLogout(false)}
        onConfirm={handleLogout}
      />

    </Animated.View>

  );

}

// ======================================================
// STYLES
// ======================================================

const styles = StyleSheet.create({

  // Overlay

  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
    elevation: 20,
    flexDirection: 'row',
  },

  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.overlay,
  },

  // Drawer

  drawer: {
    width: '84%',
    maxWidth: 350,
    height: '100%',
    backgroundColor: colors.bg,
    borderTopRightRadius: radius.lg,
    borderBottomRightRadius: radius.lg,
    overflow: 'hidden',
  },

  // Brand header

  brandHeader: {
    backgroundColor: colors.primaryDark,
    paddingHorizontal: spacing.lg,
    paddingTop: 56,
    paddingBottom: spacing.xl,
  },

  brandTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },

  logoMark: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },

  logoLetter: {
    color: colors.primaryDark,
    fontSize: 29,
    fontWeight: '800',
  },

  brandTextContainer: {
    flex: 1,
  },

  brandName: {
    color: colors.white,
    fontSize: typography.fontSize.xl,
    fontWeight: '800',
    letterSpacing: 2,
  },

  tagline: {
    color: '#D1FAE5',
    fontSize: typography.fontSize.xs,
    marginTop: 3,
  },

  welcomeText: {
    color: colors.white,
    fontSize: typography.fontSize.md,
    fontWeight: '600',
    marginTop: spacing.lg,
  },

  // Scroll menu

  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
  },

  sectionTitle: {
    color: colors.muted,
    fontSize: typography.fontSize.xs,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginHorizontal: spacing.sm,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },

  // Normal menu item

  menuItem: {
    minHeight: 53,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    gap: spacing.md,
  },

  menuItemPressed: {
    backgroundColor: colors.primaryLight,
    transform: [
      { scale: 0.98 },
    ],
  },

  menuLabel: {
    flex: 1,
    color: colors.text,
    fontSize: typography.fontSize.md,
    fontWeight: '600',
  },

  // Divider

  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.lg,
    marginHorizontal: spacing.sm,
  },

  // Logout section

  logoutDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    marginHorizontal: spacing.sm,
  },

  logoutItem: {
    minHeight: 55,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.dangerLight,
    borderWidth: 1,
    borderColor: '#FECACA',
    gap: spacing.md,
  },

  logoutItemPressed: {
    opacity: 0.75,
    transform: [
      { scale: 0.98 },
    ],
  },

  logoutIconContainer: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
  },

  logoutLabel: {
    flex: 1,
    color: colors.danger,
    fontSize: typography.fontSize.md,
    fontWeight: '800',
  },

  // Footer

  footer: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.bg,
  },

  footerText: {
    color: colors.muted,
    fontSize: typography.fontSize.xs,
    fontWeight: '500',
  },

});
