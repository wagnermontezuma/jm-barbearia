import { User, Service, Barber, Appointment, Product, ProductSale, Expense } from '../types';

// Em produção (Vercel), a API está no mesmo domínio, então usamos URL relativa
// Em desenvolvimento, usamos localhost:3001
const API_URL = import.meta.env.VITE_API_URL || '';

// Helper para requisições
async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const response = await fetch(`${API_URL}${endpoint}`, {
        headers: {
            'Content-Type': 'application/json',
            ...options?.headers,
        },
        ...options,
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Erro desconhecido' }));
        throw new Error(error.error || 'Erro na requisição');
    }

    return response.json();
}

// Transformadores para converter strings numéricas do PostgreSQL para números
const transformService = (s: any): Service => ({
    ...s,
    price: Number(s.price),
    durationMinutes: Number(s.durationMinutes),
});

const transformBarber = (b: any): Barber => ({
    ...b,
    rating: Number(b.rating),
});

const transformAppointment = (a: any): Appointment => ({
    ...a,
    priceAtBooking: Number(a.priceAtBooking),
});

const transformProduct = (p: any): Product => ({
    ...p,
    price: Number(p.price),
    stockQuantity: Number(p.stockQuantity),
});

const transformProductSale = (s: any): ProductSale => ({
    ...s,
    salePrice: Number(s.salePrice),
    quantity: Number(s.quantity),
});

const transformExpense = (e: any): Expense => ({
    ...e,
    amount: Number(e.amount),
});

export const api = {
    // --- AUTH ---
    login: async (email: string, password: string): Promise<User> => {
        return request<User>('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password }),
        });
    },

    register: async (name: string, email: string, password: string): Promise<User> => {
        return request<User>('/api/auth/register', {
            method: 'POST',
            body: JSON.stringify({ name, email, password }),
        });
    },

    getUsers: async (): Promise<User[]> => {
        return request<User[]>('/api/users');
    },

    // --- SERVICES ---
    getServices: async (): Promise<Service[]> => {
        const services = await request<any[]>('/api/services');
        return services.map(transformService);
    },

    saveService: async (service: Service): Promise<Service> => {
        const result = await request<any>('/api/services', {
            method: 'POST',
            body: JSON.stringify(service),
        });
        return transformService(result);
    },

    deleteService: async (id: string): Promise<void> => {
        await request(`/api/services/${id}`, { method: 'DELETE' });
    },

    // --- BARBERS ---
    getBarbers: async (): Promise<Barber[]> => {
        const barbers = await request<any[]>('/api/barbers');
        return barbers.map(transformBarber);
    },

    saveBarber: async (barber: Barber): Promise<Barber> => {
        const result = await request<any>('/api/barbers', {
            method: 'POST',
            body: JSON.stringify(barber),
        });
        return transformBarber(result);
    },

    deleteBarber: async (id: string): Promise<void> => {
        await request(`/api/barbers/${id}`, { method: 'DELETE' });
    },

    // --- APPOINTMENTS ---
    getAppointments: async (): Promise<Appointment[]> => {
        const appointments = await request<any[]>('/api/appointments');
        return appointments.map(transformAppointment);
    },

    getAvailableSlots: async (dateStr: string, barberId: string, serviceDuration: number): Promise<string[]> => {
        return request<string[]>(`/api/appointments/available-slots?date=${dateStr}&barberId=${barberId}&serviceDuration=${serviceDuration}`);
    },

    createAppointment: async (appointment: Omit<Appointment, 'id' | 'status' | 'priceAtBooking'>): Promise<Appointment> => {
        const result = await request<any>('/api/appointments', {
            method: 'POST',
            body: JSON.stringify(appointment),
        });
        return transformAppointment(result);
    },

    updateAppointmentStatus: async (
        id: string,
        status: 'confirmed' | 'cancelled' | 'completed',
        paymentMethod?: Appointment['paymentMethod']
    ): Promise<void> => {
        await request(`/api/appointments/${id}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ status, paymentMethod }),
        });
    },

    cancelAppointment: async (id: string): Promise<void> => {
        await request(`/api/appointments/${id}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ status: 'cancelled' }),
        });
    },

    // --- PRODUCTS ---
    getProducts: async (): Promise<Product[]> => {
        const products = await request<any[]>('/api/products');
        return products.map(transformProduct);
    },

    saveProduct: async (product: Product): Promise<Product> => {
        const result = await request<any>('/api/products', {
            method: 'POST',
            body: JSON.stringify(product),
        });
        return transformProduct(result);
    },

    deleteProduct: async (id: string): Promise<void> => {
        await request(`/api/products/${id}`, { method: 'DELETE' });
    },

    // --- PRODUCT SALES ---
    getProductSales: async (): Promise<ProductSale[]> => {
        const sales = await request<any[]>('/api/product-sales');
        return sales.map(transformProductSale);
    },

    createProductSale: async (productId: string, quantity: number, userId: string): Promise<ProductSale> => {
        const result = await request<any>('/api/product-sales', {
            method: 'POST',
            body: JSON.stringify({ productId, quantity, userId }),
        });
        return transformProductSale(result);
    },

    // --- EXPENSES ---
    getExpenses: async (): Promise<Expense[]> => {
        const expenses = await request<any[]>('/api/expenses');
        return expenses.map(transformExpense);
    },

    saveExpense: async (expense: Expense): Promise<Expense> => {
        const result = await request<any>('/api/expenses', {
            method: 'POST',
            body: JSON.stringify(expense),
        });
        return transformExpense(result);
    },

    deleteExpense: async (id: string): Promise<void> => {
        await request(`/api/expenses/${id}`, { method: 'DELETE' });
    },

    // --- HEALTH ---
    checkHealth: async (): Promise<{ status: string; database: string }> => {
        return request('/api/health');
    },
};

// Export para compatibilidade com o código existente
export const db = api;
