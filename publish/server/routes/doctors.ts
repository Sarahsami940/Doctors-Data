import { Router, Request, Response } from 'express';
import { getDb } from '../db';

const router = Router();

// GET /api/doctors - Paginated list with multi-field search
router.get('/', (req: Request, res: Response) => {
    try {
        const db = getDb();
        const page = Math.max(1, parseInt(req.query.page as string) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 50));
        const offset = (page - 1) * limit;

        const kpi = String(req.query.kpi || '').trim();

        // Advanced search filters (AND logic)
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

        if (name) {
            conditions.push('doctor_name LIKE ?');
            params.push(`%${name}%`);
        }
        if (speciality) {
            conditions.push('speciality LIKE ?');
            params.push(`%${speciality}%`);
        }
        if (qualification) {
            conditions.push('qualification LIKE ?');
            params.push(`%${qualification}%`);
        }
        if (designation) {
            conditions.push('designation LIKE ?');
            params.push(`%${designation}%`);
        }
        if (city_das) {
            conditions.push('doctor_city_das LIKE ?');
            params.push(`%${city_das}%`);
        }
        if (distributor) {
            conditions.push('distributor_name = ?');
            params.push(distributor);
        }

        if (kpi === 'no-locations') {
            conditions.push('NOT EXISTS (SELECT 1 FROM locations WHERE locations.doctor_id = doctors.id)');
        } else if (kpi === 'single-location') {
            conditions.push('doctors.id IN (SELECT doctor_id FROM locations GROUP BY doctor_id HAVING COUNT(*) = 1)');
        } else if (kpi === 'multi-locations') {
            conditions.push('doctors.id IN (SELECT doctor_id FROM locations GROUP BY doctor_id HAVING COUNT(*) > 1)');
        }

        const whereClause = `WHERE ${conditions.join(' AND ')}`;

        const countQuery = `SELECT COUNT(*) as total FROM doctors ${whereClause}`;
        const total = (db.prepare(countQuery).get(...params) as any).total;

        const dataQuery = `SELECT * FROM doctors ${whereClause} ORDER BY doctor_name ASC LIMIT ? OFFSET ?`;
        const doctors = db.prepare(dataQuery).all(...params, limit, offset);

        // For each doctor, get their location count
        const locationCountStmt = db.prepare('SELECT COUNT(*) as count FROM locations WHERE doctor_id = ?');
        const doctorsWithLocationCount = (doctors as any[]).map(doc => ({
            ...doc,
            location_count: (locationCountStmt.get(doc.id) as any).count
        }));

        res.json({
            doctors: doctorsWithLocationCount,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error: any) {
        console.error('Error fetching doctors:', error);
        res.status(500).json({ error: 'Failed to fetch doctors' });
    }
});

// GET /api/doctors/:id - Single doctor with locations
router.get('/:id', (req: Request, res: Response) => {
    try {
        const db = getDb();
        const doctor = db.prepare('SELECT * FROM doctors WHERE id = ?').get(req.params.id);

        if (!doctor) {
            return res.status(404).json({ error: 'Doctor not found' });
        }

        const locations = db.prepare(`
      SELECT l.*, us.name as added_by_name, us.employee_code as added_by_code
      FROM locations l
      LEFT JOIN user_sessions us ON l.session_id = us.id
      WHERE l.doctor_id = ?
      ORDER BY l.created_at DESC
    `).all(req.params.id);

        res.json({ ...(doctor as any), locations });
    } catch (error: any) {
        console.error('Error fetching doctor:', error);
        res.status(500).json({ error: 'Failed to fetch doctor details' });
    }
});

export default router;
