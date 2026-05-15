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

        const kpi_location = String(req.query.kpi_location || '').trim();
        const kpi_suggestion = String(req.query.kpi_suggestion || '').trim();

        let baseConditions: string[] = ['deleted_at IS NULL'];
        let params: any[] = [];

        if (search) {
            baseConditions.push(`(
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
        if (name) { baseConditions.push('doctor_name LIKE ?'); params.push(`%${name}%`); }
        if (speciality) { baseConditions.push('speciality LIKE ?'); params.push(`%${speciality}%`); }
        if (qualification) { baseConditions.push('qualification LIKE ?'); params.push(`%${qualification}%`); }
        if (designation) { baseConditions.push('designation LIKE ?'); params.push(`%${designation}%`); }
        if (city_das) { baseConditions.push('doctor_city_das LIKE ?'); params.push(`%${city_das}%`); }
        if (distributor) { baseConditions.push('distributor_name = ?'); params.push(distributor); }

        let locCondition = '';
        if (kpi_location === 'no-locations') locCondition = 'id NOT IN (SELECT DISTINCT doctor_id FROM locations)';
        else if (kpi_location === 'single-location') locCondition = 'id IN (SELECT doctor_id FROM locations GROUP BY doctor_id HAVING COUNT(*) = 1)';
        else if (kpi_location === 'multi-locations') locCondition = 'id IN (SELECT doctor_id FROM locations GROUP BY doctor_id HAVING COUNT(*) > 1)';

        let suggCondition = '';
        if (kpi_suggestion === 'no-suggestions') suggCondition = 'id NOT IN (SELECT DISTINCT doctor_id FROM doctor_suggestions)';
        else if (kpi_suggestion === 'with-suggestions') suggCondition = 'id IN (SELECT DISTINCT doctor_id FROM doctor_suggestions)';

        const buildWhere = (extraConditions: string[]) => {
            const all = [...baseConditions, ...extraConditions].filter(c => c !== '');
            return all.length ? `WHERE ${all.join(' AND ')}` : '';
        };

        const totalWhere = buildWhere([locCondition, suggCondition]);
        const locStatsWhere = buildWhere([suggCondition]);
        const suggStatsWhere = buildWhere([locCondition]);

        const totalDoctors = (db.prepare(`SELECT COUNT(*) as count FROM doctors ${totalWhere}`).get(...params) as { count: number }).count;

        const noLocations = (db.prepare(`
            SELECT COUNT(*) as count FROM doctors 
            ${locStatsWhere ? locStatsWhere + ' AND' : 'WHERE'} id NOT IN (SELECT DISTINCT doctor_id FROM locations)
        `).get(...params) as { count: number }).count;

        const singleLocation = (db.prepare(`
            SELECT COUNT(*) as count FROM doctors
            ${locStatsWhere ? locStatsWhere + ' AND' : 'WHERE'} id IN (SELECT doctor_id FROM locations GROUP BY doctor_id HAVING COUNT(*) = 1)
        `).get(...params) as { count: number }).count;

        const multipleLocations = (db.prepare(`
            SELECT COUNT(*) as count FROM doctors
            ${locStatsWhere ? locStatsWhere + ' AND' : 'WHERE'} id IN (SELECT doctor_id FROM locations GROUP BY doctor_id HAVING COUNT(*) > 1)
        `).get(...params) as { count: number }).count;

        const noSuggestions = (db.prepare(`
            SELECT COUNT(*) as count FROM doctors
            ${suggStatsWhere ? suggStatsWhere + ' AND' : 'WHERE'} id NOT IN (SELECT DISTINCT doctor_id FROM doctor_suggestions)
        `).get(...params) as { count: number }).count;

        const withSuggestions = (db.prepare(`
            SELECT COUNT(*) as count FROM doctors
            ${suggStatsWhere ? suggStatsWhere + ' AND' : 'WHERE'} id IN (SELECT DISTINCT doctor_id FROM doctor_suggestions)
        `).get(...params) as { count: number }).count;

        res.json({
            totalDoctors,
            noLocations,
            singleLocation,
            multipleLocations,
            noSuggestions,
            withSuggestions
        });
    } catch (error: any) {
        console.error('Error fetching stats:', error);
        res.status(500).json({ error: 'Failed to fetch statistics' });
    }
});

export default router;
