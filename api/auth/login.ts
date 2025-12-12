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
            const { email, password } = req.body;

            const users = await sql`
        SELECT id, name, email, role FROM users 
        WHERE email = ${email} AND password = ${password}
      `;

            if (users.length === 0) {
                return res.status(401).json({ error: 'Credenciais inválidas' });
            }

            return res.json(users[0]);
        }

        return res.status(405).json({ error: 'Método não permitido' });
    } catch (error) {
        console.error('Erro no login:', error);
        return res.status(500).json({ error: 'Erro interno do servidor' });
    }
}
