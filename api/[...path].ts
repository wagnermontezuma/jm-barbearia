import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon, neonConfig } from '@neondatabase/serverless';

// Configurar o Neon para conexões serverless
neonConfig.fetchConnectionCache = true;

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
    throw new Error('DATABASE_URL não está definida nas variáveis de ambiente');
}

const sql = neon(DATABASE_URL);

// Helper para gerar IDs
const generateId = () => Math.random().toString(36).substr(2, 9);

// Tipos de resposta
type ApiHandler = (req: VercelRequest, res: VercelResponse) => Promise<void>;

// ===========================================
// HANDLERS
// ===========================================

// Auth - Login
const handleLogin: ApiHandler = async (req, res) => {
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Método não permitido' });
        return;
    }

    const { email, password } = req.body;
    const users = await sql`
    SELECT id, name, email, role FROM users 
    WHERE email = ${email} AND password = ${password}
  `;

    if (users.length === 0) {
        res.status(401).json({ error: 'Credenciais inválidas' });
        return;
    }

    res.json(users[0]);
};

// Auth - Register
const handleRegister: ApiHandler = async (req, res) => {
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Método não permitido' });
        return;
    }

    const { name, email, password } = req.body;
    const existing = await sql`SELECT id FROM users WHERE email = ${email}`;

    if (existing.length > 0) {
        res.status(400).json({ error: 'Email já cadastrado' });
        return;
    }

    const id = generateId();
    await sql`
    INSERT INTO users (id, name, email, password, role)
    VALUES (${id}, ${name}, ${email}, ${password}, 'client')
  `;

    res.json({ id, name, email, role: 'client' });
};

// Users
const handleUsers: ApiHandler = async (req, res) => {
    if (req.method !== 'GET') {
        res.status(405).json({ error: 'Método não permitido' });
        return;
    }

    const users = await sql`SELECT id, name, email, role FROM users`;
    res.json(users);
};

// Services
const handleServices: ApiHandler = async (req, res) => {
    if (req.method === 'GET') {
        const services = await sql`
      SELECT id, name, price, duration_minutes as "durationMinutes", image 
      FROM services
    `;
        res.json(services);
        return;
    }

    if (req.method === 'POST') {
        const { id, name, price, durationMinutes, image } = req.body;
        const finalId = id || generateId();

        await sql`
      INSERT INTO services (id, name, price, duration_minutes, image)
      VALUES (${finalId}, ${name}, ${price}, ${durationMinutes}, ${image})
      ON CONFLICT (id) DO UPDATE SET
        name = ${name},
        price = ${price},
        duration_minutes = ${durationMinutes},
        image = ${image}
    `;

        res.json({ id: finalId, name, price, durationMinutes, image });
        return;
    }

    res.status(405).json({ error: 'Método não permitido' });
};

// Services Delete
const handleServiceDelete: ApiHandler = async (req, res) => {
    if (req.method !== 'DELETE') {
        res.status(405).json({ error: 'Método não permitido' });
        return;
    }

    const id = req.query.path?.[1];
    await sql`DELETE FROM services WHERE id = ${id as string}`;
    res.json({ success: true });
};

// Barbers
const handleBarbers: ApiHandler = async (req, res) => {
    if (req.method === 'GET') {
        const barbers = await sql`
      SELECT id, name, avatar_url as "avatarUrl", rating 
      FROM barbers
    `;
        res.json(barbers);
        return;
    }

    if (req.method === 'POST') {
        const { id, name, avatarUrl, rating } = req.body;
        const finalId = id || generateId();

        await sql`
      INSERT INTO barbers (id, name, avatar_url, rating)
      VALUES (${finalId}, ${name}, ${avatarUrl}, ${rating || 5.0})
      ON CONFLICT (id) DO UPDATE SET
        name = ${name},
        avatar_url = ${avatarUrl},
        rating = ${rating || 5.0}
    `;

        res.json({ id: finalId, name, avatarUrl, rating: rating || 5.0 });
        return;
    }

    res.status(405).json({ error: 'Método não permitido' });
};

// Barbers Delete
const handleBarberDelete: ApiHandler = async (req, res) => {
    if (req.method !== 'DELETE') {
        res.status(405).json({ error: 'Método não permitido' });
        return;
    }

    const id = req.query.path?.[1];
    await sql`DELETE FROM barbers WHERE id = ${id as string}`;
    res.json({ success: true });
};

