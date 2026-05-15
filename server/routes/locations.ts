import { Router, Request, Response } from 'express';
import { getDb } from '../db';

const router = Router();

// Normalize text for consistent duplicate checking:
// trims whitespace, collapses multiple spaces, removes stray commas, lowercases
function normalizeText(text: string | null | undefined): string {
    if (!text) return '';
    return text
        .trim()
        .replace(/[,]+/g, ' ')       // replace commas with spaces
        .replace(/\s+/g, ' ')        // collapse multiple spaces to single
        .trim()
        .toLowerCase();
}

// POST /api/doctors/:id/locations - Add a location for a doctor
router.post('/doctors/:id/locations', (req: Request, res: Response) => {
    try {
        const db = getDb();
        const doctorId = parseInt(req.params.id);
        const { city_expense, city_das, brick_das, location_name, session_id } = req.body;

        // Validate required fields
        if (!city_expense) {
            return res.status(400).json({ error: 'City for Expense is required' });
        }
        if (!city_das || !brick_das) {
            return res.status(400).json({ error: 'City for DAS and Brick for DAS are required fields' });
        }
        if (!session_id) {
            return res.status(400).json({ error: 'User session is required. Please refresh and enter your details.' });
        }

        // Verify doctor exists
        const doctor = db.prepare('SELECT id FROM doctors WHERE id = ?').get(doctorId);
        if (!doctor) {
            return res.status(404).json({ error: 'Doctor not found' });
        }

        // Verify session exists
        const session = db.prepare('SELECT id FROM user_sessions WHERE id = ?').get(session_id);
        if (!session) {
            return res.status(400).json({ error: 'Invalid session. Please refresh and enter your details again.' });
        }

        // Normalize all text inputs for consistent comparison
        const normCityExpense = normalizeText(city_expense);
        const normCityDas = normalizeText(city_das);
        const normBrickDas = normalizeText(brick_das);
        const normLocName = normalizeText(location_name);

        // Check for duplicate (same doctor + all 4 fields, case-insensitive)
        const existing = db.prepare(
            `SELECT id FROM locations WHERE doctor_id = ?
       AND LOWER(TRIM(city_expense)) = ?
       AND LOWER(TRIM(city_das)) = ?
       AND LOWER(TRIM(brick_das)) = ?
       AND LOWER(TRIM(COALESCE(location_name, ''))) = ?`
        ).get(doctorId, normCityExpense, normCityDas, normBrickDas, normLocName);

        if (existing) {
            return res.status(409).json({
                error: 'This location already exists for this doctor',
                message: `A location with City for Expense "${city_expense}", City for DAS "${city_das}", Brick "${brick_das}"${location_name ? `, and Location "${location_name}"` : ''} has already been added for this doctor.`
            });
        }

        // Store the cleaned (but not lowercased) values
        const clean = (v: string | null | undefined) =>
            (v || '').trim().replace(/[,]+/g, ' ').replace(/\s+/g, ' ').trim();

        const cleanCityExpense = clean(city_expense);
        const cleanCityDas = clean(city_das);
        const cleanBrickDas = clean(brick_das);
        const cleanLocName = clean(location_name) || null;

        // Insert the location
        const result = db.prepare(`
      INSERT INTO locations (doctor_id, city_expense, city_das, brick_das, location_name, session_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(doctorId, cleanCityExpense, cleanCityDas, cleanBrickDas, cleanLocName, session_id);

        const newLocation = db.prepare(`
      SELECT l.*, us.name as added_by_name, us.employee_code as added_by_code
      FROM locations l
      LEFT JOIN user_sessions us ON l.session_id = us.id
      WHERE l.id = ?
    `).get(result.lastInsertRowid);

        res.status(201).json({
            message: 'Location added successfully!',
            location: newLocation
        });
    } catch (error: any) {
        // Handle UNIQUE constraint violation for concurrent duplicates
        if (error.code === 'SQLITE_CONSTRAINT_UNIQUE' || (error.message && error.message.includes('UNIQUE'))) {
            return res.status(409).json({
                error: 'This location already exists for this doctor',
                message: 'Another user just added this same location. Please try a different location.'
            });
        }
        console.error('Error adding location:', error);
        res.status(500).json({ error: 'Failed to add location. Please try again.' });
    }
});

// PATCH /api/locations/:id - Update a location (admin only)
router.patch('/locations/:id', (req: Request, res: Response) => {
    try {
        const db = getDb();
        const locationId = parseInt(req.params.id);
        const { city_expense, city_das, brick_das, location_name } = req.body;

        if (!city_expense) return res.status(400).json({ error: 'City is required' });
        if (!city_das || !brick_das) return res.status(400).json({ error: 'Distributor City and Brick are required' });

        const existing = db.prepare('SELECT * FROM locations WHERE id = ?').get(locationId) as any;
        if (!existing) return res.status(404).json({ error: 'Location not found' });

        const clean = (v: string | null | undefined) =>
            (v || '').trim().replace(/[,]+/g, ' ').replace(/\s+/g, ' ').trim();

        // Check for duplicate among other records for same doctor
        const normCE = normalizeText(city_expense);
        const normCD = normalizeText(city_das);
        const normBD = normalizeText(brick_das);
        const normLN = normalizeText(location_name);

        const dup = db.prepare(`
            SELECT id FROM locations
            WHERE doctor_id = ? AND id != ?
            AND LOWER(TRIM(city_expense)) = ?
            AND LOWER(TRIM(city_das)) = ?
            AND LOWER(TRIM(brick_das)) = ?
            AND LOWER(TRIM(COALESCE(location_name, ''))) = ?
        `).get(existing.doctor_id, locationId, normCE, normCD, normBD, normLN);

        if (dup) return res.status(409).json({ error: 'A duplicate location already exists for this doctor' });

        db.prepare(`
            UPDATE locations SET city_expense = ?, city_das = ?, brick_das = ?, location_name = ?
            WHERE id = ?
        `).run(clean(city_expense), clean(city_das), clean(brick_das), clean(location_name) || null, locationId);

        const updated = db.prepare(`
            SELECT l.*, us.name as added_by_name, us.employee_code as added_by_code
            FROM locations l
            LEFT JOIN user_sessions us ON l.session_id = us.id
            WHERE l.id = ?
        `).get(locationId);

        res.json({ message: 'Location updated', location: updated });
    } catch (error: any) {
        console.error('Error updating location:', error);
        res.status(500).json({ error: 'Failed to update location' });
    }
});

// DELETE /api/locations/:id - Delete a location (admin only)
router.delete('/locations/:id', (req: Request, res: Response) => {
    try {
        const db = getDb();
        const locationId = parseInt(req.params.id);

        const existing = db.prepare('SELECT id FROM locations WHERE id = ?').get(locationId);
        if (!existing) return res.status(404).json({ error: 'Location not found' });

        db.prepare('DELETE FROM locations WHERE id = ?').run(locationId);
        res.json({ message: 'Location deleted' });
    } catch (error: any) {
        console.error('Error deleting location:', error);
        res.status(500).json({ error: 'Failed to delete location' });
    }
});

export default router;
