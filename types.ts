export type Role = 'client' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string; // stored for mock auth only
  role: Role;
}

export interface Barber {
  id: string;
  name: string;
  avatarUrl: string;
  rating: number; // 0 to 5
}

export interface Service {
  id: string;
  name: string;
  price: number;
  durationMinutes: number;
  image: string;
}

export interface Appointment {
  id: string;
  userId: string;
  userName?: string; // Denormalized for easier display
  barberId: string;
  serviceId: string;
  date: string; // ISO String for start time
  status: 'confirmed' | 'cancelled' | 'completed';
  priceAtBooking: number; // Snapshot of price
  paymentMethod?: 'credit_card' | 'debit_card' | 'pix' | 'cash';
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  stockQuantity: number;
}

export interface ProductSale {
  id: string;
  productId: string;
  userId: string; // The admin who registered the sale
  quantity: number;
  salePrice: number;
  createdAt: string; // ISO String
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  date: string; // ISO String
  category: 'fixed' | 'variable';
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
}