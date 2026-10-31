import api from './client';
import type {
  Address, AddressInput, AuthResponse, Banner, Cart, Category, CheckoutInput, CheckoutSummary, NotificationPage,
  OrderDetail, OrderSummary, Paginated, PaymentRecord, ProductDetail, ProductQuery, ProductSummary,
  RazorpayOrderResponse, Review, Tracking, User, VerifyResponse, WishlistItem,
} from '@/types';

const data = <T>(p: Promise<{ data: T }>) => p.then((r) => r.data);



export const authApi = {

  // ================================================
  // LOGIN
  // ================================================

  login: (email: string, password: string) =>
    data<{ access: string; refresh: string }>(
      api.post('/auth/login/', {
        email,
        password,
      })
    ),

  // ================================================
  // REGISTER
  // Email verification is required.
  // Backend does not return JWT tokens here.
  // ================================================

  register: (body: {
    email: string;
    password: string;
    first_name: string;
    last_name?: string;
    phone?: string;
  }) =>
    data<{
      detail: string;
      email_verification_required: boolean;
      user: User;
    }>(
      api.post('/auth/register/', body)
    ),

  // ================================================
  // VERIFY EMAIL
  // ================================================

  verifyEmail: (uid: string, token: string) =>
    data<{ detail: string }>(
      api.post('/auth/verify-email/', {
        uid,
        token,
      })
    ),

  // ================================================
  // LOGOUT
  // ================================================

  logout: (refresh: string) =>
    api.post('/auth/logout/', {
      refresh,
    }),

  // ================================================
  // PROFILE
  // ================================================

  profile: () =>
    data<User>(
      api.get('/auth/profile/')
    ),

  updateProfile: (
    body: Partial<
      Pick<User, 'first_name' | 'last_name' | 'phone'>
    >
  ) =>
    data<User>(
      api.patch('/auth/profile/', body)
    ),

  // ================================================
  // CHANGE PASSWORD
  // ================================================

  changePassword: (
    old_password: string,
    new_password: string
  ) =>
    api.post('/auth/change-password/', {
      old_password,
      new_password,
    }),

  // ================================================
  // FORGOT PASSWORD
  // ================================================

  forgotPassword: (email: string) =>
    api.post('/auth/forgot-password/', {
      email,
    }),

  // ================================================
  // RESET PASSWORD
  // ================================================

  resetPassword: (
    uid: string,
    token: string,
    new_password: string
  ) =>
    api.post('/auth/reset-password/', {
      uid,
      token,
      new_password,
    }),

};


export const catalogApi = {
  categories: () => data<Category[]>(api.get('/categories/')),
  banners: () => data<Banner[]>(api.get('/banners/')),
  products: (q: ProductQuery = {}) => data<Paginated<ProductSummary>>(api.get('/products/', { params: q })),
  product: (id: number) => data<ProductDetail>(api.get(`/products/${id}/`)),
  reviews: (id: number) => data<Paginated<Review>>(api.get(`/products/${id}/reviews/`)),
  saveReview: (id: number, rating: number, comment: string) => data<Review>(api.post(`/products/${id}/reviews/`, { rating, comment })),
};

export const cartApi = {
  get: () => data<Cart>(api.get('/cart/')),
  add: (product_id: number, quantity = 1) => data<Cart>(api.post('/cart/add/', { product_id, quantity })),
  update: (product_id: number, quantity: number) => data<Cart>(api.post('/cart/update/', { product_id, quantity })),
  remove: (product_id: number) => data<Cart>(api.post('/cart/remove/', { product_id })),
};

export const wishlistApi = {
  list: () => data<WishlistItem[]>(api.get('/wishlist/')),
  add: (product_id: number) => api.post('/wishlist/add/', { product_id }),
  remove: (product_id: number) => api.post('/wishlist/remove/', { product_id }),
};

export const addressApi = {
  list: () => data<Address[]>(api.get('/addresses/')),
  create: (body: AddressInput) => data<Address>(api.post('/addresses/', body)),
  update: (id: number, body: Partial<AddressInput>) => data<Address>(api.patch(`/addresses/${id}/`, body)),
  remove: (id: number) => api.delete(`/addresses/${id}/`),
};

export const orderApi = {
  summary: (address_id: number, coupon_code?: string) =>
  data<CheckoutSummary>(
    api.post('/checkout/summary/', {
      address_id,
      coupon_code: coupon_code ?? '',
    })
  ),
  checkout: (body: CheckoutInput) => data<OrderDetail>(api.post('/checkout/', body)),
  validateCoupon: (code: string) => data<{ code: string; discount: string }>(api.post('/coupons/validate/', { code })),
  list: (page = 1) => data<Paginated<OrderSummary>>(api.get('/orders/', { params: { page } })),
  get: (id: number) => data<OrderDetail>(api.get(`/orders/${id}/`)),
  cancel: (id: number) => data<OrderDetail>(api.post(`/orders/${id}/cancel/`)),
  tracking: (id: number) => data<Tracking>(api.get(`/orders/${id}/tracking/`)),
};

export const paymentApi = {
  createOrder: (order_id: number) => data<RazorpayOrderResponse>(api.post('/payments/create-order/', { order_id })),
  verify: (body: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) =>
    data<VerifyResponse>(api.post('/payments/verify/', body)),
  report: (razorpay_order_id: string, outcome: 'cancelled' | 'failed', reason = '') =>
    api.post('/payments/report/', { razorpay_order_id, outcome, reason }),
  history: () => data<Paginated<PaymentRecord>>(api.get('/payments/')),
};

export const notificationApi = {
  list: () => data<NotificationPage>(api.get('/notifications/')),
  read: (id: number) => api.post(`/notifications/${id}/read/`),
  readAll: () => api.post('/notifications/read-all/'),
  registerDevice: (token: string) => api.post('/notifications/device-token/', { token }),
};
