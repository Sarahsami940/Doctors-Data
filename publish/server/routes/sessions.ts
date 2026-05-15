import { Router, Request, Response } from 'express';
import { getDb } from '../db';

const router = Router();

// POST /api/user-session - Create a user session
router.post('/', (req: Request, res: Response) => {
    try {
        const db = getDb();
        const { name, employee_code, role, team } = req.body;

        // Validate required fields
        if (!name || !name.trim()) {
            return res.status(400).json({ error: 'Name is required' });
        }
        if (!employee_code) {
            return res.status(400).json({ error: 'Employee Code is required' });
        }
        if (!role || !role.trim()) {
            return res.status(400).json({ error: 'Role is required' });
        }
        if (!team || !team.trim()) {
            return res.status(400).json({ error: 'Team is required' });
        }

        const validRoles = ['TSM', 'DSM', 'RSM', 'Admin'];
        if (!validRoles.includes(role.trim())) {
            return res.status(400).json({ error: 'Invalid role. Must be TSM, DSM, RSM, or Admin.' });
        }

        const result = db.prepare(`
      INSERT INTO user_sessions (name, employee_code, role, team)
      VALUES (?, ?, ?, ?)
    `).run(name.trim(), parseInt(employee_code), role.trim(), team.trim());

        res.status(201).json({
            message: 'Session created',
            session_id: result.lastInsertRowid
        });
    } catch (error: any) {
        console.error('Error creating session:', error);
        console.error('Request body:', req.body);
        res.status(500).json({
            error: 'Failed to create session',
            details: error.message
        });
    }
});

export default router;
