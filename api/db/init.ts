import type { VercelRequest, VercelResponse } from '@vercel/node';
import { initializeDatabase, seedDatabase } from '../lib/database';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Protect this endpoint with a secret key
    const { authorization } = req.headers;
    const expectedKey = process.env.INIT_SECRET_KEY;

    if (expectedKey && authorization !== `Bearer ${expectedKey}`) {
        return res.status(401).json({ error: 'Não autorizado' });
    }

    try {
        if (req.method === 'POST') {
            console.log('Inicializando banco de dados...');
            await initializeDatabase();

            console.log('Populando dados iniciais...');
            await seedDatabase();

            return res.json({
                success: true,
                message: 'Banco de dados inicializado e populado com sucesso!'
            });
        }

        return res.status(405).json({ error: 'Use POST para inicializar o banco' });
    } catch (error) {
        console.error('Erro ao inicializar banco:', error);
        return res.status(500).json({ error: 'Erro ao inicializar banco de dados' });
    }
}
