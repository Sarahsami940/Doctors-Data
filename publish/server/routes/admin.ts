import { Router, Request, Response } from 'express';
import { getDb } from '../db';

const router = Router();

const ADMIN_KEY = process.env.ADMIN_KEY || 'admin123';

// POST /api/admin/auth — validate admin password (BEFORE middleware)
router.post('/auth', (req: Request, res: Response) => {
    const { password } = req.body;
    if (password === ADMIN_KEY) {
        res.json({ success: true });
    } else {
        res.status(403).json({ error: 'Incorrect password' });
    }
});

// Middleware: simple secret key check (for all OTHER admin routes)
router.use((req: Request, res: Response, next) => {
    const key = req.query.key as string;
    if (key !== ADMIN_KEY) {
        return res.status(403).json({ error: 'Forbidden' });
    }
    next();
});

// GET /api/admin/overview
router.get('/overview', (req: Request, res: Response) => {
    try {
        const db = getDb();

        // Overview KPIs
        const totalSessions = (db.prepare('SELECT COUNT(*) as count FROM user_sessions').get() as any).count;
        const totalLocations = (db.prepare('SELECT COUNT(*) as count FROM locations').get() as any).count;
        const uniqueUsers = (db.prepare('SELECT COUNT(DISTINCT employee_code) as count FROM user_sessions').get() as any).count;
        const doctorsMapped = (db.prepare('SELECT COUNT(DISTINCT doctor_id) as count FROM locations').get() as any).count;
        const totalDoctors = (db.prepare('SELECT COUNT(*) as count FROM doctors').get() as any).count;

        // Today's activity (UTC date comparison)
        const todaySessions = (db.prepare("SELECT COUNT(*) as count FROM user_sessions WHERE date(created_at) = date('now')").get() as any).count;
        const todayLocations = (db.prepare("SELECT COUNT(*) as count FROM locations WHERE date(created_at) = date('now')").get() as any).count;

        // Top contributors (by locations added)
        const topContributors = db.prepare(`
            SELECT 
                us.name,
                us.employee_code,
                us.role,
                us.team,
                COUNT(l.id) as locations_added,
                MAX(l.created_at) as last_active
            FROM user_sessions us
            LEFT JOIN locations l ON l.session_id = us.id
            GROUP BY us.employee_code, us.name, us.role, us.team
            ORDER BY locations_added DESC
            LIMIT 20
        `).all();

        // Locations per team
        const teamBreakdown = db.prepare(`
            SELECT 
                us.team,
                COUNT(l.id) as locations_added,
                COUNT(DISTINCT us.employee_code) as members_active
            FROM user_sessions us
            LEFT JOIN locations l ON l.session_id = us.id
            GROUP BY us.team
            ORDER BY locations_added DESC
        `).all();

        // Daily activity - last 14 days
        const dailyActivity = db.prepare(`
            SELECT 
                date(created_at) as day,
                COUNT(*) as locations_added
            FROM locations
            WHERE created_at >= date('now', '-13 days')
            GROUP BY date(created_at)
            ORDER BY day ASC
        `).all();

        // Recent activity log
        const recentActivity = db.prepare(`
            SELECT 
                l.id,
                us.name as user_name,
                us.employee_code,
                us.team,
                d.doctor_name,
                l.city_expense,
                l.city_das,
                l.brick_das,
                l.location_name,
                l.created_at
            FROM locations l
            JOIN user_sessions us ON us.id = l.session_id
            JOIN doctors d ON d.id = l.doctor_id
            ORDER BY l.created_at DESC
            LIMIT 50
        `).all();

        // Users with zero locations (logged in but didn't add anything)
        // Use session_id join — employee_codes who never have a session that contributed a location
        const inactiveUsers = db.prepare(`
            SELECT us.name, us.employee_code, us.role, us.team, MAX(us.created_at) as created_at
            FROM user_sessions us
            WHERE us.employee_code NOT IN (
                SELECT DISTINCT us2.employee_code
                FROM locations l
                JOIN user_sessions us2 ON us2.id = l.session_id
            )
            GROUP BY us.employee_code, us.name, us.role, us.team
            ORDER BY created_at DESC
        `).all();

        res.json({
            overview: {
                totalSessions,
                totalLocations,
                uniqueUsers,
                doctorsMapped,
                totalDoctors,
                progressPct: totalDoctors > 0 ? Math.round((doctorsMapped / totalDoctors) * 100 * 10) / 10 : 0,
                todaySessions,
                todayLocations
            },
            topContributors,
            teamBreakdown,
            dailyActivity,
            recentActivity,
            inactiveUsers
        });
    } catch (error: any) {
        console.error('Admin overview error:', error);
        res.status(500).json({ error: 'Failed to fetch admin overview' });
    }
});

export default router;
