import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import doctorRoutes from './routes/doctors';
import locationRoutes from './routes/locations';
import lookupRoutes from './routes/lookups';
import sessionRoutes from './routes/sessions';
import exportRoutes from './routes/export';
import statsRoutes from './routes/stats';
import adminRoutes from './routes/admin';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/doctors', doctorRoutes);
app.use('/api', locationRoutes);
app.use('/api', lookupRoutes);
app.use('/api/user-session', sessionRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/admin', adminRoutes);

// In production, serve the built frontend
const distPath = path.join(__dirname, '..', 'dist');
app.use(express.static(distPath));
app.get('*', (req, res) => {
    if (!req.url.startsWith('/api')) {
        res.sendFile(path.join(distPath, 'index.html'));
    }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
    console.log(`API available at http://localhost:${PORT}/api`);
    console.log(`Network access: http://<YOUR-IP>:${PORT}`);
});
