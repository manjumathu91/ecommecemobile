export interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  date_joined: string;
}
export interface AuthResponse {
  user: User;
  access: string;
  refresh: string;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  image: string | null;
  parent: number | null;
  children: Category[];
}
export interface Banner {
  id: number;
  title: string;
  image: string;
  product: number | null;
  category: number | null;
}

export interface ProductSummary {
  id: number;
  name: string;
  slug: string;
  category: number;
  category_name: string;
  price: string;
  discount_price: string | null;
  effective_price: string;
  discount_percent: number;
  stock: number;
  in_stock: boolean;
  is_low_stock: boolean;
  avg_rating: string;
  review_count: number;
  thumbnail: string | null;
}
export interface ProductImage {
  id: number;
  image: string;
  alt_text: string;
}
export interface ProductDetail extends ProductSummary {
  description: string;
  images: ProductImage[];
  related: ProductSummary[];
}
export interface ProductQuery {
  search?: string;
  category?: number;
  min_price?: string;
  max_price?: string;
  in_stock?: boolean;
  featured?: boolean;
  discounted?: boolean;
  ordering?: string;
  page?: number;
}

export interface Review {
  id: number;
  user_name: string;
  rating: number;
  comment: string;
  created_at: string;
}

export interface CartItem {
  id: number;
  product: ProductSummary;
  quantity: number;
  line_total: string;
}
export interface Cart {
  items: CartItem[];
  item_count: number;
  subtotal: string;
  discount: string;
  total: string;
  adjustments?: unknown[];
}

export interface WishlistItem {
  id: number;
  product: ProductSummary;
  added_at: string;
}


export interface Address {
  id: number;
  full_name: string;
  phone: string;
  house_number: string;
  street: string;
  city: string;
  state: string;
  postal_code: string;
  delivery_instructions: string;
  is_default: boolean;

  // GPS location
  latitude?: number | null;
  longitude?: number | null;
}


export type AddressInput = Omit<Address, 'id'>;

export type PaymentMethod = 'COD' | 'RAZORPAY';
export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'REFUND_PENDING' | 'REFUNDED';
export type OrderStatus =
  | 'PENDING_PAYMENT' | 'PLACED' | 'CONFIRMED' | 'PROCESSING' | 'SHIPPED' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'CANCELLED';

export interface OrderSummary {
  id: number;
  order_number: string;
  status: OrderStatus;
  status_label: string;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  total_amount: string;
  item_count: number;
  created_at: string;
}
export interface OrderItem {
  id: number;
  product: number | null;
  product_name: string;
  original_price: string;
  unit_price: string;
  quantity: number;
  line_total: string;
  thumbnail: string | null;
}
export interface OrderDetail extends OrderSummary {
  shipping_name: string;
  shipping_phone: string;
  shipping_address: string;
  items_total: string;
  coupon_code: string;
  coupon_discount: string;
  delivery_charge: string;
  estimated_delivery: string | null;
  items: OrderItem[];
  history: { status: OrderStatus; note: string; created_at: string }[];
  can_cancel: boolean;
}
export interface TrackingStage {
  status: OrderStatus;
  label: string;
  completed: boolean;
  current: boolean;
  timestamp: string | null;
}
export interface Tracking {
  order_number: string;
  status: OrderStatus;
  status_label: string;
  is_cancelled: boolean;
  awaiting_payment: boolean;
  estimated_delivery: string | null;
  stages: TrackingStage[];
  history: { status: OrderStatus; note: string; created_at: string }[];
}
export interface CheckoutSummary {
  original_items_total: string;
  items_total: string;
  product_discount: string;
  coupon_code: string;
  coupon_discount: string;
  delivery_charge: string;

  taxable_amount: string;
  gst_amount: string;
  cgst_amount: string;
  sgst_amount: string;
  igst_amount: string;

  tax_type: 'INTRA_STATE' | 'INTER_STATE';
  total_amount: string;
  item_count: number;
}

export interface CheckoutInput {
  address_id: number;
  payment_method: PaymentMethod;
  coupon_code?: string;
}

export interface RazorpayOrderResponse {
  key_id: string;
  razorpay_order_id: string;
  amount: number;
  currency: string;
  order_id: number;
  order_number: string;
  name: string;
  description: string;
  prefill: { name: string; email: string; contact: string };
}
export interface PaymentRecord {
  id: number;
  order: number;
  order_number: string;
  method: PaymentMethod;
  instrument: string;
  amount: string;
  currency: string;
  status: 'CREATED' | 'SUCCESS' | 'FAILED' | 'CANCELLED';
  razorpay_payment_id: string | null;
  failure_reason: string;
  created_at: string;
}
export interface VerifyResponse {
  status: 'success' | 'failed' | 'pending';
  order_id: number;
}

export interface AppNotification {
  id: number;
  title: string;
  message: string;
  type: 'ORDER' | 'PAYMENT' | 'SHIPPING' | 'DELIVERY' | 'SYSTEM';
  order: number | null;
  is_read: boolean;
  created_at: string;
}
export interface NotificationPage extends Paginated<AppNotification> {
  unread_count: number;
}
