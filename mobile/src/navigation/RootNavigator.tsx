

import React, { useEffect, useState } from 'react';
import AIChatScreen from '@/screens/shop/AIChatScreen';
import {
  Modal,
  Pressable,
} from 'react-native';

import {
  NavigationContainer,
  type LinkingOptions,
} from '@react-navigation/native';

import {
  createBottomTabNavigator,
} from '@react-navigation/bottom-tabs';

import {
  createNativeStackNavigator,
} from '@react-navigation/native-stack';

import type {
  NativeStackScreenProps,
} from '@react-navigation/native-stack';

import { MaterialCommunityIcons } from '@expo/vector-icons';

import {
  colors,
  typography,
  radius,
} from '@/constants/theme';

import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';

import AnimatedTabIcon from '@/components/AnimatedTabIcon';
import CustomerDrawer from '@/components/CustomerDrawer';

// ======================================================
// NAVIGATION TYPES
// ======================================================

import type {
  RootStackParamList,
  TabParamList,
} from './types';

// ======================================================
// AUTH SCREENS
// ======================================================

import SplashScreen from '@/screens/auth/SplashScreen';
import OnboardingScreen from '@/screens/auth/OnboardingScreen';
import LoginScreen from '@/screens/auth/LoginScreen';
import RegisterScreen from '@/screens/auth/RegisterScreen';
import VerifyEmailScreen from '@/screens/auth/VerifyEmailScreen';
import ForgotPasswordScreen from '@/screens/auth/ForgotPasswordScreen';
import ResetPasswordScreen from '@/screens/auth/ResetPasswordScreen';

// ======================================================
// SHOP SCREENS
// ======================================================

import HomeScreen from '@/screens/shop/HomeScreen';
import ProductListScreen from '@/screens/shop/ProductListScreen';
import ProductDetailScreen from '@/screens/shop/ProductDetailScreen';
import SearchScreen from '@/screens/shop/SearchScreen';
import WishlistScreen from '@/screens/shop/WishlistScreen';
import CartScreen from '@/screens/shop/CartScreen';
import CheckoutScreen from '@/screens/shop/CheckoutScreen';
import PaymentResultScreen from '@/screens/shop/PaymentResultScreen';

// ======================================================
// ACCOUNT SCREENS
// ======================================================

import ProfileScreen from '@/screens/account/ProfileScreen';
import EditProfileScreen from '@/screens/account/EditProfileScreen';
import ChangePasswordScreen from '@/screens/account/ChangePasswordScreen';
import AddressListScreen from '@/screens/account/AddressListScreen';
import AddressFormScreen from '@/screens/account/AddressFormScreen';
import NotificationsScreen from '@/screens/account/NotificationsScreen';
import PaymentHistoryScreen from '@/screens/account/PaymentHistoryScreen';

// ======================================================
// ORDER SCREENS
// ======================================================

import OrderListScreen from '@/screens/orders/OrderListScreen';
import OrderDetailScreen from '@/screens/orders/OrderDetailScreen';
import OrderTrackingScreen from '@/screens/orders/OrderTrackingScreen';

// ======================================================
// NAVIGATION INSTANCES
// ======================================================

const Stack = createNativeStackNavigator<RootStackParamList>();

const Tab = createBottomTabNavigator<TabParamList>();

// ======================================================
// DEEP LINK CONFIGURATION
// ======================================================

const linking: LinkingOptions<RootStackParamList> = {

  prefixes: [
    'velora://',
    'http://localhost:8081',
    'http://127.0.0.1:8081',
  ],

  config: {

    screens: {

      VerifyEmail: 'verify-email',

    },

  },

};

// ======================================================
// BOTTOM TAB ICONS
// ======================================================

const ICONS: Record<keyof TabParamList, [string, string]> = {

  Home: ['home', 'home-outline'],

  Wishlist: ['heart', 'heart-outline'],

  Cart: ['cart', 'cart-outline'],

  Profile: ['account', 'account-outline'],

};

// ======================================================
// CUSTOMER BOTTOM TABS
// ======================================================

