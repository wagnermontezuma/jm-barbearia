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
            return res.json(sales);
        }

        if (req.method === 'POST') {
            const { productId, userId, quantity } = req.body;

            // Buscar produto e verificar estoque
            const products = await sql`
        SELECT price, stock_quantity FROM products WHERE id = ${productId}
      `;

            if (products.length === 0) {
                return res.status(400).json({ error: 'Produto não encontrado' });
            }

            if (products[0].stock_quantity < quantity) {
                return res.status(400).json({ error: `Estoque insuficiente. Disponível: ${products[0].stock_quantity}` });
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

            return res.json({ id, productId, userId, quantity, salePrice, createdAt: new Date().toISOString() });
        }

        return res.status(405).json({ error: 'Método não permitido' });
    } catch (error) {
        console.error('Erro ao processar vendas:', error);
        return res.status(500).json({ error: 'Erro interno do servidor' });
    }
}
