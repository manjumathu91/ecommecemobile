

import { MD3LightTheme } from 'react-native-paper';

// ======================================================
// VELORA — PREMIUM E-COMMERCE DESIGN SYSTEM
// Theme: Emerald + Ivory
// ======================================================

// ------------------------------------------------------
// 1. BRAND IDENTITY
// ------------------------------------------------------

export const brand = {
  name: 'VELORA',
  tagline: 'Everything You Love, In One Place.',
  primaryLogoColor: '#064E3B',
  secondaryLogoColor: '#059669',
  backgroundColor: '#FAF9F4',
};

// ------------------------------------------------------
// 2. COLOUR PALETTE
// ------------------------------------------------------

export const colors = {
  // Primary Emerald
  primary: '#047857',
  primaryDark: '#064E3B',
  primaryLight: '#D1FAE5',
  primarySoft: '#ECFDF5',

  // Secondary Colours
  secondary: '#059669',
  accent: '#D1FAE5',
  accentDark: '#065F46',
  gold: '#C69B45',

  // Backgrounds
  bg: '#FAF9F4',
  background: '#FAF9F4',
  card: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceSoft: '#F1F5EF',
  surfaceGreen: '#ECFDF5',

  // Text
  text: '#17251D',
  textSecondary: '#43554A',
  muted: '#66756B',
  placeholder: '#9AA79E',
  disabled: '#B7C2B9',

  // Borders
  border: '#E5E9E2',
  borderStrong: '#C9D8CC',
  divider: '#EAEDE7',

  // Status
  success: '#15803D',
  successLight: '#DCFCE7',

  danger: '#DC2626',
  dangerLight: '#FEE2E2',

  warning: '#D97706',
  warningLight: '#FEF3C7',

  info: '#0284C7',
  infoLight: '#E0F2FE',

  // Basic
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',

  // Bottom Navigation
  tabActive: '#047857',
  tabInactive: '#87948A',
  tabBackground: '#FFFFFF',

  // Overlay
  overlay: 'rgba(6, 78, 59, 0.45)',
};

// ------------------------------------------------------
// 3. TYPOGRAPHY — INCREASED FONT SIZES
// ------------------------------------------------------

export const typography = {
  fontSize: {
    xs: 14,
    sm: 16,
    md: 18,
    lg: 20,
    xl: 23,
    xxl: 27,
    title: 32,
    display: 38,
    hero: 44,
  },

  fontWeight: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    extrabold: '800' as const,
  },

  lineHeight: {
    tight: 22,
    normal: 27,
    relaxed: 31,
    heading: 40,
    display: 48,
  },
};

// ------------------------------------------------------
// 4. SPACING SYSTEM
// ------------------------------------------------------

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 40,
};

// ------------------------------------------------------
// 5. BORDER RADIUS
// ------------------------------------------------------

export const radius = {
  xs: 6,
  sm: 8,
  md: 12,
  lg: 20,
  xl: 28,
  pill: 999,
};

// ------------------------------------------------------
// 6. ICON SIZES
// ------------------------------------------------------

export const iconSize = {
  xs: 16,
  sm: 20,
  md: 24,
  lg: 28,
  xl: 36,
  xxl: 48,
};

// ------------------------------------------------------
// 7. SHADOWS
// ------------------------------------------------------

export const shadows = {
  small: {
    shadowColor: '#064E3B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 5,
    elevation: 2,
  },

  medium: {
    shadowColor: '#064E3B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 10,
    elevation: 4,
  },

  large: {
    shadowColor: '#064E3B',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.13,
    shadowRadius: 16,
    elevation: 7,
  },
};

// ------------------------------------------------------
// 8. ANIMATION SETTINGS
// Used by React Native Reanimated components
// ------------------------------------------------------

export const motion = {
  duration: {
    instant: 100,
    fast: 150,
    normal: 250,
    smooth: 350,
    slow: 500,
    splash: 900,
  },

  spring: {
    gentle: {
      damping: 18,
      stiffness: 150,
      mass: 1,
    },

    smooth: {
      damping: 20,
      stiffness: 180,
      mass: 0.9,
    },

    bouncy: {
      damping: 12,
      stiffness: 180,
      mass: 0.8,
    },
  },

  pressScale: 0.97,
  cardScale: 0.98,
};

// ------------------------------------------------------
// 9. REACT NATIVE PAPER THEME
// ------------------------------------------------------

export const paperTheme = {
  ...MD3LightTheme,

  roundness: radius.md,

  colors: {
    ...MD3LightTheme.colors,

    primary: colors.primary,
    onPrimary: colors.white,
    primaryContainer: colors.primaryLight,
    onPrimaryContainer: colors.primaryDark,

    secondary: colors.secondary,
    onSecondary: colors.white,
    secondaryContainer: colors.accent,
    onSecondaryContainer: colors.primaryDark,

    tertiary: colors.gold,
    onTertiary: colors.text,
    tertiaryContainer: '#F5E9C9',
    onTertiaryContainer: '#604514',

    background: colors.bg,
    onBackground: colors.text,

    surface: colors.card,
    onSurface: colors.text,

    surfaceVariant: colors.surfaceSoft,
    onSurfaceVariant: colors.textSecondary,

    outline: colors.borderStrong,
    outlineVariant: colors.border,

    error: colors.danger,
    onError: colors.white,
    errorContainer: colors.dangerLight,
    onErrorContainer: '#991B1B',

    inverseSurface: colors.primaryDark,
    inverseOnSurface: colors.white,
    inversePrimary: '#A7F3D0',
  },
};
