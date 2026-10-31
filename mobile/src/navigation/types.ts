

import type { NavigatorScreenParams } from '@react-navigation/native';

import type {
  Address,
  PaymentMethod,
} from '@/types';

// ======================================================
// BOTTOM TAB NAVIGATION
// ======================================================

export type TabParamList = {
  Home: undefined;
  Wishlist: undefined;
  Cart: undefined;
  Profile: undefined;
};

// ======================================================
// PRODUCT LIST PARAMETERS
// ======================================================

export type ProductListParams = {
  title?: string;
  category?: number;
  search?: string;
  featured?: boolean;
  discounted?: boolean;
  ordering?: string;
};

// ======================================================
// PAYMENT RESULT
// ======================================================

export type PaymentResultStatus =
  | 'success'
  | 'pending'
  | 'failed'
  | 'cancelled'
  | 'unavailable';

// ======================================================
// EMAIL VERIFICATION PARAMETERS
// ======================================================

export type VerifyEmailParams = {
  email?: string;
  uid?: string;
  token?: string;
};

// ======================================================
// ROOT STACK NAVIGATION
// ======================================================

/** One flat param list: the root stack swaps screen groups based on session state. */

export type RootStackParamList = {

  // ----------------------------------------------
  // ONBOARDING
  // ----------------------------------------------

  Onboarding: undefined;

  // ----------------------------------------------
  // AUTHENTICATION
  // ----------------------------------------------

  Login: undefined;

  Register: undefined;

  VerifyEmail: VerifyEmailParams | undefined;

  ForgotPassword: undefined;

  ResetPassword: undefined;

  // ----------------------------------------------
  // CUSTOMER TABS
  // ----------------------------------------------

  Tabs: NavigatorScreenParams<TabParamList> | undefined;

  // ----------------------------------------------
  // PRODUCTS
  // ----------------------------------------------

  ProductList: ProductListParams;

  ProductDetail: {
    id: number;
  };

  Search: undefined;

  // ----------------------------------------------
  // CHECKOUT
  // ----------------------------------------------

  Checkout: undefined;

  // ----------------------------------------------
  // ADDRESS
  // ----------------------------------------------

  AddressList: undefined;

  AddressForm: {
    address?: Address;
  } | undefined;

  // ----------------------------------------------
  // ORDERS
  // ----------------------------------------------

  OrderList: undefined;

  OrderDetail: {
    id: number;
  };

  OrderTracking: {
    id: number;
  };

  // ----------------------------------------------
  // PAYMENT
  // ----------------------------------------------

  PaymentResult: {
    status: PaymentResultStatus;
    orderId: number;
    reason?: string;
    method?: PaymentMethod;
  };

  PaymentHistory: undefined;

  // ----------------------------------------------
  // NOTIFICATIONS
  // ----------------------------------------------

  Notifications: undefined;

  // ----------------------------------------------
  // PROFILE
  // ----------------------------------------------

  EditProfile: undefined;

  ChangePassword: undefined;

};
