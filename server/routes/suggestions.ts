import { Router, Request, Response } from 'express';
import { getDb } from '../db';

const router = Router();

// POST /api/doctors/:id/suggestions — Submit a new suggestion
router.post('/doctors/:id/suggestions', (req: Request, res: Response) => {
    try {
        const db = getDb();
        const doctorId = parseInt(req.params.id);

        // Verify doctor exists and is not deleted
        const doctor = db.prepare('SELECT id FROM doctors WHERE id = ? AND deleted_at IS NULL').get(doctorId) as any;
        if (!doctor) {
            return res.status(404).json({ error: 'Doctor not found' });
        }

        const {
            session_id, suggested_name, suggested_mobile,
            suggested_speciality, suggested_designation, suggested_qualification,
            suggested_pmdc, suggested_cnic,
            suggest_delete, delete_reason, change_reason
        } = req.body;

        if (!session_id) {
            return res.status(400).json({ error: 'Session ID is required' });
        }

        // Get employee name from session
        const session = db.prepare('SELECT name FROM user_sessions WHERE id = ?').get(session_id) as any;
        if (!session) {
            return res.status(400).json({ error: 'Invalid session' });
        }

        // If not a delete suggestion, validate required fields
        if (!suggest_delete) {
            const missing: string[] = [];
            if (!suggested_name?.trim()) missing.push('Doctor Name');
            if (!suggested_mobile?.trim()) missing.push('Mobile');
            if (!suggested_speciality?.trim()) missing.push('Speciality');
            if (!suggested_designation?.trim()) missing.push('Designation');
            if (!suggested_qualification?.trim()) missing.push('Qualification');
            if (!suggested_pmdc?.trim()) missing.push('PMDC Number');
            if (!suggested_cnic?.trim()) missing.push('CNIC');
            if (missing.length > 0) {
                return res.status(400).json({ error: `Missing required fields: ${missing.join(', ')}` });
            }

            // Validate PMDC against lookup (unless "Special Prescriber")
            if (suggested_pmdc.trim().toLowerCase() !== 'special prescriber') {
                const pmdc = db.prepare('SELECT doctor_name FROM pmdc_lookup WHERE pmdc_number = ?')
                    .get(suggested_pmdc.trim()) as any;
                if (!pmdc) {
                    return res.status(400).json({ error: 'PMDC number not found. Please check and try again.' });
                }
            }

            // Validate CNIC format: 12345-6789012-3
            const cnicRegex = /^\d{5}-\d{7}-\d{1}$/;
            if (!cnicRegex.test(suggested_cnic.trim())) {
                return res.status(400).json({ error: 'CNIC must be in format: 12345-6789012-3' });
            }

            // Handle CNIC lock — first entry locks it
            const existingCnic = db.prepare('SELECT cnic FROM doctor_cnic WHERE doctor_id = ?').get(doctorId) as any;
            if (!existingCnic) {
                // First CNIC entry — lock it
                db.prepare('INSERT INTO doctor_cnic (doctor_id, cnic, submitted_by_session) VALUES (?, ?, ?)')
                    .run(doctorId, suggested_cnic.trim(), session_id);
            }
        } else {
            // Delete suggestion requires reason
            if (!delete_reason?.trim()) {
                return res.status(400).json({ error: 'Deletion reason is required' });
            }
        }

        const result = db.prepare(`
            INSERT INTO doctor_suggestions (
                doctor_id, session_id, employee_name,
                suggested_name, suggested_mobile,
                suggested_speciality, suggested_designation, suggested_qualification,
                suggested_pmdc, suggested_cnic,
                suggest_delete, delete_reason, change_reason
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            doctorId, session_id, session.name,
            suggest_delete ? null : suggested_name?.trim(),
            suggest_delete ? null : suggested_mobile?.trim(),
            suggest_delete ? null : suggested_speciality?.trim(),
            suggest_delete ? null : suggested_designation?.trim(),
            suggest_delete ? null : suggested_qualification?.trim(),
            suggest_delete ? null : suggested_pmdc?.trim(),
            suggest_delete ? null : suggested_cnic?.trim(),
            suggest_delete ? 1 : 0,
            suggest_delete ? delete_reason?.trim() : null,
            change_reason?.trim() || null
        );

        res.status(201).json({ message: 'Suggestion submitted', id: result.lastInsertRowid });
    } catch (error: any) {
        console.error('Error submitting suggestion:', error);
        res.status(500).json({ error: 'Failed to submit suggestion', details: error.message });
    }
});

// GET /api/doctors/:id/suggestions — Get all suggestions for a doctor (admin)
router.get('/doctors/:id/suggestions', (req: Request, res: Response) => {
    try {
        const db = getDb();
        const doctorId = parseInt(req.params.id);

        const suggestions = db.prepare(`
            SELECT ds.*, us.employee_code, us.team
            FROM doctor_suggestions ds
            JOIN user_sessions us ON us.id = ds.session_id
            WHERE ds.doctor_id = ?
            ORDER BY ds.created_at DESC
        `).all(doctorId);

        res.json(suggestions);
    } catch (error: any) {
        console.error('Error fetching suggestions:', error);
        res.status(500).json({ error: 'Failed to fetch suggestions' });
    }
});

// GET /api/doctors/:id/cnic-status — Check CNIC lock status
router.get('/doctors/:id/cnic-status', (req: Request, res: Response) => {
    try {
        const db = getDb();
        const doctorId = parseInt(req.params.id);

        const cnic = db.prepare('SELECT cnic FROM doctor_cnic WHERE doctor_id = ?').get(doctorId) as any;

        if (cnic) {
            res.json({ locked: true, cnic: cnic.cnic });
        } else {
            res.json({ locked: false });
        }
    } catch (error: any) {
        console.error('Error checking CNIC status:', error);
        res.status(500).json({ error: 'Failed to check CNIC status' });
    }
});

// GET /api/pmdc/:number — Validate PMDC number and return name
router.get('/pmdc/:number', (req: Request, res: Response) => {
    try {
        const db = getDb();
        const pmdcNumber = req.params.number.trim();

        // Accept "Special Prescriber"
        if (pmdcNumber.toLowerCase() === 'special prescriber') {
            return res.json({ valid: true, doctor_name: null });
        }

        const record = db.prepare('SELECT doctor_name FROM pmdc_lookup WHERE pmdc_number = ?')
            .get(pmdcNumber) as any;

        if (record) {
            res.json({ valid: true, doctor_name: record.doctor_name });
        } else {
            res.json({ valid: false });
        }
    } catch (error: any) {
        console.error('Error validating PMDC:', error);
        res.status(500).json({ error: 'Failed to validate PMDC' });
    }
});

// GET /api/suggestions/pending/count — Get pending suggestion counts per doctor
router.get('/suggestions/pending/count', (req: Request, res: Response) => {
    try {
        const db = getDb();

        const counts = db.prepare(`
            SELECT doctor_id, COUNT(*) as pending_count
            FROM doctor_suggestions
            WHERE status = 'pending'
            GROUP BY doctor_id
        `).all();

        res.json(counts);
    } catch (error: any) {
        console.error('Error fetching suggestion counts:', error);
        res.status(500).json({ error: 'Failed to fetch suggestion counts' });
    }
});

// PATCH /api/suggestions/:id — Admin approve/reject suggestion
router.patch('/suggestions/:id', (req: Request, res: Response) => {
    try {
        const db = getDb();
        const suggestionId = parseInt(req.params.id);
        const { status, reviewed_by, overrides } = req.body;

        if (!['approved', 'rejected'].includes(status)) {
            return res.status(400).json({ error: 'Status must be approved or rejected' });
        }
        if (!reviewed_by?.trim()) {
            return res.status(400).json({ error: 'Reviewer name is required' });
        }

        const suggestion = db.prepare('SELECT * FROM doctor_suggestions WHERE id = ?').get(suggestionId) as any;
        if (!suggestion) {
            return res.status(404).json({ error: 'Suggestion not found' });
        }

        // Update suggestion status
        db.prepare(`
            UPDATE doctor_suggestions SET status = ?, reviewed_by = ?, reviewed_at = datetime('now')
            WHERE id = ?
        `).run(status, reviewed_by.trim(), suggestionId);

        if (status === 'approved') {
            if (suggestion.suggest_delete) {
                // Soft delete the doctor
                db.prepare("UPDATE doctors SET deleted_at = datetime('now') WHERE id = ?")
                    .run(suggestion.doctor_id);
            } else {
                // Insert into doctors_finalized — keep old PMDC, store new as pmdc_number_new
                const finalData = overrides || {};
                const originalDoctor = db.prepare('SELECT pmdc_number FROM doctors WHERE id = ?').get(suggestion.doctor_id) as any;
                db.prepare(`
                    INSERT INTO doctors_finalized (
                        source_doctor_id, doctor_name, mobile_number,
                        speciality, designation, qualification,
                        pmdc_number, pmdc_number_new, cnic, finalized_by
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `).run(
                    suggestion.doctor_id,
                    finalData.doctor_name || suggestion.suggested_name,
                    finalData.mobile_number || suggestion.suggested_mobile,
                    finalData.speciality || suggestion.suggested_speciality,
                    finalData.designation || suggestion.suggested_designation,
                    finalData.qualification || suggestion.suggested_qualification,
                    originalDoctor?.pmdc_number || null,
                    finalData.pmdc_number || suggestion.suggested_pmdc,
                    finalData.cnic || suggestion.suggested_cnic,
                    reviewed_by.trim()
                );
            }
        }

        res.json({ message: `Suggestion ${status}` });
    } catch (error: any) {
        console.error('Error updating suggestion:', error);
        res.status(500).json({ error: 'Failed to update suggestion', details: error.message });
    }
});

// GET /api/dropdown-options — Get dropdown options for suggestion form
router.get('/dropdown-options', (req: Request, res: Response) => {
    try {
        const db = getDb();
        const category = req.query.category as string;

        if (category) {
            const options = db.prepare('SELECT value FROM dropdown_options WHERE category = ? ORDER BY value')
                .all(category.toLowerCase()) as any[];
            res.json(options.map(o => o.value));
        } else {
            // Return all grouped
            const all = db.prepare('SELECT category, value FROM dropdown_options ORDER BY category, value').all() as any[];
            const grouped: Record<string, string[]> = {};
            for (const row of all) {
                if (!grouped[row.category]) grouped[row.category] = [];
                grouped[row.category].push(row.value);
            }
            res.json(grouped);
        }
    } catch (error: any) {
        console.error('Error fetching dropdown options:', error);
        res.status(500).json({ error: 'Failed to fetch dropdown options' });
    }
});



// GET /api/finalized — Get finalized records
router.get('/finalized', (req: Request, res: Response) => {
    try {
        const db = getDb();
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 50;
        const offset = (page - 1) * limit;

        const total = (db.prepare('SELECT COUNT(*) as c FROM doctors_finalized').get() as any).c;
        const records = db.prepare(`
            SELECT df.*, d.doctor_city_das, d.distributor_name
            FROM doctors_finalized df
            JOIN doctors d ON d.id = df.source_doctor_id
            ORDER BY df.finalized_at DESC
            LIMIT ? OFFSET ?
        `).all(limit, offset);

        res.json({
            records,
            pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
        });
    } catch (error: any) {
        console.error('Error fetching finalized records:', error);
        res.status(500).json({ error: 'Failed to fetch finalized records' });
    }
});

export default router;
