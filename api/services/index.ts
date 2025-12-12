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
            const services = await sql`
        SELECT id, name, price, duration_minutes as "durationMinutes", image 
        FROM services
      `;
            return res.json(services);
        }

        if (req.method === 'POST') {
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

            return res.json({ id: finalId, name, price, durationMinutes, image });
        }

        return res.status(405).json({ error: 'Método não permitido' });
    } catch (error) {
        console.error('Erro ao processar serviços:', error);
        return res.status(500).json({ error: 'Erro interno do servidor' });
    }
}
