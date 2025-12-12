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

    const { id } = req.query;

    try {
        if (req.method === 'DELETE') {
            await sql`DELETE FROM barbers WHERE id = ${id as string}`;
            return res.json({ success: true });
        }

        return res.status(405).json({ error: 'Método não permitido' });
    } catch (error) {
        console.error('Erro ao deletar barbeiro:', error);
        return res.status(500).json({ error: 'Erro interno do servidor' });
    }
}
