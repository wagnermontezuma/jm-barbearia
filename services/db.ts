import { User, Service, Barber, Appointment, Product, ProductSale, Expense } from '../types';

// --- MOCK DATA (SEED) ---
const INITIAL_SERVICES: Service[] = [
  { id: 's1', name: 'Corte de Cabelo', price: 50, durationMinutes: 45, image: 'https://images.unsplash.com/photo-1599351431202-6e0c06e7d1b3?ixlib=rb-1.2.1&auto=format&fit=crop&w=400&q=80' },
  { id: 's2', name: 'Barba Completa', price: 35, durationMinutes: 30, image: 'https://images.unsplash.com/photo-1621605815971-fbc98d665033?ixlib=rb-1.2.1&auto=format&fit=crop&w=400&q=80' },
  { id: 's3', name: 'Cabelo + Barba', price: 80, durationMinutes: 75, image: 'https://images.unsplash.com/photo-1503951914875-befbb6491842?ixlib=rb-1.2.1&auto=format&fit=crop&w=400&q=80' },
  { id: 's4', name: 'Sobrancelha', price: 15, durationMinutes: 15, image: 'https://images.unsplash.com/photo-1595152772835-219638b6d0b9?ixlib=rb-1.2.1&auto=format&fit=crop&w=400&q=80' },
];

const INITIAL_BARBERS: Barber[] = [
  { id: 'b1', name: 'João Silva', avatarUrl: 'https://i.pravatar.cc/150?u=b1', rating: 4.8 },
  { id: 'b2', name: 'Marcos Santos', avatarUrl: 'https://i.pravatar.cc/150?u=b2', rating: 4.5 },
  { id: 'b3', name: 'Carlos Oliveira', avatarUrl: 'https://i.pravatar.cc/150?u=b3', rating: 4.9 },
];

const INITIAL_USERS: User[] = [
  { id: 'admin1', name: 'Administrador', email: 'admin@barber.com', password: '123', role: 'admin' },
  { id: 'client1', name: 'Cliente Teste', email: 'cliente@email.com', password: '123', role: 'client' },
];

const INITIAL_PRODUCTS: Product[] = [
  { id: 'p1', name: 'Pomada Modeladora', description: 'Alta fixação, efeito matte', price: 45.00, stockQuantity: 20 },
  { id: 'p2', name: 'Óleo para Barba', description: 'Hidratação e brilho', price: 30.00, stockQuantity: 15 },
  { id: 'p3', name: 'Shampoo Anticaspa', description: 'Controle de oleosidade', price: 25.00, stockQuantity: 10 },
];

const INITIAL_EXPENSES: Expense[] = [
  { id: 'e1', description: 'Aluguel do Espaço', amount: 1500.00, date: new Date().toISOString(), category: 'fixed' },
  { id: 'e2', description: 'Conta de Energia', amount: 350.00, date: new Date().toISOString(), category: 'variable' },
  { id: 'e3', description: 'Internet', amount: 120.00, date: new Date().toISOString(), category: 'fixed' },
];

// --- LOCAL STORAGE HELPERS ---
const STORAGE_KEYS = {
  USERS: 'jm_users',
  SERVICES: 'jm_services',
  BARBERS: 'jm_barbers',
  APPOINTMENTS: 'jm_appointments',
  PRODUCTS: 'jm_products',
  SALES: 'jm_sales',
  EXPENSES: 'jm_expenses'
};

const load = <T>(key: string, initial: T): T => {
  const stored = localStorage.getItem(key);
  return stored ? JSON.parse(stored) : initial;
};

const save = (key: string, data: any) => {
  localStorage.setItem(key, JSON.stringify(data));
};

