import { neon, neonConfig } from '@neondatabase/serverless';

// Configurar o Neon para conexões serverless
neonConfig.fetchConnectionCache = true;

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
    throw new Error('DATABASE_URL não está definida nas variáveis de ambiente');
}

// Cliente SQL do Neon (usa fetch internamente - funciona em qualquer ambiente)
export const sql = neon(DATABASE_URL);

// Função para testar a conexão
export async function testConnection(): Promise<boolean> {
    try {
        await sql`SELECT NOW() as current_time`;
        return true;
    } catch (error) {
        console.error('Erro ao conectar com o banco de dados:', error);
        return false;
    }
}

// Função para inicializar as tabelas
export async function initializeDatabase(): Promise<void> {
    try {
        // Criar tabela de usuários
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

        // Criar tabela de barbeiros
        await sql`
      CREATE TABLE IF NOT EXISTS barbers (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        avatar_url TEXT,
        rating DECIMAL(2,1) DEFAULT 5.0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

        // Criar tabela de serviços
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

        // Criar tabela de agendamentos
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

        // Criar tabela de produtos
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

        // Criar tabela de vendas de produtos
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

        // Criar tabela de despesas
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
    } catch (error) {
        console.error('Erro ao criar tabelas:', error);
        throw error;
    }
}

// Função para popular dados iniciais
export async function seedDatabase(): Promise<void> {
    try {
        // Verificar se já existem usuários
        const existingUsers = await sql`SELECT COUNT(*) as count FROM users`;

        if (Number(existingUsers[0].count) === 0) {
            await sql`
        INSERT INTO users (id, name, email, password, role) VALUES
        ('admin1', 'Administrador', 'admin@barber.com', '123', 'admin'),
        ('client1', 'Cliente Teste', 'cliente@email.com', '123', 'client')
      `;
        }

        // Verificar se já existem barbeiros
        const existingBarbers = await sql`SELECT COUNT(*) as count FROM barbers`;

        if (Number(existingBarbers[0].count) === 0) {
            await sql`
        INSERT INTO barbers (id, name, avatar_url, rating) VALUES
        ('b1', 'João Silva', 'https://i.pravatar.cc/150?u=b1', 4.8),
        ('b2', 'Marcos Santos', 'https://i.pravatar.cc/150?u=b2', 4.5),
        ('b3', 'Carlos Oliveira', 'https://i.pravatar.cc/150?u=b3', 4.9)
      `;
        }

        // Verificar se já existem serviços
        const existingServices = await sql`SELECT COUNT(*) as count FROM services`;

        if (Number(existingServices[0].count) === 0) {
            await sql`
        INSERT INTO services (id, name, price, duration_minutes, image) VALUES
        ('s1', 'Corte de Cabelo', 50.00, 45, 'https://images.unsplash.com/photo-1599351431202-6e0c06e7d1b3?ixlib=rb-1.2.1&auto=format&fit=crop&w=400&q=80'),
        ('s2', 'Barba Completa', 35.00, 30, 'https://images.unsplash.com/photo-1621605815971-fbc98d665033?ixlib=rb-1.2.1&auto=format&fit=crop&w=400&q=80'),
        ('s3', 'Cabelo + Barba', 80.00, 75, 'https://images.unsplash.com/photo-1503951914875-befbb6491842?ixlib=rb-1.2.1&auto=format&fit=crop&w=400&q=80'),
        ('s4', 'Sobrancelha', 15.00, 15, 'https://images.unsplash.com/photo-1595152772835-219638b6d0b9?ixlib=rb-1.2.1&auto=format&fit=crop&w=400&q=80')
      `;
        }

        // Verificar se já existem produtos
        const existingProducts = await sql`SELECT COUNT(*) as count FROM products`;

        if (Number(existingProducts[0].count) === 0) {
            await sql`
        INSERT INTO products (id, name, description, price, stock_quantity) VALUES
        ('p1', 'Pomada Modeladora', 'Alta fixação, efeito matte', 45.00, 20),
        ('p2', 'Óleo para Barba', 'Hidratação e brilho', 30.00, 15),
        ('p3', 'Shampoo Anticaspa', 'Controle de oleosidade', 25.00, 10)
      `;
        }

        // Verificar se já existem despesas
        const existingExpenses = await sql`SELECT COUNT(*) as count FROM expenses`;

        if (Number(existingExpenses[0].count) === 0) {
            await sql`
        INSERT INTO expenses (id, description, amount, date, category) VALUES
        ('e1', 'Aluguel do Espaço', 1500.00, CURRENT_TIMESTAMP, 'fixed'),
        ('e2', 'Conta de Energia', 350.00, CURRENT_TIMESTAMP, 'variable'),
        ('e3', 'Internet', 120.00, CURRENT_TIMESTAMP, 'fixed')
      `;
        }
    } catch (error) {
        console.error('Erro ao inserir dados iniciais:', error);
        throw error;
    }
}
