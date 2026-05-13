import { Router, Request, Response } from 'express';
import { getDb } from '../db';

const router = Router();

router.get('/', (req: Request, res: Response) => {
    try {
        const db = getDb();

        // Accept the same filters as the doctors list
        const name = (req.query.name as string || '').trim();
        const speciality = (req.query.speciality as string || '').trim();
        const qualification = (req.query.qualification as string || '').trim();
        const designation = (req.query.designation as string || '').trim();
        const city_das = (req.query.city_das as string || '').trim();
        const distributor = (req.query.distributor as string || '').trim();
        const search = (req.query.search as string || '').trim();

        let conditions: string[] = ['deleted_at IS NULL'];
        let params: any[] = [];

        if (search) {
            conditions.push(`(
                doctor_name LIKE ? OR
                speciality LIKE ? OR
                qualification LIKE ? OR
                designation LIKE ? OR
                doctor_city_das LIKE ? OR
                distributor_name LIKE ? OR
                mobile_number LIKE ?
            )`);
            const searchTerm = `%${search}%`;
            params.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
        }
        if (name) { conditions.push('doctor_name LIKE ?'); params.push(`%${name}%`); }
        if (speciality) { conditions.push('speciality LIKE ?'); params.push(`%${speciality}%`); }
        if (qualification) { conditions.push('qualification LIKE ?'); params.push(`%${qualification}%`); }
        if (designation) { conditions.push('designation LIKE ?'); params.push(`%${designation}%`); }
        if (city_das) { conditions.push('doctor_city_das LIKE ?'); params.push(`%${city_das}%`); }
        if (distributor) { conditions.push('distributor_name = ?'); params.push(distributor); }

        const whereClause = `WHERE ${conditions.join(' AND ')}`;

        const totalDoctors = (db.prepare(`SELECT COUNT(*) as count FROM doctors ${whereClause}`).get(...params) as { count: number }).count;

        const noLocations = (db.prepare(`
            SELECT COUNT(*) as count FROM doctors 
            ${whereClause ? whereClause + ' AND' : 'WHERE'} id NOT IN (SELECT DISTINCT doctor_id FROM locations)
        `).get(...params) as { count: number }).count;

        const singleLocation = (db.prepare(`
            SELECT COUNT(*) as count FROM doctors
            ${whereClause ? whereClause + ' AND' : 'WHERE'} id IN (SELECT doctor_id FROM locations GROUP BY doctor_id HAVING COUNT(*) = 1)
        `).get(...params) as { count: number }).count;

        const multipleLocations = (db.prepare(`
            SELECT COUNT(*) as count FROM doctors
            ${whereClause ? whereClause + ' AND' : 'WHERE'} id IN (SELECT doctor_id FROM locations GROUP BY doctor_id HAVING COUNT(*) > 1)
        `).get(...params) as { count: number }).count;

        res.json({
            totalDoctors,
            noLocations,
            singleLocation,
            multipleLocations
        });
    } catch (error: any) {
        console.error('Error fetching stats:', error);
        res.status(500).json({ error: 'Failed to fetch statistics' });
    }
});

export default router;