// Initialize Storage if empty
if (!localStorage.getItem(STORAGE_KEYS.USERS)) save(STORAGE_KEYS.USERS, INITIAL_USERS);
if (!localStorage.getItem(STORAGE_KEYS.SERVICES)) save(STORAGE_KEYS.SERVICES, INITIAL_SERVICES);
if (!localStorage.getItem(STORAGE_KEYS.BARBERS)) save(STORAGE_KEYS.BARBERS, INITIAL_BARBERS);
if (!localStorage.getItem(STORAGE_KEYS.PRODUCTS)) save(STORAGE_KEYS.PRODUCTS, INITIAL_PRODUCTS);
if (!localStorage.getItem(STORAGE_KEYS.APPOINTMENTS)) save(STORAGE_KEYS.APPOINTMENTS, []);
if (!localStorage.getItem(STORAGE_KEYS.SALES)) save(STORAGE_KEYS.SALES, []);
if (!localStorage.getItem(STORAGE_KEYS.EXPENSES)) save(STORAGE_KEYS.EXPENSES, INITIAL_EXPENSES);

// Simulate Network Delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const db = {
  // --- AUTH ---
  login: async (email: string, password: string): Promise<User> => {
    await delay(500);
    const users = load<User[]>(STORAGE_KEYS.USERS, INITIAL_USERS);
    const user = users.find(u => u.email === email && u.password === password);
    if (!user) throw new Error('Credenciais inválidas');
    const { password: _, ...safeUser } = user;
    return safeUser;
  },

  register: async (name: string, email: string, password: string): Promise<User> => {
    await delay(500);
    const users = load<User[]>(STORAGE_KEYS.USERS, INITIAL_USERS);
    if (users.find(u => u.email === email)) throw new Error('Email já cadastrado');
    
    const newUser: User = {
      id: Math.random().toString(36).substr(2, 9),
      name,
      email,
      password,
      role: 'client'
    };
    
    users.push(newUser);
    save(STORAGE_KEYS.USERS, users);
    
    const { password: _, ...safeUser } = newUser;
    return safeUser;
  },

  getUsers: async (): Promise<User[]> => {
    await delay(300);
    return load<User[]>(STORAGE_KEYS.USERS, INITIAL_USERS).map(({password, ...u}) => u);
  },

  // --- SERVICES ---
  getServices: async (): Promise<Service[]> => {
    await delay(300);
    return load<Service[]>(STORAGE_KEYS.SERVICES, INITIAL_SERVICES);
  },

  saveService: async (service: Service): Promise<Service> => {
    await delay(400);
    const services = load<Service[]>(STORAGE_KEYS.SERVICES, INITIAL_SERVICES);
    const index = services.findIndex(s => s.id === service.id);
    
    if (index >= 0) {
      services[index] = service;
    } else {
      services.push(service);
    }
    save(STORAGE_KEYS.SERVICES, services);
    return service;
  },

  deleteService: async (id: string): Promise<void> => {
    await delay(300);
    const services = load<Service[]>(STORAGE_KEYS.SERVICES, INITIAL_SERVICES);
    save(STORAGE_KEYS.SERVICES, services.filter(s => s.id !== id));
  },

  // --- BARBERS ---
  getBarbers: async (): Promise<Barber[]> => {
    await delay(300);
    return load<Barber[]>(STORAGE_KEYS.BARBERS, INITIAL_BARBERS);
  },

  saveBarber: async (barber: Barber): Promise<Barber> => {
    await delay(400);
    const barbers = load<Barber[]>(STORAGE_KEYS.BARBERS, INITIAL_BARBERS);
    const index = barbers.findIndex(b => b.id === barber.id);
    
    if (index >= 0) {
      barbers[index] = barber;
    } else {
      barbers.push(barber);
    }
    save(STORAGE_KEYS.BARBERS, barbers);
    return barber;
  },

  deleteBarber: async (id: string): Promise<void> => {
    await delay(300);
    const barbers = load<Barber[]>(STORAGE_KEYS.BARBERS, INITIAL_BARBERS);
    save(STORAGE_KEYS.BARBERS, barbers.filter(b => b.id !== id));
  },

  // --- APPOINTMENTS ---
  getAppointments: async (): Promise<Appointment[]> => {
    await delay(300);
    return load<Appointment[]>(STORAGE_KEYS.APPOINTMENTS, []);
  },

  updateAppointmentStatus: async (id: string, status: 'confirmed' | 'cancelled' | 'completed', paymentMethod?: Appointment['paymentMethod']): Promise<void> => {
    await delay(300);
    const apps = load<Appointment[]>(STORAGE_KEYS.APPOINTMENTS, []);
    const app = apps.find(a => a.id === id);
    if (app) {
      app.status = status;
      if (paymentMethod) {
        app.paymentMethod = paymentMethod;
      }
      save(STORAGE_KEYS.APPOINTMENTS, apps);
    }
  },

  // --- SCHEDULING LOGIC ---
  getAvailableSlots: async (dateStr: string, barberId: string, serviceDuration: number): Promise<string[]> => {
    await delay(600); // Simulate processing
    const allApps = load<Appointment[]>(STORAGE_KEYS.APPOINTMENTS, []);
    
    // Filter apps for this barber on this day
    const barberApps = allApps.filter(a => 
      a.barberId === barberId && 
      a.date.startsWith(dateStr) && 
      a.status !== 'cancelled'
    );

    // Business Hours: 09:00 to 21:00
    const openHour = 9;
    const closeHour = 21;
    const interval = 30; // 30 mins

    const slots: string[] = [];
    let currentTime = new Date(`${dateStr}T${openHour.toString().padStart(2, '0')}:00:00`);
    const endTime = new Date(`${dateStr}T${closeHour.toString().padStart(2, '0')}:00:00`);

    // We need services to know the duration of existing appointments
    const services = load<Service[]>(STORAGE_KEYS.SERVICES, INITIAL_SERVICES);
    const now = new Date();

    while (currentTime < endTime) {
      const slotStart = new Date(currentTime);
      const slotEnd = new Date(currentTime.getTime() + serviceDuration * 60000);

      // Check if slot is in the past
      if (slotStart < now) {
         currentTime = new Date(currentTime.getTime() + interval * 60000);
         continue;
      }

      if (slotEnd <= endTime) {
        // Check collision
        const hasConflict = barberApps.some(app => {
          const appService = services.find(s => s.id === app.serviceId);
          const appDuration = appService ? appService.durationMinutes : 30; // default 30 if not found
          
          const appStart = new Date(app.date);
          const appEnd = new Date(appStart.getTime() + appDuration * 60000);

          // Logic: (StartA < EndB) and (EndA > StartB)
          // Ensures no overlap with existing appointments for the same barber
          return (slotStart < appEnd) && (slotEnd > appStart);
        });

        if (!hasConflict) {
          const hours = slotStart.getHours().toString().padStart(2, '0');
          const minutes = slotStart.getMinutes().toString().padStart(2, '0');
          slots.push(`${hours}:${minutes}`);
        }
      }

      currentTime = new Date(currentTime.getTime() + interval * 60000);
    }

    return slots;
  },

  createAppointment: async (appointment: Omit<Appointment, 'id' | 'status' | 'priceAtBooking'>): Promise<Appointment> => {
    await delay(800);
    
    const appDate = new Date(appointment.date);
    if (appDate < new Date()) {
        throw new Error("Não é possível realizar agendamentos no passado.");
    }

    // Double check availability (Simulate backend check)
    const services = load<Service[]>(STORAGE_KEYS.SERVICES, INITIAL_SERVICES);
    const service = services.find(s => s.id === appointment.serviceId);
    if (!service) throw new Error("Service not found");

    const slots = await db.getAvailableSlots(
      appointment.date.split('T')[0], 
      appointment.barberId, 
      service.durationMinutes
    );
    
    const time = new Date(appointment.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    
    // Simplistic check: if time is in slots. 
    // Note: In a real concurrency scenario, this check needs to be atomic.
    if (!slots.includes(time)) {
      throw new Error("Horário indisponível. Este barbeiro já possui um agendamento ou o horário não é válido.");
    }

    const newApp: Appointment = {
      ...appointment,
      id: Math.random().toString(36).substr(2, 9),
      status: 'confirmed',
      priceAtBooking: service.price
    };

    const apps = load<Appointment[]>(STORAGE_KEYS.APPOINTMENTS, []);
    apps.push(newApp);
    save(STORAGE_KEYS.APPOINTMENTS, apps);
    
    return newApp;
  },
  
  cancelAppointment: async (id: string): Promise<void> => {
    await delay(300);
    const apps = load<Appointment[]>(STORAGE_KEYS.APPOINTMENTS, []);
    const app = apps.find(a => a.id === id);
    if (app) {
        app.status = 'cancelled';
        save(STORAGE_KEYS.APPOINTMENTS, apps);
    }
  },

  // --- INVENTORY ---
  getProducts: async (): Promise<Product[]> => {
    await delay(300);
    return load<Product[]>(STORAGE_KEYS.PRODUCTS, INITIAL_PRODUCTS);
  },

  saveProduct: async (product: Product): Promise<Product> => {
    await delay(400);
    const products = load<Product[]>(STORAGE_KEYS.PRODUCTS, INITIAL_PRODUCTS);
    const index = products.findIndex(p => p.id === product.id);
    
    if (index >= 0) {
      products[index] = product;
    } else {
      products.push(product);
    }
    save(STORAGE_KEYS.PRODUCTS, products);
    return product;
  },

  deleteProduct: async (id: string): Promise<void> => {
    await delay(300);
    const products = load<Product[]>(STORAGE_KEYS.PRODUCTS, INITIAL_PRODUCTS);
    save(STORAGE_KEYS.PRODUCTS, products.filter(p => p.id !== id));
  },

  getProductSales: async (): Promise<ProductSale[]> => {
    await delay(300);
    return load<ProductSale[]>(STORAGE_KEYS.SALES, []);
  },

  createProductSale: async (productId: string, quantity: number, userId: string): Promise<ProductSale> => {
    await delay(500);
    const products = load<Product[]>(STORAGE_KEYS.PRODUCTS, INITIAL_PRODUCTS);
    const product = products.find(p => p.id === productId);

    if (!product) throw new Error('Produto não encontrado');
    if (product.stockQuantity < quantity) throw new Error(`Estoque insuficiente. Disponível: ${product.stockQuantity}`);

    // Update stock
    product.stockQuantity -= quantity;
    save(STORAGE_KEYS.PRODUCTS, products);

    // Create Sale
    const sales = load<ProductSale[]>(STORAGE_KEYS.SALES, []);
    const newSale: ProductSale = {
      id: Math.random().toString(36).substr(2, 9),
      productId,
      userId,
      quantity,
      salePrice: product.price,
      createdAt: new Date().toISOString()
    };
    
    sales.push(newSale);
    save(STORAGE_KEYS.SALES, sales);

    return newSale;
  },

  // --- EXPENSES ---
  getExpenses: async (): Promise<Expense[]> => {
    await delay(300);
    return load<Expense[]>(STORAGE_KEYS.EXPENSES, INITIAL_EXPENSES);
  },

  saveExpense: async (expense: Expense): Promise<Expense> => {
    await delay(400);
    const expenses = load<Expense[]>(STORAGE_KEYS.EXPENSES, INITIAL_EXPENSES);
    const index = expenses.findIndex(e => e.id === expense.id);
    
    if (index >= 0) {
        expenses[index] = expense;
    } else {
        expenses.push(expense);
    }
    save(STORAGE_KEYS.EXPENSES, expenses);
    return expense;
  },

  deleteExpense: async (id: string): Promise<void> => {
    await delay(300);
    const expenses = load<Expense[]>(STORAGE_KEYS.EXPENSES, INITIAL_EXPENSES);
    save(STORAGE_KEYS.EXPENSES, expenses.filter(e => e.id !== id));
  }
};