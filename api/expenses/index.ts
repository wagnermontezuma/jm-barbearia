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
            const expenses = await sql`
        SELECT id, description, amount, date, category
        FROM expenses
        ORDER BY date DESC
      `;
            return res.json(expenses);
        }

        if (req.method === 'POST') {
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

            return res.json({ id: finalId, description, amount, date, category });
        }

        return res.status(405).json({ error: 'Método não permitido' });
    } catch (error) {
        console.error('Erro ao processar despesas:', error);
        return res.status(500).json({ error: 'Erro interno do servidor' });
    }
}
