

import React, { useState } from 'react';

import {
  Pressable,
  Text,
  TextInput,
  View,
  StyleSheet,
} from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';

import Animated, {
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';

import {
  colors,
  typography,
  radius,
  spacing,
  shadows,
  motion,
} from '@/constants/theme';

// ======================================================
// PROPS
// ======================================================

interface Props {
  value?: string;
  onChangeText?: (text: string) => void;
  onSubmit?: () => void;
  onPress?: () => void;
  autoFocus?: boolean;
  placeholder?: string;
}

// ======================================================
// VELORA PREMIUM SEARCH BAR
// ======================================================

export default function SearchBar({
  value,
  onChangeText,
  onSubmit,
  onPress,
  autoFocus,
  placeholder = 'Search products or categories',
}: Props) {

  const [focused, setFocused] = useState(false);

  const scale = useSharedValue(1);

  // ====================================================
  // PRESS ANIMATION
  // ====================================================

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      {
        scale: scale.value,
      },
    ],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(
      motion.pressScale,
      motion.spring.gentle,
    );
  };

  const handlePressOut = () => {
    scale.value = withSpring(
      1,
      motion.spring.smooth,
    );
  };

  // ====================================================
  // COMMON SEARCH ICON
  // ====================================================

  const SearchIcon = () => (
    <MaterialCommunityIcons
      name="magnify"
      size={27}
      color={focused ? colors.primary : colors.primaryDark}
    />
  );

  // ====================================================
  // HOME: TAPPABLE SEARCH BAR
  // ====================================================

  if (onPress) {

    return (
      <Animated.View
        entering={FadeInDown.duration(400)}
        style={animatedStyle}
      >
        <Pressable
          onPress={onPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          accessibilityRole="button"
          accessibilityLabel="Search products and categories"
          style={styles.searchBox}
        >

          <SearchIcon />

          <Text
            numberOfLines={1}
            style={styles.placeholder}
          >
            {placeholder}
          </Text>

          <MaterialCommunityIcons
            name="tune-variant"
            size={23}
            color={colors.muted}
          />

        </Pressable>
      </Animated.View>
    );
  }

  // ====================================================
  // SEARCH: REAL TEXT INPUT
  // ====================================================

  return (
    <Animated.View
      entering={FadeInDown.duration(400)}
      style={[
        styles.searchBox,
        styles.inputBox,
        focused && styles.focusedBox,
        animatedStyle,
      ]}
    >

      {/* Search Icon */}

      <SearchIcon />

      {/* Search Input */}

      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        onSubmitEditing={onSubmit}
        returnKeyType="search"
        autoFocus={autoFocus}
        placeholder={placeholder}
        placeholderTextColor={colors.placeholder}
        selectionColor={colors.primary}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        accessibilityLabel="Search products"
        autoCapitalize="none"
        autoCorrect={false}
      />

      {/* Clear Button */}

      {!!value && (
        <Pressable
          onPress={() => onChangeText?.('')}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Clear search"
          style={styles.clearButton}
        >
          <MaterialCommunityIcons
            name="close-circle"
            size={23}
            color={colors.muted}
          />
        </Pressable>
      )}

    </Animated.View>
  );
}

// ======================================================
// VELORA PREMIUM SEARCH STYLES
// ======================================================

const styles = StyleSheet.create({

  // Main search container

  searchBox: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    ...shadows.small,
  },

  // Actual input container

  inputBox: {
    backgroundColor: colors.white,
  },

  // Focused state

  focusedBox: {
    borderColor: colors.primary,
    borderWidth: 2,
    shadowColor: colors.primary,
    shadowOpacity: 0.10,
  },

  // Home placeholder

  placeholder: {
    flex: 1,
    color: colors.muted,
    fontSize: typography.fontSize.md,
    fontWeight: '500',
    marginLeft: spacing.xs,
  },

  // Text input

  input: {
    flex: 1,
    minWidth: 0,
    marginLeft: spacing.xs,
    color: colors.text,
    fontSize: typography.fontSize.md,
    fontWeight: '500',
    paddingVertical: spacing.sm,
    outlineStyle: 'none' as any,
  },

  // Clear button

  clearButton: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },

});
