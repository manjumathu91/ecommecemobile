import React, { useState } from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  ScrollView,
  Switch,
  Text,
  View,
  StyleSheet,
} from 'react-native';

import {
  Chip,
  Modal,
  Portal,
  TextInput,
} from 'react-native-paper';

import Animated, {
  FadeInDown,
  FadeIn,
} from 'react-native-reanimated';

import type {
  NativeStackScreenProps,
} from '@react-navigation/native-stack';

import { catalogApi } from '@/api/services';

import {
  CustomButton,
  EmptyState,
  ErrorMessage,
  ProductGrid,
  ProductGridSkeleton,
} from '@/components';

import {
  colors,
  typography,
  spacing,
  radius,
  shadows,
  motion,
} from '@/constants/theme';

import { usePaginated } from '@/hooks/usePaginated';

import type {
  RootStackParamList,
} from '@/navigation/types';

// ======================================================
// SORT OPTIONS
// ======================================================

const SORTS = [
  { label: 'Latest', value: '-created_at' },
  { label: 'Popular', value: '-sold_count' },
  { label: 'Price: Low to High', value: 'effective_price_db' },
  { label: 'Price: High to Low', value: '-effective_price_db' },
  { label: 'Top Rated', value: '-avg_rating' },
];

// ======================================================
// FILTER TYPES
// ======================================================

interface Filters {
  min: string;
  max: string;
  inStock: boolean;
}

const NO_FILTERS: Filters = {
  min: '',
  max: '',
  inStock: false,
};

// ======================================================
// VELORA PREMIUM PRODUCT LIST SCREEN
// ======================================================

