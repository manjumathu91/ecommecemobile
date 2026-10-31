

import React, { useState } from 'react';

import {
  FlatList,
  RefreshControl,
  View,
  Text,
  StyleSheet,
} from 'react-native';

import Animated, {
  FadeInDown,
  FadeInUp,
  ZoomIn,
} from 'react-native-reanimated';

import { SafeAreaView } from 'react-native-safe-area-context';

import { addressApi } from '@/api/services';

import {
  AddressCard,
  ConfirmationDialog,
  CustomButton,
  EmptyState,
  ErrorMessage,
  LoadingIndicator,
} from '@/components';

import {
  colors,
  typography,
  spacing,
  radius,
  shadows,
  motion,
} from '@/constants/theme';

import { useToast } from '@/context/ToastContext';
import { useFetch } from '@/hooks/useFetch';
import { useNav } from '@/navigation/hooks';

import type { Address } from '@/types';

import { errorMessage } from '@/utils/forms';

// ======================================================
// ADDRESS LIST SCREEN
// ======================================================

export default function AddressListScreen() {

  const nav = useNav();

  const toast = useToast();

  const list = useFetch(
    addressApi.list,
    [],
    { refetchOnFocus: true }
  );

  const [deleting, setDeleting] = useState<Address | null>(null);

  // ====================================================
  // MAKE DEFAULT ADDRESS
  // ====================================================

  const makeDefault = async (address: Address) => {

    try {

      await addressApi.update(address.id, {
        is_default: true,
      });

      toast.show('Default address updated', 'success');

      list.refresh();

    } catch (e) {

      toast.show(errorMessage(e), 'error');

    }
  };

  // ====================================================
  // DELETE ADDRESS
  // ====================================================

  const doDelete = async () => {

    if (!deleting) return;

    try {

      await addressApi.remove(deleting.id);

      toast.show('Address deleted successfully', 'success');

      list.refresh();

    } catch (e) {

      toast.show(errorMessage(e), 'error');

    } finally {

      setDeleting(null);

    }
  };

  // ====================================================
  // LOADING STATE
  // ====================================================

  if (list.loading) {

    return (
      <SafeAreaView style={styles.stateContainer}>

        <LoadingIndicator />

      </SafeAreaView>
    );

  }

  // ====================================================
  // ERROR STATE
  // ====================================================

  if (list.error || !list.data) {

    return (
      <SafeAreaView style={styles.stateContainer}>

        <ErrorMessage
          message={list.error ?? 'Could not load addresses'}
          onRetry={list.reload}
        />

      </SafeAreaView>
    );

  }

  // ====================================================
  // MAIN UI
  // ====================================================

  return (

    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>

      {/* ================================================
          PAGE HEADER
      ================================================ */}

      <Animated.View
        entering={FadeInDown.duration(motion.duration.smooth)}
        style={styles.header}
      >

        <View style={styles.headingRow}>

          <View style={styles.headingContent}>

            <Text style={styles.title}>
              My Addresses
            </Text>

            <Text style={styles.subtitle}>
              Manage your delivery locations
            </Text>

          </View>

          <Animated.View
            entering={ZoomIn.delay(200)}
            style={styles.countBadge}
          >

            <Text style={styles.countText}>
              {list.data.length}
            </Text>

          </Animated.View>

        </View>

        <View style={styles.headerDivider} />

      </Animated.View>

      {/* ================================================
          ADDRESS LIST
      ================================================ */}

      <FlatList
        data={list.data}
        keyExtractor={(address) => String(address.id)}

        showsVerticalScrollIndicator={false}

        contentContainerStyle={[
          styles.listContent,
          list.data.length === 0 && styles.emptyListContent,
        ]}

        refreshControl={
          <RefreshControl
            refreshing={list.refreshing}
            onRefresh={list.refresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }

        ListEmptyComponent={

          <Animated.View
            entering={FadeInUp.duration(400)}
            style={styles.emptyContainer}
          >

            <EmptyState
              icon="map-marker-outline"
              title="No addresses yet"
              subtitle="Add your delivery address to make checkout faster and easier."
            />

          </Animated.View>

        }

        renderItem={({ item, index }) => (

          <Animated.View
            entering={FadeInUp
              .delay(Math.min(index * 80, 400))
              .duration(motion.duration.smooth)}
            style={styles.addressItem}
          >

            <AddressCard
              address={item}

              actions={

                <View style={styles.actions}>

                  {/* EDIT */}

                  <View style={styles.actionButton}>

                    <CustomButton
                      label="Edit"
                      mode="text"
                      onPress={() =>
                        nav.navigate('AddressForm', {
                          address: item,
                        })
                      }
                    />

                  </View>

                  {/* MAKE DEFAULT */}

                  {!item.is_default && (

                    <View style={styles.actionButton}>

                      <CustomButton
                        label="Make default"
                        mode="text"
                        onPress={() => makeDefault(item)}
                      />

                    </View>

                  )}

                  {/* DELETE */}

                  <View style={styles.actionButton}>

                    <CustomButton
                      label="Delete"
                      mode="text"
                      danger
                      onPress={() => setDeleting(item)}
                    />

                  </View>

                </View>

              }

            />

          </Animated.View>

        )}

      />

      {/* ================================================
          BOTTOM ADD ADDRESS BUTTON
      ================================================ */}

      <Animated.View
        entering={FadeInDown.delay(250)}
        style={styles.footer}
      >

        <CustomButton
          label="Add New Address"
          icon="plus"
          onPress={() => nav.navigate('AddressForm')}
          style={styles.addButton}
        />

        <Text style={styles.footerText}>
          Your delivery addresses are saved securely.
        </Text>

      </Animated.View>

      {/* ================================================
          DELETE CONFIRMATION
      ================================================ */}

      <ConfirmationDialog
        visible={!!deleting}
        title="Delete address?"
        message="This address will be removed from your account. Past orders keep their delivery details."
        confirmLabel="Delete"
        danger
        onCancel={() => setDeleting(null)}
        onConfirm={doDelete}
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

  stateContainer: {
    flex: 1,
    backgroundColor: colors.bg,
    justifyContent: 'center',
  },

  // Header

  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    backgroundColor: colors.bg,
  },

  headingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  headingContent: {
    flex: 1,
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
    marginTop: spacing.xs,
  },

  countBadge: {
    minWidth: 44,
    height: 44,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },

  countText: {
    color: colors.primaryDark,
    fontSize: typography.fontSize.lg,
    fontWeight: '800',
  },

  headerDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginTop: spacing.lg,
  },

  // Address list

  listContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
    flexGrow: 1,
  },

  emptyListContent: {
    justifyContent: 'center',
  },

  addressItem: {
    marginBottom: spacing.md,
  },

  // Address actions

  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginTop: spacing.sm,
    gap: spacing.xs,
  },

  actionButton: {
    minWidth: 70,
  },

  // Empty state

  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
  },

  // Bottom section

  footer: {
    backgroundColor: colors.card,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    ...shadows.small,
  },

  addButton: {
    marginBottom: spacing.sm,
  },

  footerText: {
    color: colors.muted,
    fontSize: typography.fontSize.xs,
    textAlign: 'center',
  },

});