function Tabs({

  navigation,

}: NativeStackScreenProps<RootStackParamList, 'Tabs'>) {

  const { count } = useCart();

  const [drawerVisible, setDrawerVisible] = useState(false);

  const closeDrawer = () => {
    setDrawerVisible(false);
  };

  return (

    <>

      {/* ==============================================
          BOTTOM TAB NAVIGATOR
      ============================================== */}

      <Tab.Navigator

        screenOptions={({ route }) => ({

          // Home has its own custom VELORA header.
          headerShown: route.name !== 'Home',

          // Header styling
          headerStyle: {
            backgroundColor: colors.bg,
          },

          headerTintColor: colors.primaryDark,

          headerTitleStyle: {
            fontSize: typography.fontSize.lg,
            fontWeight: '700',
            color: colors.primaryDark,
          },

          headerTitleAlign: 'left',

          headerShadowVisible: false,

          // Hamburger button
          headerLeft:
            route.name !== 'Home'
              ? () => (

                  <Pressable
                    onPress={() => setDrawerVisible(true)}
                    hitSlop={10}
                    accessibilityRole="button"
                    accessibilityLabel="Open navigation menu"
                    style={({ pressed }) => ({
                      marginRight: 14,
                      marginLeft: 4,
                      width: 40,
                      height: 40,
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: radius.md,
                      backgroundColor: pressed
                        ? colors.primaryLight
                        : 'transparent',
                    })}
                  >

                    <MaterialCommunityIcons
                      name="menu"
                      size={28}
                      color={colors.primaryDark}
                    />

                  </Pressable>

                )
              : undefined,

          // Bottom navigation colours
          tabBarActiveTintColor: colors.primary,

          tabBarInactiveTintColor: colors.tabInactive,

          // Bottom navigation styling
          tabBarStyle: {
            backgroundColor: colors.tabBackground,
            borderTopColor: colors.border,
            borderTopWidth: 1,
            height: 80,
            paddingBottom: 9,
            paddingTop: 8,
            elevation: 10,
          },

          // Larger navigation labels
          tabBarLabelStyle: {
            fontSize: 16,
            fontWeight: '700',
            marginTop: 4,
          },

          // Animated tab icons
          tabBarIcon: ({ focused, color }) => (

            <AnimatedTabIcon
              name={ICONS[route.name][focused ? 0 : 1]}
              color={color}
              focused={focused}
            />

          ),

          tabBarHideOnKeyboard: true,

        })}

      >

        {/* HOME */}

        <Tab.Screen
          name="Home"
          component={HomeScreen}
          options={{
            headerShown: false,
            title: 'Home',
            tabBarLabel: 'Home',
          }}
        />

        {/* WISHLIST */}

        <Tab.Screen
          name="Wishlist"
          component={WishlistScreen}
          options={{
            title: 'My Wishlist',
            tabBarLabel: 'Wishlist',
          }}
        />

        {/* CART */}

        <Tab.Screen
          name="Cart"
          component={CartScreen}
          options={{
            title: 'My Cart',
            tabBarLabel: 'Cart',
            tabBarBadge: count > 0 ? count : undefined,
            tabBarBadgeStyle: {
              backgroundColor: colors.primary,
              color: colors.white,
              fontWeight: '800',
            },
          }}
        />

        {/* PROFILE */}

        <Tab.Screen
          name="Profile"
          component={ProfileScreen}
          options={{
            title: 'My Profile',
            tabBarLabel: 'Profile',
          }}
        />

      </Tab.Navigator>

      {/* ==============================================
          SHARED CUSTOMER DRAWER
      ============================================== */}

      <Modal
        visible={drawerVisible}
        transparent
        animationType="none"
        statusBarTranslucent
        onRequestClose={closeDrawer}
      >

        <CustomerDrawer
          navigation={navigation}
          onClose={closeDrawer}
        />

      </Modal>

    </>

  );

}

// ======================================================
// ROOT NAVIGATOR
// ======================================================