// Appointments
const handleAppointments: ApiHandler = async (req, res) => {
    if (req.method === 'GET') {
        const appointments = await sql`
      SELECT 
        id, 
        user_id as "userId", 
        user_name as "userName",
        barber_id as "barberId", 
        service_id as "serviceId", 
        date, 
        status, 
        price_at_booking as "priceAtBooking",
        payment_method as "paymentMethod"
      FROM appointments
      ORDER BY date DESC
    `;
        res.json(appointments);
        return;
    }

    if (req.method === 'POST') {
        const { userId, userName, barberId, serviceId, date } = req.body;

        const services = await sql`SELECT price FROM services WHERE id = ${serviceId}`;
        if (services.length === 0) {
            res.status(400).json({ error: 'Serviço não encontrado' });
            return;
        }

        const priceAtBooking = services[0].price;
        const id = generateId();

        await sql`
      INSERT INTO appointments (id, user_id, user_name, barber_id, service_id, date, status, price_at_booking)
      VALUES (${id}, ${userId}, ${userName}, ${barberId}, ${serviceId}, ${date}, 'confirmed', ${priceAtBooking})
    `;

        res.json({
            id,
            userId,
            userName,
            barberId,
            serviceId,
            date,
            status: 'confirmed',
            priceAtBooking
        });
        return;
    }

    res.status(405).json({ error: 'Método não permitido' });
};

// Available Slots
const handleAvailableSlots: ApiHandler = async (req, res) => {
    if (req.method !== 'GET') {
        res.status(405).json({ error: 'Método não permitido' });
        return;
    }

    const { date, barberId, serviceDuration } = req.query;

    const appointments = await sql`
    SELECT a.date, s.duration_minutes
    FROM appointments a
    JOIN services s ON a.service_id = s.id
    WHERE a.barber_id = ${barberId as string}
      AND DATE(a.date) = ${date as string}
      AND a.status != 'cancelled'
  `;

    const openHour = 9;
    const closeHour = 21;
    const interval = 30;
    const duration = Number(serviceDuration);

    const slots: string[] = [];
    const dateStr = date as string;
    const now = new Date();

    for (let hour = openHour; hour < closeHour; hour++) {
        for (let min = 0; min < 60; min += interval) {
            const slotStart = new Date(`${dateStr}T${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}:00`);
            const slotEnd = new Date(slotStart.getTime() + duration * 60000);

            if (slotStart < now) continue;

            const closeTime = new Date(`${dateStr}T${closeHour.toString().padStart(2, '0')}:00:00`);
            if (slotEnd > closeTime) continue;

            const hasConflict = appointments.some((app: any) => {
                const appStart = new Date(app.date);
                const appEnd = new Date(appStart.getTime() + app.duration_minutes * 60000);
                return (slotStart < appEnd) && (slotEnd > appStart);
            });

            if (!hasConflict) {
                slots.push(`${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`);
            }
        }
    }

    res.json(slots);
};

// Appointment Status Update
const handleAppointmentStatus: ApiHandler = async (req, res) => {
    if (req.method !== 'PATCH') {
        res.status(405).json({ error: 'Método não permitido' });
        return;
    }

    const id = req.query.path?.[1];
    const { status, paymentMethod } = req.body;

    if (paymentMethod) {
        await sql`
      UPDATE appointments 
      SET status = ${status}, payment_method = ${paymentMethod}
      WHERE id = ${id as string}
    `;
    } else {
        await sql`
      UPDATE appointments SET status = ${status} WHERE id = ${id as string}
    `;
    }

    res.json({ success: true });
};

// Products
const handleProducts: ApiHandler = async (req, res) => {
    if (req.method === 'GET') {
        const products = await sql`
      SELECT id, name, description, price, stock_quantity as "stockQuantity"
      FROM products
    `;
        res.json(products);
        return;
    }

    if (req.method === 'POST') {
        const { id, name, description, price, stockQuantity } = req.body;
        const finalId = id || generateId();

        await sql`
      INSERT INTO products (id, name, description, price, stock_quantity)
      VALUES (${finalId}, ${name}, ${description}, ${price}, ${stockQuantity})
      ON CONFLICT (id) DO UPDATE SET
        name = ${name},
        description = ${description},
        price = ${price},
        stock_quantity = ${stockQuantity}
    `;

        res.json({ id: finalId, name, description, price, stockQuantity });
        return;
    }

    res.status(405).json({ error: 'Método não permitido' });
};

// Products Delete
const handleProductDelete: ApiHandler = async (req, res) => {
    if (req.method !== 'DELETE') {
        res.status(405).json({ error: 'Método não permitido' });
        return;
    }

    const id = req.query.path?.[1];
    await sql`DELETE FROM products WHERE id = ${id as string}`;
    res.json({ success: true });
};

