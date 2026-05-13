import { Router, Request, Response } from 'express';
import { getDb } from '../db';

const router = Router();

// GET /api/cities - DAS cities from city_brick_mapping (for location form)
router.get('/cities', (req: Request, res: Response) => {
    try {
        const db = getDb();
        const cities = db.prepare(
            'SELECT DISTINCT city_name FROM city_brick_mapping ORDER BY city_name'
        ).all();
        res.json(cities);
    } catch (error: any) {
        console.error('Error fetching cities:', error);
        res.status(500).json({ error: 'Failed to fetch cities' });
    }
});

// GET /api/bricks - Bricks, optionally filtered by city_name
router.get('/bricks', (req: Request, res: Response) => {
    try {
        const db = getDb();
        const cityName = (req.query.cityName as string || '').trim();
        const search = (req.query.search as string || '').trim();

        let query = 'SELECT DISTINCT brick_name, city_name FROM city_brick_mapping';
        let conditions: string[] = [];
        let params: any[] = [];

        if (cityName) {
            conditions.push('city_name = ?');
            params.push(cityName);
        }
        if (search) {
            conditions.push('brick_name LIKE ?');
            params.push(`%${search}%`);
        }

        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }

        query += ' ORDER BY brick_name LIMIT 200';
        const bricks = db.prepare(query).all(...params);
        res.json(bricks);
    } catch (error: any) {
        console.error('Error fetching bricks:', error);
        res.status(500).json({ error: 'Failed to fetch bricks' });
    }
});

// GET /api/cities-expense - All expense cities (for location form)
router.get('/cities-expense', (req: Request, res: Response) => {
    try {
        const db = getDb();
        const cities = db.prepare(
            'SELECT city_name FROM cities_expense ORDER BY city_name'
        ).all();
        res.json(cities);
    } catch (error: any) {
        console.error('Error fetching expense cities:', error);
        res.status(500).json({ error: 'Failed to fetch expense cities' });
    }
});

// GET /api/filter-options - Distinct values for filter dropdowns
router.get('/filter-options', (req: Request, res: Response) => {
    try {
        const db = getDb();
        const specialities = (db.prepare(
            "SELECT DISTINCT speciality FROM doctors WHERE speciality IS NOT NULL AND TRIM(speciality) != '' ORDER BY speciality"
        ).all() as { speciality: string }[]).map(r => r.speciality);

        const qualifications = (db.prepare(
            "SELECT DISTINCT qualification FROM doctors WHERE qualification IS NOT NULL AND TRIM(qualification) != '' ORDER BY qualification"
        ).all() as { qualification: string }[]).map(r => r.qualification);

        const designations = (db.prepare(
            "SELECT DISTINCT designation FROM doctors WHERE designation IS NOT NULL AND TRIM(designation) != '' ORDER BY designation"
        ).all() as { designation: string }[]).map(r => r.designation);

        const doctor_cities_das = (db.prepare(
            "SELECT DISTINCT doctor_city_das FROM doctors WHERE doctor_city_das IS NOT NULL AND TRIM(doctor_city_das) != '' ORDER BY doctor_city_das"
        ).all() as { doctor_city_das: string }[]).map(r => r.doctor_city_das);

        const distributors = (db.prepare(
            "SELECT DISTINCT distributor_name FROM doctors WHERE distributor_name IS NOT NULL AND TRIM(distributor_name) != '' ORDER BY distributor_name"
        ).all() as { distributor_name: string }[]).map(r => r.distributor_name);

        res.json({ specialities, qualifications, designations, doctor_cities_das, distributors });
    } catch (error: any) {
        console.error('Error fetching filter options:', error);
        res.status(500).json({ error: 'Failed to fetch filter options' });
    }
});

export default router;