export default function ProductListScreen({
  route,
  navigation,
}: NativeStackScreenProps<
  RootStackParamList,
  'ProductList'
>) {

  const base = route.params;

  // ====================================================
  // STATE
  // ====================================================

  const [ordering, setOrdering] = useState(
    base.ordering ?? '-created_at',
  );

  const [filters, setFilters] = useState<Filters>(
    NO_FILTERS,
  );

  const [draft, setDraft] = useState<Filters>(
    NO_FILTERS,
  );

  const [panel, setPanel] = useState(false);

  // ====================================================
  // PRODUCT API + PAGINATION
  // ====================================================

  const list = usePaginated(
    (page) =>
      catalogApi.products({
        search: base.search,
        category: base.category,
        featured: base.featured || undefined,
        discounted: base.discounted || undefined,

        ordering,

        min_price: filters.min || undefined,
        max_price: filters.max || undefined,
        in_stock: filters.inStock || undefined,

        page,
      }),

    [
      ordering,
      filters,
      base.search,
      base.category,
      base.featured,
      base.discounted,
    ],
  );

  // ====================================================
  // ACTIVE FILTERS
  // ====================================================

  const activeFilters = !!(
    filters.min ||
    filters.max ||
    filters.inStock
  );

  const filterCount = [
    !!filters.min,
    !!filters.max,
    filters.inStock,
  ].filter(Boolean).length;

  // ====================================================
  // FILTER ACTIONS
  // ====================================================

  const openFilters = () => {
    setDraft(filters);
    setPanel(true);
  };

  const closeFilters = () => {
    setPanel(false);
  };

  const resetFilters = () => {
    setFilters(NO_FILTERS);
    setDraft(NO_FILTERS);
    setPanel(false);
  };

  const applyFilters = () => {

    const min = Number(draft.min);
    const max = Number(draft.max);

    if (
      draft.min &&
      draft.max &&
      min > max
    ) {
      return;
    }

    setFilters(draft);
    setPanel(false);
  };

  // ====================================================
  // LIST HEADER
  // ====================================================

  const header = (

    <View style={styles.listHeader}>

      {/* ==============================================
          PRODUCT COUNT
      ============================================== */}

      {!list.loading && (

        <Animated.View
          entering={FadeInDown.duration(
            motion.duration.smooth,
          )}
          style={styles.headingContainer}
        >

          <View style={styles.headingTextContainer}>

            <Text style={styles.heading}>
              {base.title ?? 'Explore Products'}
            </Text>

            <Text style={styles.subtitle}>
              Find your favourite products
            </Text>

          </View>

          <View style={styles.countBadge}>

            <Text style={styles.countNumber}>
              {list.total}
            </Text>

            <Text style={styles.countLabel}>
              Products
            </Text>

          </View>

        </Animated.View>

      )}

      {/* ==============================================
          FILTER AND SORTING
      ============================================== */}

      <Animated.View
        entering={FadeInDown.delay(100).duration(400)}
      >

        <Text style={styles.sortLabel}>
          FILTER & SORT
        </Text>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipContainer}
        >

          {/* FILTER BUTTON */}

          <Chip
            icon="tune-variant"
            selected={activeFilters}
            onPress={openFilters}
            showSelectedCheck={false}
            style={[
              styles.filterChip,
              activeFilters && styles.selectedChip,
            ]}
            textStyle={[
              styles.chipText,
              activeFilters && styles.selectedChipText,
            ]}
          >
            {filterCount > 0
              ? `Filters (${filterCount})`
              : 'Filters'}
          </Chip>

          {/* SORT OPTIONS */}

          {SORTS.map((item, index) => {

            const selected = ordering === item.value;

            return (

              <Animated.View
                key={item.value}
                entering={FadeIn.delay(
                  Math.min(index, 5) * 60,
                )}
              >

                <Chip
                  selected={selected}
                  showSelectedCheck={false}
                  onPress={() =>
                    setOrdering(item.value)
                  }
                  style={[
                    styles.sortChip,
                    selected && styles.selectedChip,
                  ]}
                  textStyle={[
                    styles.chipText,
                    selected && styles.selectedChipText,
                  ]}
                >
                  {item.label}
                </Chip>

              </Animated.View>

            );
          })}

        </ScrollView>

      </Animated.View>

      {/* ==============================================
          ACTIVE FILTER SUMMARY
      ============================================== */}

      {activeFilters && (

        <Animated.View
          entering={FadeInDown.duration(300)}
          style={styles.activeFilterRow}
        >

          <Text style={styles.activeFilterText}>
            Filters applied
          </Text>

          <Text
            onPress={resetFilters}
            style={styles.clearFilterText}
          >
            Clear All
          </Text>

        </Animated.View>

      )}

    </View>
  );

  // ====================================================
  // SCREEN UI
  // ====================================================

  return (

    <View style={styles.container}>

      {/* ==============================================
          LOADING STATE
      ============================================== */}

      {list.loading ? (

        <>
          {header}

          <ProductGridSkeleton />

        </>

      ) : list.error && !list.items.length ? (

        // ============================================
        // ERROR STATE
        // ============================================

        <ErrorMessage
          message={list.error}
          onRetry={list.reload}
        />

      ) : (

        // ============================================
        // PRODUCT GRID
        // ============================================

        <ProductGrid
          products={list.items}
          header={header}

          onPressProduct={(p) =>
            navigation.navigate('ProductDetail', {
              id: p.id,
            })
          }

          onEndReached={list.loadMore}
          loadingMore={list.loadingMore}

          refreshing={list.refreshing}
          onRefresh={list.refresh}

          empty={
            <EmptyState
              icon="magnify-close"
              title="No products found"

              subtitle={
                base.search
                  ? `Nothing matched "${base.search}". Try another word.`
                  : 'Try changing your filters.'
              }

              actionLabel={
                activeFilters
                  ? 'Clear filters'
                  : undefined
              }

              onAction={
                activeFilters
                  ? () => setFilters(NO_FILTERS)
                  : undefined
              }
            />
          }
        />

      )}

      {/* ==============================================
          PREMIUM FILTER MODAL
      ============================================== */}

      <Portal>

        <Modal
          visible={panel}
          onDismiss={closeFilters}
          contentContainerStyle={styles.modalContainer}
        >

          <Animated.View
            entering={FadeInDown.duration(300)}
          >

            {/* MODAL HEADER */}

            <View style={styles.modalHeader}>

              <View style={styles.modalTitleContainer}>

                <View style={styles.modalIcon}>
                <MaterialCommunityIcons
                    name="tune-variant"
                    size={24}
                    color={colors.primary}
                  />
                </View>

                <View>

                  <Text style={styles.modalTitle}>
                    Filter Products
                  </Text>

                  <Text style={styles.modalSubtitle}>
                    Find products that match your needs
                  </Text>

                </View>

              </View>

              <Text
                onPress={closeFilters}
                style={styles.closeButton}
              >
                ✕
              </Text>

            </View>

            {/* PRICE RANGE */}

            <Text style={styles.fieldTitle}>
              Price Range
            </Text>

            <View style={styles.priceInputRow}>

              <TextInput
                mode="outlined"
                label="Min Price"
                keyboardType="numeric"
                value={draft.min}

                onChangeText={(t) =>
                  setDraft({
                    ...draft,
                    min: t.replace(/[^0-9.]/g, ''),
                  })
                }

                outlineColor={colors.border}
                activeOutlineColor={colors.primary}
                textColor={colors.text}
                style={styles.priceInput}
                contentStyle={styles.inputContent}
              />

              <TextInput
                mode="outlined"
                label="Max Price"
                keyboardType="numeric"
                value={draft.max}

                onChangeText={(t) =>
                  setDraft({
                    ...draft,
                    max: t.replace(/[^0-9.]/g, ''),
                  })
                }

                outlineColor={colors.border}
                activeOutlineColor={colors.primary}
                textColor={colors.text}
                style={styles.priceInput}
                contentStyle={styles.inputContent}
              />

            </View>

            {draft.min &&
              draft.max &&
              Number(draft.min) > Number(draft.max) && (

              <Text style={styles.validationError}>
                Maximum price must be greater than minimum price.
              </Text>

            )}

            {/* STOCK FILTER */}

            <View style={styles.stockRow}>

              <View style={styles.stockTextContainer}>

                <MaterialCommunityIcons
                  name="package-variant-closed-check"
                  size={24}
                  color={colors.primary}
                />

                <View style={{ flex: 1 }}>

                  <Text style={styles.stockTitle}>
                    Available Products
                  </Text>

                  <Text style={styles.stockSubtitle}>
                    Show products currently in stock
                  </Text>

                </View>

              </View>

              <Switch
                value={draft.inStock}
                onValueChange={(value) =>
                  setDraft({
                    ...draft,
                    inStock: value,
                  })
                }

                trackColor={{
                  false: colors.borderStrong,
                  true: colors.primaryLight,
                }}

                thumbColor={
                  draft.inStock
                    ? colors.primary
                    : colors.muted
                }

              />

            </View>

            {/* MODAL ACTION BUTTONS */}

            <View style={styles.modalActions}>

              <View style={styles.actionButton}>
                <CustomButton
                  label="Reset"
                  mode="outlined"
                  onPress={resetFilters}
                  style={{ flex: 1 }}
                />
              </View>

              <View style={styles.actionButton}>
                <CustomButton
                  label="Apply Filters"
                  onPress={applyFilters}
                  style={{ flex: 1 }}
                />
              </View>

            </View>

          </Animated.View>

        </Modal>

      </Portal>

    </View>
  );
}

