import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '../../lib/database';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        if (req.method === 'POST') {
            const { name, email, password } = req.body;

            // Verificar se email já existe
            const existing = await sql`SELECT id FROM users WHERE email = ${email}`;

            if (existing.length > 0) {
                return res.status(400).json({ error: 'Email já cadastrado' });
            }

            const id = Math.random().toString(36).substr(2, 9);

            await sql`
        INSERT INTO users (id, name, email, password, role)
        VALUES (${id}, ${name}, ${email}, ${password}, 'client')
      `;

            return res.json({ id, name, email, role: 'client' });
        }

        return res.status(405).json({ error: 'Método não permitido' });
    } catch (error) {
        console.error('Erro no registro:', error);
        return res.status(500).json({ error: 'Erro interno do servidor' });
    }
}