// Product Sales
const handleProductSales: ApiHandler = async (req, res) => {
    if (req.method === 'GET') {
        const sales = await sql`
      SELECT 
        id, 
        product_id as "productId", 
        user_id as "userId", 
        quantity, 
        sale_price as "salePrice",
        created_at as "createdAt"
      FROM product_sales
      ORDER BY created_at DESC
    `;
        res.json(sales);
        return;
    }

    if (req.method === 'POST') {
        const { productId, userId, quantity } = req.body;

        const products = await sql`
      SELECT price, stock_quantity FROM products WHERE id = ${productId}
    `;

        if (products.length === 0) {
            res.status(400).json({ error: 'Produto não encontrado' });
            return;
        }

        if (products[0].stock_quantity < quantity) {
            res.status(400).json({ error: `Estoque insuficiente. Disponível: ${products[0].stock_quantity}` });
            return;
        }

        const salePrice = products[0].price;
        const id = generateId();

        await sql`
      UPDATE products 
      SET stock_quantity = stock_quantity - ${quantity}
      WHERE id = ${productId}
    `;

        await sql`
      INSERT INTO product_sales (id, product_id, user_id, quantity, sale_price)
      VALUES (${id}, ${productId}, ${userId}, ${quantity}, ${salePrice})
    `;

        res.json({ id, productId, userId, quantity, salePrice, createdAt: new Date().toISOString() });
        return;
    }

    res.status(405).json({ error: 'Método não permitido' });
};

// Expenses
const handleExpenses: ApiHandler = async (req, res) => {
    if (req.method === 'GET') {
        const expenses = await sql`
      SELECT id, description, amount, date, category
      FROM expenses
      ORDER BY date DESC
    `;
        res.json(expenses);
        return;
    }

    if (req.method === 'POST') {
        const { id, description, amount, date, category } = req.body;
        const finalId = id || generateId();

        await sql`
      INSERT INTO expenses (id, description, amount, date, category)
      VALUES (${finalId}, ${description}, ${amount}, ${date}, ${category})
      ON CONFLICT (id) DO UPDATE SET
        description = ${description},
        amount = ${amount},
        date = ${date},
        category = ${category}
    `;

        res.json({ id: finalId, description, amount, date, category });
        return;
    }

    res.status(405).json({ error: 'Método não permitido' });
};

// Expenses Delete
const handleExpenseDelete: ApiHandler = async (req, res) => {
    if (req.method !== 'DELETE') {
        res.status(405).json({ error: 'Método não permitido' });
        return;
    }

    const id = req.query.path?.[1];
    await sql`DELETE FROM expenses WHERE id = ${id as string}`;
    res.json({ success: true });
};

// Health Check
const handleHealth: ApiHandler = async (_req, res) => {
    try {
        await sql`SELECT 1`;
        res.json({ status: 'ok', database: 'connected' });
    } catch {
        res.status(500).json({ status: 'error', database: 'disconnected' });
    }
};

