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
            const products = await sql`
        SELECT id, name, description, price, stock_quantity as "stockQuantity"
        FROM products
      `;
            return res.json(products);
        }

        if (req.method === 'POST') {
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

            return res.json({ id: finalId, name, description, price, stockQuantity });
        }

        return res.status(405).json({ error: 'Método não permitido' });
    } catch (error) {
        console.error('Erro ao processar produtos:', error);
        return res.status(500).json({ error: 'Erro interno do servidor' });
    }
}