export default function RootNavigator() {

  const {
    user,
    loading,
    onboarded,
  } = useAuth();

  const [minSplash, setMinSplash] = useState(false);

  // ====================================================
  // MINIMUM SPLASH DURATION
  // ====================================================

  useEffect(() => {

    const timer = setTimeout(() => {
      setMinSplash(true);
    }, 3000);

    return () => clearTimeout(timer);

  }, []);

  // ====================================================
  // SPLASH SCREEN
  // ====================================================

  if (loading || !minSplash) {

    return <SplashScreen />;

  }

  // ====================================================
  // NAVIGATION CONTAINER
  // ====================================================

  return (

    <NavigationContainer linking={linking}>

      <Stack.Navigator

        screenOptions={{

          headerTintColor: colors.primaryDark,

          headerStyle: {
            backgroundColor: colors.bg,
          },

          headerTitleStyle: {
            color: colors.primaryDark,
            fontSize: typography.fontSize.lg,
            fontWeight: '700',
          },

          headerShadowVisible: false,

          contentStyle: {
            backgroundColor: colors.bg,
          },

        }}

      >

        {/* =============================================
            ONBOARDING
        ============================================= */}

        {!onboarded ? (

          <Stack.Screen
            name="Onboarding"
            component={OnboardingScreen}
            options={{
              headerShown: false,
            }}
          />

        ) : !user ? (

          // ===========================================
          // AUTHENTICATION SCREENS
          // ===========================================

          <>

            <Stack.Screen
              name="Login"
              component={LoginScreen}
              options={{
                headerShown: false,
              }}
            />

            <Stack.Screen
              name="Register"
              component={RegisterScreen}
              options={{
                title: 'Create Account',
              }}
            />

            {/* EMAIL VERIFICATION */}

            <Stack.Screen
              name="VerifyEmail"
              component={VerifyEmailScreen}
              options={{
                title: 'Verify Email',
                headerBackVisible: false,
              }}
            />

            <Stack.Screen
              name="ForgotPassword"
              component={ForgotPasswordScreen}
              options={{
                title: 'Forgot Password',
              }}
            />

            <Stack.Screen
              name="ResetPassword"
              component={ResetPasswordScreen}
              options={{
                title: 'Reset Password',
              }}
            />

          </>

        ) : (

          // ===========================================
          // PROTECTED CUSTOMER APPLICATION
          // ===========================================

          <>

            <Stack.Screen
              name="Tabs"
              component={Tabs}
              options={{
                headerShown: false,
              }}
            />
            <Stack.Screen
  name="AIChat"
  component={AIChatScreen}
  options={{
    title: 'VELORA AI Assistant',
    headerShown: true,
  }}
/>

            <Stack.Screen
              name="ProductList"
              component={ProductListScreen}
              options={({ route }) => ({
                title: route.params.title ?? 'Products',
              })}
            />

            <Stack.Screen
              name="ProductDetail"
              component={ProductDetailScreen}
              options={{
                title: 'Product Details',
              }}
            />

            <Stack.Screen
              name="Search"
              component={SearchScreen}
              options={{
                title: 'Search Products',
              }}
            />

            <Stack.Screen
              name="Checkout"
              component={CheckoutScreen}
              options={{
                title: 'Checkout',
              }}
            />

            <Stack.Screen
              name="PaymentResult"
              component={PaymentResultScreen}
              options={{
                headerShown: false,
                gestureEnabled: false,
              }}
            />

            <Stack.Screen
              name="AddressList"
              component={AddressListScreen}
              options={{
                title: 'My Addresses',
              }}
            />

            <Stack.Screen
              name="AddressForm"
              component={AddressFormScreen}
              options={({ route }) => ({
                title: route.params?.address
                  ? 'Edit Address'
                  : 'New Address',
              })}
            />

            <Stack.Screen
              name="OrderList"
              component={OrderListScreen}
              options={{
                title: 'My Orders',
              }}
            />

            <Stack.Screen
              name="OrderDetail"
              component={OrderDetailScreen}
              options={{
                title: 'Order Details',
              }}
            />

            <Stack.Screen
              name="OrderTracking"
              component={OrderTrackingScreen}
              options={{
                title: 'Track Order',
              }}
            />

            <Stack.Screen
              name="PaymentHistory"
              component={PaymentHistoryScreen}
              options={{
                title: 'Payment History',
              }}
            />

            <Stack.Screen
              name="Notifications"
              component={NotificationsScreen}
              options={{
                title: 'Notifications',
              }}
            />

            <Stack.Screen
              name="EditProfile"
              component={EditProfileScreen}
              options={{
                title: 'Edit Profile',
              }}
            />

            <Stack.Screen
              name="ChangePassword"
              component={ChangePasswordScreen}
              options={{
                title: 'Change Password',
              }}
            />

          </>

        )}

      </Stack.Navigator>

    </NavigationContainer>

  );

}