// DB Init
const handleDbInit: ApiHandler = async (req, res) => {
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Use POST para inicializar o banco' });
        return;
    }

    // Criar tabelas
    await sql`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('client', 'admin')),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `;

    await sql`
    CREATE TABLE IF NOT EXISTS barbers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      avatar_url TEXT,
      rating DECIMAL(2,1) DEFAULT 5.0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `;

    await sql`
    CREATE TABLE IF NOT EXISTS services (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      price DECIMAL(10,2) NOT NULL,
      duration_minutes INTEGER NOT NULL,
      image TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `;

    await sql`
    CREATE TABLE IF NOT EXISTS appointments (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      user_name TEXT,
      barber_id TEXT NOT NULL REFERENCES barbers(id),
      service_id TEXT NOT NULL REFERENCES services(id),
      date TIMESTAMP NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('confirmed', 'cancelled', 'completed')),
      price_at_booking DECIMAL(10,2) NOT NULL,
      payment_method TEXT CHECK (payment_method IN ('credit_card', 'debit_card', 'pix', 'cash')),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `;

    await sql`
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      price DECIMAL(10,2) NOT NULL,
      stock_quantity INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `;

    await sql`
    CREATE TABLE IF NOT EXISTS product_sales (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL REFERENCES products(id),
      user_id TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      sale_price DECIMAL(10,2) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `;

    await sql`
    CREATE TABLE IF NOT EXISTS expenses (
      id TEXT PRIMARY KEY,
      description TEXT NOT NULL,
      amount DECIMAL(10,2) NOT NULL,
      date TIMESTAMP NOT NULL,
      category TEXT NOT NULL CHECK (category IN ('fixed', 'variable')),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `;

    // Seed data
    const existingUsers = await sql`SELECT COUNT(*) as count FROM users`;
    if (Number(existingUsers[0].count) === 0) {
        await sql`
      INSERT INTO users (id, name, email, password, role) VALUES
      ('admin1', 'Administrador', 'admin@barber.com', '123', 'admin'),
      ('client1', 'Cliente Teste', 'cliente@email.com', '123', 'client')
    `;
    }

    const existingBarbers = await sql`SELECT COUNT(*) as count FROM barbers`;
    if (Number(existingBarbers[0].count) === 0) {
        await sql`
      INSERT INTO barbers (id, name, avatar_url, rating) VALUES
      ('b1', 'João Silva', 'https://i.pravatar.cc/150?u=b1', 4.8),
      ('b2', 'Marcos Santos', 'https://i.pravatar.cc/150?u=b2', 4.5),
      ('b3', 'Carlos Oliveira', 'https://i.pravatar.cc/150?u=b3', 4.9)
    `;
    }

    const existingServices = await sql`SELECT COUNT(*) as count FROM services`;
    if (Number(existingServices[0].count) === 0) {
        await sql`
      INSERT INTO services (id, name, price, duration_minutes, image) VALUES
      ('s1', 'Corte de Cabelo', 50.00, 45, 'https://images.unsplash.com/photo-1599351431202-6e0c06e7d1b3?w=400'),
      ('s2', 'Barba Completa', 35.00, 30, 'https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=400'),
      ('s3', 'Cabelo + Barba', 80.00, 75, 'https://images.unsplash.com/photo-1503951914875-befbb6491842?w=400'),
      ('s4', 'Sobrancelha', 15.00, 15, 'https://images.unsplash.com/photo-1595152772835-219638b6d0b9?w=400')
    `;
    }

    const existingProducts = await sql`SELECT COUNT(*) as count FROM products`;
    if (Number(existingProducts[0].count) === 0) {
        await sql`
      INSERT INTO products (id, name, description, price, stock_quantity) VALUES
      ('p1', 'Pomada Modeladora', 'Alta fixação, efeito matte', 45.00, 20),
      ('p2', 'Óleo para Barba', 'Hidratação e brilho', 30.00, 15),
      ('p3', 'Shampoo Anticaspa', 'Controle de oleosidade', 25.00, 10)
    `;
    }

    const existingExpenses = await sql`SELECT COUNT(*) as count FROM expenses`;
    if (Number(existingExpenses[0].count) === 0) {
        await sql`
      INSERT INTO expenses (id, description, amount, date, category) VALUES
      ('e1', 'Aluguel do Espaço', 1500.00, CURRENT_TIMESTAMP, 'fixed'),
      ('e2', 'Conta de Energia', 350.00, CURRENT_TIMESTAMP, 'variable'),
      ('e3', 'Internet', 120.00, CURRENT_TIMESTAMP, 'fixed')
    `;
    }

    res.json({ success: true, message: 'Banco de dados inicializado com sucesso!' });
};

// ===========================================
// ROUTER
// ===========================================

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    try {
        const path = req.query.path as string[] | undefined;
        const route = path?.join('/') || '';

        // Routing
        if (route === 'auth/login') return handleLogin(req, res);
        if (route === 'auth/register') return handleRegister(req, res);
        if (route === 'users') return handleUsers(req, res);
        if (route === 'services') return handleServices(req, res);
        if (route.startsWith('services/') && req.method === 'DELETE') return handleServiceDelete(req, res);
        if (route === 'barbers') return handleBarbers(req, res);
        if (route.startsWith('barbers/') && req.method === 'DELETE') return handleBarberDelete(req, res);
        if (route === 'appointments') return handleAppointments(req, res);
        if (route === 'appointments/available-slots') return handleAvailableSlots(req, res);
        if (route.match(/^appointments\/[^/]+\/status$/)) return handleAppointmentStatus(req, res);
        if (route === 'products') return handleProducts(req, res);
        if (route.startsWith('products/') && req.method === 'DELETE') return handleProductDelete(req, res);
        if (route === 'product-sales') return handleProductSales(req, res);
        if (route === 'expenses') return handleExpenses(req, res);
        if (route.startsWith('expenses/') && req.method === 'DELETE') return handleExpenseDelete(req, res);
        if (route === 'health') return handleHealth(req, res);
        if (route === 'db/init') return handleDbInit(req, res);

        res.status(404).json({ error: 'Endpoint não encontrado', route });
    } catch (error) {
        console.error('Erro na API:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
}
