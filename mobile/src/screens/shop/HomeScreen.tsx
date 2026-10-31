

import React, { useCallback, useState } from 'react';

import {
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';

import Animated, {
  FadeIn,
  FadeInDown,
} from 'react-native-reanimated';

import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { catalogApi, notificationApi } from '@/api/services';

import {
  BannerCarousel,
  CategoryCard,
  ErrorMessage,
  ProductCard,
  SearchBar,
  SkeletonLoader,
  ProductGridSkeleton,
} from '@/components';

import CustomerDrawer from '@/components/CustomerDrawer';

import {
  colors,
  typography,
  radius,
  spacing,
} from '@/constants/theme';

import { useAuth } from '@/context/AuthContext';
import { useFetch } from '@/hooks/useFetch';
import { useNav } from '@/navigation/hooks';

import type {
  ProductListParams,
  RootStackParamList,
} from '@/navigation/types';

import type { ProductSummary } from '@/types';

import { recentlyViewed } from '@/utils/storage';

// ======================================================
// VELORA PRODUCT SECTION
// ======================================================

function ProductRow({
  title,
  products,
  params,
  delay = 0,
}: {
  title: string;
  products: ProductSummary[];
  params?: ProductListParams;
  delay?: number;
}) {
  const nav = useNav();

  if (!products.length) return null;

  return (
    <Animated.View
      entering={FadeInDown.delay(delay).duration(450)}
      style={{ marginTop: spacing.lg }}
    >
      {/* Section heading */}

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: spacing.lg,
          marginBottom: spacing.md,
        }}
      >
        <Text
          style={{
            color: colors.primaryDark,
            fontSize: typography.fontSize.xl,
            fontWeight: '800',
          }}
        >
          {title}
        </Text>

        {params && (
          <Pressable
            onPress={() =>
              nav.navigate('ProductList', {
                title,
                ...params,
              })
            }
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={`See all ${title}`}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
              }}
            >
              <Text
                style={{
                  color: colors.primary,
                  fontSize: typography.fontSize.sm,
                  fontWeight: '700',
                }}
              >
                See all
              </Text>

              <MaterialCommunityIcons
                name="chevron-right"
                size={20}
                color={colors.primary}
              />
            </View>
          </Pressable>
        )}
      </View>

      {/* Animated product list */}

      <FlatList
        horizontal
        data={products}
        keyExtractor={(p) => String(p.id)}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: spacing.sm,
        }}
        renderItem={({ item, index }) => (
          <ProductCard
            product={item}
            width={176}
            index={index}
            onPress={() =>
              nav.navigate('ProductDetail', {
                id: item.id,
              })
            }
          />
        )}
      />
    </Animated.View>
  );
}

// ======================================================
// VELORA HOME SCREEN
// ======================================================

