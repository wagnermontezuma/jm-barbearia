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
            const barbers = await sql`
        SELECT id, name, avatar_url as "avatarUrl", rating 
        FROM barbers
      `;
            return res.json(barbers);
        }

        if (req.method === 'POST') {
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

            return res.json({ id: finalId, name, avatarUrl, rating: rating || 5.0 });
        }

        return res.status(405).json({ error: 'Método não permitido' });
    } catch (error) {
        console.error('Erro ao processar barbeiros:', error);
        return res.status(500).json({ error: 'Erro interno do servidor' });
    }
}
