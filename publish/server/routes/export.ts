import { Router, Request, Response } from 'express';
import { getDb } from '../db';

const router = Router();

// GET /api/export/locations - Download all locations as CSV
router.get('/locations', (req: Request, res: Response) => {
    try {
        const db = getDb();

        const locations = db.prepare(`
      SELECT
        d.doctor_name,
        d.speciality,
        d.qualification,
        d.designation,
        d.doctor_city_das,
        d.distributor_name,
        d.mobile_number,
        d.pmdc_number,
        l.city_expense as location_city_expense,
        l.city_das as location_city_das,
        l.brick_das as location_brick_das,
        l.location_name,
        l.created_at as location_added_at,
        us.name as added_by_name,
        us.employee_code as added_by_employee_code,
        us.role as added_by_role,
        us.team as added_by_team
      FROM locations l
      JOIN doctors d ON l.doctor_id = d.id
      LEFT JOIN user_sessions us ON l.session_id = us.id
      ORDER BY d.doctor_name, l.created_at
    `).all() as any[];

        // Build CSV
        const headers = [
            'Doctor Name', 'Speciality', 'Qualification', 'Designation', 'Doctor City (DAS)',
            'Distributor Name', 'Mobile Number', 'PMDC Number',
            'Location City (Expense)', 'Location City (DAS)', 'Location Brick (DAS)', 'Location Name',
            'Added At', 'Added By Name', 'Added By Employee Code', 'Added By Role', 'Added By Team'
        ];

        const escapeCSV = (val: any) => {
            if (val === null || val === undefined) return '';
            const str = String(val);
            if (str.includes(',') || str.includes('"') || str.includes('\n')) {
                return `"${str.replace(/"/g, '""')}"`;
            }
            return str;
        };

        let csv = headers.join(',') + '\n';
        for (const row of locations) {
            csv += [
                row.doctor_name, row.speciality, row.qualification, row.designation, row.doctor_city_das,
                row.distributor_name, row.mobile_number, row.pmdc_number,
                row.location_city_expense, row.location_city_das, row.location_brick_das, row.location_name,
                row.location_added_at, row.added_by_name, row.added_by_employee_code, row.added_by_role, row.added_by_team
            ].map(escapeCSV).join(',') + '\n';
        }

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="doctor_locations_export_${new Date().toISOString().slice(0, 10)}.csv"`);
        res.send(csv);
    } catch (error: any) {
        console.error('Error exporting locations:', error);
        res.status(500).json({ error: 'Failed to export locations' });
    }
});

export default router;