export default function HomeScreen() {
  const nav = useNav();

  const { user } = useAuth();

  const [viewed, setViewed] = useState<ProductSummary[]>([]);
  const [drawerVisible, setDrawerVisible] = useState(false);

  const drawerNavigation =
    nav as unknown as NativeStackNavigationProp<RootStackParamList>;

  // ====================================================
  // HOME API
  // ====================================================

  const home = useFetch(async () => {
    const [
      banners,
      categories,
      featured,
      latest,
      best,
      offers,
      top,
    ] = await Promise.all([
      catalogApi.banners(),
      catalogApi.categories(),
      catalogApi.products({ featured: true }),
      catalogApi.products({ ordering: '-created_at' }),
      catalogApi.products({ ordering: '-sold_count' }),
      catalogApi.products({ discounted: true }),
      catalogApi.products({ ordering: '-avg_rating' }),
    ]);

    return {
      banners,
      categories,
      featured: featured.results,
      latest: latest.results,
      best: best.results,
      offers: offers.results,
      top: top.results,
    };
  });

  // ====================================================
  // NOTIFICATIONS
  // ====================================================

  const notes = useFetch(
    notificationApi.list,
    [],
    { refetchOnFocus: true },
  );

  const unread = notes.data?.unread_count ?? 0;

  // ====================================================
  // RECENTLY VIEWED
  // ====================================================

  useFocusEffect(
    useCallback(() => {
      recentlyViewed.get().then(setViewed);
    }, []),
  );

  const d = home.data;

  // ====================================================
  // MAIN UI
  // ====================================================

  return (
    <SafeAreaView
      style={{
        flex: 1,
        backgroundColor: colors.bg,
      }}
      edges={['top']}
    >

      {/* ==============================================
          ANIMATED VELORA HEADER
      ============================================== */}

      <Animated.View
        entering={FadeInDown.duration(500)}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: spacing.lg,
          paddingVertical: spacing.md,
          backgroundColor: colors.bg,
        }}
      >

        {/* Hamburger */}

        <Pressable
          onPress={() => setDrawerVisible(true)}
          accessibilityRole="button"
          accessibilityLabel="Open navigation menu"
          hitSlop={8}
          style={({ pressed }) => ({
            width: 46,
            height: 46,
            borderRadius: radius.md,
            backgroundColor: colors.primaryLight,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: pressed ? 0.75 : 1,
            transform: [
              { scale: pressed ? 0.95 : 1 },
            ],
          })}
        >
          <MaterialCommunityIcons
            name="menu"
            size={29}
            color={colors.primaryDark}
          />
        </Pressable>

        {/* VELORA name */}

        <View
          style={{
            flex: 1,
            marginLeft: spacing.md,
          }}
        >
          <Text
            style={{
              color: colors.primaryDark,
              fontSize: typography.fontSize.xl,
              fontWeight: '800',
              letterSpacing: 1.5,
            }}
          >
            VELORA
          </Text>

          <Text
            style={{
              color: colors.muted,
              fontSize: typography.fontSize.sm,
              marginTop: 2,
            }}
          >
            Hello, {user?.first_name || 'there'}!
          </Text>
        </View>

        {/* Notifications */}

        <Pressable
          onPress={() => nav.navigate('Notifications')}
          accessibilityRole="button"
          accessibilityLabel="Notifications"
          hitSlop={10}
          style={{
            width: 44,
            height: 44,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.surfaceGreen,
            borderRadius: radius.md,
          }}
        >
          <MaterialCommunityIcons
            name="bell-outline"
            size={27}
            color={colors.primaryDark}
          />

          {unread > 0 && (
            <View
              style={{
                position: 'absolute',
                top: 2,
                right: 2,
                backgroundColor: colors.danger,
                borderRadius: 10,
                minWidth: 18,
                height: 18,
                paddingHorizontal: 3,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text
                style={{
                  color: colors.white,
                  fontSize: 11,
                  fontWeight: '700',
                }}
              >
                {unread > 9 ? '9+' : unread}
              </Text>
            </View>
          )}
        </Pressable>

      </Animated.View>

      {/* ==============================================
          ANIMATED SEARCH
      ============================================== */}

      <Animated.View
        entering={FadeInDown.delay(100).duration(450)}
        style={{
          paddingHorizontal: spacing.lg,
          paddingBottom: spacing.md,
        }}
      >
        <SearchBar
          onPress={() => nav.navigate('Search')}
        />
      </Animated.View>

      {/* ==============================================
          LOADING
      ============================================== */}

      {home.loading ? (

        <ScrollView>
          <SkeletonLoader
            height={160}
            radius={16}
            style={{ marginHorizontal: 16 }}
          />

          <ProductGridSkeleton count={4} />
        </ScrollView>

      ) : home.error || !d ? (

        <ErrorMessage
          message={home.error ?? 'Could not load the store'}
          onRetry={home.reload}
        />

      ) : (

        // ==============================================
        // HOME CONTENT
        // ==============================================

        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={home.refreshing}
              onRefresh={home.refresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          contentContainerStyle={{
            paddingBottom: spacing.xxl,
          }}
        >

          {/* BANNER ANIMATION */}

          <Animated.View
            entering={FadeInDown.delay(150).duration(550)}
          >
            <BannerCarousel
              banners={d.banners}
              onPress={(b) =>
                b.product
                  ? nav.navigate('ProductDetail', {
                      id: b.product,
                    })
                  : b.category
                    ? nav.navigate('ProductList', {
                        category: b.category,
                        title: b.title,
                      })
                    : undefined
              }
            />
          </Animated.View>

          {/* CATEGORIES */}

          {d.categories.length > 0 && (
            <Animated.View
              entering={FadeInDown.delay(250).duration(450)}
              style={{ marginTop: spacing.lg }}
            >
              <Text
                style={{
                  color: colors.primaryDark,
                  fontSize: typography.fontSize.xl,
                  fontWeight: '800',
                  marginHorizontal: spacing.lg,
                  marginBottom: spacing.md,
                }}
              >
                Explore Categories
              </Text>

              <FlatList
                horizontal
                data={d.categories}
                keyExtractor={(c) => String(c.id)}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{
                  paddingHorizontal: spacing.lg,
                }}
                renderItem={({ item, index }) => (
                  <CategoryCard
                    category={item}
                    index={index}
                    onPress={() =>
                      nav.navigate('ProductList', {
                        category: item.id,
                        title: item.name,
                      })
                    }
                  />
                )}
              />
            </Animated.View>
          )}

          {/* PRODUCT SECTIONS */}

          <ProductRow
            title="Featured Products"
            products={d.featured}
            params={{ featured: true }}
            delay={350}
          />

          <ProductRow
            title="Special Offers"
            products={d.offers}
            params={{ discounted: true }}
            delay={450}
          />

          <ProductRow
            title="Latest Products"
            products={d.latest}
            params={{ ordering: '-created_at' }}
            delay={550}
          />

          <ProductRow
            title="Best Sellers"
            products={d.best}
            params={{ ordering: '-sold_count' }}
            delay={650}
          />

          <ProductRow
            title="Recommended For You"
            products={d.top}
            params={{ ordering: '-avg_rating' }}
            delay={750}
          />

          <ProductRow
            title="Recently Viewed"
            products={viewed}
            delay={850}
          />

          {/* FOOTER BRANDING */}

          <Animated.View
            entering={FadeIn.delay(900)}
            style={{
              alignItems: 'center',
              marginTop: spacing.xxl,
              padding: spacing.lg,
            }}
          >
            <MaterialCommunityIcons
              name="leaf"
              size={25}
              color={colors.secondary}
            />

            <Text
              style={{
                color: colors.primaryDark,
                fontSize: typography.fontSize.lg,
                fontWeight: '800',
                letterSpacing: 1.5,
                marginTop: spacing.sm,
              }}
            >
              VELORA
            </Text>

            <Text
              style={{
                color: colors.muted,
                fontSize: typography.fontSize.xs,
                marginTop: 4,
              }}
            >
              Everything You Love, In One Place.
            </Text>
          </Animated.View>

        </ScrollView>
      )}

      {/* ==============================================
          CUSTOMER DRAWER
      ============================================== */}

      <Modal
        visible={drawerVisible}
        transparent
        animationType="none"
        statusBarTranslucent
        onRequestClose={() => setDrawerVisible(false)}
      >
        <CustomerDrawer
          navigation={drawerNavigation}
          onClose={() => setDrawerVisible(false)}
        />
      </Modal>

    </SafeAreaView>
  );
}
