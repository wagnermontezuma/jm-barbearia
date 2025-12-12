import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { sql, testConnection, initializeDatabase, seedDatabase } from './database';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares
app.use(cors());
app.use(express.json());

// Logging middleware
app.use((req: Request, _res: Response, next: NextFunction) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// ============= AUTH ROUTES =============

app.post('/api/auth/login', async (req: Request, res: Response) => {
    try {
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
    } catch (error) {
        console.error('Erro no login:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

app.post('/api/auth/register', async (req: Request, res: Response) => {
    try {
        const { name, email, password } = req.body;

        // Verificar se email já existe
        const existing = await sql`SELECT id FROM users WHERE email = ${email}`;

        if (existing.length > 0) {
            res.status(400).json({ error: 'Email já cadastrado' });
            return;
        }

        const id = Math.random().toString(36).substr(2, 9);

        await sql`
      INSERT INTO users (id, name, email, password, role)
      VALUES (${id}, ${name}, ${email}, ${password}, 'client')
    `;

        res.json({ id, name, email, role: 'client' });
    } catch (error) {
        console.error('Erro no registro:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

app.get('/api/users', async (_req: Request, res: Response) => {
    try {
        const users = await sql`SELECT id, name, email, role FROM users`;
        res.json(users);
    } catch (error) {
        console.error('Erro ao buscar usuários:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// ============= SERVICES ROUTES =============

app.get('/api/services', async (_req: Request, res: Response) => {
    try {
        const services = await sql`
      SELECT id, name, price, duration_minutes as "durationMinutes", image 
      FROM services
    `;
        res.json(services);
    } catch (error) {
        console.error('Erro ao buscar serviços:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

app.post('/api/services', async (req: Request, res: Response) => {
    try {
        const { id, name, price, durationMinutes, image } = req.body;
        const finalId = id || Math.random().toString(36).substr(2, 9);

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
    } catch (error) {
        console.error('Erro ao salvar serviço:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

app.delete('/api/services/:id', async (req: Request, res: Response) => {
    try {
        await sql`DELETE FROM services WHERE id = ${req.params.id}`;
        res.json({ success: true });
    } catch (error) {
        console.error('Erro ao deletar serviço:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// ============= BARBERS ROUTES =============

app.get('/api/barbers', async (_req: Request, res: Response) => {
    try {
        const barbers = await sql`
      SELECT id, name, avatar_url as "avatarUrl", rating 
      FROM barbers
    `;
        res.json(barbers);
    } catch (error) {
        console.error('Erro ao buscar barbeiros:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

app.post('/api/barbers', async (req: Request, res: Response) => {
    try {
        const { id, name, avatarUrl, rating } = req.body;
        const finalId = id || Math.random().toString(36).substr(2, 9);

        await sql`
      INSERT INTO barbers (id, name, avatar_url, rating)
      VALUES (${finalId}, ${name}, ${avatarUrl}, ${rating || 5.0})
      ON CONFLICT (id) DO UPDATE SET
        name = ${name},
        avatar_url = ${avatarUrl},
        rating = ${rating || 5.0}
    `;

        res.json({ id: finalId, name, avatarUrl, rating: rating || 5.0 });
    } catch (error) {
        console.error('Erro ao salvar barbeiro:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

app.delete('/api/barbers/:id', async (req: Request, res: Response) => {
    try {
        await sql`DELETE FROM barbers WHERE id = ${req.params.id}`;
        res.json({ success: true });
    } catch (error) {
        console.error('Erro ao deletar barbeiro:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// ============= APPOINTMENTS ROUTES =============

app.get('/api/appointments', async (_req: Request, res: Response) => {
    try {
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
    } catch (error) {
        console.error('Erro ao buscar agendamentos:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

app.post('/api/appointments', async (req: Request, res: Response) => {
    try {
        const { userId, userName, barberId, serviceId, date } = req.body;

        // Buscar preço do serviço
        const services = await sql`SELECT price FROM services WHERE id = ${serviceId}`;
        if (services.length === 0) {
            res.status(400).json({ error: 'Serviço não encontrado' });
            return;
        }

        const priceAtBooking = services[0].price;
        const id = Math.random().toString(36).substr(2, 9);

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
    } catch (error) {
        console.error('Erro ao criar agendamento:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

app.patch('/api/appointments/:id/status', async (req: Request, res: Response) => {
    try {
        const { status, paymentMethod } = req.body;

        if (paymentMethod) {
            await sql`
        UPDATE appointments 
        SET status = ${status}, payment_method = ${paymentMethod}
        WHERE id = ${req.params.id}
      `;
        } else {
            await sql`
        UPDATE appointments SET status = ${status} WHERE id = ${req.params.id}
      `;
        }

        res.json({ success: true });
    } catch (error) {
        console.error('Erro ao atualizar status:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

app.get('/api/appointments/available-slots', async (req: Request, res: Response) => {
    try {
        const { date, barberId, serviceDuration } = req.query;

        // Buscar agendamentos do barbeiro nesse dia
        const appointments = await sql`
      SELECT a.date, s.duration_minutes
      FROM appointments a
      JOIN services s ON a.service_id = s.id
      WHERE a.barber_id = ${barberId as string}
        AND DATE(a.date) = ${date as string}
        AND a.status != 'cancelled'
    `;

        // Calcular slots disponíveis
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

                // Pular slots no passado
                if (slotStart < now) continue;

                // Verificar se ultrapassa horário de fechamento
                const closeTime = new Date(`${dateStr}T${closeHour.toString().padStart(2, '0')}:00:00`);
                if (slotEnd > closeTime) continue;

                // Verificar conflitos
                const hasConflict = appointments.some(app => {
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
    } catch (error) {
        console.error('Erro ao buscar slots:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// ============= PRODUCTS ROUTES =============

app.get('/api/products', async (_req: Request, res: Response) => {
    try {
        const products = await sql`
      SELECT id, name, description, price, stock_quantity as "stockQuantity"
      FROM products
    `;
        res.json(products);
    } catch (error) {
        console.error('Erro ao buscar produtos:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

app.post('/api/products', async (req: Request, res: Response) => {
    try {
        const { id, name, description, price, stockQuantity } = req.body;
        const finalId = id || Math.random().toString(36).substr(2, 9);

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
    } catch (error) {
        console.error('Erro ao salvar produto:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

app.delete('/api/products/:id', async (req: Request, res: Response) => {
    try {
        await sql`DELETE FROM products WHERE id = ${req.params.id}`;
        res.json({ success: true });
    } catch (error) {
        console.error('Erro ao deletar produto:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// ============= PRODUCT SALES ROUTES =============

app.get('/api/product-sales', async (_req: Request, res: Response) => {
    try {
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
    } catch (error) {
        console.error('Erro ao buscar vendas:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

app.post('/api/product-sales', async (req: Request, res: Response) => {
    try {
        const { productId, userId, quantity } = req.body;

        // Buscar produto e verificar estoque
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
        const id = Math.random().toString(36).substr(2, 9);

        // Atualizar estoque
        await sql`
      UPDATE products 
      SET stock_quantity = stock_quantity - ${quantity}
      WHERE id = ${productId}
    `;

        // Criar venda
        await sql`
      INSERT INTO product_sales (id, product_id, user_id, quantity, sale_price)
      VALUES (${id}, ${productId}, ${userId}, ${quantity}, ${salePrice})
    `;

        res.json({ id, productId, userId, quantity, salePrice, createdAt: new Date().toISOString() });
    } catch (error) {
        console.error('Erro ao criar venda:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// ============= EXPENSES ROUTES =============

app.get('/api/expenses', async (_req: Request, res: Response) => {
    try {
        const expenses = await sql`
      SELECT id, description, amount, date, category
      FROM expenses
      ORDER BY date DESC
    `;
        res.json(expenses);
    } catch (error) {
        console.error('Erro ao buscar despesas:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

app.post('/api/expenses', async (req: Request, res: Response) => {
    try {
        const { id, description, amount, date, category } = req.body;
        const finalId = id || Math.random().toString(36).substr(2, 9);

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
    } catch (error) {
        console.error('Erro ao salvar despesa:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

app.delete('/api/expenses/:id', async (req: Request, res: Response) => {
    try {
        await sql`DELETE FROM expenses WHERE id = ${req.params.id}`;
        res.json({ success: true });
    } catch (error) {
        console.error('Erro ao deletar despesa:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// ============= HEALTH CHECK =============

app.get('/api/health', async (_req: Request, res: Response) => {
    try {
        await sql`SELECT 1`;
        res.json({ status: 'ok', database: 'connected' });
    } catch (error) {
        res.status(500).json({ status: 'error', database: 'disconnected' });
    }
});

// ============= START SERVER =============

async function startServer() {
    console.log('🚀 Iniciando servidor JM Barbearia...\n');

    // Testar conexão
    const connected = await testConnection();
    if (!connected) {
        console.error('Falha ao conectar com o banco de dados. Encerrando...');
        process.exit(1);
    }

    // Inicializar banco
    await initializeDatabase();

    // Popular dados iniciais
    await seedDatabase();

    // Iniciar servidor
    app.listen(PORT, () => {
        console.log(`\n🎉 Servidor rodando em http://localhost:${PORT}`);
        console.log('   Endpoints disponíveis:');
        console.log('   - POST /api/auth/login');
        console.log('   - POST /api/auth/register');
        console.log('   - GET  /api/users');
        console.log('   - GET  /api/services');
        console.log('   - GET  /api/barbers');
        console.log('   - GET  /api/appointments');
        console.log('   - GET  /api/products');
        console.log('   - GET  /api/expenses');
        console.log('   - GET  /api/health');
    });
}

startServer().catch(console.error);