// ======================================================
// VELORA PREMIUM PRODUCT LIST STYLES
// ======================================================

const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },

  listHeader: {
    backgroundColor: colors.bg,
    paddingBottom: spacing.sm,
  },

  // Page heading

  headingContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },

  headingTextContainer: {
    flex: 1,
    marginRight: spacing.sm,
  },

  heading: {
    color: colors.primaryDark,
    fontSize: typography.fontSize.xxl,
    fontWeight: '800',
  },

  subtitle: {
    color: colors.muted,
    fontSize: typography.fontSize.sm,
    marginTop: 4,
  },

  // Product count

  countBadge: {
    backgroundColor: colors.primaryLight,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    minWidth: 76,
  },

  countNumber: {
    color: colors.primaryDark,
    fontSize: typography.fontSize.xl,
    fontWeight: '800',
  },

  countLabel: {
    color: colors.primaryDark,
    fontSize: typography.fontSize.xs,
    fontWeight: '600',
  },

  // Filter labels

  sortLabel: {
    color: colors.muted,
    fontSize: typography.fontSize.xs,
    fontWeight: '800',
    letterSpacing: 1,
    marginLeft: spacing.lg,
    marginBottom: spacing.xs,
  },

  chipContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
    alignItems: 'center',
  },

  filterChip: {
    backgroundColor: colors.card,
    borderColor: colors.primary,
    borderWidth: 1,
    marginRight: spacing.sm,
  },

  sortChip: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    marginRight: spacing.sm,
  },

  selectedChip: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },

  chipText: {
    color: colors.text,
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
  },

  selectedChipText: {
    color: colors.primaryDark,
    fontWeight: '800',
  },

  // Active filter summary

  activeFilterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },

  activeFilterText: {
    color: colors.primaryDark,
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
  },

  clearFilterText: {
    color: colors.danger,
    fontSize: typography.fontSize.sm,
    fontWeight: '700',
    padding: spacing.xs,
  },

  // Filter modal

  modalContainer: {
    backgroundColor: colors.card,
    marginHorizontal: 20,
    padding: spacing.lg,
    borderRadius: radius.xl,
    ...shadows.large,
  },

  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },

  modalTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },

  modalIcon: {
    width: 46,
    height: 46,
    borderRadius: radius.md,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },

  modalTitle: {
    color: colors.primaryDark,
    fontSize: typography.fontSize.xl,
    fontWeight: '800',
  },

  modalSubtitle: {
    color: colors.muted,
    fontSize: typography.fontSize.xs,
    marginTop: 3,
  },

  closeButton: {
    color: colors.muted,
    fontSize: 23,
    fontWeight: '600',
    padding: spacing.sm,
  },

  // Price inputs

  fieldTitle: {
    color: colors.text,
    fontSize: typography.fontSize.lg,
    fontWeight: '700',
    marginBottom: spacing.md,
  },

  priceInputRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },

  priceInput: {
    flex: 1,
    backgroundColor: colors.card,
  },

  inputContent: {
    fontSize: typography.fontSize.md,
  },

  validationError: {
    color: colors.danger,
    fontSize: typography.fontSize.xs,
    marginTop: spacing.sm,
  },

  // In-stock switch

  stockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xl,
    marginBottom: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },

  stockTextContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },

  stockTitle: {
    color: colors.text,
    fontSize: typography.fontSize.md,
    fontWeight: '700',
  },

  stockSubtitle: {
    color: colors.muted,
    fontSize: typography.fontSize.xs,
    marginTop: 3,
  },

  // Modal actions

  modalActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },

  actionButton: {
    flex: 1,
  },

});
