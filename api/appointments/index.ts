import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '../lib/database';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
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
            return res.json(appointments);
        }

        if (req.method === 'POST') {
            const { userId, userName, barberId, serviceId, date } = req.body;

            // Buscar preço do serviço
            const services = await sql`SELECT price FROM services WHERE id = ${serviceId}`;
            if (services.length === 0) {
                return res.status(400).json({ error: 'Serviço não encontrado' });
            }

            const priceAtBooking = services[0].price;
            const id = Math.random().toString(36).substr(2, 9);

            await sql`
        INSERT INTO appointments (id, user_id, user_name, barber_id, service_id, date, status, price_at_booking)
        VALUES (${id}, ${userId}, ${userName}, ${barberId}, ${serviceId}, ${date}, 'confirmed', ${priceAtBooking})
      `;

            return res.json({
                id,
                userId,
                userName,
                barberId,
                serviceId,
                date,
                status: 'confirmed',
                priceAtBooking
            });
        }

        return res.status(405).json({ error: 'Método não permitido' });
    } catch (error) {
        console.error('Erro ao processar agendamentos:', error);
        return res.status(500).json({ error: 'Erro interno do servidor' });
    }
}
