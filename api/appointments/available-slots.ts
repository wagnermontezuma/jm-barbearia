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
        if (req.method === 'GET') {
            const { date, barberId, serviceDuration } = req.query;

            // Buscar agendamentos do barbeiro nesse dia
            const appointments = await sql`
        SELECT a.date, s.duration_minutes
        FROM appointments a
        JOIN services s ON a.service_id = s.id
        WHERE a.barber_id = ${barberId as string}
          AND DATE(a.date) = ${date as string}
          AND a.status != 'cancelled'
      `;

            // Calcular slots disponíveis
            const openHour = 9;
            const closeHour = 21;
            const interval = 30;
            const duration = Number(serviceDuration);

            const slots: string[] = [];
            const dateStr = date as string;
            const now = new Date();

            for (let hour = openHour; hour < closeHour; hour++) {
                for (let min = 0; min < 60; min += interval) {
                    const slotStart = new Date(`${dateStr}T${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}:00`);
                    const slotEnd = new Date(slotStart.getTime() + duration * 60000);

                    // Pular slots no passado
                    if (slotStart < now) continue;

                    // Verificar se ultrapassa horário de fechamento
                    const closeTime = new Date(`${dateStr}T${closeHour.toString().padStart(2, '0')}:00:00`);
                    if (slotEnd > closeTime) continue;

                    // Verificar conflitos
                    const hasConflict = appointments.some(app => {
                        const appStart = new Date(app.date);
                        const appEnd = new Date(appStart.getTime() + app.duration_minutes * 60000);
                        return (slotStart < appEnd) && (slotEnd > appStart);
                    });

                    if (!hasConflict) {
                        slots.push(`${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`);
                    }
                }
            }

            return res.json(slots);
        }

        return res.status(405).json({ error: 'Método não permitido' });
    } catch (error) {
        console.error('Erro ao buscar slots:', error);
        return res.status(500).json({ error: 'Erro interno do servidor' });
    }
}
